import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query "q" is required' });
  }

  try {
    const nyaaUrl = `https://nyaa.si/?page=rss&q=${encodeURIComponent(q)}`;
    const response = await fetch(nyaaUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Nyaa.si error: ${response.statusText}` });
    }

    const text = await response.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
      const itemXml = match[1];

      const getField = (tagName: string) => {
        const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`);
        const m = regex.exec(itemXml);
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const title = getField('title');
      const link = getField('link');
      const guid = getField('guid');
      const pubDate = getField('pubDate');
      const seeders = getField('nyaa:seeders');
      const leechers = getField('nyaa:leechers');
      const downloads = getField('nyaa:downloads');
      const infoHash = getField('nyaa:infoHash');
      const size = getField('nyaa:size');
      const category = getField('nyaa:category');

      const magnet = infoHash ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}` : '';

      items.push({
        title,
        link,
        guid,
        pubDate,
        seeders: Number(seeders) || 0,
        leechers: Number(leechers) || 0,
        downloads: Number(downloads) || 0,
        infoHash,
        size,
        category,
        magnet
      });
    }

    // Cache responses for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
