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

const API_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'application/json'
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
  const res = await fetch(url, { headers: API_HEADERS });
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
  const infoRes = await fetch(infoUrl, { headers: API_HEADERS });
  if (!infoRes.ok) throw new Error(`Failed to fetch novel details: ${infoRes.statusText}`);
  const infoJson = await infoRes.json();

  const chaptersUrl = `${WUXIAWORLD_BASE}/api/chapters/${novelId}/`;
  const chaptersRes = await fetch(chaptersUrl, { headers: API_HEADERS });
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
    author: typeof infoJson.author === 'object' && infoJson.author !== null
      ? (infoJson.author.name || '')
      : (infoJson.author || ''),
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
  const res = await fetch(url, { headers: API_HEADERS });
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



async function scrapeRoyalRoadSearch(query: string) {
  const url = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('.fiction-list-item').each((_, el) => {
    const a = $(el).find('.fiction-title a');
    const href = a.attr('href') || '';
    const id = href.replace(/^\/fiction\//, '');
    const cover = $(el).find('img').attr('src') || '';
    
    results.push({
      id,
      title: a.text().trim(),
      image: cover.startsWith('/') ? `https://www.royalroad.com${cover}` : cover,
      author: $(el).find('.author').text().replace('by', '').trim(),
      description: $(el).find('.description').text().trim()
    });
  });

  return results;
}

async function scrapeRoyalRoadInfo(novelId: string) {
  const url = `https://www.royalroad.com/fiction/${novelId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const author = $('h4 span a').first().text().trim();
  const description = $('.description').first().text().trim();
  const coverUrl = $('img.thumbnail').attr('src') || '';
  const image = coverUrl.startsWith('/') ? `https://www.royalroad.com${coverUrl}` : coverUrl;

  const genres: string[] = [];
  $('.tags span').each((_, el) => {
    genres.push($(el).text().trim());
  });

  const chapters: any[] = [];
  $('td:not([class]) a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const cleanId = href.startsWith('/') ? href.slice(1) : href;
    chapters.push({
      id: cleanId,
      title: $(el).text().trim(),
      url: `https://www.royalroad.com/${cleanId}`
    });
  });

  return {
    id: novelId,
    title,
    image,
    author,
    description,
    genres,
    rating: null,
    chapters
  };
}

async function scrapeRoyalRoadChapter(chapterId: string) {
  const url = `https://www.royalroad.com/${chapterId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.chapter-title').text().trim() || $('.chapter-header h1').text().trim() || 'Chapter';
  const paragraphs: string[] = [];
  $('.chapter-content p').each((_, el) => {
    paragraphs.push($(el).text().trim());
  });

  return {
    title,
    paragraphs,
    nextChapterId: null,
    prevChapterId: null
  };
}

async function scrapeScribbleHubSearch(query: string) {
  const url = `https://www.scribblehub.com/?s=${encodeURIComponent(query)}&post_type=fictionposts`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('.search_main_box').each((_, el) => {
    const a = $(el).find('.search_title a');
    const href = a.attr('href') || '';
    const id = href.replace(/^https:\/\/www\.scribblehub\.com\/series\//, '').replace(/\/$/, '');
    const cover = $(el).find('.search_img img').attr('src') || '';

    results.push({
      id,
      title: a.text().trim(),
      image: cover,
      author: $(el).find('.search_author a').text().trim(),
      description: $(el).find('.search_body').text().trim()
    });
  });

  return results;
}

async function scrapeScribbleHubInfo(novelId: string) {
  const url = `https://www.scribblehub.com/series/${novelId}/`;
  
  const customHeaders = {
    ...BROWSER_HEADERS,
    'Cookie': 'toc_show=9999'
  };
  
  let html = '';
  try {
    const res = await fetch(url, { headers: customHeaders });
    if (res.ok) html = await res.text();
  } catch {}

  if (!html) {
    const escapedUrl = url.replace(/'/g, "'\\''");
    html = execSync(
      `curl -s -L -b 'toc_show=9999' -A '${USER_AGENT}' '${escapedUrl}'`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }
    ).toString();
  }

  const $ = cheerio.load(html);

  const title = $('.fic_title').first().text().trim();
  const author = $('.auth_name_fic').first().text().trim();
  const description = $('.wi_fic_desc').first().text().trim();
  const image = $('.fic_image img').attr('src') || '';

  const genres: string[] = [];
  $('.wi_fic_genre a').each((_, el) => {
    genres.push($(el).text().trim());
  });

  const chapters: any[] = [];
  $('a.toc_a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const cleanId = href.startsWith('https://www.scribblehub.com/') ? href.replace('https://www.scribblehub.com/', '') : href;
    chapters.push({
      id: cleanId,
      title: $(el).text().trim(),
      url: href
    });
  });
  
  chapters.reverse();

  return {
    id: novelId,
    title,
    image,
    author,
    description,
    genres,
    rating: null,
    chapters
  };
}

async function scrapeScribbleHubChapter(chapterId: string) {
  const url = `https://www.scribblehub.com/${chapterId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.chapter-title').text().trim() || 'Chapter';
  const paragraphs: string[] = [];
  $('#chp_raw p').each((_, el) => {
    paragraphs.push($(el).text().trim());
  });

  return {
    title,
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
    if (['novelfull', 'ranobes', 'wuxiaworld', 'royalroad', 'scribblehub'].includes(providerKey)) {
      if (action === 'search') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        let results;
        if (providerKey === 'royalroad') {
          results = await scrapeRoyalRoadSearch(query);
        } else if (providerKey === 'scribblehub') {
          results = await scrapeScribbleHubSearch(query);
        } else {
          results = await scrapeWuxiaWorldSearch(query);
        }
        return res.status(200).json(results);
      }

      if (action === 'info') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        let data;
        if (providerKey === 'royalroad') {
          data = await scrapeRoyalRoadInfo(id);
        } else if (providerKey === 'scribblehub') {
          data = await scrapeScribbleHubInfo(id);
        } else {
          data = await scrapeWuxiaWorldInfo(id);
        }
        return res.status(200).json(data);
      }

      if (action === 'pages') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        let data;
        if (providerKey === 'royalroad') {
          data = await scrapeRoyalRoadChapter(id);
        } else if (providerKey === 'scribblehub') {
          data = await scrapeScribbleHubChapter(id);
        } else {
          data = await scrapeWuxiaWorldChapter(id);
        }
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

