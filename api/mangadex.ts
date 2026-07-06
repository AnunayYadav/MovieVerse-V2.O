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

  const { path, service } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path parameter is required and must be a string' });
  }

  const isDrama = service === 'drama';

  // Construct target URL query parameters
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || key === 'service') continue;
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else if (value) {
      searchParams.append(key, value);
    }
  }

  const targetBase = isDrama ? 'https://my-drama-list-api-ten.vercel.app/api' : 'https://api.mangadex.org';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${targetBase}${cleanPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  try {
    const headers: Record<string, string> = {};
    if (!isDrama) {
      headers['User-Agent'] = 'MovieVerse/2.0 (contact@movieverse.app)';
    }

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API error (${isDrama ? 'Drama' : 'MangaDex'}): ${errorText}` });
    }
    
    const data = await response.json();

    // Cache the response globally on Vercel's CDN (30 mins for Drama, 5 mins for MangaDex)
    const cacheAge = isDrama ? 1800 : 300;
    const revalidateAge = isDrama ? 600 : 120;
    res.setHeader('Cache-Control', `s-maxage=${cacheAge}, stale-while-revalidate=${revalidateAge}`);
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
