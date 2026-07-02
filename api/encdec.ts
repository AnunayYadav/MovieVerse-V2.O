import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let { tmdbId, mediaType, seasonId, episodeId, title, year, server } = req.query;

  if (!tmdbId || typeof tmdbId !== 'string') {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }
  if (!mediaType || typeof mediaType !== 'string' || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return res.status(400).json({ error: 'mediaType parameter is required (movie or tv)' });
  }

  const seasonNum = seasonId ? String(seasonId) : '1';
  const episodeNum = episodeId ? String(episodeId) : '1';

  // TMDB details lookup for title and year if missing
  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
  if (!title || !year) {
    try {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        if (mediaType === 'movie') {
          title = title || tmdbData.title || tmdbData.original_title;
          year = year || (tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '');
        } else {
          title = title || tmdbData.name || tmdbData.original_name;
          year = year || (tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : '');
        }
      }
    } catch (e) {
      console.warn("Failed to fetch metadata from TMDB:", e);
    }
  }

  if (!title) {
    return res.status(400).json({ error: 'title parameter is required or could not be resolved from TMDB' });
  }

  // All EncDec API servers
  const allProviders = [
    { name: 'Yoru', endpoint: 'cdn', isMovieOnly: true },
    { name: 'Cypher', endpoint: 'downloader2', isMovieOnly: false },
    { name: 'Neon', endpoint: 'mb-flix', isMovieOnly: false },
    { name: 'Sage', endpoint: '1movies', isMovieOnly: false },
    { name: 'Breach', endpoint: 'm4uhd', isMovieOnly: false },
    { name: 'Vyse', endpoint: 'hdmovie', isMovieOnly: false },
    { name: 'Fade', endpoint: 'hdmovie', isMovieOnly: false, extraParams: { quality: 'Hindi' } },
    { name: 'Killjoy', endpoint: 'meine', isMovieOnly: false, extraParams: { language: 'german' } },
    { name: 'Omen', endpoint: 'lamovie', isMovieOnly: false },
    { name: 'Raze', endpoint: 'superflix', isMovieOnly: false }
  ];

  // Filter based on movie/tv type
  const providers = allProviders.filter(p => !p.isMovieOnly || mediaType === 'movie');
  const availableServers = providers.map(p => p.name);

  // If a specific server is requested, filter to that one
  let targetProviders = providers;
  if (server && typeof server === 'string') {
    const matched = providers.find(p => p.name.toLowerCase() === server.toLowerCase());
    if (matched) {
      targetProviders = [matched];
    }
  }

  const cleanTitle = title ? (typeof title === 'string' ? title : Array.isArray(title) ? title[0] : '') : '';

  const queryParams: any = {
    title: encodeURIComponent(cleanTitle),
    mediaType: String(mediaType),
    year: year ? String(year) : '',
    episodeId: episodeNum,
    seasonId: seasonNum,
    tmdbId: String(tmdbId)
  };

  let successData: any = null;
  let successfulProvider = '';
  const errors: string[] = [];

  for (const provider of targetProviders) {
    const combinedParams = { ...queryParams, ...(provider.extraParams || {}) };
    const queryString = new URLSearchParams(combinedParams).toString();
    const url = `https://api.videasy.to/${provider.endpoint}/sources-with-title?${queryString}`;
    try {
      const fetchRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
          "Referer": "https://www.vidking.net/",
          "Origin": "https://www.vidking.net"
        }
      });

      if (!fetchRes.ok) {
        errors.push(`${provider.name}: HTTP ${fetchRes.status}`);
        continue;
      }

      const cipherHex = (await fetchRes.text()).trim();
      if (!cipherHex) {
        errors.push(`${provider.name}: Empty response`);
        continue;
      }

      // Decrypt using enc-dec.app API
      const decRes = await fetch("https://enc-dec.app/api/dec-videasy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          text: cipherHex,
          id: tmdbId
        })
      });

      if (!decRes.ok) {
        errors.push(`${provider.name}: Decrypt API HTTP ${decRes.status}`);
        continue;
      }

      const decJson = await decRes.json();
      if (decJson && decJson.status === 200 && decJson.result && decJson.result.sources && decJson.result.sources.length > 0) {
        successData = decJson.result;
        successfulProvider = provider.name;
        break; // Success!
      } else {
        const errMsg = decJson?.error || "Empty result or bad status";
        errors.push(`${provider.name}: Decrypt API failed (${errMsg})`);
      }
    } catch (err: any) {
      errors.push(`${provider.name}: ${err.message || err}`);
    }
  }

  if (successData) {
    return res.status(200).json({
      success: true,
      provider: successfulProvider,
      availableServers,
      data: successData
    });
  } else {
    return res.status(502).json({
      success: false,
      availableServers,
      error: `All EncDec providers failed — ${errors.join('; ')}`
    });
  }
}
