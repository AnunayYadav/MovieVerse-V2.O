import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchFromApibay(q: string) {
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://tpb.party/'
    }
  });
  
  if (!response.ok) {
    throw new Error(`apibay status: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data || (data.length === 1 && (data[0].id === '0' || data[0].name === 'No results found'))) {
    return [];
  }

  return data
    .filter((item: any) => item.category && item.category.startsWith('2')) // Video categories only
    .map((item: any) => {
      const title = item.name || '';
      const infoHash = item.info_hash || '';
      const sizeBytes = Number(item.size) || 0;
      
      let size = '0 B';
      if (sizeBytes > 0) {
        const giB = sizeBytes / (1024 * 1024 * 1024);
        if (giB >= 0.9) {
          size = `${giB.toFixed(1)} GiB`;
        } else {
          size = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
        }
      }

      let category = 'Video';
      if (['201', '202', '203', '204'].includes(item.category)) {
        category = 'Movie';
      } else if (['207', '208'].includes(item.category)) {
        category = 'HD Movie';
      } else if (['205', '206'].includes(item.category)) {
        category = 'TV Show';
      }

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
      const link = infoHash ? `https://itorrents.org/torrent/${infoHash}.torrent` : '';

      const addedUnix = Number(item.added) || 0;
      const pubDate = addedUnix > 0 ? new Date(addedUnix * 1000).toUTCString() : '';

      return {
        title,
        link,
        guid: item.id || '',
        pubDate,
        seeders: Number(item.seeders) || 0,
        leechers: Number(item.leechers) || 0,
        downloads: Number(item.seeders + item.leechers) || 0,
        infoHash,
        size,
        category,
        magnet
      };
    });
}

async function fetchFromYts(q: string) {
  const url = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(q)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`YTS error status: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok' || !data.data?.movies) return [];
  
  const items: any[] = [];
  for (const movie of data.data.movies) {
    for (const t of (movie.torrents || [])) {
      const title = `${movie.title} [${t.quality}] [${t.type.toUpperCase()}] [YTS]`;
      const trackers = [
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.openbittorrent.com:80/announce',
        'udp://tracker.opentrackr.org:1337/announce'
      ].map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
      const magnet = `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(title)}${trackers}`;
      
      items.push({
        title,
        link: t.url,
        guid: t.hash,
        pubDate: t.date_uploaded,
        seeders: Number(t.seeds) || 0,
        leechers: Number(t.peers) || 0,
        downloads: Number(t.seeds + t.peers) || 0,
        infoHash: t.hash,
        size: t.size,
        category: 'Movie',
        magnet
      });
    }
  }
  return items;
}

async function fetchFromEztv(q: string) {
  const url = `https://eztv.re/api/get-torrents?limit=30&search=${encodeURIComponent(q)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`EZTV error status: ${response.status}`);
  const data = await response.json();
  if (!data.torrents) return [];
  
  return data.torrents.map((t: any) => {
    const sizeBytes = Number(t.size) || 0;
    let size = '0 B';
    if (sizeBytes > 0) {
      const giB = sizeBytes / (1024 * 1024 * 1024);
      size = giB >= 0.9 ? `${giB.toFixed(1)} GiB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
    }
    
    return {
      title: t.title,
      link: t.torrent_url,
      guid: t.hash,
      pubDate: new Date(t.date_released_unix * 1000).toUTCString(),
      seeders: Number(t.seeds) || 0,
      leechers: Number(t.peers) || 0,
      downloads: Number(t.seeds + t.peers) || 0,
      infoHash: t.hash,
      size,
      category: 'TV Show',
      magnet: t.magnet_url
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, type } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query "q" is required' });
  }

  const isTv = type === 'tv';

  try {
    // Try primary source: Apibay
    try {
      const items = await fetchFromApibay(q);
      if (items.length > 0) {
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
        return res.status(200).json(items);
      }
    } catch (apiErr: any) {
      console.warn('Apibay failed, switching to fallback indexer:', apiErr.message || apiErr);
    }

    // Switch to fallback indexers: YTS (movies) or EZTV (shows)
    let fallbackItems: any[] = [];
    try {
      fallbackItems = isTv ? await fetchFromEztv(q) : await fetchFromYts(q);
    } catch (fallbackErr: any) {
      throw new Error(`All indexers failed (Apibay, YTS/EZTV). Last error: ${fallbackErr.message || fallbackErr}`);
    }
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(fallbackItems);
  } catch (error: any) {
    return res.status(200).json([
      {
        title: `Failed to fetch torrents: ${error.message || error}`,
        link: '#',
        guid: 'error',
        pubDate: new Date().toUTCString(),
        seeders: 0,
        leechers: 0,
        downloads: 0,
        infoHash: '',
        size: '0 B',
        category: 'Error',
        magnet: ''
      }
    ]);
  }
}
