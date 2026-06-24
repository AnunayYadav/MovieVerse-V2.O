import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path parameter is required and must be a string' });
  }

  // Construct target URL query parameters
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else if (value) {
      searchParams.append(key, value);
    }
  }

  // Target MangaDex API URL
  const mangadexUrl = `https://api.mangadex.org${path}?${searchParams.toString()}`;

  try {
    // Send request with a valid custom User-Agent, which MangaDex requires
    const response = await fetch(mangadexUrl, {
      headers: {
        'User-Agent': 'MovieVerse/2.0 (contact@movieverse.app)'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `MangaDex error: ${errorText}` });
    }
    
    const data = await response.json();

    // Cache the response globally on Vercel's CDN (5 mins s-maxage, stale-while-revalidate 2 mins)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
