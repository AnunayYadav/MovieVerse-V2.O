import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, query, id } = req.query;

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action parameter is required and must be a string' });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://novelbin.me'
    };

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
      
      const searchUrl = `https://novelbin.me/search?keyword=${encodeURIComponent(query)}`;
      const fetchRes = await fetch(searchUrl, { headers });
      if (!fetchRes.ok) throw new Error(`Failed to fetch search results from NovelBin: ${fetchRes.statusText}`);
      
      const html = await fetchRes.text();
      const $ = cheerio.load(html);
      const results: any[] = [];
      
      $('h3.novel-title').each((_, el) => {
        const parent = $(el).closest('.row');
        const titleEl = $(el).find('a');
        const title = titleEl.text().trim() || $(el).text().trim();
        const href = titleEl.attr('href') || '';
        
        // Extract novel id from href e.g. "https://novelbin.me/novel-book/solo-leveling" -> "solo-leveling"
        let novelId = href;
        if (href.includes('/novel-book/')) {
          novelId = href.split('/novel-book/')[1].split('/')[0];
        }
        
        const img = parent.find('img').attr('src') || parent.find('img').attr('data-src') || '';
        
        if (title && novelId) {
          results.push({
            id: novelId,
            title,
            image: img,
            url: href
          });
        }
      });
      
      return res.status(200).json(results);
    }

    if (action === 'info') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }

      // Fetch the main novel page to get metadata and description
      const infoUrl = `https://novelbin.me/novel-book/${encodeURIComponent(id)}`;
      const fetchRes = await fetch(infoUrl, { headers });
      if (!fetchRes.ok) throw new Error(`Failed to fetch novel details from NovelBin: ${fetchRes.statusText}`);
      
      const html = await fetchRes.text();
      const $ = cheerio.load(html);
      
      const title = $('h3.title').text().trim() || $('title').text().replace('Novel - Read Online For Free - Novel Bin', '').trim();
      const image = $('.books img').attr('src') || $('.books img').attr('data-src') || '';
      
      // Clean description
      const description = $('.desc').text().trim() || '';
      
      // Retrieve chapters using the archive AJAX endpoint
      const archiveUrl = `https://novelbin.me/ajax/chapter-archive?novelId=${encodeURIComponent(id)}`;
      const archiveRes = await fetch(archiveUrl, { headers });
      if (!archiveRes.ok) throw new Error(`Failed to fetch chapters archive: ${archiveRes.statusText}`);
      
      const archiveHtml = await archiveRes.text();
      const $archive = cheerio.load(archiveHtml);
      
      const chapters: any[] = [];
      $archive('a').each((_, el) => {
        const chapterTitle = $archive(el).find('.nchr-text').text().trim() || $archive(el).attr('title') || $archive(el).text().trim();
        const href = $archive(el).attr('href') || '';
        
        // Extract relative ID from href, e.g. "https://novelbin.me/novel-book/solo-leveling/chapter-1" -> "solo-leveling/chapter-1"
        let chapterId = href;
        if (href.includes('/novel-book/')) {
          chapterId = href.split('/novel-book/')[1];
        }
        
        if (chapterTitle && chapterId) {
          chapters.push({
            id: chapterId,
            title: chapterTitle,
            url: href
          });
        }
      });

      return res.status(200).json({
        id,
        title,
        image,
        description,
        chapters
      });
    }

    if (action === 'chapter') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }

      // ID is e.g. "solo-leveling/chapter-1"
      const chapterUrl = `https://novelbin.me/novel-book/${id}`;
      const fetchRes = await fetch(chapterUrl, { headers });
      if (!fetchRes.ok) throw new Error(`Failed to fetch chapter content from NovelBin: ${fetchRes.statusText}`);
      
      const html = await fetchRes.text();
      const $ = cheerio.load(html);
      
      const title = $('.chr-title').text().trim() || $('title').text().trim();
      const contentEl = $('#chr-content').length > 0 ? $('#chr-content') : ($('#chapter-content').length > 0 ? $('#chapter-content') : $('.chr-c'));
      
      if (contentEl.length === 0) {
        throw new Error('Chapter content container not found');
      }

      // Remove ads, script elements, styles, etc.
      contentEl.find('script, style, iframe, ads, .ads, .adsbygoogle').remove();
      
      // Extract paragraphs
      const paragraphs: string[] = [];
      contentEl.find('p').each((_, el) => {
        const pText = $(el).text().trim();
        // Skip ads or empty paragraphs
        if (pText && !pText.includes('novelbin') && !pText.includes('Read Web Novels') && !pText.includes('adsbygoogle')) {
          paragraphs.push(pText);
        }
      });

      // Fallback to text lines if <p> tags are not used
      if (paragraphs.length === 0) {
        const rawText = contentEl.text();
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        paragraphs.push(...lines);
      }

      return res.status(200).json({
        id,
        title,
        paragraphs
      });
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Novel API error [action=${action}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
