// Cloudflare Worker Script for ComicK & MangaPill Proxying
// Deploy this to dash.cloudflare.com -> Workers & Pages -> Create Worker
// Then add VITE_MANGA_WORKER_URL=https://your-worker.workers.dev to .env and Vercel project settings.

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);
    const targetUrl = reqUrl.searchParams.get('url');
    const provider = reqUrl.searchParams.get('provider');
    if (!targetUrl) return new Response('Missing url parameter', { status: 400 });

    let referer = 'https://comick.live';
    if (provider === 'mangapill' || targetUrl.includes('mangapill') || targetUrl.includes('readdetectiveconan')) {
      referer = 'https://mangapill.com/';
    } else if (provider === 'comick' || targetUrl.includes('comick')) {
      referer = 'https://comick.live';
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': referer
      }
    });

    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(res.body, { status: res.status, headers });
  }
};
