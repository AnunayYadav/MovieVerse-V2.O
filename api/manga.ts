import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANGA } from '@consumet/extensions';

// Initialize and cache provider instances
const providers: Record<string, any> = {
  mangadex: new MANGA.MangaDex(),
  comick: new MANGA.ComicK(),
  mangahere: new MANGA.MangaHere(),
  mangapill: new MANGA.MangaPill(),
  mangareader: new MANGA.MangaReader(),
  asurascans: new MANGA.AsuraScans(),
  weebcentral: new MANGA.WeebCentral(),
  mangakakalot: new MANGA.MangaKakalot()
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, query, id, provider: providerQuery } = req.query;

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action parameter is required and must be a string' });
  }

  // Resolve the active provider (defaults to mangapill)
  const providerKey = typeof providerQuery === 'string' ? providerQuery.toLowerCase() : 'mangapill';
  const provider = providers[providerKey] || providers.mangapill;

  try {
    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
      const data = await provider.search(query);
      // Ensure we always return a flat array of results
      const results = Array.isArray(data) ? data : (data.results || []);
      return res.status(200).json(results);
    }

    if (action === 'info') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }
      const data = await provider.fetchMangaInfo(id);
      return res.status(200).json(data);
    }

    if (action === 'pages') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
      }
      const data = await provider.fetchChapterPages(id);
      return res.status(200).json(data);
    }

    if (action === 'proxy-image') {
      const imageUrl = req.query.url;
      const refererUrl = req.query.referer || provider.baseUrl;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      };

      if (refererUrl && typeof refererUrl === 'string') {
        headers['Referer'] = refererUrl;
      }

      const response = await fetch(imageUrl, { headers });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Proxy fetch failed: ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      // Cache the image for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      const arrayBuffer = await response.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    }

    if (action === 'translate') {
      let image_url = '';
      let target_lang = 'English';

      if (req.method === 'POST') {
        image_url = req.body?.image_url;
        target_lang = req.body?.target_lang || 'English';
      } else {
        image_url = req.query?.url as string || req.query?.image_url as string;
        target_lang = (req.query?.target_lang as string) || 'English';
      }

      if (!image_url) {
        return res.status(400).json({ error: 'image_url parameter is required' });
      }

      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured' });
      }

      // Extract raw image URL if it's nested inside a proxy URL
      let rawImageUrl = image_url;
      if (image_url.includes('url=')) {
        try {
          const urlObj = new URL(image_url, 'http://localhost');
          rawImageUrl = urlObj.searchParams.get('url') || image_url;
        } catch (e) {
          const match = image_url.match(/[?&]url=([^&]+)/);
          if (match) {
            rawImageUrl = decodeURIComponent(match[1]);
          }
        }
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      };

      try {
        const urlObj = new URL(rawImageUrl);
        headers['Referer'] = urlObj.origin + '/';
      } catch (e) {
        // Ignore URL parsing errors
      }

      const imageRes = await fetch(rawImageUrl, { headers });
      if (!imageRes.ok) {
        return res.status(imageRes.status).json({ error: `Failed to fetch image from URL: ${imageRes.statusText}` });
      }

      const arrayBuffer = await imageRes.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      let contentType = imageRes.headers.get('content-type') || 'image/png';
      if (!contentType.startsWith('image/')) {
        contentType = 'image/png';
      }

      const prompt = `You are a professional manga translator. Analyze the manga page image provided.
Identify all text bubbles or text areas containing Japanese text.
For each text area, find its bounding box in normalized coordinates [ymin, xmin, ymax, xmax] (from 0 to 1000, representing percentage of image height/width from top-left).
Translate the Japanese text to ${target_lang}.
Return a JSON object containing a "blocks" array. Each block must have:
- "box_2d": [ymin, xmin, ymax, xmax] (numbers, e.g. [120, 450, 230, 580])
- "original_text": "original Japanese text"
- "translated_text": "translated text in ${target_lang}"`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: contentType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Gemini API error: ${errorText}` });
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const parsedData = JSON.parse(text.trim());
      return res.status(200).json(parsedData);
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Manga API error [action=${action}, provider=${providerKey}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
