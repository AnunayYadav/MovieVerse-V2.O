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
  const ajaxPath = ep.sources[type][server]; // media/kJCpIDyoWS2JcOLyFL5L7BvpCQ

  // Try all megaup and rapidshare mirrors from the database
  const megaupMirrors = entry.info?.mirrors?.megaup || [];
  const rapidshareMirrors = entry.info?.mirrors?.rapidshare || [];
  const mirrors = [...megaupMirrors, ...rapidshareMirrors];
  if (mirrors.length === 0) {
    mirrors.push(
      'https://megaup.nl/',
      'https://megaup.live/',
      'https://rapidshare.work/',
      'https://rapidshare.cc/'
    );
  }

  let successText = '';
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

  for (const mirror of mirrors) {
    const finalUrl = `${mirror}${ajaxPath}`;
    const embedCode = ajaxPath.replace('media/', '');
    const referer = `${mirror}e/${embedCode}`;

    try {
      const mediaRes = await fetch(finalUrl, {
        headers: {
          "User-Agent": userAgent,
          "Referer": referer
        }
      });

      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json();
        if (mediaJson && mediaJson.result) {
          successText = mediaJson.result;
          break;
        }
      }
    } catch (e) {
      console.warn(`AnimeKai mirror ${mirror} fetch failed:`, e);
    }
  }

  if (!successText) {
    throw new Error("All AnimeKai mirrors failed to resolve the media content (HTTP 522/403/404)");
  }

  // Decrypt using dec-mega
  const decRes = await fetch("https://enc-dec.app/api/dec-mega", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: successText,
      agent: userAgent
    })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt AnimeKai hoster media: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`AnimeKai hoster decryption failed: ${decJson.error || 'unknown'}`);
  }

  return {
    success: true,
    provider: selectedLabel,
    availableServers,
    data: decJson.result
  };
}

// ----------------------------------------------------
// 1. Hexa Scraper
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
// 2. Vidlink Scraper
// ----------------------------------------------------
async function resolveVidlink(
  type: 'movie' | 'tv',
  tmdbId: string,
  season: string,
  episode: string
) {
  // 1. Get encrypted TMDB ID from enc-dec.app API
  const encUrl = `https://enc-dec.app/api/enc-vidlink?text=${tmdbId}`;
  const encRes = await fetch(encUrl);
  if (!encRes.ok) {
    throw new Error(`Failed to encrypt TMDB ID for Vidlink: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json() as any;
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`Vidlink encryption failed: ${encJson.error || 'unknown'}`);
  }

  const encrypted = encJson.result;

  // 2. Fetch from Vidlink API
  const url = type === 'movie'
    ? `https://vidlink.pro/api/b/movie/${encrypted}`
    : `https://vidlink.pro/api/b/tv/${encrypted}/${season}/${episode}`;

  const fetchRes = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Origin": "https://vidlink.pro",
      "Referer": "https://vidlink.pro/"
    }
  });

  if (!fetchRes.ok) {
    throw new Error(`Vidlink API request failed: HTTP ${fetchRes.status}`);
  }

  const data = await fetchRes.json() as any;

  // 3. Transform to unified stream/subtitle structure expected by the player
  const sources: any[] = [];
  if (data.stream && data.stream.qualities) {
    for (const [q, details] of Object.entries(data.stream.qualities) as any) {
      sources.push({
        url: details.url,
        quality: `${q}p`,
        label: `${q}p`,
        type: details.type === 'hls' ? 'hls' : 'mp4'
      });
    }
  }

  // Fallback to playlist URL if qualities object is missing
  if (sources.length === 0 && data.stream && data.stream.playlist) {
    sources.push({
      url: data.stream.playlist,
      quality: 'Auto',
      label: 'Auto',
      type: 'hls'
    });
  }

  const rawCaptions = data.captions || (data.stream && data.stream.captions) || [];
  const subtitles = rawCaptions.map((cap: any) => ({
    url: cap.url,
    label: cap.language || cap.lang || 'English'
  }));

  return {
    success: true,
    provider: 'VidLink Direct',
    availableServers: ['VidLink Direct'],
    data: {
      sources,
      subtitles
    }
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
  const providerStr = typeof provider === 'string' ? provider.toLowerCase() : 'animekai';
  const serverStr = typeof server === 'string' ? server : undefined;
  const anilistIdStr = typeof anilistId === 'string' ? anilistId : undefined;

  // TMDB details lookup for title, year and IMDB ID if missing
  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
  let cleanTitle = typeof title === 'string' ? title : Array.isArray(title) ? title[0] : '';
  let cleanYear = typeof year === 'string' ? year : Array.isArray(year) ? year[0] : '';

  if (!cleanTitle || !cleanYear) {
    try {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        if (mediaType === 'movie') {
          cleanTitle = cleanTitle || tmdbData.title || tmdbData.original_title;
          cleanYear = cleanYear || (tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '');
        } else {
          cleanTitle = cleanTitle || tmdbData.name || tmdbData.original_name;
          cleanYear = cleanYear || (tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : '');
        }
      }
    } catch (e) {
      console.warn("Failed to fetch metadata from TMDB:", e);
    }
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

    if (providerStr === 'hexa') {
      const result = await resolveHexa(
        mediaType,
        tmdbId,
        seasonNum,
        episodeNum
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'vidlink') {
      try {
        const result = await resolveVidlink(
          mediaType,
          tmdbId,
          seasonNum,
          episodeNum
        );
        return res.status(200).json(result);
      } catch (err: any) {
        console.warn(`VidLink direct decryption failed: ${err.message}. Falling back to iframe.`);
        return res.status(200).json({
          success: true,
          provider: 'VidLink Iframe Fallback',
          availableServers: ['VidLink Iframe Fallback'],
          data: {
            iframeUrl: mediaType === 'movie'
              ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=EF4444`
              : `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${episodeNum}?primaryColor=EF4444`
          }
        });
      }
    }

    return res.status(400).json({ error: `Unsupported provider: ${providerStr}` });
  } catch (error: any) {
    console.error(`${providerStr} extraction error:`, error);
    return res.status(502).json({
      success: false,
      error: `EncDec extraction for ${providerStr} failed: ${error.message || error}`
    });
  }
}
