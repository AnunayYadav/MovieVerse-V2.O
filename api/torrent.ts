import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const url = `https://apibay.org/q.php?q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `apibay error: ${response.statusText}` });
    }

    const data = await response.json();
    
    // Check if apibay returned empty search result
    if (!data || (data.length === 1 && (data[0].id === '0' || data[0].name === 'No results found'))) {
      return res.status(200).json([]);
    }

    const items = data
      .filter((item: any) => item.category && item.category.startsWith('2')) // Video categories only
      .map((item: any) => {
        const title = item.name || '';
        const infoHash = item.info_hash || '';
        const sizeBytes = Number(item.size) || 0;
        
        // Format size
        let size = '0 B';
        if (sizeBytes > 0) {
          const giB = sizeBytes / (1024 * 1024 * 1024);
          if (giB >= 0.9) {
            size = `${giB.toFixed(1)} GiB`;
          } else {
            size = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
          }
        }

        // Map category
        let category = 'Video';
        if (['201', '202', '203', '204'].includes(item.category)) {
          category = 'Movie';
        } else if (['207', '208'].includes(item.category)) {
          category = 'HD Movie';
        } else if (['205', '206'].includes(item.category)) {
          category = 'TV Show';
        }

        // Magnet link
        const trackers = [
          'udp://tracker.coppersurfer.tk:6969/announce',
          'udp://tracker.openbittorrent.com:80/announce',
          'udp://9.rarbg.to:2710/announce',
          'udp://9.rarbg.me:2710/announce',
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://tracker.cyberia.is:6969/announce'
        ];
        const trackerParams = trackers.map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
        const magnet = infoHash ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${trackerParams}` : '';
        
        // Direct .torrent cache download
        const link = infoHash ? `https://itorrents.org/torrent/${infoHash}.torrent` : '';

        // pubDate from unix timestamp
        const addedUnix = Number(item.added) || 0;
        const pubDate = addedUnix > 0 ? new Date(addedUnix * 1000).toUTCString() : '';

        return {
          title,
          link,
          guid: item.id || '',
          pubDate,
          seeders: Number(item.seeders) || 0,
          leechers: Number(item.leechers) || 0,
          downloads: Number(item.seeders + item.leechers) || 0, // Fallback completed count
          infoHash,
          size,
          category,
          magnet
        };
      });

    // Cache responses for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
