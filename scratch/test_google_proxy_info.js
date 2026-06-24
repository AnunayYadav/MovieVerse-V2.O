import * as cheerio from 'cheerio';

async function testGoogleProxyInfo() {
  const id = 'emperor-of-solo-play';
  // Let's test info
  const infoTarget = `https://novelbin.me/novel-book/${id}`;
  const infoProxy = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(infoTarget)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  try {
    console.log('Fetching info via Google Translate proxy:', infoProxy);
    const res = await fetch(infoProxy, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('h3.title').text().trim() || $('title').text().trim();
    const description = $('.desc').text().trim();
    console.log('Parsed Title:', title);
    console.log('Description Length:', description.length);

    // Let's test chapter archive AJAX
    const archiveTarget = `https://novelbin.me/ajax/chapter-archive?novelId=${id}`;
    const archiveProxy = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(archiveTarget)}`;
    console.log('\nFetching archive via Google Translate proxy:', archiveProxy);
    const resArchive = await fetch(archiveProxy, { headers });
    const archiveHtml = await resArchive.text();
    const $archive = cheerio.load(archiveHtml);
    const chapters = [];
    $archive('a').each((_, el) => {
      const chapterTitle = $archive(el).find('.nchr-text').text().trim() || $archive(el).attr('title') || $archive(el).text().trim();
      const href = $archive(el).attr('href') || '';
      
      let chapterId = href;
      if (href.includes('/novel-book/')) {
        chapterId = href.split('/novel-book/')[1];
      }
      
      if (chapterId.includes('?')) {
        chapterId = chapterId.split('?')[0];
      }
      
      if (chapterTitle && chapterId) {
        chapters.push({ id: chapterId, title: chapterTitle });
      }
    });

    console.log('Parsed Chapters Count:', chapters.length);
    if (chapters.length > 0) {
      console.log('First Chapter parsed:', chapters[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testGoogleProxyInfo();
