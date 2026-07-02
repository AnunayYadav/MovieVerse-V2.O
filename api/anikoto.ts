import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

const ANIKOTO_BASE = 'https://anikototv.to';
const ANIKOTO_API_BASE = 'https://anikotoapi.site';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractId(href: string | undefined): string | null {
  if (!href) return null;
  return href
    .replace(/^https?:\/\/[^\/]+\/watch\//, '')
    .replace(/^\/watch\//, '')
    .replace(/\/ep-\d+.*$/, '')
    .replace(/^\//, '')
    .trim() || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { tmdbId, mediaType, episode, anilistId, title, lang } = req.query;

  if (!anilistId && !title) {
    return res.status(400).send("Missing title or anilistId parameter.");
  }

  const epNum = episode ? parseInt(String(episode), 10) : 1;
  const subdub = lang === 'dub' ? 'dub' : 'sub';
  const typeStr = mediaType === 'tv' ? 'tv' : 'movie';

  try {
    let cleanTitle = '';
    if (title) {
      cleanTitle = String(title)
        .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
        .trim();
    }

    if (!cleanTitle && tmdbId) {
      const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        cleanTitle = typeStr === 'movie'
          ? (tmdbData.title || tmdbData.original_title)
          : (tmdbData.name || tmdbData.original_name);
      }
    }

    if (!cleanTitle) {
      return res.status(400).send("Could not resolve anime title.");
    }

    // 1. Search Anikoto
    const searchUrl = `${ANIKOTO_BASE}/filter?keyword=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!searchRes.ok) {
      throw new Error(`Search failed: HTTP ${searchRes.status}`);
    }

    const searchHtml = await searchRes.text();
    const $ = cheerio.load(searchHtml);
    const searchItems: { id: string; name: string }[] = [];

    $('#list-items .item').each((_, el) => {
      const posterLink = $(el).find('.ani.poster a, a.poster').first();
      const href = posterLink.attr('href') || $(el).find('a').first().attr('href');
      const id = extractId(href);
      const name = $(el).find('.name.d-title').text().trim();
      if (id && name) {
        searchItems.push({ id, name });
      }
    });

    if (searchItems.length === 0) {
      return res.status(404).send(`No search results for "${cleanTitle}" on Anikoto.`);
    }

    // 2. Find matching anime
    let matchedAnimeId = ''; // numeric ID
    const targetAlId = anilistId ? String(anilistId).trim() : '';

    for (const item of searchItems) {
      try {
        const watchRes = await fetch(`${ANIKOTO_BASE}/watch/${item.id}`, {
          headers: { 'User-Agent': USER_AGENT }
        });
        if (watchRes.ok) {
          const watchHtml = await watchRes.text();
          const $$ = cheerio.load(watchHtml);
          const animeId = $$('#watch-main').attr('data-id') || null;
          if (animeId) {
            if (targetAlId) {
              const apiRes = await fetch(`${ANIKOTO_API_BASE}/series/${animeId}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT }
              });
              if (apiRes.ok) {
                const apiData = await apiRes.json() as any;
                const aniId = apiData?.data?.anime?.ani_id;
                if (String(aniId) === targetAlId) {
                  matchedAnimeId = animeId;
                  break;
                }
              }
            } else {
              matchedAnimeId = animeId;
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to inspect Anikoto item ${item.id}:`, e);
      }
    }

    // Fallback if AniList ID is not matched
    if (!matchedAnimeId && searchItems.length > 0) {
      const firstItem = searchItems[0];
      const watchRes = await fetch(`${ANIKOTO_BASE}/watch/${firstItem.id}`, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (watchRes.ok) {
        const watchHtml = await watchRes.text();
        const $$ = cheerio.load(watchHtml);
        matchedAnimeId = $$('#watch-main').attr('data-id') || '';
      }
    }

    if (!matchedAnimeId) {
      return res.status(404).send(`No matching anime found for "${cleanTitle}" on Anikoto.`);
    }

    // 3. Fetch episodes list and resolve target episode stream
    const apiRes = await fetch(`${ANIKOTO_API_BASE}/series/${matchedAnimeId}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT }
    });

    if (!apiRes.ok) {
      throw new Error(`Failed to fetch series data from Anikoto JSON API: HTTP ${apiRes.status}`);
    }

    const apiData = await apiRes.json() as any;
    if (!apiData.ok || !apiData.data || !apiData.data.episodes) {
      throw new Error('Invalid JSON API response from Anikoto');
    }

    const episodesList = apiData.data.episodes || [];
    const matchedEp = episodesList.find((ep: any) => ep.number === epNum);

    if (!matchedEp) {
      return res.status(404).send(`Episode ${epNum} not found on Anikoto.`);
    }

    const embedUrls = matchedEp.embed_url || {};
    const embedUrl = subdub === 'dub' ? (embedUrls.dub || embedUrls.sub) : (embedUrls.sub || embedUrls.dub);

    if (!embedUrl) {
      return res.status(502).send("No streaming embed URL available for this episode.");
    }

    // Redirect to the embed player
    res.writeHead(302, { Location: embedUrl });
    return res.end();
  } catch (e: any) {
    console.error("Anikoto redirect error:", e);
    return res.status(500).send(`Anikoto extraction error: ${e.message}`);
  }
}
