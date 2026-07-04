import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import zlib from 'zlib';
import { META } from '@consumet/extensions';

// Initialize and cache AniList Meta provider instance
const anilist = new META.Anilist();

const ANIKAI_BASE = 'https://www3.anikai.cc';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function getSeasonDescriptors(seasonNum: number) {
  const rom = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  const ord = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
  
  const descriptors: string[] = [
    `season ${seasonNum}`,
    `s${seasonNum}`,
    `${ord[seasonNum]} season` || `${seasonNum}th season`,
    `part ${seasonNum}`,
    `part ${rom[seasonNum]}` || "",
  ].filter(Boolean);
  
  return descriptors;
}

function findBestMatch(
  searchItems: { id: string; name: string; totalEpisodes: number }[],
  cleanTitle: string,
  seasonNum: number,
  seasonName: string
) {
  if (searchItems.length === 0) return null;
  const target = cleanTitle.toLowerCase();
  
  // Extract significant words from seasonName
  const stopwords = new Set(["the", "season", "part", "arc", "series", "show", "anime", "of", "and", "in", "to", "a", "an"]);
  const seasonWords = seasonName
    ? seasonName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopwords.has(w))
    : [];

  const targetSeasonDescriptors = getSeasonDescriptors(seasonNum);
  
  // Get descriptors for other seasons (1 to 10, excluding target)
  const otherSeasonDescriptors: string[] = [];
  for (let s = 1; s <= 10; s++) {
    if (s !== seasonNum) {
      otherSeasonDescriptors.push(...getSeasonDescriptors(s));
    }
  }

  let bestItem = searchItems[0];
  let bestScore = -9999;

  for (const item of searchItems) {
    const itemLower = item.name.toLowerCase();
    
    // 1. Calculate base text similarity score
    let score = 0;
    const targetWords = target.split(/\s+/).filter(w => w.length > 2);
    for (const word of targetWords) {
      if (itemLower.includes(word)) {
        score += 2;
      }
    }
    
    if (itemLower.startsWith(target) || target.startsWith(itemLower)) {
      score += 5;
    }
    
    if (itemLower === target) {
      score += 10;
    }

    // 2. Adjust score based on season matching
    // Bonus for matching significant words from the TMDB season name
    for (const word of seasonWords) {
      if (itemLower.includes(word)) {
        score += 20;
      }
    }

    // Bonus for matching target season descriptors
    for (const desc of targetSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        score += 15;
      }
    }
    // Also support standalone number suffix (e.g. "One Punch Man 2")
    if (seasonNum > 1) {
      const numPattern = new RegExp(`\\b${seasonNum}\\b`);
      if (numPattern.test(itemLower)) {
        score += 10;
      }
    }

    // Penalize for matching descriptors of other seasons
    for (const desc of otherSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        score -= 15;
      }
    }
    if (seasonNum === 1) {
      // For season 1, penalize standalone number suffixes > 1
      for (let s = 2; s <= 10; s++) {
        const numPattern = new RegExp(`\\b${s}\\b`);
        if (numPattern.test(itemLower)) {
          score -= 10;
        }
      }
    } else {
      // For season > 1, penalize standalone number suffixes of other seasons > 1
      for (let s = 2; s <= 10; s++) {
        if (s !== seasonNum) {
          const numPattern = new RegExp(`\\b${s}\\b`);
          if (numPattern.test(itemLower)) {
            score -= 10;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

async function resolveAnikai(
  cleanTitle: string,
  season: any,
  episode: any,
  lang: any,
  seasonName: string,
  seasonEpisodeCount: number,
  absoluteEpisode: number
) {
  const seasonNum = season ? parseInt(String(season), 10) : 1;
  const initialEpNum = episode ? parseInt(String(episode), 10) : 1;
  const subdub = lang === 'dub' ? 'dub' : 'sub';

  const searchUrl = `${ANIKAI_BASE}/browser?keyword=${encodeURIComponent(cleanTitle)}`;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!searchRes.ok) {
    throw new Error(`Search failed: HTTP ${searchRes.status}`);
  }

  const searchHtml = await searchRes.text();
  const $ = cheerio.load(searchHtml);
  const searchItems: { id: string; name: string; totalEpisodes: number }[] = [];

  $('.aitem-wrapper.regular .aitem').each((_, el) => {
    const href = $(el).attr('href') || $(el).find('a.poster').attr('href');
    if (href) {
      const id = href.replace('/watch/', '').split('#')[0].trim();
      const name = $(el).find('a.title').text().trim() || $(el).find('h6.title').text().trim();
      
      const totalEpisodesText = $(el).find('.info .sub').text().trim() || $(el).find('.info span').first().text().trim();
      const totalEpisodes = totalEpisodesText ? parseInt(totalEpisodesText, 10) : 0;
      
      searchItems.push({ id, name, totalEpisodes });
    }
  });

  if (searchItems.length === 0) {
    throw new Error(`No search results on Anikai.`);
  }

  const bestMatch = findBestMatch(searchItems, cleanTitle, seasonNum, seasonName);
  if (!bestMatch) {
    throw new Error(`No match found on Anikai.`);
  }

  // Determine whether to play seasonal episode or absolute episode
  let epNum = initialEpNum;
  if (seasonNum > 1) {
    const itemLower = bestMatch.name.toLowerCase();
    
    // Check if the best match is a seasonal entry
    const targetSeasonDescriptors = getSeasonDescriptors(seasonNum);
    let isSeasonalMatch = false;
    for (const desc of targetSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        isSeasonalMatch = true;
        break;
      }
    }
    
    // Check if the TMDB season name (if any) is included in the match name
    if (seasonName && !isSeasonalMatch) {
      const stopwords = new Set(["the", "season", "part", "arc", "series", "show", "anime", "of", "and", "in", "to", "a", "an"]);
      const seasonWords = seasonName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopwords.has(w));
      for (const word of seasonWords) {
        if (itemLower.includes(word)) {
          isSeasonalMatch = true;
          break;
        }
      }
    }

    // Check if it has a small/matching number of total episodes
    const isSmallEpisodeCount = seasonEpisodeCount > 0 && bestMatch.totalEpisodes > 0 && bestMatch.totalEpisodes <= seasonEpisodeCount + 5;
    
    if (isSeasonalMatch || isSmallEpisodeCount) {
      // Seasonal entry, use the requested episode number as is
      epNum = initialEpNum;
    } else {
      // Combined entry, use the calculated absolute episode number
      epNum = absoluteEpisode;
    }
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

  const { provider, action, tmdbId, mediaType, season, episode, anilistId, title, lang, episodeId } = req.query;

  // Resolve clean title if missing or provided
  let cleanTitle = '';
  if (title) {
    cleanTitle = String(title)
      .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
      .trim();
  }

  let seasonName = '';
  let seasonEpisodeCount = 0;
  let absoluteEpisode = episode ? parseInt(String(episode), 10) : 1;

  if (tmdbId) {
    try {
      const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
      const typeStr = mediaType === 'tv' ? 'tv' : 'movie';
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        if (!cleanTitle) {
          cleanTitle = typeStr === 'movie'
            ? (tmdbData.title || tmdbData.original_title)
            : (tmdbData.name || tmdbData.original_name);
        }

        if (typeStr === 'tv') {
          const seasonNum = season ? parseInt(String(season), 10) : 1;
          const seasons = tmdbData.seasons || [];
          let prevEpisodesSum = 0;
          for (const s of seasons) {
            if (s.season_number < seasonNum && s.season_number > 0) {
              prevEpisodesSum += s.episode_count || 0;
            }
            if (s.season_number === seasonNum) {
              seasonEpisodeCount = s.episode_count || 0;
              seasonName = s.name || '';
            }
          }
          const epNum = episode ? parseInt(String(episode), 10) : 1;
          absoluteEpisode = prevEpisodesSum + epNum;
        }
      }
    } catch {}
  }

  // 1. Route to Anikai Scraper
  if (provider === 'anikai') {
    if (!cleanTitle) {
      return res.status(400).send("Could not resolve anime title.");
    }
    try {
      const embedUrl = await resolveAnikai(
        cleanTitle,
        season,
        episode,
        lang,
        seasonName,
        seasonEpisodeCount,
        absoluteEpisode
      );
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
