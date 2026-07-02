import type { VercelRequest, VercelResponse } from '@vercel/node';
import zlib from 'zlib';

const MIRURO_PIPE_URL = 'https://www.miruro.tv/api/secure/pipe';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.miruro.tv/'
};

function encodePipeRequest(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  return Buffer.from(jsonStr).toString('base64url');
}

function decodePipeResponse(encodedStr: string): any {
  const buffer = Buffer.from(encodedStr, 'base64url');
  const decompressed = zlib.gunzipSync(buffer);
  return JSON.parse(decompressed.toString('utf-8'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { anilistId, episode, lang } = req.query;

  if (!anilistId) {
    return res.status(400).json({ success: false, error: "Missing anilistId parameter." });
  }

  const epNum = episode ? parseInt(String(episode), 10) : 1;
  const category = lang === 'dub' ? 'dub' : 'sub';

  try {
    // 1. Fetch episodes list from Miruro secure pipe
    const epPayload = {
      path: "episodes",
      method: "GET",
      query: { anilistId: Number(anilistId) },
      body: null,
      version: "0.1.0"
    };

    const epEnc = encodePipeRequest(epPayload);
    const epRes = await fetch(`${MIRURO_PIPE_URL}?e=${epEnc}`, { headers: HEADERS });
    if (!epRes.ok) {
      throw new Error(`Failed to fetch episodes from Miruro: HTTP ${epRes.status}`);
    }

    const epText = await epRes.text();
    const epData = decodePipeResponse(epText.trim());

    if (!epData || !epData.providers) {
      throw new Error("Invalid episodes data from Miruro pipe.");
    }

    // Find the first provider with episodes for the target category
    let matchedEpisodeId = '';
    let matchedProvider = '';

    for (const [providerName, providerInfo] of Object.entries(epData.providers)) {
      const info = providerInfo as any;
      if (!info || !info.episodes) continue;
      
      const epList = info.episodes[category] || info.episodes.sub || [];
      if (!Array.isArray(epList)) continue;

      const targetEp = epList.find((e: any) => e.number === epNum);
      if (targetEp && targetEp.id) {
        matchedEpisodeId = targetEp.id;
        matchedProvider = providerName;
        break;
      }
    }

    if (!matchedEpisodeId) {
      return res.status(404).json({ success: false, error: `Episode ${epNum} (${category}) not found on Miruro.` });
    }

    // 2. Fetch sources for the matched episode
    const encEpId = Buffer.from(matchedEpisodeId).toString('base64url');
    const srcPayload = {
      path: "sources",
      method: "GET",
      query: {
        episodeId: encEpId,
        provider: matchedProvider,
        category: category,
        anilistId: Number(anilistId)
      },
      body: null,
      version: "0.1.0"
    };

    const srcEnc = encodePipeRequest(srcPayload);
    const srcRes = await fetch(`${MIRURO_PIPE_URL}?e=${srcEnc}`, { headers: HEADERS });
    if (!srcRes.ok) {
      throw new Error(`Failed to fetch sources from Miruro: HTTP ${srcRes.status}`);
    }

    const srcText = await srcRes.text();
    const srcData = decodePipeResponse(srcText.trim());

    if (!srcData) {
      throw new Error("Invalid sources data from Miruro pipe.");
    }

    const rawSources = srcData.sources || [];
    const rawSubtitles = srcData.subtitles || [];

    const sources = rawSources.map((s: any) => ({
      file: s.url,
      label: s.quality || 'Auto',
      type: s.isM3U8 ? 'hls' : 'mp4'
    }));

    const subtitles = rawSubtitles.map((sub: any) => ({
      file: sub.url,
      label: sub.lang || sub.label || 'English',
      kind: 'captions'
    }));

    return res.status(200).json({
      success: true,
      data: {
        sources,
        subtitles
      }
    });
  } catch (e: any) {
    console.error("Miruro resolution error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
