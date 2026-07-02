import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import zlib from 'zlib';
import { META } from '@consumet/extensions';

// Initialize and cache AniList Meta provider instance
const anilist = new META.Anilist();

const ANIKAI_BASE = 'https://www3.anikai.cc';
const ANIKOTO_BASE = 'https://anikototv.to';
const ANIKOTO_API_BASE = 'https://anikotoapi.site';
const EMBED_BASE = 'https://megaplay.buzz';
const MIRURO_PIPE_URL = 'https://www.miruro.tv/api/secure/pipe';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MIRURO_HEADERS = {
  'User-Agent': USER_AGENT,
  'Referer': 'https://www.miruro.tv/'
};

function extractAnikotoId(href: string | undefined): string | null {
  if (!href) return null;
  return href
    .replace(/^https?:\/\/[^\/]+\/watch\//, '')
    .replace(/^\/watch\//, '')
    .replace(/\/ep-\d+.*$/, '')
    .replace(/^\//, '')
    .trim() || null;
}

function encodePipeRequest(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  return Buffer.from(jsonStr).toString('base64url');
}

function decodePipeResponse(encodedStr: string): any {
  const buffer = Buffer.from(encodedStr, 'base64url');
  const decompressed = zlib.gunzipSync(buffer);
  return JSON.parse(decompressed.toString('utf-8'));
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

  // 1. Route to Anikai Scraper
  if (provider === 'anikai') {
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
        return res.status(404).send(`No search results for "${cleanTitle}" on Anikai.`);
      }

      let matchedId = '';
      let matchedAlId = '';
      let matchedMalId = '';

      if (anilistId) {
        const targetAlId = String(anilistId).trim();
        for (const item of searchItems) {
          try {
            const detailRes = await fetch(`${ANIKAI_BASE}/watch/${item.id}`, { headers: { 'User-Agent': USER_AGENT } });
            if (detailRes.ok) {
              const detailHtml = await detailRes.text();
              const $$ = cheerio.load(detailHtml);
              const alId = $$('#watch-page').attr('data-al-id');
              const malId = $$('#watch-page').attr('data-mal-id');
              if (alId === targetAlId) {
                matchedId = item.id;
                matchedAlId = alId || '';
                matchedMalId = malId || '';
                break;
              }
            }
          } catch {}
        }
      }

      if (!matchedId) {
        matchedId = searchItems[0].id;
        try {
          const detailRes = await fetch(`${ANIKAI_BASE}/watch/${matchedId}`, { headers: { 'User-Agent': USER_AGENT } });
          if (detailRes.ok) {
            const detailHtml = await detailRes.text();
            const $$ = cheerio.load(detailHtml);
            matchedAlId = $$('#watch-page').attr('data-al-id') || '';
            matchedMalId = $$('#watch-page').attr('data-mal-id') || '';
          }
        } catch {}
      }

      if (!matchedId) {
        return res.status(404).send(`No matching anime found for "${cleanTitle}" on Anikai.`);
      }

      const idToUse = matchedAlId || matchedMalId;
      const typeToUse = matchedAlId ? 'ani' : 'mal';

      if (!idToUse) {
        return res.status(502).send("Could not extract AniList or MAL ID for this anime.");
      }

      const embedUrl = `${EMBED_BASE}/stream/${typeToUse}/${idToUse}/${epNum}/${subdub}`;
      res.writeHead(302, { Location: embedUrl });
      return res.end();
    } catch (e: any) {
      console.error("Anikai redirect error:", e);
      return res.status(500).send(`Anikai extraction error: ${e.message}`);
    }
  }

  // 2. Route to Anikoto Scraper
  if (provider === 'anikoto') {
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

      const searchUrl = `${ANIKOTO_BASE}/filter?keyword=${encodeURIComponent(cleanTitle)}`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!searchRes.ok) {
        throw new Error(`Search failed: HTTP ${searchRes.status}`);
      }

      const searchHtml = await searchRes.text();
      const $ = cheerio.load(searchHtml);
      const searchItems: { id: string; name: string }[] = [];

      $('#list-items .item').each((_, el) => {
        const posterLink = $(el).find('.ani.poster a, a.poster').first();
        const href = posterLink.attr('href') || $(el).find('a').first().attr('href');
        const id = extractAnikotoId(href);
        const name = $(el).find('.name.d-title').text().trim();
        if (id && name) {
          searchItems.push({ id, name });
        }
      });

      if (searchItems.length === 0) {
        return res.status(404).send(`No search results for "${cleanTitle}" on Anikoto.`);
      }

      let matchedAnimeId = '';
      const targetAlId = anilistId ? String(anilistId).trim() : '';

      for (const item of searchItems) {
        try {
          const watchRes = await fetch(`${ANIKOTO_BASE}/watch/${item.id}`, { headers: { 'User-Agent': USER_AGENT } });
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
        } catch {}
      }

      if (!matchedAnimeId && searchItems.length > 0) {
        const firstItem = searchItems[0];
        const watchRes = await fetch(`${ANIKOTO_BASE}/watch/${firstItem.id}`, { headers: { 'User-Agent': USER_AGENT } });
        if (watchRes.ok) {
          const watchHtml = await watchRes.text();
          const $$ = cheerio.load(watchHtml);
          matchedAnimeId = $$('#watch-main').attr('data-id') || '';
        }
      }

      if (!matchedAnimeId) {
        return res.status(404).send(`No matching anime found for "${cleanTitle}" on Anikoto.`);
      }

      const apiRes = await fetch(`${ANIKOTO_API_BASE}/series/${matchedAnimeId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT }
      });

      if (!apiRes.ok) {
        throw new Error(`Failed to fetch series data: HTTP ${apiRes.status}`);
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

      res.writeHead(302, { Location: embedUrl });
      return res.end();
    } catch (e: any) {
      console.error("Anikoto redirect error:", e);
      return res.status(500).send(`Anikoto extraction error: ${e.message}`);
    }
  }

  // 3. Route to Miruro Pipe HLS Stream resolver
  if (provider === 'miruro') {
    const epNum = episode ? parseInt(String(episode), 10) : 1;
    const category = lang === 'dub' ? 'dub' : 'sub';

    try {
      let cleanTitle = '';
      if (title) {
        cleanTitle = String(title)
          .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
          .trim();
      }

      if (!cleanTitle && tmdbId) {
        const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
        const typeStr = mediaType === 'tv' ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}?api_key=${apiKey}`);
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json() as any;
          cleanTitle = typeStr === 'movie'
            ? (tmdbData.title || tmdbData.original_title)
            : (tmdbData.name || tmdbData.original_name);
        }
      }

      let targetAlId = anilistId ? String(anilistId).trim() : '';

      // If anilistId is missing, resolve it by searching AniList by title
      if (!targetAlId && cleanTitle) {
        try {
          const query = `
            query ($search: String) {
              Media (search: $search, type: ANIME) {
                id
              }
            }
          `;
          const aniListRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { search: cleanTitle }
            })
          });
          if (aniListRes.ok) {
            const aniListData = await aniListRes.json() as any;
            if (aniListData?.data?.Media?.id) {
              targetAlId = String(aniListData.data.Media.id);
            }
          }
        } catch (err) {
          console.error("Failed to resolve AniList ID by title:", err);
        }
      }

      if (!targetAlId) {
        return res.status(400).json({ success: false, error: "Missing anilistId parameter and could not resolve it from title." });
      }

      const epPayload = {
        path: "episodes",
        method: "GET",
        query: { anilistId: Number(targetAlId) },
        body: null,
        version: "0.1.0"
      };

      const epEnc = encodePipeRequest(epPayload);
      const epRes = await fetch(`${MIRURO_PIPE_URL}?e=${epEnc}`, { headers: MIRURO_HEADERS });
      if (!epRes.ok) {
        throw new Error(`Failed to fetch episodes from Miruro: HTTP ${epRes.status}`);
      }

      const epText = await epRes.text();
      const epData = decodePipeResponse(epText.trim());

      if (!epData || !epData.providers) {
        throw new Error("Invalid episodes data from Miruro pipe.");
      }

      let matchedEpisodeId = '';
      let matchedProvider = '';

      for (const [providerName, providerInfo] of Object.entries(epData.providers)) {
        const info = providerInfo as any;
        if (!info || !info.episodes) continue;
        
        const epList = info.episodes[category] || info.episodes.sub || [];
        if (!Array.isArray(epList)) continue;

        const targetEp = epList.find((e: any) => e.number === epNum);
        if (targetEp && targetEp.id) {
          matchedEpisodeId = targetEp.id;
          matchedProvider = providerName;
          break;
        }
      }

      if (!matchedEpisodeId) {
        return res.status(404).json({ success: false, error: `Episode ${epNum} (${category}) not found on Miruro.` });
      }

      const encEpId = Buffer.from(matchedEpisodeId).toString('base64url');
      const srcPayload = {
        path: "sources",
        method: "GET",
        query: {
          episodeId: encEpId,
          provider: matchedProvider,
          category: category,
          anilistId: Number(targetAlId)
        },
        body: null,
        version: "0.1.0"
      };

      const srcEnc = encodePipeRequest(srcPayload);
      const srcRes = await fetch(`${MIRURO_PIPE_URL}?e=${srcEnc}`, { headers: MIRURO_HEADERS });
      if (!srcRes.ok) {
        throw new Error(`Failed to fetch sources from Miruro: HTTP ${srcRes.status}`);
      }

      const srcText = await srcRes.text();
      const srcData = decodePipeResponse(srcText.trim());

      if (!srcData) {
        throw new Error("Invalid sources data from Miruro pipe.");
      }

      const rawSources = srcData.sources || [];
      const rawSubtitles = srcData.subtitles || [];

      const sources = rawSources.map((s: any) => ({
        file: s.url,
        label: s.quality || 'Auto',
        type: s.isM3U8 ? 'hls' : 'mp4'
      }));

      const subtitles = rawSubtitles.map((sub: any) => ({
        file: sub.url,
        label: sub.lang || sub.label || 'English',
        kind: 'captions'
      }));

      return res.status(200).json({
        success: true,
        data: {
          sources,
          subtitles
        }
      });
    } catch (e: any) {
      console.error("Miruro resolution error:", e);
      return res.status(500).json({ success: false, error: e.message });
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
