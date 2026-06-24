async function testChapterReferer() {
  const chapterId = 'campus-rebirth-the-strongest-female-agent/chapter-2813-end-2813-c2759-ending-chapter-no-book-currency-grand-ending';
  const targetUrl = `https://novelbin.me/novel-book/${chapterId}`;
  
  // Extract parent novel ID
  const novelId = chapterId.split('/')[0];
  const parentUrl = `https://novelbin.me/novel-book/${novelId}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': parentUrl
  };

  try {
    console.log('Fetching chapter with parent referer:', parentUrl);
    const res = await fetch(targetUrl, { headers });
    console.log('Status:', res.status, res.statusText);
    const html = await res.text();
    console.log('HTML length:', html.length);
    console.log('HTML snippet:', html.substring(0, 500));
  } catch (err) {
    console.error('Error:', err);
  }
}

testChapterReferer();
