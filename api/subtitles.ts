import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let targetUrl = '';
  if (req.url) {
    const urlObj = new URL(req.url, 'http://localhost');
    const urlParam = urlObj.searchParams.get('url');
    if (urlParam) {
      targetUrl = urlParam;
    } else {
      const indexOfUrl = req.url.indexOf('url=');
      if (indexOfUrl !== -1) {
        targetUrl = decodeURIComponent(req.url.slice(indexOfUrl + 4));
      }
    }
  }

  if (!targetUrl) {
    return res.status(400).send('Error: "url" parameter is required.');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Referer": "https://www.vidking.net/",
        "Origin": "https://www.vidking.net"
      }
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return res.status(response.status).send(`Failed to fetch subtitle from upstream: ${response.statusText}. Details: ${errorText}`);
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    // Cache the subtitle on the CDN for 2 hours
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=1800');
    return res.status(200).send(text);
  } catch (error: any) {
    return res.status(500).send(`Proxy Error: ${error.message || error}`);
  }
}
