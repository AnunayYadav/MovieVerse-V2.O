import type { VercelRequest, VercelResponse } from '@vercel/node';
import { load } from 'cheerio';

const parsePostInfo = (post: string) => {
  let year = '';
  let size = '';
  let description = '';
  let sizeDone = false;
  for (let i = 0; i < post.length; i++) {
    if (i + 5 < post.length &&
      post[i] === 'Y' &&
      post[i + 1] === 'e' &&
      post[i + 2] === 'a' &&
      post[i + 3] === 'r' &&
      post[i + 4] === ' ' &&
      post[i + 5] === ':') {
      year = post[i + 7] + post[i + 8] + post[i + 9] + post[i + 10];
      i += 9;
    }
    else if (i + 5 < post.length &&
      post[i] === 'S' &&
      post[i + 1] === 'i' &&
      post[i + 2] === 'z' &&
      post[i + 3] === 'e' &&
      post[i + 4] === ' ' &&
      post[i + 5] === ':') {
      let j = i + 7;
      const temp = j;
      for (; j < temp + 4; j++) {
        if (!isNaN(Number(post[j]))) {
          size += post[j];
        }
        else {
          break;
        }
      }
      size += post[j] + post[j + 1];
      i += j - i;
      i += 2;
      sizeDone = true;
    }
    if (sizeDone) {
      description += post[i];
    }
  }
  description = description.substring(0, Math.max(0, description.length - 12));
  return { year, size, description };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, query, page, url } = req.query;
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const searchQuery = query ? (query as string) : '';

  try {
    // 1. Fetch detailed mirrors for a specific comic on-demand (Fast, 1-page fetch)
    if (action === 'info') {
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required for info action' });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch comic details: ${response.statusText}`);
      
      const html = await response.text();
      const $ = load(html);

      const download = $('.aio-red[title="Download Now"]').attr('href') || $('.aio-red[title*="Download"]').attr('href') || '';
      const readOnline = $('.aio-red[title="Read Online"]').attr('href') || '';
      const ufile = $('.aio-blue').attr('href') || '';
      const mega = $('.aio-purple').attr('href') || '';
      const mediafire = $('.aio-orange').attr('href') || '';
      const zippyshare = $('.aio-gray').attr('href') || '';

      return res.status(200).json({
        download,
        readOnline,
        ufile,
        mega,
        mediafire,
        zippyshare
      });
    }

    // 2. Search/browse action (Extremely fast, no nested scrapes)
    const getComicsUrl = searchQuery
      ? `https://getcomics.org/page/${pageNum}/?s=${encodeURIComponent(searchQuery)}`
      : `https://getcomics.org/page/${pageNum}/`;

    const response = await fetch(getComicsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`GetComics request failed: ${response.statusText}`);

    const html = await response.text();
    const $ = load(html);

    const hasNextPage = $('a.pagination-older').length > 0 || $('a.next').length > 0 || $('.pagination-next').length > 0;
    const containers: any[] = [];

    $('article').each((_, el) => {
      const postText = $(el).find('div.post-info').text() || $(el).text() || '';
      const vals = parsePostInfo(postText);
      
      const title = $(el).find('h1.post-title').text() || $(el).find('div.post-info h1').text() || '';
      const image = $(el).find('div.post-header-image img').attr('src') || $(el).find('img').attr('src') || '';
      const excerpt = $(el).find('p.post-excerpt').text() || '';
      const link = $(el).find('div.post-header-image a').attr('href') || $(el).find('a').attr('href') || '';

      if (title) {
        containers.push({
          title: title.trim(),
          image,
          excerpt: excerpt.trim(),
          year: vals.year,
          size: vals.size,
          description: vals.description ? vals.description.trim() : '',
          link
        });
      }
    });

    return res.status(200).json({
      containers,
      hasNextPage
    });

  } catch (error: any) {
    console.error(`Comics API error:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
