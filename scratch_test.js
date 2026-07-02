import * as cheerio from 'cheerio';

const ANIKAI_BASE = 'https://www3.anikai.cc';
const ANIKOTO_BASE = 'https://anikototv.to';
const ANIKOTO_API_BASE = 'https://anikotoapi.site';
const EMBED_BASE = 'https://megaplay.buzz';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractAnikotoId(href) {
  if (!href) return null;
  return href
    .replace(/^https?:\/\/[^\/]+\/watch\//, '')
    .replace(/^\/watch\//, '')
    .replace(/\/ep-\d+.*$/, '')
    .replace(/^\//, '')
    .trim() || null;
}

async function test() {
  console.log("Fetching Anikoto watch page...");
  try {
    const watchUrl = 'https://anikototv.to/watch/that-time-i-got-reincarnated-as-a-slime-season-4-0u851';
    const watchRes = await fetch(watchUrl, { headers: { 'User-Agent': USER_AGENT } });
    const html = await watchRes.text();
    const $ = cheerio.load(html);

    console.log("Analyzing Anikoto watch page classes...");
    $('*').each((_, el) => {
      const cls = $(el).attr('class') || '';
      const id = $(el).attr('id') || '';
      const text = $(el).text().trim().substring(0, 50);
      if (cls.includes('ep') || cls.includes('server') || cls.includes('stream') || id.includes('ep') || id.includes('server') || id.includes('stream')) {
        console.log(`<${el.name}> Class: "${cls}" ID: "${id}" Attributes:`, $(el).attr(), text ? `Text: ${text}` : '');
      }
    });
  } catch (err) {
    console.error("Error during test:", err);
  }
}

test();
