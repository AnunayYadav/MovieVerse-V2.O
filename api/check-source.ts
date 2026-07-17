import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL parameter is required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    // If it's a 404, the movie/episode is definitely not on the server
    if (response.status === 404) {
      return res.status(200).json({ exists: false, status: 404 });
    }

    // If it's a Cloudflare block or server block (403/503/401)
    // We assume it's online to avoid false-negatives for end-users, since it might work in their browser
    if (response.status === 403 || response.status === 503 || response.status === 401) {
      return res.status(200).json({ exists: true, status: response.status, reason: 'blocked_cloudflare_fallback' });
    }

    // For successful responses, inspect the content to check if it's an error page or a 404
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      // Check for common error properties
      if (
        data.error === 'Not Found' ||
        data.message === 'Not Found' ||
        data.success === false ||
        (typeof data.error === 'string' && data.error.toLowerCase().includes('not found'))
      ) {
        return res.status(200).json({ exists: false, status: 200, reason: 'json_error_not_found' });
      }
    } else {
      // HTML or Text response
      const text = await response.text().catch(() => '');
      const textLower = text.toLowerCase();
      
      // Heuristics for common 404 pages
      if (
        textLower.includes('<title>404') ||
        textLower.includes('404 page not found') ||
        textLower.includes('404 | this page could not be found') ||
        (textLower.includes('{"error"') && textLower.includes('not found'))
      ) {
        return res.status(200).json({ exists: false, status: 200, reason: 'html_contains_404_text' });
      }
    }

    return res.status(200).json({ exists: true, status: response.status });
  } catch (error: any) {
    // If fetching the specific player URL failed (e.g. SSL/DNS/connection error)
    // Try to fallback to checking if the root domain's favicon is alive
    try {
      const rootDomain = new URL(url).origin;
      const favController = new AbortController();
      const favTimeout = setTimeout(() => favController.abort(), 2000);

      const favResponse = await fetch(`${rootDomain}/favicon.ico`, {
        mode: 'no-cors',
        signal: favController.signal
      });
      clearTimeout(favTimeout);

      // If domain's favicon loaded successfully, the domain is up, so fallback to online
      if (favResponse.ok || favResponse.status === 0 || favResponse.status === 404) {
        return res.status(200).json({ exists: true, status: 200, reason: 'favicon_fallback_success' });
      }
    } catch (_) {
      // Fall through to error
    }

    return res.status(200).json({ exists: false, status: 0, reason: error.message || 'fetch_failed' });
  }
}
