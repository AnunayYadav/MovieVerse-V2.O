import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

const ANIKAI_BASE = 'https://www3.anikai.cc';
const EMBED_BASE = 'https://megaplay.buzz';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

    // 1. Fetch title from TMDB if missing
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

    // 2. Search Anikai
    const searchUrl = `${ANIKAI_BASE}/browser?keyword=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

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

    // 3. Find matching anime
    let matchedId = '';
    let matchedAlId = '';
    let matchedMalId = '';

    // If anilistId is provided, check each watch page for data-al-id
    if (anilistId) {
      const targetAlId = String(anilistId).trim();
      for (const item of searchItems) {
        try {
          const detailRes = await fetch(`${ANIKAI_BASE}/watch/${item.id}`, {
            headers: { 'User-Agent': USER_AGENT }
          });
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
        } catch (e) {
          console.warn(`Failed to inspect item ${item.id}:`, e);
        }
      }
    }

    // Fallback: match by title similarity if no AniList ID match
    if (!matchedId) {
      // Just pick the first search result
      matchedId = searchItems[0].id;
      // Fetch its IDs
      try {
        const detailRes = await fetch(`${ANIKAI_BASE}/watch/${matchedId}`, {
          headers: { 'User-Agent': USER_AGENT }
        });
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

    // 4. Resolve stream URL
    const idToUse = matchedAlId || matchedMalId;
    const typeToUse = matchedAlId ? 'ani' : 'mal';

    if (!idToUse) {
      return res.status(502).send("Could not extract AniList or MAL ID for this anime.");
    }

    // Construct Megaplay embed URL
    const embedUrl = `${EMBED_BASE}/stream/${typeToUse}/${idToUse}/${epNum}/${subdub}`;

    // 302 Redirect to the embed player
    res.writeHead(302, { Location: embedUrl });
    return res.end();
  } catch (e: any) {
    console.error("Anikai redirect error:", e);
    return res.status(500).send(`Anikai extraction error: ${e.message}`);
  }
}
