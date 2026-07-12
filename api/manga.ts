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

const NOVELFULL_BASE = 'https://novelfull.com';
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

async function scrapeNovelFullSearch(query: string) {
  // NovelFull search results are loaded via JavaScript AJAX, so we can't scrape
  // them server-side. Instead, we convert the query to a slug and try to fetch
  // the novel info page directly as a "direct lookup" search.
  const results: any[] = [];

  // Generate candidate slugs from the query
  const baseSlug = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Try multiple slug variations (with and without common suffixes)
  const slugCandidates = [baseSlug];
  // Also try without trailing words like "novel", "light", etc.
  const trimmed = baseSlug.replace(/-(novel|light-novel|ln|wn|web-novel)$/, '');
  if (trimmed !== baseSlug) slugCandidates.push(trimmed);

  for (const slug of slugCandidates) {
    try {
      const url = `${NOVELFULL_BASE}/${slug}.html`;
      const html = await novelFetch(url);
      const $ = cheerio.load(html);

      const title = $('h3.title').text().trim();
      if (!title) continue; // Not a valid novel page

      let image = $('div.book img').attr('src') || '';
      if (image && !image.startsWith('http')) {
        image = `${NOVELFULL_BASE}${image}`;
      }

      const author = $('div.info div:contains("Author")').find('a').first().text().trim()
        || $('div.info').text().match(/Author[:\s]*([^\n]+)/)?.[1]?.trim()
        || '';

      results.push({ id: slug, title, image, author });
      break; // Found a match, stop trying
    } catch {
      // Slug didn't resolve to a valid page, continue
    }
  }

  return results;
}

async function scrapeNovelFullInfo(novelId: string) {
  const url = `${NOVELFULL_BASE}/${novelId}.html`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('h3.title').text().trim();
  let image = $('div.book img').attr('src') || '';
  if (image && !image.startsWith('http')) {
    image = `${NOVELFULL_BASE}${image}`;
  }

  const description = $('div.desc-text').text().trim();

  const genres: string[] = [];
  $('div.info a[href*="/genre/"]').each((_, el) => {
    genres.push($(el).text().trim());
  });

  const rating = $('span[itemprop="ratingValue"]').text().trim();
  const dbNovelId = $('#rating').attr('data-novel-id') || $('.rateit').attr('data-novel-id') || '';
  
  const chapters: any[] = [];
  if (dbNovelId) {
    const chaptersUrl = `${NOVELFULL_BASE}/ajax-chapter-option?novelId=${dbNovelId}`;
    const chaptersHtml = await novelFetch(chaptersUrl).catch(() => '');
    if (chaptersHtml) {
      const $c = cheerio.load(chaptersHtml);
      $c('option').each((_, el) => {
        const cTitle = $c(el).text().trim();
        const cVal = $c(el).attr('value') || '';
        const cId = cVal.replace(/^\//, '');
        if (cId && cTitle) {
          chapters.push({
            id: cId,
            title: cTitle,
            url: `${NOVELFULL_BASE}/${cId}`
          });
        }
      });
    }
  }

  return {
    id: novelId,
    title,
    image,
    description,
    genres,
    rating: rating ? parseFloat(rating) : null,
    chapters
  };
}

async function scrapeNovelFullChapter(chapterId: string) {
  const url = `${NOVELFULL_BASE}/${chapterId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.chapter-title').text().trim() || $('title').text().trim();
  const container = $('#chapter-content');
  container.find('script, iframe, style, .ads, .ads-holder, .social-share, .adsbygoogle').remove();

  let paragraphs: string[] = [];
  container.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  if (paragraphs.length === 0) {
    const rawText = container.text();
    paragraphs = rawText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  paragraphs = paragraphs.filter(text => {
    const lower = text.toLowerCase();
    return (
      !lower.includes('report chapter') &&
      !lower.includes('broken links') &&
      !lower.includes('novelfull.com') &&
      !lower.includes('update faster') &&
      !lower.includes('if you find any errors')
    );
  });

  return {
    title,
    paragraphs
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
    if (providerKey === 'novelfull') {
      if (action === 'search') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        const results = await scrapeNovelFullSearch(query);
        return res.status(200).json(results);
      }

      if (action === 'info') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeNovelFullInfo(id);
        return res.status(200).json(data);
      }

      if (action === 'pages') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeNovelFullChapter(id);
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
      const refererUrl = req.query.referer || (providerKey === 'novelfull' ? NOVELFULL_BASE : provider.baseUrl);
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

