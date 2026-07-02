import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ----------------------------------------------------
// 0. AnimeKai Scraper & Hoster Resolver
// ----------------------------------------------------
async function resolveHosterEmbed(embed: string) {
  const referer = embed.split('/e/')[0] + '/';
  const mediaUrl = embed.replace('/e/', '/media/');

  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  const mediaRes = await fetch(mediaUrl, {
    headers: {
      "User-Agent": userAgent,
      "Referer": referer
    }
  });

  if (!mediaRes.ok) {
    throw new Error(`Failed to fetch media data from hoster: HTTP ${mediaRes.status}`);
  }

  const mediaJson = await mediaRes.json();
  const encrypted = mediaJson.result;

  const decRes = await fetch("https://enc-dec.app/api/dec-mega", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: encrypted,
      agent: userAgent
    })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt hoster media: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Hoster decryption failed: ${decJson.error || 'unknown'}`);
  }

  return decJson.result; // Returns sources with stream URLs
}

async function resolveAnimekai(
  title: string,
  year: string,
  season: string,
  episode: string,
  anilistId?: string,
  requestedServer?: string
) {
  let entry: any = null;

  // 1. Try finding by Anilist ID
  if (anilistId) {
    try {
      const findRes = await fetch(`https://enc-dec.app/db/kai/find?anilist_id=${anilistId}`);
      if (findRes.ok) {
        const findJson = await findRes.json();
        if (Array.isArray(findJson) && findJson.length > 0) {
          entry = findJson[0];
        }
      }
    } catch (e) {
      console.warn("Failed to find AnimeKai by Anilist ID:", e);
    }
  }

  // 2. Fallback to searching by title
  if (!entry) {
    const searchUrl = `https://enc-dec.app/db/kai/search?query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`AnimeKai search failed: HTTP ${searchRes.status}`);
    }
    const searchJson = await searchRes.json();
    if (Array.isArray(searchJson) && searchJson.length > 0) {
      entry = searchJson[0];
    }
  }

  if (!entry) {
    throw new Error("No matching anime found in AnimeKai database");
  }

  const episodes = entry.episodes;
  if (!episodes) {
    throw new Error("No episodes found in AnimeKai database entry");
  }

  // Seasons in anime are usually 1, or relative episode numbers
  const ep = episodes[season]?.[episode] || episodes['1']?.[episode];
  if (!ep || !ep.sources) {
    throw new Error(`Episode ${episode} (Season ${season}) not found in AnimeKai entry`);
  }

  // Construct available servers list
  const availableServers: string[] = [];
  const serverMap: { [key: string]: { type: string, server: string } } = {};

  for (const type of Object.keys(ep.sources)) {
    const serversForType = ep.sources[type];
    for (const serverName of Object.keys(serversForType)) {
      const serverLabel = `${type.toUpperCase()} - ${serverName.toUpperCase()}`;
      availableServers.push(serverLabel);
      serverMap[serverLabel.toLowerCase()] = { type, server: serverName };
    }
  }

  if (availableServers.length === 0) {
    throw new Error("No streaming servers available for this episode");
  }

  // Select requested server or fallback to the first
  const selectedLabel = requestedServer && serverMap[requestedServer.toLowerCase()] 
    ? requestedServer 
    : availableServers[0];

  const { type, server } = serverMap[selectedLabel.toLowerCase()];
  const ajaxPath = ep.sources[type][server];
  const megaup = entry.info?.mirrors?.megaup?.[0] || 'https://animekai.to';
  const ajaxUrl = `${megaup}${ajaxPath}`;

  // Fetch encrypted ajax content
  const ajaxRes = await fetch(ajaxUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://animekai.to/"
    }
  });

  if (!ajaxRes.ok) {
    throw new Error(`Failed to load Ajax links view: HTTP ${ajaxRes.status}`);
  }

  const ajaxData = await ajaxRes.json();
  const encryptedText = ajaxData.result;

  // Decrypt Ajax view content via enc-dec.app
  const decKaiRes = await fetch("https://enc-dec.app/api/dec-kai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: encryptedText })
  });

  if (!decKaiRes.ok) {
    throw new Error(`Failed to decrypt AnimeKai link view: HTTP ${decKaiRes.status}`);
  }

  const decKaiJson = await decKaiRes.json();
  if (decKaiJson.status !== 200 || !decKaiJson.result || !decKaiJson.result.url) {
    throw new Error(`AnimeKai decryption failed: ${decKaiJson.error || 'unknown'}`);
  }

  const embedUrl = decKaiJson.result.url;

  // Decrypt hoster embed stream URL
  const hosterStream = await resolveHosterEmbed(embedUrl);

  return {
    success: true,
    provider: selectedLabel,
    availableServers,
    data: hosterStream
  };
}

// ----------------------------------------------------
// 1. Vidfast / Vidcore Scraper
// ----------------------------------------------------
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

// ----------------------------------------------------
// 2. Lordflix Scraper
// ----------------------------------------------------
async function resolveLordflix(
  type: 'movie' | 'tv',
  tmdbId: string,
  imdbId: string,
  title: string,
  year: string,
  season: string,
  episode: string,
  requestedServer?: string
) {
  // Fetch servers list
  const serversRes = await fetch("https://snowhouse.lordflix.club/servers", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://lordflix.org/",
      "Origin": "https://lordflix.org"
    }
  });

  if (!serversRes.ok) {
    throw new Error(`Failed to fetch Lordflix servers: HTTP ${serversRes.status}`);
  }

  const serversData = await serversRes.json();
  const serversList = serversData.servers || [];
  if (serversList.length === 0) {
    throw new Error("No servers available for Lordflix");
  }

  const availableServers = serversList.map((s: any) => s.name);
  const selectedServer = serversList.find((s: any) => s.name.toLowerCase() === requestedServer?.toLowerCase()) || serversList[0];
  const serverName = selectedServer.name;

  const lfType = type === 'movie' ? 'movie' : 'series';
  const queryParams: any = {
    title,
    type: lfType,
    year,
    imdb: imdbId,
    tmdb: tmdbId,
    server: serverName
  };
  if (type === 'tv') {
    queryParams.season = season;
    queryParams.episode = episode;
  }

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://snowhouse.lordflix.club/?${queryString}`;

  // Encrypt with enc-dec.app API
  const encRes = await fetch(`https://enc-dec.app/api/enc-lordflix?url=${encodeURIComponent(url)}`);
  if (!encRes.ok) {
    throw new Error(`Lordflix encryption request failed: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`Lordflix encryption failed: ${encJson.error || 'unknown'}`);
  }

  const { url: encUrl, sign } = encJson.result;

  // Fetch encrypted payload from lordflix
  const payloadRes = await fetch(encUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://lordflix.org/",
      "Origin": "https://lordflix.org"
    }
  });

  if (!payloadRes.ok) {
    throw new Error(`Failed to fetch Lordflix encrypted data: HTTP ${payloadRes.status}`);
  }

  const encryptedText = await payloadRes.text();

  // Decrypt using enc-dec.app API
  const decRes = await fetch("https://enc-dec.app/api/dec-lordflix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: encryptedText, sign })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt Lordflix stream: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Lordflix decryption failed: ${decJson.error || 'unknown'}`);
  }

  return {
    success: true,
    provider: serverName,
    availableServers,
    data: decJson.result // Contains stream sources, subtitles, etc.
  };
}

// ----------------------------------------------------
// 3. Vidsync Scraper
// ----------------------------------------------------
async function resolveVidsync(
  type: 'movie' | 'tv',
  tmdbId: string,
  title: string,
  year: string,
  season: string,
  episode: string,
  requestedServer?: string
) {
  // 1. Fetch cf turnstile token from enc-dec.app
  const encRes = await fetch("https://enc-dec.app/api/enc-vidsync");
  if (!encRes.ok) {
    throw new Error(`Failed to fetch Vidsync turnstile token: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`Vidsync encryption failed: ${encJson.error || 'unknown'}`);
  }

  const token = encJson.result.token;
  const availableServers = ["cinevault", "cinedub", "cinebox", "cineflix", "cinevip", "cinecloud", "cine4k"];
  const serverName = availableServers.includes(requestedServer || '') ? (requestedServer || '') : "cinevault";

  // Build query string
  const queryParams: any = {
    title,
    type,
    releaseYear: year,
    mediaId: tmdbId,
    serverName
  };
  if (type === 'tv') {
    queryParams.season = season;
    queryParams.episode = episode;
  }

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://vidsync.xyz/api/stream/fetch?${queryString}`;

  // Fetch encrypted payload from vidsync
  const streamRes = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://vidsync.xyz/",
      "Origin": "https://vidsync.xyz",
      "X-Requested-With": "XMLHttpRequest",
      "X-Cf-Turnstile": token
    }
  });

  if (!streamRes.ok) {
    throw new Error(`Failed to fetch Vidsync stream payload: HTTP ${streamRes.status}`);
  }

  const encryptedText = await streamRes.text();

  // Decrypt using enc-dec.app API
  const decRes = await fetch("https://enc-dec.app/api/dec-vidsync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: encryptedText, id: tmdbId })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt Vidsync stream: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Vidsync decryption failed: ${decJson.error || 'unknown'}`);
  }

  return {
    success: true,
    provider: serverName,
    availableServers,
    data: decJson.result
  };
}

// ----------------------------------------------------
// 4. Hexa Scraper
// ----------------------------------------------------
async function resolveHexa(
  type: 'movie' | 'tv',
  tmdbId: string,
  season: string,
  episode: string
) {
  // Generate a random 32-byte key hex string
  const key = crypto.randomBytes(32).toString('hex');

  // Fetch cap token
  const encRes = await fetch("https://enc-dec.app/api/enc-hexa");
  if (!encRes.ok) {
    throw new Error(`Failed to fetch Hexa challenge token: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`Hexa token request failed: ${encJson.error || 'unknown'}`);
  }

  const token = encJson.result.token;
  const url = type === 'movie'
    ? `https://theemoviedb.hexa.su/api/tmdb/movie/${tmdbId}/images`
    : `https://theemoviedb.hexa.su/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}/images`;

  // Fetch encrypted payload from Hexa
  const payloadRes = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://hexa.su/",
      "Accept": "text/plain",
      "X-Fingerprint-Lite": "e9136c41504646444",
      "X-Api-Key": key,
      "X-Cap-Token": token
    }
  });

  if (!payloadRes.ok) {
    throw new Error(`Failed to load Hexa payload: HTTP ${payloadRes.status}`);
  }

  const encryptedText = await payloadRes.text();

  // Decrypt using enc-dec.app API
  const decRes = await fetch("https://enc-dec.app/api/dec-hexa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: encryptedText, key })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt Hexa stream: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Hexa decryption failed: ${decJson.error || 'unknown'}`);
  }

  return {
    success: true,
    provider: 'Hexa Auto',
    availableServers: ['Hexa Auto'],
    data: decJson.result
  };
}

// ----------------------------------------------------
// Main Handler
// ----------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let { tmdbId, mediaType, seasonId, episodeId, title, year, server, provider, anilistId } = req.query;

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
  const anilistIdStr = typeof anilistId === 'string' ? anilistId : undefined;

  // TMDB details lookup for title, year and IMDB ID if missing
  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
  let cleanTitle = typeof title === 'string' ? title : Array.isArray(title) ? title[0] : '';
  let cleanYear = typeof year === 'string' ? year : Array.isArray(year) ? year[0] : '';
  let imdbId = '';

  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`);
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json() as any;
      if (mediaType === 'movie') {
        cleanTitle = cleanTitle || tmdbData.title || tmdbData.original_title;
        cleanYear = cleanYear || (tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '');
        imdbId = tmdbData.imdb_id || '';
      } else {
        cleanTitle = cleanTitle || tmdbData.name || tmdbData.original_name;
        cleanYear = cleanYear || (tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : '');
      }
    }
    
    // For series, get IMDB ID from external_ids endpoint
    if (mediaType === 'tv') {
      const extRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${apiKey}`);
      if (extRes.ok) {
        const extData = await extRes.json() as any;
        imdbId = extData.imdb_id || '';
      }
    }
  } catch (e) {
    console.warn("Failed to fetch metadata from TMDB:", e);
  }

  if (!cleanTitle) {
    return res.status(400).json({ error: 'title parameter is required or could not be resolved from TMDB' });
  }

  // Route to the appropriate scraper
  try {
    if (providerStr === 'animekai') {
      const result = await resolveAnimekai(
        cleanTitle,
        cleanYear,
        seasonNum,
        episodeNum,
        anilistIdStr,
        serverStr
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'vidfast' || providerStr === 'vidcore') {
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
    }

    if (providerStr === 'lordflix') {
      const result = await resolveLordflix(
        mediaType,
        tmdbId,
        imdbId,
        cleanTitle,
        cleanYear,
        seasonNum,
        episodeNum,
        serverStr
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'vidsync') {
      const result = await resolveVidsync(
        mediaType,
        tmdbId,
        cleanTitle,
        cleanYear,
        seasonNum,
        episodeNum,
        serverStr
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'hexa') {
      const result = await resolveHexa(
        mediaType,
        tmdbId,
        seasonNum,
        episodeNum
      );
      return res.status(200).json(result);
    }
  } catch (error: any) {
    console.error(`${providerStr} extraction error:`, error);
    return res.status(502).json({
      success: false,
      error: `EncDec extraction for ${providerStr} failed: ${error.message || error}`
    });
  }

  // Fallback / default to Videasy
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
    year: cleanYear ? String(cleanYear) : '',
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
