async function debugSearch() {
  const query = 'Another World';
  const searchUrl = `https://novelbin.me/search?keyword=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelbin.me'
  };

  try {
    console.log('Fetching:', searchUrl);
    const res = await fetch(searchUrl, { headers });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', JSON.stringify([...res.headers.entries()]));
    const text = await res.text();
    console.log('HTML Length:', text.length);
    console.log('First 500 chars of HTML:', text.substring(0, 500));
  } catch (e) {
    console.error('Error:', e);
  }
}

debugSearch();
