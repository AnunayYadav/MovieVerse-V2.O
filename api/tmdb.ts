import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path parameter is required and must be a string' });
  }

  // Retrieve TMDB API key from Vercel environment variables or fallback to a working key
  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';

  // Construct target URL query parameters
  const searchParams = new URLSearchParams();
  searchParams.append('api_key', apiKey);

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else if (value) {
      searchParams.append(key, value);
    }
  }

  const tmdbUrl = `https://api.themoviedb.org/3${path}?${searchParams.toString()}`;

  try {
    const response = await fetch(tmdbUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `TMDB error: ${errorText}` });
    }
    
    const data = await response.json();

    // Cache the response globally on Vercel's CDN (30 mins s-maxage, stale-while-revalidate 10 mins)
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
