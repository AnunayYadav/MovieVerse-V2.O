import * as cheerio from 'cheerio';

async function checkWord() {
  const query = 'Mushoku Tensei';
  const url = `https://novelbin.me/search?keyword=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://novelbin.me'
  };

  try {
    const res = await fetch(url, { headers });
    const html = await res.text();
    console.log('Contains "Just a moment...":', html.includes('Just a moment...'));
    console.log('Contains "cloudflare":', html.toLowerCase().includes('cloudflare'));
    console.log('Contains "Attention Required!":', html.includes('Attention Required!'));
  } catch (err) {
    console.error(err);
  }
}

checkWord();
