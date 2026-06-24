async function checkChapters() {
  const chapters = [
    { id: 'the-empty-box-and-zeroth-maria/book-1-chapter-22', parent: 'the-empty-box-and-zeroth-maria' },
    { id: 'three-days-of-happiness/chapter-14', parent: 'three-days-of-happiness' }
  ];

  for (const ch of chapters) {
    const url = `https://novelbin.me/novel-book/${ch.id}`;
    const parentUrl = `https://novelbin.me/novel-book/${ch.parent}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': parentUrl
    };

    console.log(`Checking Chapter URL: ${url}`);
    try {
      const res = await fetch(url, { headers });
      console.log('Status:', res.status, res.statusText);
      const html = await res.text();
      console.log('HTML Length:', html.length);
      console.log('Includes title:', html.match(/<title>([\s\S]*?)<\/title>/)?.[0]);
      console.log('Contains "Just a moment...":', html.includes('Just a moment...'));
    } catch (err) {
      console.error('Error:', err);
    }
    console.log('--------------------------------');
  }
}

checkChapters();
