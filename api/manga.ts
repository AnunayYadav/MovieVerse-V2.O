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

const RANOBES_BASE = 'https://ranobes.net';
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

async function scrapeRanobesSearch(query: string) {
  const url = `${RANOBES_BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('article.story').each((_, el) => {
    const titleEl = $(el).find('h2.title a').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';
    const id = href.replace(/^https?:\/\/ranobes\.net\/novels\//, '').replace(/\.html$/, '');

    const styleAttr = $(el).find('.cover').attr('style') || '';
    const imgMatch = styleAttr.match(/url\(['"]?([^'")]+)['"]?\)/);
    let image = imgMatch ? imgMatch[1] : '';
    if (image && !image.startsWith('http')) {
      image = `${RANOBES_BASE}${image}`;
    }

    const description = $(el).find('.cont-in > div[style*="color:"]').text().trim() || $(el).find('.cont-in').text().trim();

    if (id && title) {
      results.push({
        id,
        title,
        image,
        author: '',
        description
      });
    }
  });

  return results;
}

async function scrapeRanobesInfo(novelId: string) {
  const url = `${RANOBES_BASE}/novels/${novelId}.html`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('h1.title').text().trim() || $('.desc .title').text().trim() || $('title').text().trim();
  
  let image = $('.poster img, div.book img, figure.cover img, a.highslide img').first().attr('src') || '';
  if (image && !image.startsWith('http')) {
    image = `${RANOBES_BASE}${image}`;
  }

  const description = $('.moreless__full').text().trim() || $('.moreless__short').text().trim() || '';
  
  const genres: string[] = [];
  $('a[href*="/genre/"]').each((_, el) => {
    genres.push($(el).text().trim());
  });

  const author = $('a[href*="/authors/"]').first().text().trim() || $('a[href*="/author/"]').first().text().trim() || '';

  const chaptersLink = $('a[href*="/chapters/"]').attr('href') || '';
  const bookIdMatch = chaptersLink.match(/\/chapters\/(\d+)/);
  const bookId = bookIdMatch ? bookIdMatch[1] : '';

  const chapters: any[] = [];
  if (bookId) {
    const page1Url = `${RANOBES_BASE}/chapters/${bookId}/`;
    const page1Html = await novelFetch(page1Url).catch(() => '');
    if (page1Html) {
      const match = page1Html.match(/window\.__DATA__\s*=\s*({[\s\S]*?})(?:\s*;|\s*<\/script>)/);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          const pagesCount = json.pages_count || 1;
          const rawChapters = json.chapters || [];
          
          const allChaptersMap = new Map<string, any>();
          
          const mapChapter = (ch: any) => {
            const linkPath = ch.link.replace(/^https?:\/\/ranobes\.net\//, '').replace(/\.html$/, '');
            const idMatch = ch.link.match(/\/(\d+)\.html/);
            return {
              id: linkPath,
              title: ch.title,
              url: ch.link,
              numericId: idMatch ? parseInt(idMatch[1]) : 0
            };
          };

          rawChapters.forEach((ch: any) => {
            const item = mapChapter(ch);
            allChaptersMap.set(item.id, item);
          });

          // Fetch pages concurrently: pages 2, 3 (latest) and pagesCount, pagesCount-1 (oldest)
          const pagesToFetch: number[] = [];
          for (let p = 2; p <= Math.min(3, pagesCount); p++) {
            pagesToFetch.push(p);
          }
          for (let p = pagesCount; p > Math.min(3, pagesCount) && p >= pagesCount - 1; p--) {
            if (!pagesToFetch.includes(p)) {
              pagesToFetch.push(p);
            }
          }

          if (pagesToFetch.length > 0) {
            const promises = pagesToFetch.map(p =>
              novelFetch(`${RANOBES_BASE}/chapters/${bookId}/page/${p}/`)
                .then(chHtml => {
                  const m = chHtml.match(/window\.__DATA__\s*=\s*({[\s\S]*?})(?:\s*;|\s*<\/script>)/);
                  if (m) {
                    const j = JSON.parse(m[1]);
                    return j.chapters || [];
                  }
                  return [];
                })
                .catch(() => [])
            );
            const results = await Promise.all(promises);
            results.forEach(rawChs => {
              rawChs.forEach((ch: any) => {
                const item = mapChapter(ch);
                allChaptersMap.set(item.id, item);
              });
            });
          }

          const sorted = Array.from(allChaptersMap.values());
          sorted.sort((a, b) => a.numericId - b.numericId);
          
          sorted.forEach(item => {
            chapters.push({
              id: item.id,
              title: item.title,
              url: item.url
            });
          });
        } catch (e) {
          console.error('Error parsing ranobes chapters json:', e);
        }
      }
    }
  }

  // Fallback: If chapters list is empty, scrape chapter-item links from info page
  if (chapters.length === 0) {
    $('a.chapter-item').each((_, el) => {
      const href = $(el).attr('href') || '';
      const cTitle = $(el).text().trim() || $(el).find('.title').text().trim();
      const linkPath = href.replace(/^https?:\/\/ranobes\.net\//, '').replace(/\.html$/, '');
      const idMatch = href.match(/\/(\d+)\.html/);
      if (linkPath && cTitle) {
        chapters.push({
          id: linkPath,
          title: cTitle,
          url: href,
          numericId: idMatch ? parseInt(idMatch[1]) : 0
        });
      }
    });
    chapters.sort((a, b) => a.numericId - b.numericId);
  }

  return {
    id: novelId,
    title,
    image,
    author,
    description,
    genres,
    rating: null,
    chapters: chapters.map(({ id, title, url }) => ({ id, title, url }))
  };
}

async function scrapeRanobesChapter(chapterId: string) {
  const url = `${RANOBES_BASE}/${chapterId}.html`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.story .title, h1.title, .chapter-title').first().text().trim() || $('title').text().trim();
  const container = $('#arrticle');
  
  container.find('script, iframe, style, .ads, .ads-holder, .social-share, .adsbygoogle, div[style*="display:none"]').remove();

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
      !lower.includes('ranobes.net') &&
      !lower.includes('ranobes') &&
      !lower.includes('report chapter') &&
      !lower.includes('broken links') &&
      !lower.includes('update faster') &&
      !lower.includes('if you find any errors') &&
      !lower.includes('translator:') &&
      !lower.includes('editor:')
    );
  });

  const nextHref = $('#next').attr('href') || '';
  const prevHref = $('#prev').attr('href') || '';

  const nextChapterId = nextHref.replace(/^https?:\/\/ranobes\.net\//, '').replace(/\.html$/, '');
  const prevChapterId = prevHref.replace(/^https?:\/\/ranobes\.net\//, '').replace(/\.html$/, '');

  return {
    title,
    paragraphs,
    nextChapterId: nextChapterId || null,
    prevChapterId: prevChapterId || null
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
    if (providerKey === 'novelfull' || providerKey === 'ranobes') {
      if (action === 'search') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        const results = await scrapeRanobesSearch(query);
        return res.status(200).json(results);
      }

      if (action === 'info') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeRanobesInfo(id);
        return res.status(200).json(data);
      }

      if (action === 'pages') {
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID parameter is required' });
        }
        const data = await scrapeRanobesChapter(id);
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
      const refererUrl = req.query.referer || (['novelfull', 'ranobes'].includes(providerKey) ? RANOBES_BASE : provider.baseUrl);
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

