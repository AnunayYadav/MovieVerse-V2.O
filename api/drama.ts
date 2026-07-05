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

  // Ensure target path format is correct
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `https://my-drama-list-api-ten.vercel.app${cleanPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `MyDramaList API error: ${errorText}` });
    }
    
    const data = await response.json();

    // Cache responses (30 mins s-maxage, stale-while-revalidate 10 mins)
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
