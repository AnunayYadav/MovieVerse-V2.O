async function testNovelFullReferer() {
  const url = 'https://novelfull.com/the-empty-box-and-zeroth-maria.html';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelfull.com'
  };

  try {
    console.log('Fetching NovelFull details page...');
    const res = await fetch(url, { headers });
    console.log('Status:', res.status, res.statusText);
    const html = await res.text();
    console.log('HTML Length:', html.length);
  } catch (err) {
    console.error('Error:', err);
  }
}

testNovelFullReferer();
