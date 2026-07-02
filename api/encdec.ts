import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to resolve Vidfast or Vidcore streams using enc-dec.app API
async function resolveVidfastOrVidcore(
  domain: string,
  type: 'movie' | 'tv',
  tmdbId: string,
  season: string,
  episode: string,
  isVidcore: boolean,
  requestedServer?: string
) {
  const baseUrl = type === 'movie'
    ? `https://${domain}/movie/${tmdbId}/`
    : `https://${domain}/tv/${tmdbId}/${season}/${episode}/`;

  const pageRes = await fetch(baseUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": `https://${domain}/`
    }
  });

  if (!pageRes.ok) {
    throw new Error(`Failed to load page from ${domain}: HTTP ${pageRes.status}`);
  }

  const html = await pageRes.text();
  const match = html.match(/\\"en\\":\\"(.*?)\\"/);
  if (!match) {
    throw new Error(`Could not find encrypted payload on ${domain} page`);
  }

  const encryptedText = match[1];
  const encEndpoint = isVidcore ? 'enc-vidcore' : 'enc-vidfast';

  const encRes = await fetch(`https://enc-dec.app/api/${encEndpoint}?text=${encodeURIComponent(encryptedText)}`);
  if (!encRes.ok) {
    throw new Error(`EncDec enc endpoint failed: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`EncDec enc failed: ${encJson.error || 'unknown'}`);
  }

  const { servers, stream, token } = encJson.result;

  // Fetch servers list
  const serversRes = await fetch(servers, {
    method: 'POST',
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": `https://${domain}/`,
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-Token": token
    }
  });

  if (!serversRes.ok) {
    throw new Error(`Failed to fetch server list: HTTP ${serversRes.status}`);
  }

  const serversEncrypted = await serversRes.text();
  const decEndpoint = isVidcore ? 'dec-vidcore' : 'dec-vidfast';

  const decRes = await fetch(`https://enc-dec.app/api/${decEndpoint}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: serversEncrypted })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt server list: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Server list decryption failed: ${decJson.error || 'unknown'}`);
  }

  const serversList = decJson.result; // [{ name: "Server Name", data: "..." }]
  if (!serversList || serversList.length === 0) {
    throw new Error("No servers available for this stream");
  }

  const availableServers = serversList.map((s: any) => s.name);

  // Match requested server or fallback to the first
  const selectedServerObj = serversList.find((s: any) => s.name.toLowerCase() === requestedServer?.toLowerCase()) || serversList[0];
  if (!selectedServerObj) {
    throw new Error("Target server not found in available list");
  }

  const finalStreamUrl = `${stream}/${selectedServerObj.data}`;
  const streamRes = await fetch(finalStreamUrl, {
    method: 'POST',
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": `https://${domain}/`,
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-Token": token
    }
  });

  if (!streamRes.ok) {
    throw new Error(`Failed to fetch stream data: HTTP ${streamRes.status}`);
  }

  const streamEncrypted = await streamRes.text();
  const finalDecRes = await fetch(`https://enc-dec.app/api/${decEndpoint}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: streamEncrypted })
  });

  if (!finalDecRes.ok) {
    throw new Error(`Failed to decrypt stream data: HTTP ${finalDecRes.status}`);
  }

  const finalDecJson = await finalDecRes.json();
  if (finalDecJson.status !== 200 || !finalDecJson.result) {
    throw new Error(`Stream decryption failed: ${finalDecJson.error || 'unknown'}`);
  }

  return {
    success: true,
    provider: selectedServerObj.name,
    availableServers,
    data: finalDecJson.result // Contains sources, subtitles, etc.
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let { tmdbId, mediaType, seasonId, episodeId, title, year, server, provider } = req.query;

  if (!tmdbId || typeof tmdbId !== 'string') {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }
  if (!mediaType || typeof mediaType !== 'string' || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return res.status(400).json({ error: 'mediaType parameter is required (movie or tv)' });
  }

  const seasonNum = seasonId ? String(seasonId) : '1';
  const episodeNum = episodeId ? String(episodeId) : '1';
  const providerStr = typeof provider === 'string' ? provider.toLowerCase() : 'videasy';
  const serverStr = typeof server === 'string' ? server : undefined;

  // Resolve Vidfast or Vidcore
  if (providerStr === 'vidfast' || providerStr === 'vidcore') {
    try {
      const isVidcore = providerStr === 'vidcore';
      const domain = isVidcore ? 'vidcore.net' : 'vidfast.pro';
      const result = await resolveVidfastOrVidcore(
        domain,
        mediaType,
        tmdbId,
        seasonNum,
        episodeNum,
        isVidcore,
        serverStr
      );
      return res.status(200).json(result);
    } catch (error: any) {
      console.error(`${providerStr} extraction error:`, error);
      return res.status(502).json({
        success: false,
        error: `EncDec extraction for ${providerStr} failed: ${error.message || error}`
      });
    }
  }

  // Fallback / default to Videasy
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

  const cleanTitle = title ? (typeof title === 'string' ? title : Array.isArray(title) ? title[0] : '') : '';
  if (!cleanTitle) {
    return res.status(400).json({ error: 'title parameter is required or could not be resolved from TMDB' });
  }

  // All EncDec API servers for Videasy
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
  if (serverStr) {
    const matched = providers.find(p => p.name.toLowerCase() === serverStr.toLowerCase());
    if (matched) {
      targetProviders = [matched];
    }
  }

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
