import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANGA } from '@consumet/extensions';
import * as cheerio from 'cheerio';

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
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function scrapeNovelFullSearch(query: string) {
  const url = `${NOVELFULL_BASE}/search?keyword=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`NovelFull fetch failed: ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('div.list-novel div.row').each((_, el) => {
    const titleEl = $(el).find('h3.novel-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';
    const id = href.replace(/^\//, '').replace(/\.html$/, '');

    let img = $(el).find('div.novel-img img').attr('src') || '';
    if (img && !img.startsWith('http')) {
      img = `${NOVELFULL_BASE}${img}`;
    }

    const author = $(el).find('span.author').text().trim();

    if (id && title) {
      results.push({ id, title, image: img, author });
    }
  });

  return results;
}

async function scrapeNovelFullInfo(novelId: string) {
  const url = `${NOVELFULL_BASE}/${novelId}.html`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`NovelFull info fetch failed: ${res.statusText}`);
  const html = await res.text();
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
    const chaptersRes = await fetch(chaptersUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (chaptersRes.ok) {
      const chaptersHtml = await chaptersRes.text();
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
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`NovelFull chapter fetch failed: ${res.statusText}`);
  const html = await res.text();
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

