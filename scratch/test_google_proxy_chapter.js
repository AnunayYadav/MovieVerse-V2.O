import * as cheerio from 'cheerio';

async function testChapterProxy() {
  const chapterId = 'emperor-of-solo-play/chapter-1';
  const targetUrl = `https://novelbin.me/novel-book/${chapterId}`;
  const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  try {
    console.log('Fetching chapter via Google Translate proxy:', proxyUrl);
    const res = await fetch(proxyUrl, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const title = $('.chr-title').text().trim() || $('title').text().trim();
    const contentEl = $('#chr-content').length > 0 ? $('#chr-content') : ($('#chapter-content').length > 0 ? $('#chapter-content') : $('.chr-c'));
    
    console.log('Parsed Chapter Title:', title);
    console.log('Content Container Found:', contentEl.length > 0);
    
    if (contentEl.length > 0) {
      contentEl.find('script, style, iframe, ads, .ads, .adsbygoogle').remove();
      const paragraphs = [];
      contentEl.find('p').each((_, el) => {
        const pText = $(el).text().trim();
        if (pText && !pText.includes('novelbin') && !pText.includes('Read Web Novels') && !pText.includes('adsbygoogle')) {
          paragraphs.push(pText);
        }
      });
      console.log('Paragraphs Count:', paragraphs.length);
      if (paragraphs.length > 0) {
        console.log('First Paragraph:', paragraphs[0]);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testChapterProxy();
