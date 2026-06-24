import * as cheerio from 'cheerio';

async function fetchHtmlWithFallback(path, headers) {
  const domains = ['https://novelbin.com', 'https://novelbin.me'];
  let lastError = null;

  const isCloudflareChallenge = (html) => {
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
    const reqHeaders = { ...headers };
    if (reqHeaders['Referer']) {
      reqHeaders['Referer'] = reqHeaders['Referer'].replace(/https:\/\/novelbin\.(me|com|net|org)/gi, domain);
    }

    // Try 1: Direct fetch
    try {
      console.log(`Trying Direct fetch to ${targetUrl}...`);
      const res = await fetch(targetUrl, { headers: reqHeaders });
      console.log(`Direct fetch status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const html = await res.text();
        if (!isCloudflareChallenge(html)) {
          return { html, isProxied: false, domainUsed: domain };
        }
        lastError = new Error(`Direct fetch to ${domain} hit Cloudflare security check [status=${res.status}]`);
      } else {
        lastError = new Error(`Direct fetch to ${domain} failed with status ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      lastError = err;
    }

    console.warn(`Direct fetch to ${targetUrl} failed, trying Google Translate proxy. Error:`, lastError?.message || lastError);

    // Try 2: Google Translate proxy
    try {
      const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
      const proxyHeaders = { ...reqHeaders };
      delete proxyHeaders['Referer'];
      delete proxyHeaders['referer'];

      console.log(`Trying Proxy fetch via Google Translate to ${proxyUrl}...`);
      const proxyRes = await fetch(proxyUrl, { headers: proxyHeaders });
      console.log(`Proxy fetch status: ${proxyRes.status} ${proxyRes.statusText}`);
      if (proxyRes.ok) {
        const html = await proxyRes.text();
        if (!isCloudflareChallenge(html)) {
          return { html, isProxied: true, domainUsed: domain };
        }
        throw new Error(`Google Translate proxy for ${domain} hit Cloudflare security check [status=${proxyRes.status}]`);
      } else {
        throw new Error(`Google Translate proxy for ${domain} failed with status ${proxyRes.status}: ${proxyRes.statusText}`);
      }
    } catch (err) {
      console.error(`Google Translate proxy also failed for ${targetUrl}:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`Failed to load content from all mirrors. Last error: ${lastError?.message || 'Network Error'}`);
}

async function testChapters() {
  const chapters = [
    'the-empty-box-and-zeroth-maria/book-1-chapter-22',
    'three-days-of-happiness/chapter-14'
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  for (const cid of chapters) {
    console.log(`\n========================================\nTesting chapter: ${cid}`);
    const novelId = cid.split('/')[0];
    const parentUrl = `https://novelbin.com/novel-book/${novelId}`;
    const chapterPath = `/novel-book/${cid}`;
    const chapterHeaders = { ...headers, 'Referer': parentUrl };

    try {
      const { html, isProxied, domainUsed } = await fetchHtmlWithFallback(chapterPath, chapterHeaders);
      const $ = cheerio.load(html);
      const title = $('.chr-title').text().trim() || $('title').text().trim();
      const contentEl = $('#chr-content').length > 0 ? $('#chr-content') : ($('#chapter-content').length > 0 ? $('#chapter-content') : $('.chr-c'));
      
      console.log(`SUCCESS! Domain: ${domainUsed}, Proxied: ${isProxied}`);
      console.log('Chapter Title:', title);
      console.log('Content Element Found:', contentEl.length > 0);
      
      if (contentEl.length > 0) {
        const paragraphs = [];
        contentEl.find('p').each((_, el) => {
          const pText = $(el).text().trim();
          if (pText && !pText.includes('novelbin') && !pText.includes('Read Web Novels')) {
            paragraphs.push(pText);
          }
        });
        console.log('Paragraphs count:', paragraphs.length);
        if (paragraphs.length > 0) {
          console.log('First paragraph:', paragraphs[0].substring(0, 100) + '...');
        }
      }
    } catch (err) {
      console.error('FAILED to load chapter:', err.message);
    }
  }
}

testChapters();
