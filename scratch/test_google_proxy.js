import * as cheerio from 'cheerio';

async function testGoogleProxy() {
  const targetUrl = 'https://novelbin.me/search?keyword=solo';
  const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  try {
    console.log('Fetching via Google Translate proxy:', proxyUrl);
    const res = await fetch(proxyUrl, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    console.log('h3.novel-title count:', $('h3.novel-title').length);

    $('h3.novel-title').each((i, el) => {
      const parent = $(el).closest('.row');
      const titleEl = $(el).find('a');
      const title = titleEl.text().trim();
      const href = titleEl.attr('href') || '';
      const img = parent.find('img').attr('src') || parent.find('img').attr('data-src') || '';
      
      console.log(`Match ${i}: title="${title}" href="${href}" img="${img}"`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

testGoogleProxy();
