async function testProxyReferer() {
  const targetUrl = 'https://novelbin.me/novel-book/the-empty-box-and-zeroth-maria/book-1-chapter-22';
  const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}`;
  const parentUrl = 'https://novelbin.me/novel-book/the-empty-box-and-zeroth-maria';
  
  const headersWithReferer = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': parentUrl
  };

  const headersNoReferer = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  try {
    console.log('1. Fetching proxy WITH referer header...');
    const res1 = await fetch(proxyUrl, { headers: headersWithReferer });
    console.log('Status WITH referer:', res1.status, res1.statusText);

    console.log('\n2. Fetching proxy WITHOUT referer header...');
    const res2 = await fetch(proxyUrl, { headers: headersNoReferer });
    console.log('Status WITHOUT referer:', res2.status, res2.statusText);
  } catch (err) {
    console.error('Error:', err);
  }
}

testProxyReferer();
