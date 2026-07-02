import type { VercelRequest, VercelResponse } from '@vercel/node';

// Regex utility to convert SRT to VTT format
function srtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n';
  // Replace SRT time separator commas with VTT dots: HH:MM:SS,mmm -> HH:MM:SS.mmm
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

  // Retrieve API Key and Credentials from request headers or environment variables
  const apiKey = (req.headers['x-opensubtitles-key'] as string) || process.env.OPENSUBTITLES_API_KEY || '';
  const username = (req.headers['x-opensubtitles-username'] as string) || process.env.OPENSUBTITLES_USERNAME || '';
  const password = (req.headers['x-opensubtitles-password'] as string) || process.env.OPENSUBTITLES_PASSWORD || '';

  if (!apiKey) {
    return res.status(400).json({ error: 'OpenSubtitles Api-Key is required. Please set it in the headers (x-opensubtitles-key) or server configuration.' });
  }

  const userAgent = 'MovieVerse v2.0';

  // --- SEARCH ACTION ---
  if (action === 'search') {
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
          'User-Agent': userAgent,
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

  // --- DOWNLOAD ACTION ---
  if (action === 'download') {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId query parameter is required for download.' });
    }

    try {
      let authToken = '';

      // 1. Authenticate if username and password are provided
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
        } else {
          console.warn('OpenSubtitles login failed, attempting anonymous download.');
        }
      }

      // 2. Request download URL
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

      // 3. Fetch subtitle file from temporary URL
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: `Failed to fetch subtitle file from download host: ${fileRes.statusText}` });
      }

      const srtText = await fileRes.text();
      const vttText = srtToVtt(srtText);

      // 4. Return as WebVTT
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).send(vttText);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  return res.status(400).json({ error: 'Invalid or missing action. Use action=search or action=download.' });
}
