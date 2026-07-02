import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to resolve relative paths and rewrite URIs inside .m3u8 files
function rewriteM3U8(manifestText: string, playlistUrl: string, proxyBaseUrl: string, referer: string): string {
  const lines = manifestText.split('\n');
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // If it's a tag line, look for URI="..." attributes (e.g., encryption keys or alternative audio/subtitles)
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        const absoluteUri = new URL(uri, playlistUrl).toString();
        let proxied = `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}`;
        if (referer) {
          proxied += `&referer=${encodeURIComponent(referer)}`;
        }
        return `URI="${proxied}"`;
      });
    }

    // It's a segment or child playlist URL
    const absoluteUri = new URL(trimmed, playlistUrl).toString();
    let proxied = `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}`;
    if (referer) {
      proxied += `&referer=${encodeURIComponent(referer)}`;
    }
    return proxied;
  });

  return rewrittenLines.join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let targetUrl = '';
  let refererParam = '';

  if (req.url) {
    const urlObj = new URL(req.url, 'http://localhost');
    const urlParam = urlObj.searchParams.get('url');
    const refParam = urlObj.searchParams.get('referer');
    if (urlParam) {
      targetUrl = urlParam;
    } else {
      const indexOfUrl = req.url.indexOf('url=');
      if (indexOfUrl !== -1) {
        targetUrl = decodeURIComponent(req.url.slice(indexOfUrl + 4).split('&')[0]);
      }
    }
    if (refParam) {
      refererParam = refParam;
    } else {
      const indexOfRef = req.url.indexOf('referer=');
      if (indexOfRef !== -1) {
        refererParam = decodeURIComponent(req.url.slice(indexOfRef + 8).split('&')[0]);
      }
    }
  }

  if (!targetUrl) {
    return res.status(400).send('Error: "url" parameter is required.');
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    };

    if (refererParam) {
      headers["Referer"] = refererParam;
      try {
        const originUrl = new URL(refererParam);
        headers["Origin"] = originUrl.origin;
      } catch {}
    } else {
      // Fallback headers that mimic the player origin to bypass Cloudflare
      if (!targetUrl.includes('.workers.dev') && (targetUrl.includes('vidking') || targetUrl.includes('videasy') || targetUrl.includes('flixcloud'))) {
        headers["Referer"] = "https://www.vidking.net/";
        headers["Origin"] = "https://www.vidking.net";
      }
    }

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return res.status(response.status).send(`Failed to fetch streaming resource from upstream: ${response.statusText}. Details: ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || targetUrl.includes('.m3u8');

    if (isM3U8) {
      // It is an HLS playlist index. Download the text, rewrite the URLs, and return it.
      const manifestText = await response.text();
      const finalPlaylistUrl = response.url || targetUrl; // Use final redirected URL to resolve paths
      
      const host = req.headers.host || 'localhost';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const proxyBaseUrl = `${protocol}://${host}/api/m3u8-proxy`;

      const rewrittenManifest = rewriteM3U8(manifestText, finalPlaylistUrl, proxyBaseUrl, refererParam);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).send(rewrittenManifest);
    } else {
      // It is a binary chunk (segment, encryption key, etc.). Stream it back directly.
      res.status(response.status);
      for (const [key, value] of response.headers.entries()) {
        if (['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }
      res.setHeader('Access-Control-Allow-Origin', '*');

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      return res.end();
    }
  } catch (error: any) {
    return res.status(500).send(`Stream Proxy Error: ${error.message || error}`);
  }
}
