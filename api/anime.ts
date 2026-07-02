import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import zlib from 'zlib';
import { META } from '@consumet/extensions';

// Initialize and cache AniList Meta provider instance
const anilist = new META.Anilist();

const ANIKAI_BASE = 'https://www3.anikai.cc';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function findBestMatch(searchItems: { id: string; name: string }[], cleanTitle: string) {
  if (searchItems.length === 0) return null;
  const target = cleanTitle.toLowerCase();
  const exact = searchItems.find(item => item.name.toLowerCase() === target);
  if (exact) return exact;

  let bestItem = searchItems[0];
  let bestScore = 0;
  const targetWords = target.split(/\s+/).filter(w => w.length > 2);

  for (const item of searchItems) {
    const itemLower = item.name.toLowerCase();
    let score = 0;
    for (const word of targetWords) {
      if (itemLower.includes(word)) {
        score += 1;
      }
    }
    if (itemLower.startsWith(target) || target.startsWith(itemLower)) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }
  return bestItem;
}

async function resolveAnikai(cleanTitle: string, episode: any, lang: any) {
  const epNum = episode ? parseInt(String(episode), 10) : 1;
  const subdub = lang === 'dub' ? 'dub' : 'sub';

  const searchUrl = `${ANIKAI_BASE}/browser?keyword=${encodeURIComponent(cleanTitle)}`;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!searchRes.ok) {
    throw new Error(`Search failed: HTTP ${searchRes.status}`);
  }

  const searchHtml = await searchRes.text();
  const $ = cheerio.load(searchHtml);
  const searchItems: { id: string; name: string }[] = [];

  $('.aitem-wrapper.regular .aitem').each((_, el) => {
    const href = $(el).attr('href') || $(el).find('a.poster').attr('href');
    if (href) {
      const id = href.replace('/watch/', '').split('#')[0].trim();
      const name = $(el).find('a.title').text().trim() || $(el).find('h6.title').text().trim();
      searchItems.push({ id, name });
    }
  });

  if (searchItems.length === 0) {
    throw new Error(`No search results on Anikai.`);
  }

  const bestMatch = findBestMatch(searchItems, cleanTitle);
  if (!bestMatch) {
    throw new Error(`No match found on Anikai.`);
  }

  // Fetch watch details page of the best match for the specific episode to get direct video URLs
  const watchUrl = `${ANIKAI_BASE}/watch/${bestMatch.id}/ep-${epNum}`;
  const detailRes = await fetch(watchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!detailRes.ok) {
    throw new Error(`Failed to load watch page on Anikai: ${watchUrl}`);
  }

  const detailHtml = await detailRes.text();
  const $$ = cheerio.load(detailHtml);
  
  const targetTab = subdub === 'dub' ? 'tab_2' : 'tab_1';
  let matchedVideoUrl = '';

  // 1. Try finding HD-1 or HD-2 on the target tab
  $$('.server-video').each((_, el) => {
    const tab = $$(el).attr('data-tab');
    const video = $$(el).attr('data-video');
    const text = $$(el).text().trim();
    if (tab === targetTab && video && (text.includes('HD-1') || text.includes('HD-2'))) {
      matchedVideoUrl = video;
      return false; // Break
    }
  });

  // 2. Try finding any server on the target tab
  if (!matchedVideoUrl) {
    $$('.server-video').each((_, el) => {
      const tab = $$(el).attr('data-tab');
      const video = $$(el).attr('data-video');
      if (tab === targetTab && video) {
        matchedVideoUrl = video;
        return false;
      }
    });
  }

  // 3. Fallback to any tab with HD-1/HD-2
  if (!matchedVideoUrl) {
    $$('.server-video').each((_, el) => {
      const video = $$(el).attr('data-video');
      const text = $$(el).text().trim();
      if (video && (text.includes('HD-1') || text.includes('HD-2'))) {
        matchedVideoUrl = video;
        return false;
      }
    });
  }

  // 4. Final fallback: first available server
  if (!matchedVideoUrl) {
    matchedVideoUrl = $$('.server-video').first().attr('data-video') || '';
  }

  if (!matchedVideoUrl) {
    throw new Error("Could not extract video stream URL from Anikai.");
  }

  return matchedVideoUrl;
}



export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { provider, action, tmdbId, mediaType, episode, anilistId, title, lang, episodeId } = req.query;

  // Resolve clean title if missing or provided
  let cleanTitle = '';
  if (title) {
    cleanTitle = String(title)
      .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
      .trim();
  }

  if (!cleanTitle && tmdbId) {
    try {
      const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
      const typeStr = mediaType === 'tv' ? 'tv' : 'movie';
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        cleanTitle = typeStr === 'movie'
          ? (tmdbData.title || tmdbData.original_title)
          : (tmdbData.name || tmdbData.original_name);
      }
    } catch {}
  }

  // 1. Route to Anikai Scraper
  if (provider === 'anikai') {
    if (!cleanTitle) {
      return res.status(400).send("Could not resolve anime title.");
    }
    try {
      const embedUrl = await resolveAnikai(cleanTitle, episode, lang);
      res.writeHead(302, { Location: embedUrl });
      return res.end();
    } catch (e: any) {
      console.error("Anikai redirect error:", e);
      return res.status(502).send(`Anikai extraction error: ${e.message}`);
    }
  }


  // 4. Default: Consumet AniList Meta logic
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action or provider parameter is required' });
  }

  try {
    if (action === 'episodes') {
      if (!anilistId || typeof anilistId !== 'string') {
        return res.status(400).json({ error: 'anilistId parameter is required' });
      }

      const data = await anilist.fetchAnimeInfo(anilistId);
      
      return res.status(200).json({
        id: data.id,
        title: data.title,
        episodes: data.episodes || [],
      });
    }

    if (action === 'watch') {
      if (!episodeId || typeof episodeId !== 'string') {
        return res.status(400).json({ error: 'episodeId parameter is required' });
      }

      const data = await anilist.fetchEpisodeSources(episodeId);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Anime API error [action=${action}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
