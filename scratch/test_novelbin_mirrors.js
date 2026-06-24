async function testMirrors() {
  const mirrors = [
    'https://novelbin.com',
    'https://novelbin.net',
    'https://novelbin.org'
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  for (const m of mirrors) {
    console.log(`Checking mirror: ${m}`);
    try {
      const res = await fetch(`${m}/novel-book/the-empty-box-and-zeroth-maria`, { headers });
      console.log('Status:', res.status, res.statusText);
      const html = await res.text();
      console.log('HTML Length:', html.length);
    } catch (err) {
      console.error('Mirror error:', err.message || err);
    }
    console.log('--------------------------------');
  }
}

testMirrors();
