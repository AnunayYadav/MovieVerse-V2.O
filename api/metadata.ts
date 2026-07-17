import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, path } = req.query;

  // --- ANILIST METADATA ACTION ---
  if (action === 'anilist' || req.body?.query) {
    const { query, variables } = req.body || {};
    if (!query) {
      // In case query is passed via GET or query params
      const getQuery = req.query.query;
      const getVars = req.query.variables;
      if (!getQuery) {
        return res.status(400).json({ error: 'GraphQL query is required in body or query parameters.' });
      }
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'MovieVerse/2.0'
          },
          body: JSON.stringify({ query: getQuery, variables: getVars ? JSON.parse(String(getVars)) : undefined })
        });
        const data = await response.json();
        res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=600');
        return res.status(response.status || 200).json(data);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    }

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'MovieVerse/2.0'
        },
        body: JSON.stringify({ query, variables })
      });

      const data = await response.json();
      if (!response.ok || data.errors) {
        return res.status(response.status || 400).json(data);
      }

      res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=600');
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  // --- TMDB METADATA ACTION ---
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path parameter is required for TMDB or action=anilist for AniList' });
  }

  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
  const searchParams = new URLSearchParams();
  searchParams.append('api_key', apiKey);

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || key === 'action') continue;
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
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
