import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

async function fetchHtmlWithFallback(path: string, headers: any): Promise<{ html: string; isProxied: boolean; domainUsed: string }> {
  const domains = ['https://novelbin.com', 'https://novelbin.me'];
  let lastError: any = null;
  
  const isCloudflareChallenge = (html: string) => {
    const lower = html.toLowerCase();
    return html.includes('Just a moment...') || 
           html.includes('Attention Required!') || 
           html.includes('cf-challenge') || 
           lower.includes('id="cf-wrapper"') || 
           lower.includes('cf-browser-verification') || 
           lower.includes('cf_challenge') ||
           (lower.includes('cloudflare') && lower.includes('security'));
  };

  for (const domain of domains) {
    const targetUrl = `${domain}${path}`;
    
    // Construct request headers with the correct referer matching the active domain
    const reqHeaders = { ...headers };
    if (reqHeaders['Referer'] && typeof reqHeaders['Referer'] === 'string') {
      reqHeaders['Referer'] = reqHeaders['Referer'].replace(/https:\/\/novelbin\.(me|com|net|org)/gi, domain);
    }
    if (reqHeaders['referer'] && typeof reqHeaders['referer'] === 'string') {
      reqHeaders['referer'] = reqHeaders['referer'].replace(/https:\/\/novelbin\.(me|com|net|org)/gi, domain);
    }

    // Try 1: Direct fetch
    try {
      const res = await fetch(targetUrl, { headers: reqHeaders });
      if (res.ok) {
        const html = await res.text();
        if (!isCloudflareChallenge(html)) {
          return { html, isProxied: false, domainUsed: domain };
        }
        lastError = new Error(`Direct fetch to ${domain} hit Cloudflare security check [status=${res.status}]`);
      } else {
        lastError = new Error(`Direct fetch to ${domain} failed with status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      lastError = err;
    }
    
    console.warn(`Direct fetch to ${targetUrl} failed, trying Google Translate proxy. Error:`, lastError?.message || lastError);
    
    // Try 2: Google Translate proxy
    try {
      const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
      // Clear referer header when calling translate.google.com to avoid 403 Forbidden on translate.google.com
      const proxyHeaders = { ...reqHeaders };
      delete proxyHeaders['Referer'];
      delete proxyHeaders['referer'];
      
      const proxyRes = await fetch(proxyUrl, { headers: proxyHeaders });
      if (proxyRes.ok) {
        const html = await proxyRes.text();
        if (!isCloudflareChallenge(html)) {
          return { html, isProxied: true, domainUsed: domain };
        }
        throw new Error(`Google Translate proxy for ${domain} hit Cloudflare security check [status=${proxyRes.status}]`);
      } else {
        throw new Error(`Google Translate proxy for ${domain} failed with status ${proxyRes.status}: ${proxyRes.statusText}`);
      }
    } catch (err: any) {
      console.error(`Google Translate proxy also failed for ${targetUrl}:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`Failed to load content from all mirrors. Last error: ${lastError?.message || 'Network Error'}`);
}

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
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://novelbin.com'
    };

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
      
      // Clean query to avoid Cloudflare WAF triggers (e.g. colons, special characters, long strings)
      let cleanedQuery = query
        .split(':')[0]
        .split('(')[0]
        .split('[')[0]
        .split('-')[0]
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim();
        
      // Limit to first 4 words to prevent long string signatures
      const words = cleanedQuery.split(/\s+/).filter(Boolean);
      if (words.length > 4) {
        cleanedQuery = words.slice(0, 4).join(' ');
      } else {
        cleanedQuery = words.join(' ');
      }
      
      if (!cleanedQuery) {
        cleanedQuery = query;
      }
      
      const searchPath = `/search?keyword=${encodeURIComponent(cleanedQuery)}`;
      const { html } = await fetchHtmlWithFallback(searchPath, headers);
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
        } else if (href.includes('/b/')) {
          novelId = href.split('/b/')[1].split('/')[0];
        } else {
          try {
            const urlObj = new URL(href, 'https://novelbin.com');
            const parts = urlObj.pathname.split('/').filter(Boolean);
            if (parts.length > 0) {
              novelId = parts[parts.length - 1];
            }
          } catch (_) {
            const parts = href.split('/').filter(Boolean);
            if (parts.length > 0) {
              novelId = parts[parts.length - 1];
            }
          }
        }
        if (novelId.includes('?')) {
          novelId = novelId.split('?')[0];
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
      const infoPath = `/novel-book/${encodeURIComponent(id)}`;
      const infoHeaders = { ...headers, 'Referer': 'https://novelbin.com/search' };
      const { html, domainUsed } = await fetchHtmlWithFallback(infoPath, infoHeaders);
      const $ = cheerio.load(html);
      
      const title = $('h3.title').text().trim() || $('title').text().replace('Novel - Read Online For Free - Novel Bin', '').trim();
      const image = $('.books img').attr('src') || $('.books img').attr('data-src') || '';
      
      // Clean description
      const description = $('.desc').text().trim() || '';
      
      // Retrieve chapters using the archive AJAX endpoint
      const archivePath = `/ajax/chapter-archive?novelId=${encodeURIComponent(id)}`;
      const archiveHeaders = { ...headers, 'Referer': `${domainUsed}/novel-book/${encodeURIComponent(id)}` };
      const { html: archiveHtml } = await fetchHtmlWithFallback(archivePath, archiveHeaders);
      const $archive = cheerio.load(archiveHtml);
      
      const chapters: any[] = [];
      $archive('a').each((_, el) => {
        const chapterTitle = $archive(el).find('.nchr-text').text().trim() || $archive(el).attr('title') || $archive(el).text().trim();
        const href = $archive(el).attr('href') || '';
        
        // Extract relative ID from href, e.g. "https://novelbin.me/novel-book/solo-leveling/chapter-1" -> "solo-leveling/chapter-1"
        let chapterId = href;
        if (href.includes('/novel-book/')) {
          chapterId = href.split('/novel-book/')[1];
        } else if (href.includes('/b/')) {
          chapterId = href.split('/b/')[1];
        } else {
          try {
            const urlObj = new URL(href, 'https://novelbin.com');
            const pathname = urlObj.pathname;
            if (pathname.includes('/novel-book/')) {
              chapterId = pathname.split('/novel-book/')[1];
            } else if (pathname.includes('/b/')) {
              chapterId = pathname.split('/b/')[1];
            } else {
              const parts = pathname.split('/').filter(Boolean);
              if (parts.length >= 2) {
                chapterId = parts.slice(parts.length - 2).join('/');
              }
            }
          } catch (_) {}
        }
        if (chapterId.includes('?')) {
          chapterId = chapterId.split('?')[0];
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

      // ID is e.g. "campus-rebirth-the-strongest-female-agent/chapter-2813-..."
      const novelId = id.split('/')[0];
      const parentUrl = `https://novelbin.com/novel-book/${novelId}`;
      const chapterPath = `/novel-book/${id}`;
      const chapterHeaders = { ...headers, 'Referer': parentUrl };
      const { html } = await fetchHtmlWithFallback(chapterPath, chapterHeaders);
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
