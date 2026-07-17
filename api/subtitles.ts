import type { VercelRequest, VercelResponse } from '@vercel/node';

// Regex utility to convert SRT to VTT format
function srtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n';
  const timestampRegex = /(\d{2}:\d{2}:\d{2})[,.](\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2})[,.](\d{3})/g;
  vtt += srt.replace(timestampRegex, '$1.$2 --> $3.$4');
  return vtt;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-opensubtitles-key, x-opensubtitles-username, x-opensubtitles-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  // --- OPEN SUBTITLES SEARCH ACTION ---
  if (action === 'search') {
    const apiKey = (req.headers['x-opensubtitles-key'] as string) || process.env.OPENSUBTITLES_API_KEY || '';
    if (!apiKey) {
      return res.status(400).json({ error: 'OpenSubtitles Api-Key is required. Please set it in the headers (x-opensubtitles-key) or server configuration.' });
    }

    const { tmdbId, mediaType, seasonId, episodeId, languages } = req.query;
    if (!tmdbId) {
      return res.status(400).json({ error: 'tmdbId query parameter is required for search.' });
    }

    const queryParams = new URLSearchParams();
    queryParams.append('tmdb_id', String(tmdbId).trim());
    queryParams.append('languages', languages ? String(languages) : 'en');

    if (mediaType === 'tv') {
      queryParams.append('type', 'episode');
      if (seasonId) queryParams.append('season_number', String(seasonId));
      if (episodeId) queryParams.append('episode_number', String(episodeId));
    } else {
      queryParams.append('type', 'movie');
    }

    const searchUrl = `https://api.opensubtitles.com/api/v1/subtitles?${queryParams.toString()}`;

    try {
      const searchRes = await fetch(searchUrl, {
        headers: {
          'Api-Key': apiKey,
          'User-Agent': 'MovieVerse v2.0',
          'Accept': 'application/json'
        }
      });

      if (!searchRes.ok) {
        const errorText = await searchRes.text();
        return res.status(searchRes.status).json({ error: `OpenSubtitles search failed: ${errorText}` });
      }

      const data = await searchRes.json();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  // --- OPEN SUBTITLES DOWNLOAD ACTION ---
  if (action === 'download') {
    const apiKey = (req.headers['x-opensubtitles-key'] as string) || process.env.OPENSUBTITLES_API_KEY || '';
    const username = (req.headers['x-opensubtitles-username'] as string) || process.env.OPENSUBTITLES_USERNAME || '';
    const password = (req.headers['x-opensubtitles-password'] as string) || process.env.OPENSUBTITLES_PASSWORD || '';

    if (!apiKey) {
      return res.status(400).json({ error: 'OpenSubtitles Api-Key is required. Please set it in the headers (x-opensubtitles-key) or server configuration.' });
    }

    const { fileId } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId query parameter is required for download.' });
    }

    try {
      let authToken = '';
      const userAgent = 'MovieVerse v2.0';

      if (username && password) {
        const loginRes = await fetch('https://api.opensubtitles.com/api/v1/login', {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
            'User-Agent': userAgent,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          authToken = loginData.token || '';
        }
      }

      const downloadHeaders: Record<string, string> = {
        'Api-Key': apiKey,
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (authToken) {
        downloadHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: downloadHeaders,
        body: JSON.stringify({ file_id: Number(fileId) })
      });

      if (!downloadRes.ok) {
        const errText = await downloadRes.text();
        return res.status(downloadRes.status).json({ error: `OpenSubtitles download ticket failed: ${errText}` });
      }

      const downloadData = await downloadRes.json();
      const fileUrl = downloadData.link;

      if (!fileUrl) {
        return res.status(502).json({ error: 'Failed to retrieve download link from OpenSubtitles.' });
      }

      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: `Failed to fetch subtitle file from download host: ${fileRes.statusText}` });
      }

      const srtText = await fileRes.text();
      const vttText = srtToVtt(srtText);

      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).send(vttText);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  // --- GENERAL SUBTITLE PROXY ---
  let targetUrl = '';
  if (req.url) {
    const urlObj = new URL(req.url, 'http://localhost');
    const urlParam = urlObj.searchParams.get('url');
    if (urlParam) {
      targetUrl = urlParam;
    } else {
      const indexOfUrl = req.url.indexOf('url=');
      if (indexOfUrl !== -1) {
        targetUrl = decodeURIComponent(req.url.slice(indexOfUrl + 4));
      }
    }
  }

  if (!targetUrl) {
    return res.status(400).send('Error: "url" or "action" parameter is required.');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Referer": "https://www.vidking.net/",
        "Origin": "https://www.vidking.net"
      }
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return res.status(response.status).send(`Failed to fetch subtitle from upstream: ${response.statusText}. Details: ${errorText}`);
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=1800');
    return res.status(200).send(text);
  } catch (error: any) {
    return res.status(500).send(`Proxy Error: ${error.message || error}`);
  }
}
