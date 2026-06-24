async function testMirrorChapters() {
  const mirrors = [
    'https://novelbin.com',
    'https://novelbin.net'
  ];

  const chapterId = 'the-empty-box-and-zeroth-maria/book-1-chapter-22';
  const parentId = 'the-empty-box-and-zeroth-maria';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  for (const m of mirrors) {
    const url = `${m}/novel-book/${chapterId}`;
    const parentUrl = `${m}/novel-book/${parentId}`;
    
    console.log(`Checking Chapter on mirror: ${url}`);
    try {
      const res = await fetch(url, { headers: { ...headers, 'Referer': parentUrl } });
      console.log('Status:', res.status, res.statusText);
      const html = await res.text();
      console.log('HTML Length:', html.length);
      console.log('Includes title:', html.match(/<title>([\s\S]*?)<\/title>/)?.[0]);
    } catch (err) {
      console.error('Mirror chapter error:', err.message || err);
    }
    console.log('--------------------------------');
  }
}

testMirrorChapters();
