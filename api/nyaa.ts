import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q as string) || '';

  try {
    const fetchRes = await fetch(`https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}`);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send('Failed to fetch from Nyaa');
    }
    const xml = await fetchRes.text();
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
