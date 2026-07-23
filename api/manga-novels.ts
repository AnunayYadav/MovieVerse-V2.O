import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANGA } from '@consumet/extensions';
import * as cheerio from 'cheerio';
import { spawnSync } from 'child_process';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

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

async function scrapeGigaViewerSearch(query: string, host: string = 'shonenjumpplus.com') {
  const url = `https://${host}/search?q=${encodeURIComponent(query)}`;
  const html = await novelFetch(url);
  const $ = cheerio.load(html);
  
  const results: any[] = [];
  $('.search-series-list li').each((_, el) => {
    const title = $(el).find('.series-title').text().trim();
    const author = $(el).find('.author').text().trim();
    const thumbnail = $(el).find('.thmb-container img').attr('src') || '';
    const firstEpisodeUrl = $(el).find('.thmb-container a').attr('href') || '';
    
    if (firstEpisodeUrl) {
      results.push({
        id: firstEpisodeUrl,
        title,
        image: thumbnail,
        author,
        description: `Source: ${host}`
      });
    }
  });
  return results;
}

async function scrapeGigaViewerInfo(episodeUrl: string) {
  const html = await novelFetch(episodeUrl);
  const $ = cheerio.load(html);
  
  const script = $('#episode-json');
  if (script.length === 0) {
    throw new Error('Could not find episode details');
  }
  const data = JSON.parse(script.attr('data-value') || '{}');
  const readable = data.readableProduct || {};
  
  const seriesId = readable.series?.id;
  const seriesTitle = readable.series?.title || readable.title || 'Manga';
  const coverUrl = readable.series?.thumbnailUri || '';
  const parsedUrl = new URL(episodeUrl);
  const host = parsedUrl.host;
  
  if (!seriesId) {
    return {
      id: episodeUrl,
      title: seriesTitle,
      image: coverUrl,
      author: 'GigaViewer',
      description: readable.title || '',
      chapters: [
        {
          id: episodeUrl,
          attributes: {
            title: readable.title || 'Chapter',
            chapter: 'Oneshot',
            publishAt: readable.publishedAt || new Date().toISOString()
          }
        }
      ]
    };
  }

  const rssUrl = `https://${host}/rss/series/${seriesId}`;
  let xml = '';
  try {
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    if (rssRes.ok) {
      xml = await rssRes.text();
    }
  } catch (err) {
    console.warn(`Failed to fetch GigaViewer RSS from ${rssUrl}:`, err);
  }

  if (!xml) {
    return {
      id: episodeUrl,
      title: seriesTitle,
      image: coverUrl,
      author: 'GigaViewer',
      description: readable.title || '',
      chapters: [
        {
          id: episodeUrl,
          attributes: {
            title: readable.title || 'Chapter',
            chapter: 'Oneshot',
            publishAt: readable.publishedAt || new Date().toISOString()
          }
        }
      ]
    };
  }

  const rss$ = cheerio.load(xml, { xmlMode: true });
  const title = rss$('channel > title').text().replace(/少年ジャンプ＋（|となジャン（|くらげバンチ（|コミックデイズ（|）/g, '').trim() || seriesTitle;
  const description = rss$('channel > description').text().trim() || '';
  
  const chapters: any[] = [];
  rss$('item').each((_, el) => {
    const itemTitle = rss$(el).find('title').text().trim();
    const itemLink = rss$(el).find('link').text().trim();
    const pubDate = rss$(el).find('pubDate').text().trim();
    
    const match = itemTitle.match(/\[(\d+(?:\.\d+)?)話\]/);
    const chapterNum = match ? match[1] : '';
    
    chapters.push({
      id: itemLink,
      attributes: {
        title: itemTitle,
        chapter: chapterNum || itemTitle,
        publishAt: new Date(pubDate).toISOString()
      }
    });
  });

  return {
    id: episodeUrl,
    title,
    image: coverUrl,
    author: 'GigaViewer',
    description,
    chapters: chapters.reverse()
  };
}

async function scrapeGigaViewerPages(episodeUrl: string) {
  const html = await novelFetch(episodeUrl);
  const $ = cheerio.load(html);
  
  const script = $('#episode-json');
  if (script.length === 0) {
    throw new Error('Could not find episode details');
  }
  const data = JSON.parse(script.attr('data-value') || '{}');
  const readable = data.readableProduct || {};
  
  const pages = (readable.pageStructure?.pages || [])
    .filter((p: any) => p.src)
    .map((p: any) => ({
      src: p.src,
      width: p.width,
      height: p.height
    }));
    
  return pages;
}

async function resolveBestGigaViewerHost(query: string) {
  const hosts = [
    'shonenjumpplus.com',
    'comic-days.com',
    'tonarinoyj.jp',
    'www.sunday-webry.com',
    'kuragebunch.com'
  ];
  
  const searchPromises = hosts.map(async (host) => {
    try {
      const results = await scrapeGigaViewerSearch(query, host);
      if (results && results.length > 0) {
        const info = await scrapeGigaViewerInfo(results[0].id);
        return {
          host,
          url: results[0].id,
          chapterCount: info.chapters?.length || 0,
          info
        };
      }
    } catch (e) {
      // Ignore errors for individual hosts to allow others to complete
    }
    return null;
  });
  
  const resolved = await Promise.all(searchPromises);
  const valid = resolved.filter((r): r is NonNullable<typeof r> => r !== null && r.chapterCount > 0);
  
  if (valid.length === 0) {
    return null;
  }
  
  // Sort by chapter count descending to get the host with the most chapters
  valid.sort((a, b) => b.chapterCount - a.chapterCount);
  
  return {
    url: valid[0].url,
    host: valid[0].host,
    chapters: valid[0].info.chapters,
    title: valid[0].info.title,
    image: valid[0].info.image,
    description: valid[0].info.description
  };
}

async function kadocomiFetch(url: string, options: any = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proxyUrl = process.env.JAPAN_PROXY;
    const parsedUrl = new URL(url);
    
    const headers = {
      'User-Agent': USER_AGENT,
      'Referer': 'https://comic-walker.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      ...(options.headers || {})
    };
    
    const requestOptions: any = {
      method: options.method || 'GET',
      headers: headers,
      timeout: 15000,
    };
    
    if (proxyUrl) {
      requestOptions.agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const req = https.request(url, requestOptions, (res) => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          const absoluteRedirect = redirectUrl.startsWith('http') 
            ? redirectUrl 
            : `https://${parsedUrl.host}${redirectUrl}`;
          resolve(kadocomiFetch(absoluteRedirect, options));
          return;
        }
      }
      
      const chunks: any[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('utf8'));
      });
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function kadocomiFetchBuffer(url: string, options: any = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proxyUrl = process.env.JAPAN_PROXY;
    const parsedUrl = new URL(url);
    
    const headers = {
      'User-Agent': USER_AGENT,
      'Referer': 'https://comic-walker.com/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      ...(options.headers || {})
    };
    
    const requestOptions: any = {
      method: options.method || 'GET',
      headers: headers,
      timeout: 15000,
    };
    
    if (proxyUrl) {
      requestOptions.agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const req = https.request(url, requestOptions, (res) => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          const absoluteRedirect = redirectUrl.startsWith('http') 
            ? redirectUrl 
            : `https://${parsedUrl.host}${redirectUrl}`;
          resolve(kadocomiFetchBuffer(absoluteRedirect, options));
          return;
        }
      }
      
      const chunks: any[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function scrapeKadoComiSearch(query: string) {
  const url = `https://comic-walker.com/api/search/keywords?keywords=${encodeURIComponent(query)}&limit=20&offset=0&sortBy=popularity`;
  const raw = await kadocomiFetch(url);
  const data = JSON.parse(raw);
  
  const results: any[] = [];
  const list = data.result || [];
  for (const item of list) {
    if (item.code) {
      results.push({
        id: `https://comic-walker.com/contents/detail/${item.code}`,
        title: item.title,
        image: item.bookCover || item.thumbnail || '',
        author: item.authors?.map((a: any) => a.name).join(', ') || '',
        description: item.summary || 'KadoComi series'
      });
    }
  }
  return results;
}

async function scrapeKadoComiInfo(urlOrCode: string) {
  const code = urlOrCode.includes('/') ? urlOrCode.substring(urlOrCode.lastIndexOf('/') + 1) : urlOrCode;
  const apiUrl = `https://comic-walker.com/api/contents/details/work?workCode=${code}`;
  
  const raw = await kadocomiFetch(apiUrl);
  const data = JSON.parse(raw);
  
  const work = data.work || {};
  const episodesResult = data.latestEpisodes?.result || [];
  
  const chapters = episodesResult.map((ep: any) => {
    return {
      id: ep.id,
      title: ep.title,
      chapter: ep.internal?.episodeNo?.toString() || '1',
      releaseDate: ep.updateDate,
      code: ep.code
    };
  });
  
  return {
    title: work.title || '',
    image: work.bookCover || work.thumbnail || '',
    description: work.summary || '',
    chapters
  };
}

async function scrapeKadoComiPages(episodeId: string) {
  const url = `https://comic-walker.com/api/contents/viewer?episodeId=${episodeId}&imageSizeType=width%3A1284`;
  const raw = await kadocomiFetch(url);
  const data = JSON.parse(raw);
  
  const manuscripts = data.manuscripts || [];
  const pages = manuscripts.map((m: any) => {
    const proxyUrl = `/api/manga?action=proxy-kadocomi-image&url=${encodeURIComponent(m.drmImageUrl)}&hash=${m.drmHash}`;
    return {
      src: proxyUrl,
      width: 800,
      height: 1200
    };
  });
  
  return pages;
}

async function proxyKadoComiImage(imageUrl: string, hashHex: string, res: VercelResponse) {
  try {
    const encrypted = await kadocomiFetchBuffer(imageUrl);
    const hash = Buffer.from(hashHex, 'hex');
    
    const decrypted = Buffer.alloc(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ hash[i % hash.length];
    }
    
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(decrypted);
  } catch (err: any) {
    console.error("proxyKadoComiImage error:", err.message);
    return res.status(500).json({ error: err.message || 'Image proxy failed' });
  }
}

async function scrapeWelomaSearch(query: string) {
  const url = `https://weloma.art/manga-list.html?name=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`WeLoMa search failed with status ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results: any[] = [];
  $('.thumb-item-flow').each((_, el) => {
    const titleLink = $(el).find('.series-title a');
    const title = titleLink.attr('title') || titleLink.text().trim() || '';
    const href = titleLink.attr('href') || '';
    const id = href.replace(/\//g, '').trim(); // e.g. "/234/" -> "234"
    
    // Extract thumbnail from style attribute
    const thumbWrapper = $(el).find('.content.img-in-ratio');
    const styleAttr = thumbWrapper.attr('style') || '';
    const bgUrlMatch = styleAttr.match(/url\(['"]?(.*?)['"]?\)/);
    const image = bgUrlMatch ? bgUrlMatch[1] : '';

    if (id && title) {
      results.push({
        id,
        title,
        image,
        author: '',
        description: 'WeLoMa series'
      });
    }
  });

  return results;
}

async function scrapeWelomaInfo(seriesId: string) {
  const url = `https://weloma.art/${seriesId}/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`WeLoMa info failed with status ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('h1, .series-name, .manga-title').first().text().trim() || 'WeLoMa Manga';
  const description = $('.manga-summary, .description, .summary, .detail-content').first().text().trim() || '';
  
  // Find cover image
  const imgWrapper = $('.manga-info-pic img, .manga-image img, .cover img, img').first();
  const image = imgWrapper.attr('src') || imgWrapper.attr('data-src') || '';

  const chapters: any[] = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    // Links are like "/234/243522/"
    const match = href.match(new RegExp(`^\\/${seriesId}\\/(\\d+)\\/$`));
    if (match) {
      const chapterId = match[1];
      
      // Parse chapter number
      let chapterNum = '1';
      const numMatch = text.match(/Chapter\s*(\d+(\.\d+)?)/i) || text.match(/Chap\s*(\d+(\.\d+)?)/i) || text.match(/(\d+(\.\d+)?)/);
      if (numMatch) {
        chapterNum = numMatch[1];
      }
      
      // Parse publish/update date
      const dateText = text.replace(/Chapter\s*\d+/i, '').replace(/Chap\s*\d+/i, '').replace(/[\r\n\t]+/g, ' ').trim();
      
      chapters.push({
        id: `${seriesId}/${chapterId}`, // Store path so pages scraper can fetch it directly
        title: text.split('\n')[0].trim(),
        chapter: chapterNum,
        releaseDate: dateText || 'Recent'
      });
    }
  });

  // Remove duplicates and sort by chapter ascending
  const uniqueChaptersMap = new Map<string, any>();
  for (const ch of chapters) {
    uniqueChaptersMap.set(ch.id, ch);
  }
  const sortedChapters = Array.from(uniqueChaptersMap.values()).reverse(); // Typically listed newest first, so reverse to make it oldest first

  return {
    title,
    image,
    description,
    chapters: sortedChapters
  };
}

async function scrapeWelomaPages(chapterPath: string) {
  const url = `https://weloma.art/${chapterPath}/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`WeLoMa pages failed with status ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const pages: any[] = [];
  $('img').each((_, el) => {
    const dataImg = $(el).attr('data-img');
    if (dataImg) {
      try {
        const decodedUrl = Buffer.from(dataImg, 'base64').toString('utf8');
        if (decodedUrl.startsWith('http')) {
          pages.push({
            src: `/api/manga?action=proxy-weloma-image&url=${encodeURIComponent(decodedUrl)}`,
            width: 800,
            height: 1200
          });
        }
      } catch (e) {}
    }
  });

  return pages;
}

async function proxyWelomaImage(imageUrl: string, res: VercelResponse) {
  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://weloma.art/'
      }
    });
    if (!imgRes.ok) throw new Error(`CDN returned status ${imgRes.status}`);
    const buffer = await imgRes.arrayBuffer();
    
    res.setHeader('Content-Type', imgRes.headers.get('Content-Type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err: any) {
    console.error("proxyWelomaImage error:", err.message);
    return res.status(500).json({ error: err.message || 'Image proxy failed' });
  }
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

const GENERIC_BASE_MAP: Record<string, string> = {
  novelfull: 'https://novelfull.com',
  freewebnovel: 'https://freewebnovel.com',
  novelbin: 'https://novelbin.me',
  novelsonline: 'https://novelsonline.net'
};

async function scrapeGenericNovelSearch(query: string, providerKey: string) {
  const baseUrl = GENERIC_BASE_MAP[providerKey] || 'https://freewebnovel.com';
  const url = `${baseUrl}/search?keyword=${encodeURIComponent(query)}`;
  try {
    const html = await novelFetch(url);
    const $ = cheerio.load(html);
    const results: any[] = [];

    $('.list-novel .row, .col-novel-main .row, .search-novel .row, .novel-item').each((_, el) => {
      const a = $(el).find('h3.novel-title a, .novel-title a').first();
      const href = a.attr('href') || '';
      const title = a.text().trim();
      const img = $(el).find('img').attr('src') || '';
      const author = $(el).find('.author, .author-link').text().trim() || 'Novel Author';

      if (title && href) {
        const id = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '').replace(/\/$/, '');
        results.push({
          id,
          title,
          image: img.startsWith('http') ? img : `${baseUrl}${img}`,
          author,
          description: `Provider: ${providerKey}`
        });
      }
    });

    if (results.length > 0) return results;
  } catch (err: any) {
    console.warn(`scrapeGenericNovelSearch failed for ${providerKey}:`, err.message);
  }

  return await scrapeWuxiaWorldSearch(query);
}

async function scrapeGenericNovelInfo(novelId: string, providerKey: string) {
  const baseUrl = GENERIC_BASE_MAP[providerKey] || 'https://freewebnovel.com';
  const url = `${baseUrl}/${novelId}`;
  try {
    const html = await novelFetch(url);
    const $ = cheerio.load(html);

    const title = $('h3.title, .novel-title, h1').first().text().trim() || novelId;
    const author = $('.author a, .info-author a').first().text().trim() || 'Unknown';
    const description = $('.desc-text, .summary, .description').text().trim() || '';
    const image = $('.book img, .cover img').attr('src') || '';

    const chapters: any[] = [];
    $('ul.list-chapter li a, .chapter-list a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const cTitle = $(el).text().trim();
      const cleanId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
      if (cleanId) {
        chapters.push({
          id: cleanId,
          title: cTitle || 'Chapter',
          url: href.startsWith('http') ? href : `${baseUrl}/${cleanId}`
        });
      }
    });

    if (chapters.length > 0) {
      return {
        id: novelId,
        title,
        image: image.startsWith('http') ? image : `${baseUrl}${image}`,
        author,
        description,
        chapters
      };
    }
  } catch (err: any) {
    console.warn(`scrapeGenericNovelInfo failed for ${providerKey}:`, err.message);
  }

  return await scrapeWuxiaWorldInfo(novelId);
}

async function scrapeGenericNovelChapter(chapterId: string, providerKey: string) {
  const baseUrl = GENERIC_BASE_MAP[providerKey] || 'https://freewebnovel.com';
  const url = `${baseUrl}/${chapterId}`;
  try {
    const html = await novelFetch(url);
    const $ = cheerio.load(html);

    const title = $('.chapter-title, h2, h1').first().text().trim() || 'Chapter';
    const paragraphs: string[] = [];

    $('#chr-content p, #chapter-content p, .chapter-c p, .content p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      return {
        title,
        paragraphs,
        nextChapterId: null,
        prevChapterId: null
      };
    }
  } catch (err: any) {
    console.warn(`scrapeGenericNovelChapter failed for ${providerKey}:`, err.message);
  }

  return await scrapeWuxiaWorldChapter(chapterId);
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

  const { path, service, action, query, id, provider: providerQuery } = req.query;

  // 1. MangaDex / DramaList Direct proxy logic (routed from /api/mangadex or /api/drama)
  if (path && typeof path === 'string') {
    const isDrama = service === 'drama';
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path' || key === 'service' || key === 'provider') continue;
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else if (value) {
        searchParams.append(key, value);
      }
    }

    const targetBase = isDrama ? 'https://my-drama-list-api-ten.vercel.app/api' : 'https://api.mangadex.org';
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (isDrama && cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.substring(4);
    }
    const targetUrl = `${targetBase}${cleanPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    try {
      const headers: Record<string, string> = {};
      if (!isDrama) {
        headers['User-Agent'] = 'MovieVerse/2.0 (contact@movieverse.app)';
      }

      const response = await fetch(targetUrl, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `API error (${isDrama ? 'Drama' : 'MangaDex'}): ${errorText}` });
      }
      
      const data = await response.json();
      const cacheAge = isDrama ? 1800 : 300;
      const revalidateAge = isDrama ? 600 : 120;
      res.setHeader('Cache-Control', `s-maxage=${cacheAge}, stale-while-revalidate=${revalidateAge}`);
      
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action parameter is required and must be a string' });
  }

  const providerKey = typeof providerQuery === 'string' ? providerQuery.toLowerCase() : 'mangapill';

  try {
    if (['novelfull', 'freewebnovel', 'novelbin', 'novelsonline', 'ranobes', 'wuxiaworld', 'royalroad', 'scribblehub', 'lightnovelworld', 'allnovel', 'gigaviewer', 'kadocomi', 'weloma'].includes(providerKey)) {
      if (action === 'resolve-best-gigaviewer') {
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Query parameter is required' });
        }
        const data = await resolveBestGigaViewerHost(query);
        return res.status(200).json(data);
      }

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
        } else if (['novelfull', 'freewebnovel', 'novelbin', 'novelsonline'].includes(providerKey)) {
          results = await scrapeGenericNovelSearch(query, providerKey);
        } else if (providerKey === 'gigaviewer') {
          const host = typeof req.query.host === 'string' ? req.query.host : 'shonenjumpplus.com';
          results = await scrapeGigaViewerSearch(query, host);
        } else if (providerKey === 'kadocomi') {
          results = await scrapeKadoComiSearch(query);
        } else if (providerKey === 'weloma') {
          results = await scrapeWelomaSearch(query);
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
        } else if (['novelfull', 'freewebnovel', 'novelbin', 'novelsonline'].includes(providerKey)) {
          data = await scrapeGenericNovelInfo(id, providerKey);
        } else if (providerKey === 'gigaviewer') {
          data = await scrapeGigaViewerInfo(id);
        } else if (providerKey === 'kadocomi') {
          data = await scrapeKadoComiInfo(id);
        } else if (providerKey === 'weloma') {
          data = await scrapeWelomaInfo(id);
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
        } else if (['novelfull', 'freewebnovel', 'novelbin', 'novelsonline'].includes(providerKey)) {
          data = await scrapeGenericNovelChapter(id, providerKey);
        } else if (providerKey === 'gigaviewer') {
          data = await scrapeGigaViewerPages(id);
        } else if (providerKey === 'kadocomi') {
          data = await scrapeKadoComiPages(id);
        } else if (providerKey === 'weloma') {
          data = await scrapeWelomaPages(id);
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

    if (action === 'proxy-weloma-image') {
      const imageUrl = req.query.url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }
      return proxyWelomaImage(imageUrl, res);
    }

    if (action === 'proxy-kadocomi-image') {
      const imageUrl = req.query.url;
      const hashHex = req.query.hash;
      if (!imageUrl || typeof imageUrl !== 'string' || !hashHex || typeof hashHex !== 'string') {
        return res.status(400).json({ error: 'URL and hash parameters are required' });
      }
      return proxyKadoComiImage(imageUrl, hashHex, res);
    }

    if (action === 'proxy-gigaviewer-image') {
      const imageUrl = req.query.url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      try {
        const imgRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': new URL(imageUrl).origin
          }
        });
        if (!imgRes.ok) {
          return res.status(imgRes.status).json({ error: `CDN responded with status: ${imgRes.status}` });
        }
        const buffer = await imgRes.arrayBuffer();
        res.setHeader('Content-Type', imgRes.headers.get('Content-Type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(buffer));
      } catch (err: any) {
        console.error("GigaViewer image proxy error:", err.message);
        return res.status(500).json({ error: err.message || 'Image proxy failed' });
      }
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

      // If downloading, fetch and stream the image bytes directly from the server to bypass CORS
      if (req.query.download === 'true') {
        try {
          const fetchResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': new URL(imageUrl).origin
            }
          });
          if (!fetchResponse.ok) throw new Error(`CDN returned status ${fetchResponse.status}`);
          const buffer = await fetchResponse.arrayBuffer();
          res.setHeader('Content-Type', fetchResponse.headers.get('Content-Type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(200).send(Buffer.from(buffer));
        } catch (err: any) {
          console.error("Download proxy-image streaming error:", err.message);
        }
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

