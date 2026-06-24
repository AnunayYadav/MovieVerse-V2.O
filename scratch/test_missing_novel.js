async function checkMissing() {
  const ids = [
    'the-empty-box-and-zeroth-maria',
    'three-days-of-happiness'
  ];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelbin.me'
  };

  for (const id of ids) {
    const url = `https://novelbin.me/novel-book/${id}`;
    console.log(`Checking Details for ${id} at ${url}`);
    try {
      const res = await fetch(url, { headers });
      console.log('Details Page Status:', res.status, res.statusText);
      const html = await res.text();
      console.log('HTML Length:', html.length);
      console.log('Includes title tag:', html.match(/<title>([\s\S]*?)<\/title>/)?.[0]);
    } catch (err) {
      console.error('Error:', err);
    }
    console.log('--------------------------------');
  }
}

checkMissing();
