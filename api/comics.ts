import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COMICS } from '@consumet/extensions';

// Cache provider instance
const getComics = new COMICS.GetComics();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, page } = req.query;
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const searchQuery = query ? (query as string) : '';

  try {
    const data = await getComics.search(searchQuery, pageNum);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error(`Comics API error [query=${searchQuery}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
