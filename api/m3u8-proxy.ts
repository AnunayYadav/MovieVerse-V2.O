import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to resolve relative paths and rewrite URIs inside .m3u8 files
function rewriteM3U8(manifestText: string, playlistUrl: string, proxyBaseUrl: string): string {
  const lines = manifestText.split('\n');
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // If it's a tag line, look for URI="..." attributes (e.g., encryption keys or alternative audio/subtitles)
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        const absoluteUri = new URL(uri, playlistUrl).toString();
        return `URI="${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}"`;
      });
    }

    // It's a segment or child playlist URL
    const absoluteUri = new URL(trimmed, playlistUrl).toString();
    return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}`;
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
    return res.status(400).send('Error: "url" parameter is required.');
  }

  try {
    // Standard headers that mimic the player origin to bypass Cloudflare
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      "Referer": "https://www.vidking.net/",
      "Origin": "https://www.vidking.net"
    };

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

      const rewrittenManifest = rewriteM3U8(manifestText, finalPlaylistUrl, proxyBaseUrl);

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
