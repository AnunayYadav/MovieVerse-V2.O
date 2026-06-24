import * as cheerio from 'cheerio';

async function testNovelFull() {
  const query = 'Another World';
  const url = `https://novelfull.com/search?keyword=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelfull.com'
  };

  try {
    console.log('Fetching:', url);
    const res = await fetch(url, { headers });
    console.log('Status:', res.status, res.statusText);
    const html = await res.text();
    console.log('HTML length:', html.length);

    const $ = cheerio.load(html);
    const results = [];

    // On novelfull.com, search results are typically in .col-xs-7 .title or .list-novel .row
    // Let's print out some elements to see the structure
    console.log('Total a elements:', $('a').length);
    
    // Let's look for elements that might represent novels
    $('.row').each((i, el) => {
      const titleEl = $(el).find('h3.novel-title a');
      if (titleEl.length > 0) {
        const title = titleEl.text().trim();
        const href = titleEl.attr('href') || '';
        const img = $(el).find('img').attr('src') || '';
        results.push({ title, href, img });
      }
    });

    console.log('Parsed results using h3.novel-title:', results.length);
    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2));
    } else {
      // Let's search for any links containing /novel/ or similar
      console.log('Searching for fallback title selectors...');
      $('h3 a').each((i, el) => {
        if (i < 5) console.log(`h3 a ${i}: text="${$(el).text().trim()}" href="${$(el).attr('href')}"`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

testNovelFull();
