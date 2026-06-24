import * as cheerio from 'cheerio';

async function testNovelFullProxy() {
  const query = 'Mushoku Tensei';
  const targetUrl = `https://novelfull.com/search?keyword=${encodeURIComponent(query)}`;
  const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  try {
    console.log('Fetching NovelFull via proxy:', proxyUrl);
    const res = await fetch(proxyUrl, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    // On novelfull.com, search results are in .col-xs-7 .title or .list-novel .row
    // Let's see if we can find them
    $('h3.novel-title a').each((i, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href') || '';
      results.push({ title, href });
    });

    console.log('NovelFull proxy results count:', results.length);
    if (results.length > 0) {
      console.log('First result:', results[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testNovelFullProxy();
