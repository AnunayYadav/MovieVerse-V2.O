import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to resolve relative paths and rewrite URIs inside .m3u8 files
function rewriteM3U8(manifestText: string, playlistUrl: string, proxyBaseUrl: string, customReferer?: string): string {
  const lines = manifestText.split('\n');
  const refererParam = customReferer ? `&referer=${encodeURIComponent(customReferer)}` : '';
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // If it's a tag line, look for URI="..." attributes (e.g., encryption keys or alternative audio/subtitles)
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        const absoluteUri = new URL(uri, playlistUrl).toString();
        return `URI="${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}${refererParam}"`;
      });
    }

    // It's a segment or child playlist URL
    const absoluteUri = new URL(trimmed, playlistUrl).toString();
    
    // Check if the URL is a child playlist (usually contains .m3u8 or .m3u)
    const isPlaylist = absoluteUri.toLowerCase().includes('.m3u8') || absoluteUri.toLowerCase().includes('.m3u');
    if (isPlaylist) {
      return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}${refererParam}`;
    }
    
    // For segment files (e.g., .ts, .m4s, etc.), return the absolute CDN URL directly.
    // This allows the browser to stream segments directly from the CDN, bypassing Vercel entirely.
    return absoluteUri;
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
    const customReferer = req.query.referer;
    let referer = typeof customReferer === 'string' ? customReferer : "https://www.vidking.net/";
    let origin = referer.endsWith('/') ? referer.slice(0, -1) : referer;

    if (!customReferer) {
      if (targetUrl.includes('videasy') || targetUrl.includes('easy') || targetUrl.includes('player.videasy')) {
        referer = "https://player.videasy.to/";
        origin = "https://player.videasy.to";
      } else if (targetUrl.includes('lordflix')) {
        referer = "https://lordflix.org/";
        origin = "https://lordflix.org";
      } else if (targetUrl.includes('vidsync')) {
        referer = "https://vidsync.xyz/";
        origin = "https://vidsync.xyz";
      } else if (targetUrl.includes('hexa')) {
        referer = "https://hexa.su/";
        origin = "https://hexa.su";
      }
    }

    // Standard headers that mimic the player origin to bypass Cloudflare
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      "Referer": referer,
      "Origin": origin
    };

    const fetchWithRedirects = async (target: string, requestHeaders: Record<string, string>) => {
      let resp = await fetch(target, { headers: requestHeaders, redirect: 'manual' });
      let redirectCount = 0;
      const maxRedirects = 5;
      let currentUrl = target;
      while (resp.status >= 300 && resp.status < 400 && redirectCount < maxRedirects) {
        const location = resp.headers.get('location');
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        resp = await fetch(currentUrl, { headers: requestHeaders, redirect: 'manual' });
        redirectCount++;
      }
      return { response: resp, finalUrl: currentUrl };
    };

    let { response, finalUrl } = await fetchWithRedirects(targetUrl, headers);

    if (response.status === 403 || response.status === 401) {
      // Retry with alt referer
      const altHeaders = {
        "User-Agent": headers["User-Agent"],
        "Referer": "https://www.vidking.net/",
        "Origin": "https://www.vidking.net"
      };
      const retryResult = await fetchWithRedirects(targetUrl, altHeaders);
      if (retryResult.response.ok) {
        response = retryResult.response;
        finalUrl = retryResult.finalUrl;
      } else {
        // Try with no referer/origin
        const cleanHeaders = {
          "User-Agent": headers["User-Agent"]
        };
        const cleanResult = await fetchWithRedirects(targetUrl, cleanHeaders);
        if (cleanResult.response.ok) {
          response = cleanResult.response;
          finalUrl = cleanResult.finalUrl;
        }
      }
    }

    targetUrl = finalUrl;

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

      const rewrittenManifest = rewriteM3U8(
        manifestText, 
        finalPlaylistUrl, 
        proxyBaseUrl, 
        typeof customReferer === 'string' ? customReferer : undefined
      );

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).send(rewrittenManifest);
    } else {
      // It is a binary chunk (segment, encryption key, etc.).
      // To drastically reduce Vercel Fast Origin Transfer bandwidth and active CPU time,
      // we redirect the browser to the direct CDN URL instead of proxying the binary data.
      res.writeHead(302, { 'Location': targetUrl });
      return res.end();
    }
  } catch (error: any) {
    return res.status(500).send(`Stream Proxy Error: ${error.message || error}`);
  }
}
