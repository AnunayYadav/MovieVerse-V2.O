import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import zlib from 'zlib';
import crypto from 'crypto';
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

const DECRYPT_KEYS: Record<string, { key: Buffer; iv: Buffer }> = {
  txt: {
    key: Buffer.from("8056483646328763"),
    iv: Buffer.from("6852612370185273"),
  },
  txt1: {
    key: Buffer.from("AmSmZVcH93UQUezi"),
    iv: Buffer.from("ReBKWW8cqdjPEnF6"),
  },
  default: {
    key: Buffer.from("sWODXX04QRTkHdlZ"),
    iv: Buffer.from("8pwhapJeC4hrS9hO"),
  },
};

function decryptSubtitleText(data: string, url: string): string {
  const lowerUrl = url.split("?")[0]?.toLowerCase() || url.toLowerCase();
  let format = "default";
  if (lowerUrl.endsWith(".txt1")) {
    format = "txt1";
  } else if (lowerUrl.endsWith(".txt")) {
    format = "txt";
  }
  const { key, iv } = DECRYPT_KEYS[format] || DECRYPT_KEYS.default;

  const normalizedData = data
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/"/g, "");
  const lines = normalizedData.split(/\r?\n/);
  
  const decryptedLines = lines
    .map((line) => {
      const trimmed = line.trim();
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length > 4) {
        try {
          const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
          let decryptedLine = decipher.update(trimmed, "base64", "utf8");
          decryptedLine += decipher.final("utf8");
          return decryptedLine;
        } catch (error) {
          return line;
        }
      }
      return line;
    })
    .join("\n");
  
  return decryptedLines;
}

async function resolveKisskh(
  title: string,
  mediaType: string,
  seasonNum: number,
  episodeNum: number,
  year?: string
) {
  const domains = ["https://kisskh.nl", "https://kisskh.co", "https://kisskh.do"];
  const viGuid = "62f176f3bb1b5b8e70e39932ad34a0c7";
  const subGuid = "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp";

  let lastError: any = new Error("No KissKh domains succeeded");

  for (const baseUrl of domains) {
    try {
      // 1. Search for drama
      const cleanTarget = title.replace(/\(\d{4}\)/g, '').trim();
      const searchUrl = `${baseUrl}/api/DramaList/Search?q=${encodeURIComponent(cleanTarget)}&type=0`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!searchRes.ok) throw new Error(`Search failed on ${baseUrl}`);
      const searchList = await searchRes.json() as any[];
      
      if (!searchList || searchList.length === 0) {
        throw new Error(`No show found on ${baseUrl} matching "${title}"`);
      }

      // Find best match
      const lowerTarget = cleanTarget.toLowerCase();
      let matchedShow = searchList.find(item => item.title.toLowerCase() === lowerTarget);
      if (!matchedShow && year) {
        matchedShow = searchList.find(item => item.title.toLowerCase().includes(lowerTarget) && item.title.includes(year));
      }
      if (!matchedShow) {
        matchedShow = searchList.find(item => item.title.toLowerCase().includes(lowerTarget) || lowerTarget.includes(item.title.toLowerCase()));
      }
      if (!matchedShow) {
        matchedShow = searchList[0];
      }

      const dramaId = matchedShow.id;

      // 2. Fetch drama details
      const detailRes = await fetch(`${baseUrl}/api/DramaList/Drama/${dramaId}`, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!detailRes.ok) throw new Error(`Details fetch failed on ${baseUrl}`);
      const detail = await detailRes.json() as any;

      // Find correct episode
      const requestedEpNum = mediaType === 'movie' ? 1 : episodeNum;
      const ep = detail.episodes.find((e: any) => e.number === requestedEpNum) || detail.episodes[0];
      if (!ep) {
        throw new Error(`Episode ${requestedEpNum} not found for drama "${detail.title}"`);
      }
      const episodeId = ep.id;

      // 3. Fetch index.html to find the script and evaluate token generator
      const indexRes = await fetch(`${baseUrl}/index.html`, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });
      if (!indexRes.ok) throw new Error(`Index.html fetch failed on ${baseUrl}`);
      const html = await indexRes.text();
      const scriptMatch = html.match(/<script[^>]*src="([^"]*common[^"]*)"/i);
      if (!scriptMatch) {
        throw new Error(`Could not find common script in index.html on ${baseUrl}`);
      }
      const scriptSrc = scriptMatch[1];

      // Fetch script JS
      const jsRes = await fetch(`${baseUrl}/${scriptSrc}`, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });
      if (!jsRes.ok) throw new Error(`Common JS fetch failed on ${baseUrl}`);
      const jsCode = await jsRes.text();

      // Evaluate stream token
      const streamSandbox = `
        ${jsCode};
        _0x54b991(${episodeId}, null, "2.8.10", "${viGuid}", 4830201, "kisskh", "kisskh", "kisskh", "kisskh", "kisskh", "kisskh");
      `;
      let streamToken;
      try {
        streamToken = eval(streamSandbox);
      } catch (e: any) {
        throw new Error(`Stream token evaluation failed on ${baseUrl}: ${e.message}`);
      }

      // Evaluate subtitle token
      const subSandbox = `
        ${jsCode};
        _0x54b991(${episodeId}, null, "2.8.10", "${subGuid}", 4830201, "kisskh", "kisskh", "kisskh", "kisskh", "kisskh", "kisskh");
      `;
      let subToken;
      try {
        subToken = eval(subSandbox);
      } catch (e: any) {
        throw new Error(`Subtitle token evaluation failed on ${baseUrl}: ${e.message}`);
      }

      // 4. Fetch direct video stream URL
      const streamRes = await fetch(`${baseUrl}/api/DramaList/Episode/${episodeId}.png?kkey=${streamToken}`, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!streamRes.ok) throw new Error(`Stream details fetch failed on ${baseUrl}`);
      const streamData = await streamRes.json() as any;
      if (!streamData || !streamData.Video) {
        throw new Error(`No video source resolved from ${baseUrl}`);
      }

      let finalVideoUrl = streamData.Video;
      if (!finalVideoUrl.startsWith("http")) {
        finalVideoUrl = `https:${finalVideoUrl}`;
      }

      // 5. Fetch subtitle options
      let subtitlesList: any[] = [];
      try {
        const subsRes = await fetch(`${baseUrl}/api/Sub/${episodeId}?kkey=${subToken}`, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json"
          }
        });
        if (subsRes.ok) {
          const subsData = await subsRes.json() as any[];
          if (Array.isArray(subsData)) {
            subtitlesList = subsData.map((sub: any) => {
              const isEncrypted = sub.src.split('?')[0].endsWith('.txt') || sub.src.split('?')[0].endsWith('.txt1');
              const finalSubUrl = isEncrypted
                ? `/api/anime?action=subtitle-proxy&url=${encodeURIComponent(sub.src)}`
                : sub.src;
              
              return {
                url: finalSubUrl,
                lang: sub.label || sub.land,
                label: sub.label || sub.land
              };
            });
          }
        }
      } catch (e) {
        console.error("Failed fetching/mapping subtitles:", e);
      }

      return {
        videoUrl: finalVideoUrl,
        subtitles: subtitlesList
      };

    } catch (err: any) {
      console.warn(`Failed KissKh resolution on ${baseUrl}: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
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

  // Handle subtitle proxy action early
  if (action === 'subtitle-proxy') {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send("URL parameter is required.");
    }
    try {
      const subRes = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });
      if (!subRes.ok) throw new Error("Failed to fetch subtitle file");
      const encryptedData = await subRes.text();
      const decrypted = decryptSubtitleText(encryptedData, url);
      
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).send(decrypted);
    } catch (e: any) {
      console.error("Subtitle decryption error:", e);
      return res.status(502).send(`Subtitle decryption error: ${e.message}`);
    }
  }

  // Resolve clean title if missing or provided
  let cleanTitle = '';
  let yearStr = req.query.year ? String(req.query.year) : '';
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
        if (!yearStr) {
          const relDate = tmdbData.release_date || tmdbData.first_air_date || '';
          if (relDate) {
            yearStr = relDate.substring(0, 4);
          }
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

  // 1.5. Route to KissKh Scraper
  if (provider === 'kisskh') {
    if (!cleanTitle) {
      return res.status(400).send("Could not resolve drama title.");
    }
    const seasonVal = season ? parseInt(String(season), 10) : 1;
    const episodeVal = episode ? parseInt(String(episode), 10) : 1;
    const mediaTypeStr = mediaType ? String(mediaType) : 'tv';

    try {
      const data = await resolveKisskh(
        cleanTitle,
        mediaTypeStr,
        seasonVal,
        episodeVal,
        yearStr || undefined
      );
      return res.status(200).json({
        success: true,
        data: {
          sources: [
            {
              url: data.videoUrl,
              quality: 'Default',
              label: 'Default'
            }
          ],
          subtitles: data.subtitles
        }
      });
    } catch (e: any) {
      console.error("KissKh extraction error:", e);
      return res.status(502).json({ error: `KissKh extraction error: ${e.message}` });
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
