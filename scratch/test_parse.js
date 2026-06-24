import * as cheerio from 'cheerio';

async function debugParse() {
  const query = 'I Got a Cheat and Moved to Another World, so I Want to Live as I Like';
  const searchUrl = `https://novelbin.me/search?keyword=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelbin.me'
  };

  try {
    const res = await fetch(searchUrl, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    console.log('Total h3.novel-title elements found:', $('h3.novel-title').length);
    console.log('Total .row elements found:', $('.row').length);

    $('h3.novel-title').each((i, el) => {
      try {
        const parent = $(el).closest('.row');
        const titleEl = $(el).find('a');
        const title = titleEl.text().trim() || $(el).text().trim();
        const href = titleEl.attr('href') || '';
        
        let novelId = href;
        if (href.includes('/novel-book/')) {
          novelId = href.split('/novel-book/')[1].split('/')[0];
        }
        
        const img = parent.find('img').attr('src') || parent.find('img').attr('data-src') || '';
        
        console.log(`Element ${i}: title="${title}" href="${href}" novelId="${novelId}" img="${img}"`);
        
        if (title && novelId) {
          results.push({
            id: novelId,
            title,
            image: img,
            url: href
          });
        }
      } catch (err) {
        console.error(`Error on element ${i}:`, err);
      }
    });

    console.log('Total parsed results:', results.length);
  } catch (e) {
    console.error('Fetch/Parse Error:', e);
  }
}

debugParse();
