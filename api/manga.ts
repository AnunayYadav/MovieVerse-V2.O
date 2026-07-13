import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANGA } from '@consumet/extensions';
import * as cheerio from 'cheerio';
import { spawnSync } from 'child_process';

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
const LIGHTNOVELWORLD_BASE = 'https://lightnovelworld.org';
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
    if (res.status !== 403) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
  } catch (e: any) {
    if (e?.message && !e.message.includes('403')) {
      console.warn('novelFetch: fetch error, trying curl fallback:', e.message);
    }
  }

  try {
    const res = spawnSync('curl', ['-s', '-L', '-A', USER_AGENT, url], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15000
    });
    if (res.status === 0 && res.stdout) {
      const html = res.stdout.toString();
      if (html) return html;
    }
  } catch (err: any) {
    console.warn('novelFetch spawnSync error:', err.message);
  }

  throw new Error(`Failed to fetch ${url}: all methods exhausted`);
}

function parseTitleForSort(title: string) {
  const t = title.toLowerCase();
  
  let vol: number | null = null;
  const volMatch = t.match(/(?:vol(?:ume)?|v)\.?\s*(\d+(\.\d+)?)/);
  if (volMatch) {
    vol = parseFloat(volMatch[1]);
  }
  
  let chap = 0;
  if (t.includes('prologue')) {
    chap = -1;
  } else {
    const chapMatch = t.match(/(?:ch(?:apter|ap)?|c)\.?\s*(\d+(\.\d+)?)/);
    if (chapMatch) {
      chap = parseFloat(chapMatch[1]);
    } else {
      const numbers = [...t.matchAll(/\d+(\.\d+)?/g)].map(m => parseFloat(m[0]));
      if (numbers.length > 0) {
        if (vol !== null && numbers[0] === vol) {
          if (numbers.length > 1) chap = numbers[1];
        } else {
          chap = numbers[0];
        }
      }
    }
  }
  return { vol, chap };
}

function sortChaptersByVolumeAndNumber(chapters: any[]) {
  let lastVol = 1;
  const parsed = chapters.map((ch: any, idx: number) => {
    const p = parseTitleForSort(ch.title);
    if (p.vol !== null) {
      lastVol = p.vol;
    }
    return {
      originalIndex: idx,
      data: ch,
      vol: p.vol !== null ? p.vol : lastVol,
      chap: p.chap
    };
  });

  parsed.sort((a: any, b: any) => {
    if (a.vol !== b.vol) return a.vol - b.vol;
    if (a.chap !== b.chap) return a.chap - b.chap;
    return a.originalIndex - b.originalIndex;
  });

  return parsed.map((p: any) => p.data);
}

async function scrapeAllNovelSearch(query: string) {
  const url = `https://allnovel.org/search?keyword=${encodeURIComponent(query)}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('.list-truyen .row').each((_, el) => {
    const titleEl = $(el).find('.truyen-title a');
    const href = titleEl.attr('href') || '';
    if (!href) return;
    
    const id = href.replace(/^\//, '').replace(/\.html$/, '').replace(/^https:\/\/allnovel\.org\//, '');
    const cover = $(el).find('img.cover').attr('src') || '';
    const image = cover.startsWith('/') ? `https://allnovel.org${cover}` : cover;
    const author = $(el).find('.author').text().trim().replace(/^\s*Author:\s*/i, '');
    const lastChapter = $(el).find('.text-info a').text().trim();

    results.push({
      id,
      title: titleEl.text().trim(),
      image,
      author,
      description: lastChapter ? `Latest: ${lastChapter}` : ''
    });
  });

  return results;
}

async function scrapeAllNovelInfo(novelId: string) {
  const url = `https://allnovel.org/${novelId}.html`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('h3.title').first().text().trim();
  const coverUrl = $('.info-holder .book img').attr('src') || '';
  const image = coverUrl.startsWith('/') ? `https://allnovel.org${coverUrl}` : coverUrl;
  
  let author = $('.info .author a').text().trim();
  if (!author) {
    $('.info div').each((_, el) => {
      const txt = $(el).text();
      if (txt.includes('Author:')) {
        author = txt.replace('Author:', '').trim();
      }
    });
  }

  const description = $('.desc-text').text().trim();

  const genres: string[] = [];
  $('.info div').each((_, el) => {
    const txt = $(el).text();
    if (txt.includes('Genre:')) {
      $(el).find('a').each((_, aEl) => {
        genres.push($(aEl).text().trim());
      });
    }
  });

  const ratingVal = $('#rateVal').val();
  const rating = ratingVal ? parseFloat(String(ratingVal)) : null;

  const pageChaptersMap: Record<number, any[]> = {};
  
  function parseChaptersPage(pageHtml: string, pageNum: number) {
    const page$ = cheerio.load(pageHtml);
    const pageChapters: any[] = [];
    page$('#list-chapter .list-chapter li a').each((_, el) => {
      const href = page$(el).attr('href') || '';
      const id = href.replace(/^\//, '');
      if (id) {
        pageChapters.push({
          id,
          title: page$(el).text().trim(),
          url: `https://allnovel.org/${id}`
        });
      }
    });
    pageChaptersMap[pageNum] = pageChapters;
  }

  parseChaptersPage(html, 1);

  let totalPages = 1;
  const lastPageLink = $('.pagination li.last a').attr('href');
  if (lastPageLink) {
    const match = lastPageLink.match(/page=(\d+)/);
    if (match) {
      totalPages = parseInt(match[1]);
    }
  } else {
    $('.pagination li a').each((_, el) => {
      const pageNumAttr = $(el).attr('data-page');
      if (pageNumAttr) {
        const val = parseInt(pageNumAttr) + 1;
        if (val > totalPages) totalPages = val;
      }
    });
  }

  if (totalPages > 1) {
    const remainingPages: number[] = [];
    for (let p = 2; p <= totalPages; p++) {
      remainingPages.push(p);
    }

    const BATCH_SIZE = 8;
    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (page) => {
          try {
            const pageHtml = await novelFetch(`https://allnovel.org/${novelId}.html?page=${page}`);
            parseChaptersPage(pageHtml, page);
          } catch (err: any) {
            console.error(`Error scraping AllNovel page ${page}:`, err.message);
          }
        })
      );
      if (i + BATCH_SIZE < remainingPages.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  // Combine pages in strict chronological page sequence order
  const chapters: any[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (pageChaptersMap[p]) {
      chapters.push(...pageChaptersMap[p]);
    }
  }

  return {
    id: novelId,
    title,
    image,
    author,
    description,
    genres,
    rating,
    chapters
  };
}

async function scrapeAllNovelChapter(chapterId: string) {
  const url = `https://allnovel.org/${chapterId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.chapter-title').text().trim() || $('h2').first().text().trim() || $('.title').first().text().trim() || 'Chapter';
  const paragraphs: string[] = [];

  $('#chapter-content p, .chapter-content p, #chapter-c p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  if (paragraphs.length === 0) {
    const contentHtml = $('#chapter-content, .chapter-c').html() || '';
    const lines = contentHtml.split(/<br\s*\/?>/i);
    lines.forEach(line => {
      const text = cheerio.load(line).text().trim();
      if (text) paragraphs.push(text);
    });
  }

  return {
    title,
    paragraphs,
    nextChapterId: null,
    prevChapterId: null
  };
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
  const sortedChapters = sortChaptersByVolumeAndNumber(chapters);

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
    chapters: sortedChapters.map((ch: any) => ({
      id: ch.novSlugChapSlug,
      title: ch.title,
      url: `${WUXIAWORLD_BASE}/chapter/${ch.novSlugChapSlug}`,
      date: ch.timeAdded || null
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
    try {
      const res = spawnSync('curl', ['-s', '-L', '-b', 'toc_show=9999', '-A', USER_AGENT, url], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15000
      });
      if (res.status === 0 && res.stdout) {
        html = res.stdout.toString();
      }
    } catch (err: any) {
      console.warn('ScribbleHub curl fallback error:', err.message);
    }
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

async function scrapeLightNovelWorldSearch(query: string) {
  const url = `${LIGHTNOVELWORLD_BASE}/api/search/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  const json = await res.json();
  const rawResults = json.novels || [];

  return rawResults.map((item: any) => ({
    id: item.slug,
    title: item.title,
    image: item.cover_path || '',
    author: item.author || '',
    description: `Rank: ${item.rank || 'N/A'} | Status: ${item.status || 'Ongoing'}`
  }));
}

async function scrapeLightNovelWorldInfo(novelId: string) {
  const url = `${LIGHTNOVELWORLD_BASE}/novel/${novelId}/`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('h1.novel-title').text().trim() || novelId;
  const author = $('a.author-link').first().text().trim() || 'Unknown';
  const description = $('.summary-content').text().trim() || '';
  const image = $('img.novel-cover').attr('src') || '';

  const genres: string[] = [];
  $('.genre-tags .genre-tag').each((_, el) => {
    genres.push($(el).text().trim());
  });

  const ratingText = $('.rating-number').text().trim();
  const rating = ratingText ? parseFloat(ratingText) : null;

  const pageChaptersMap: Record<number, any[]> = {};
  const firstPageHtml = await novelFetch(`${LIGHTNOVELWORLD_BASE}/novel/${novelId}/chapters/`);
  const $first = cheerio.load(firstPageHtml);

  // Extract page count
  let totalPages = 1;
  const pageOptions = $first('#pageSelect option');
  if (pageOptions.length > 0) {
    totalPages = pageOptions.length;
  } else {
    const lastPageLink = $first('.page-link[title="Last Page"]').attr('href');
    if (lastPageLink) {
      const match = lastPageLink.match(/page=(\d+)/);
      if (match) totalPages = parseInt(match[1]);
    }
  }

  function parsePage(pageHtml: string, pageNum: number) {
    const page$ = cheerio.load(pageHtml);
    const pageChapters: any[] = [];
    page$('.chapter-card').each((_, el) => {
      const onclick = page$(el).attr('onclick') || '';
      const hrefMatch = onclick.match(/location\.href='([^']+)'/);
      const href = hrefMatch ? hrefMatch[1] : '';
      const cTitle = page$(el).find('.chapter-title').text().trim();
      const cDate = page$(el).find('.chapter-time').text().trim();
      const id = href.replace(/^\//, ''); // e.g. "novel/shadow-slave/chapter/1/"
      if (id) {
        pageChapters.push({
          id,
          title: cTitle,
          url: `${LIGHTNOVELWORLD_BASE}${href}`,
          date: cDate || null
        });
      }
    });
    pageChaptersMap[pageNum] = pageChapters;
  }

  parsePage(firstPageHtml, 1);

  if (totalPages > 1) {
    const remainingPages = [];
    for (let p = 2; p <= totalPages; p++) {
      remainingPages.push(p);
    }

    const BATCH_SIZE = 8;
    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (page) => {
          try {
            const pageHtml = await novelFetch(`${LIGHTNOVELWORLD_BASE}/novel/${novelId}/chapters/?page=${page}`);
            parsePage(pageHtml, page);
          } catch (err: any) {
            console.error(`Error scraping page ${page}:`, err.message);
          }
        })
      );
      if (i + BATCH_SIZE < remainingPages.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  // Combine pages in strict page sequence order
  const chapters: any[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (pageChaptersMap[p]) {
      chapters.push(...pageChaptersMap[p]);
    }
  }

  return {
    id: novelId,
    title,
    image,
    author,
    description,
    genres,
    rating,
    chapters
  };
}

async function scrapeLightNovelWorldChapter(chapterId: string) {
  const url = `${LIGHTNOVELWORLD_BASE}/${chapterId}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);

  const title = $('.chapter-title').first().text().trim() || 'Chapter';
  const paragraphs: string[] = [];
  $('#chapterText p, .chapter-text p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      paragraphs.push(text);
    }
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
    if (['novelfull', 'ranobes', 'wuxiaworld', 'royalroad', 'scribblehub', 'lightnovelworld', 'allnovel'].includes(providerKey)) {
      if (action === 'search') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        let results;
        if (providerKey === 'royalroad') {
          results = await scrapeRoyalRoadSearch(query);
        } else if (providerKey === 'scribblehub') {
          results = await scrapeScribbleHubSearch(query);
        } else if (providerKey === 'lightnovelworld') {
          results = await scrapeLightNovelWorldSearch(query);
        } else if (providerKey === 'allnovel') {
          results = await scrapeAllNovelSearch(query);
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
        } else if (providerKey === 'lightnovelworld') {
          data = await scrapeLightNovelWorldInfo(id);
        } else if (providerKey === 'allnovel') {
          data = await scrapeAllNovelInfo(id);
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
        } else if (providerKey === 'lightnovelworld') {
          data = await scrapeLightNovelWorldChapter(id);
        } else if (providerKey === 'allnovel') {
          data = await scrapeAllNovelChapter(id);
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
      let imageUrl = req.query.url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      if (imageUrl.startsWith('/')) {
        const base = providerKey === 'lightnovelworld' ? LIGHTNOVELWORLD_BASE : (
          providerKey === 'allnovel' ? 'https://allnovel.org' : WUXIAWORLD_BASE
        );
        imageUrl = `${base}${imageUrl}`;
      }

      // Redirect browser directly to CDN to save Vercel bandwidth and CPU usage
      res.writeHead(302, { 'Location': imageUrl });
      return res.end();
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Manga/Novel API error [action=${action}, provider=${providerKey}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

