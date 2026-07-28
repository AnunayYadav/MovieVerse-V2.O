/**
 * Hayase Torrent Proxy Backend (100% Free High-Speed Swarm Engine)
 * Allows deployed web apps to stream ANY Nyaa or TCP/UDP Torrent with instant buffering.
 */

import express from 'express';
import cors from 'cors';
import torrentStream from 'torrent-stream';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;

// High-speed public trackers list for rapid swarm connections (Nyaa + Anime + P2P)
const HIGH_SPEED_TRACKERS = [
  'http://nyaa.tracker.wf:7777/announce',
  'udp://tracker.nyaa.uk:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://explodie.org:6969/announce',
  'udp://mgtracker.org:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

function getMimeType(fileName) {
  if (!fileName) return 'video/mp4';
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

// Active Engine Cache to reuse swarm connections across HTTP Range requests
const engineCache = new Map();

function getOrCreateEngine(magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i) || magnet.match(/^[a-fA-F0-9]{40}$/);
  const infoHash = match ? match[1].toLowerCase() : magnet;

  if (engineCache.has(infoHash)) {
    const cached = engineCache.get(infoHash);
    cached.lastAccess = Date.now();
    return cached.promise;
  }

  const enginePromise = new Promise((resolve, reject) => {
    console.log('[Hayase Swarm] Initializing torrent engine for hash:', infoHash);
    
    const engine = torrentStream(magnet, {
      connections: 350,
      uploads: 0,
      verify: false, // Skip slow initial hash verification for instant playback!
      trackers: HIGH_SPEED_TRACKERS
    });

    const timeout = setTimeout(() => {
      engine.destroy();
      engineCache.delete(infoHash);
      reject(new Error('Swarm connection timeout'));
    }, 15000);

    engine.on('ready', () => {
      clearTimeout(timeout);
      const file = engine.files.find(f => f.name.match(/\.(mp4|mkv|webm|avi|mov)$/i)) || engine.files[0];
      if (!file) {
        engine.destroy();
        engineCache.delete(infoHash);
        return reject(new Error('No streamable video file in torrent'));
      }
      
      // Select file for piece downloading & prioritize initial chunks
      file.select();
      
      console.log('[Hayase Swarm] Ready! Selected file:', file.name, 'Size:', file.length);
      resolve({ engine, file });
    });

    engine.on('error', (err) => {
      clearTimeout(timeout);
      engine.destroy();
      engineCache.delete(infoHash);
      reject(err);
    });
  });

  engineCache.set(infoHash, { promise: enginePromise, lastAccess: Date.now() });
  return enginePromise;
}

// Clean up inactive torrent engines every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hash, entry] of engineCache.entries()) {
    if (now - entry.lastAccess > 10 * 60 * 1000) { // 10 mins inactive
      entry.promise.then(({ engine }) => {
        try { engine.destroy(); } catch (e) {}
      }).catch(() => {});
      engineCache.delete(hash);
      console.log('[Hayase Swarm] Cleaned up inactive torrent engine:', hash);
    }
  }
}, 5 * 60 * 1000);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Hayase Torrent Proxy Engine', activeEngines: engineCache.size });
});

app.get('/nyaa', async (req, res) => {
  const query = req.query.q || '';
  try {
    const fetchRes = await fetch(`https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}`);
    const xml = await fetchRes.text();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/stream', async (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) {
    return res.status(400).send('Missing magnet parameter');
  }

  try {
    const { file } = await getOrCreateEngine(magnet);
    const mimeType = getMimeType(file.name);

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      const stream = file.createReadStream();
      stream.pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${file.length}`,
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    const stream = file.createReadStream({ start, end });
    stream.pipe(res);

    req.on('close', () => {
      stream.destroy();
    });
  } catch (err) {
    console.error('[Hayase Proxy Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Torrent Error: ' + err.message);
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Hayase High-Speed Torrent Proxy running on port ${PORT}`);
});
