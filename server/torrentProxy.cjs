/**
 * Hayase Torrent Proxy Backend (CommonJS Version)
 */

const express = require('express');
const cors = require('cors');
const torrentStream = require('torrent-stream');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Hayase Torrent Proxy Engine' });
});

app.get('/stream', (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) {
    return res.status(400).send('Missing magnet parameter');
  }

  console.log('[Hayase Proxy] Fetching torrent from Nyaa/Swarm:', String(magnet).substring(0, 60));

  const engine = torrentStream(magnet, {
    trackers: [
      'http://nyaa.tracker.wf:7777/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://open.stealth.si:80/announce',
      'udp://exodus.desync.com:6969/announce',
      'wss://tracker.openwebtorrent.com'
    ]
  });

  engine.on('ready', () => {
    // Find primary video file (.mp4, .mkv, .webm)
    const file = engine.files.find(f => f.name.match(/\.(mp4|mkv|webm|avi|mov)$/i)) || engine.files[0];

    if (!file) {
      engine.destroy();
      return res.status(404).send('No video file found in torrent');
    }

    console.log('[Hayase Proxy] Streaming file:', file.name, 'Size:', file.length);

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes'
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
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes'
    });

    const stream = file.createReadStream({ start, end });
    stream.pipe(res);

    req.on('close', () => {
      stream.destroy();
    });
  });

  engine.on('error', (err) => {
    console.error('[Hayase Proxy Error]:', err);
    if (!res.headersSent) {
      res.status(500).send('Torrent Error: ' + err.message);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Hayase Torrent Proxy running on port ${PORT}`);
});
