/**
 * Hayase Torrent Proxy & Cloud Engines Service
 * Converts TCP/UDP Magnet links (Nyaa, 1337x, etc.) into instant HTTP video streams.
 */

export interface TorBoxCachedItem {
  name?: string;
  size?: number;
  files?: Array<{ name: string; size: number; s3_path?: string }>;
  hash?: string;
}

/**
 * Extract 40-character hex infoHash from magnet URI or raw infoHash string
 */
export function extractInfoHash(magnetOrHash: string): string | null {
  if (!magnetOrHash) return null;
  const match = magnetOrHash.match(/urn:btih:([a-fA-F0-9]{40})/i) || magnetOrHash.match(/^[a-fA-F0-9]{40}$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Stream any Nyaa or BitTorrent Magnet via Hayase Free Proxy Engine
 */
export async function resolveHayaseProxyStream(magnetUri: string, customProxyUrl?: string): Promise<{
  streamUrl: string;
  fileName: string;
} | null> {
  const proxyBase = (customProxyUrl || localStorage.getItem('hayase_proxy_url') || 'http://localhost:4000').replace(/\/$/, '');
  const encodedMagnet = encodeURIComponent(magnetUri);

  // Ping proxy
  try {
    const health = await fetch(`${proxyBase}/health`, { signal: AbortSignal.timeout(2000) });
    if (!health.ok) {
      throw new Error('Proxy server returned non-OK status');
    }
  } catch (e) {
    console.warn('[Hayase Proxy] Health check warning:', e);
  }

  return {
    streamUrl: `${proxyBase}/stream?magnet=${encodedMagnet}`,
    fileName: 'Nyaa P2P Torrent Stream'
  };
}

/**
 * Detect & Stream via Local Free TCP/UDP Engine (Stremio Server / Local Hybrid Engine at http://127.0.0.1:11470)
 * 100% Free & Unlimited. Connects to standard TCP/UDP Nyaa seeders over local engine proxy.
 */
export async function resolveLocalStremioEngine(magnetUri: string): Promise<{
  streamUrl: string;
  fileName: string;
} | null> {
  const infoHash = extractInfoHash(magnetUri);
  if (!infoHash) {
    throw new Error('Invalid infoHash in magnet link');
  }

  const ports = [11470, 8888, 8080];
  let activePort: number | null = null;

  for (const port of ports) {
    try {
      const ping = await fetch(`http://127.0.0.1:${port}/stats.json`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (ping.ok) {
        activePort = port;
        break;
      }
    } catch (e) {}
  }

  if (!activePort) {
    throw new Error('Local Engine not running on 127.0.0.1:11470. Launch Stremio (or WebTorrent Desktop) locally to enable 100% FREE & UNLIMITED TCP/UDP Nyaa streaming!');
  }

  return {
    streamUrl: `http://127.0.0.1:${activePort}/stream/torrent/${infoHash}`,
    fileName: `Local Engine Stream (${infoHash.substring(0, 8)})`
  };
}

/**
 * Check if a torrent infoHash is instantly cached on TorBox (Free API check)
 */
export async function checkTorBoxCache(infoHash: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.torbox.app/v1/api/torrents/checkcached?hash=${infoHash}&format=object`);
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.success && data.data) {
      const match = data.data[infoHash.toLowerCase()] || data.data[infoHash.toUpperCase()];
      return Boolean(match);
    }
    return false;
  } catch (e) {
    console.warn('[TorBox] Cache check error:', e);
    return false;
  }
}

/**
 * Create a torrent on TorBox using user API Token or public gateway
 */
export async function resolveTorBoxStream(magnetUri: string, apiToken?: string): Promise<{
  streamUrl: string;
  fileName: string;
} | null> {
  const token = apiToken || localStorage.getItem('torbox_api_key') || '';
  if (!token) {
    throw new Error('TorBox API Token required to add new cloud torrents. Enter your free API token from torbox.app in settings.');
  }

  try {
    const formData = new FormData();
    formData.append('magnet', magnetUri);

    const createRes = await fetch('https://api.torbox.app/v1/api/torrents/createtorrent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const createData = await createRes.json();
    if (!createData.success) {
      throw new Error(createData.detail || createData.message || 'TorBox creation failed');
    }

    const torrentId = createData.data?.torrent_id || createData.data?.id;
    if (!torrentId) {
      throw new Error('TorBox did not return a valid torrent ID');
    }

    // Request download link for primary video file
    const dlRes = await fetch(`https://api.torbox.app/v1/api/torrents/requestdl?token=${token}&torrent_id=${torrentId}&zip=false`);
    const dlData = await dlRes.json();

    if (dlData && dlData.success && dlData.data) {
      return {
        streamUrl: dlData.data,
        fileName: createData.data?.name || 'Cloud Video Stream'
      };
    }
    throw new Error('Failed to generate TorBox stream URL');
  } catch (err: any) {
    console.error('[TorBox] Stream Resolution Error:', err);
    throw err;
  }
}

/**
 * Seedr Cloud Torrent Resolution (Free Tier Token)
 */
export async function resolveSeedrStream(magnetUri: string, seedrToken?: string): Promise<{
  streamUrl: string;
  fileName: string;
} | null> {
  const token = seedrToken || localStorage.getItem('seedr_api_key') || '';
  if (!token) {
    throw new Error('Seedr API Token required. Enter your free token in settings.');
  }

  try {
    const body = new URLSearchParams();
    body.append('magnet', magnetUri);
    body.append('access_token', token);

    const res = await fetch('https://www.seedr.cc/api/torrent/magnet', {
      method: 'POST',
      body
    });

    const data = await res.json();
    if (data.user_torrent_id) {
      return {
        streamUrl: `https://www.seedr.cc/api/media/stream/${data.user_torrent_id}`,
        fileName: data.title || 'Seedr Cloud Stream'
      };
    }
    throw new Error(data.error || 'Seedr torrent creation failed');
  } catch (err: any) {
    console.error('[Seedr] Resolution Error:', err);
    throw err;
  }
}
