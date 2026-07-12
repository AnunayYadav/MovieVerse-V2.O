import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANGA } from '@consumet/extensions';
import * as cheerio from 'cheerio';
import { execSync } from 'child_process';

// Initialize and cache provider instances
const providers: Record<string, any> = {
  mangadex: new MANGA.MangaDex(),
  comick: new MANGA.ComicK(),
  mangahere: new MANGA.MangaHere(),
  mangapill: new MANGA.MangaPill(),
  mangareader: new MANGA.MangaReader(),
  asurascans: new MANGA.AsuraScans(),
  weebcentral: new MANGA.WeebCentral(),
  mangakakalot: new MANGA.MangaKakalot()
};

const WUXIAWORLD_BASE = 'https://wuxiaworld.eu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1'
};

/**
 * Fetches HTML from a URL. Tries native fetch first (works on Vercel).
 * Falls back to curl via child_process for local dev where Node's TLS
 * fingerprint gets blocked by Cloudflare.
 */
async function novelFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (res.ok) {
      return await res.text();
    }
    // If Cloudflare blocks us (403), fall through to curl fallback
    if (res.status !== 403) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
  } catch (e: any) {
    // Network errors also fall through to curl
    if (e?.message && !e.message.includes('403')) {
      console.warn('novelFetch: fetch error, trying curl fallback:', e.message);
    }
  }

  // Fallback: use curl (available on most servers and local dev)
  try {
    const escapedUrl = url.replace(/'/g, "'\\''");
    const html = execSync(
      `curl -s -L -A '${USER_AGENT}' '${escapedUrl}'`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }
    ).toString();
    if (html) return html;
  } catch {
    // curl not available or failed
  }

  throw new Error(`Failed to fetch ${url}: all methods exhausted`);
}

async function scrapeWuxiaWorldSearch(query: string) {
  const url = `${WUXIAWORLD_BASE}/api/search/?search=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  const json = await res.json();
  const rawResults = json.results || [];

  return rawResults.map((item: any) => ({
    id: item.slug,
    title: item.name,
    image: item.image || '',
    author: '',
    description: item.description || ''
  }));
}

async function scrapeWuxiaWorldInfo(novelId: string) {
  const infoUrl = `${WUXIAWORLD_BASE}/api/novels/${novelId}/`;
  const infoRes = await fetch(infoUrl, { headers: BROWSER_HEADERS });
  if (!infoRes.ok) throw new Error(`Failed to fetch novel details: ${infoRes.statusText}`);
  const infoJson = await infoRes.json();

  const chaptersUrl = `${WUXIAWORLD_BASE}/api/chapters/${novelId}/`;
  const chaptersRes = await fetch(chaptersUrl, { headers: BROWSER_HEADERS });
  if (!chaptersRes.ok) throw new Error(`Failed to fetch chapters list: ${chaptersRes.statusText}`);
  const chaptersJson = await chaptersRes.json();

  const chapters = Array.isArray(chaptersJson) ? chaptersJson : [];
  chapters.sort((a: any, b: any) => (a.index || 0) - (b.index || 0));

  const genres = Array.isArray(infoJson.categories)
    ? infoJson.categories.map((c: any) => c.name)
    : [];

  return {
    id: novelId,
    title: infoJson.name,
    image: infoJson.image || '',
    author: infoJson.author || '',
    description: infoJson.description || '',
    genres,
    rating: infoJson.rating ? parseFloat(infoJson.rating) : null,
    chapters: chapters.map((ch: any) => ({
      id: ch.novSlugChapSlug,
      title: ch.title,
      url: `${WUXIAWORLD_BASE}/chapter/${ch.novSlugChapSlug}`
    }))
  };
}

async function scrapeWuxiaWorldChapter(chapterId: string) {
  const url = `${WUXIAWORLD_BASE}/api/getchapter/${chapterId}/`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch chapter content: ${res.statusText}`);
  const json = await res.json();

  const paragraphs = (json.text || '')
    .split('\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  return {
    title: json.title || 'Chapter Content',
    paragraphs,
    nextChapterId: null,
    prevChapterId: null
  };
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, query, id, provider: providerQuery } = req.query;

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action parameter is required and must be a string' });
  }

  const providerKey = typeof providerQuery === 'string' ? providerQuery.toLowerCase() : 'mangapill';

  try {
    if (['novelfull', 'ranobes', 'wuxiaworld'].includes(providerKey)) {
      if (action === 'search') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        const results = await scrapeWuxiaWorldSearch(query);
        return res.status(200).json(results);
      }

      if (action === 'info') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeWuxiaWorldInfo(id);
        return res.status(200).json(data);
      }

      if (action === 'pages') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeWuxiaWorldChapter(id);
        return res.status(200).json(data);
      }
    }

    // Default Manga provider logic
    const provider = providers[providerKey] || providers.mangapill;

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
      const data = await provider.search(query);
      const results = Array.isArray(data) ? data : (data.results || []);
      return res.status(200).json(results);
    }

    if (action === 'info') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }
      const data = await provider.fetchMangaInfo(id);
      return res.status(200).json(data);
    }

    if (action === 'pages') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }
      const data = await provider.fetchChapterPages(id);
      return res.status(200).json(data);
    }

    if (action === 'proxy-image') {
      const imageUrl = req.query.url;
      const refererUrl = req.query.referer || (['novelfull', 'ranobes', 'wuxiaworld'].includes(providerKey) ? WUXIAWORLD_BASE : provider.baseUrl);
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      const headers: Record<string, string> = {
        'User-Agent': USER_AGENT
      };

      if (refererUrl && typeof refererUrl === 'string') {
        headers['Referer'] = refererUrl;
      }

      const response = await fetch(imageUrl, { headers });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Proxy fetch failed: ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      const arrayBuffer = await response.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Manga/Novel API error [action=${action}, provider=${providerKey}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

