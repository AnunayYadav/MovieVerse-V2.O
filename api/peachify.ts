import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';

// --- Cryptographic Helper Functions ---

function dC(e: string): Uint8Array {
  let t = e.replace(/-/g, "+").replace(/_/g, "/");
  let i = t.length % 4 === 0 ? "" : "=".repeat(4 - (t.length % 4));
  let r = globalThis.atob(t + i);
  let s = new Uint8Array(r.length);
  for (let e = 0; e < r.length; e++) {
    s[e] = r.charCodeAt(e);
  }
  return s;
}

async function dP(e: string) {
  let t = new Uint8Array(e.match(/.{1,2}/g)!.map(e => parseInt(e, 16)));
  const webcrypto = crypto.webcrypto as any;
  return await webcrypto.subtle.importKey("raw", t, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function dD(e: string, t: string) {
  try {
    let [i, r, s] = e.split(".");
    let n = dC(i);
    let a = dC(r);
    let l = dC(s);
    let o = new Uint8Array(a.length + l.length);
    o.set(a, 0);
    o.set(l, a.length);
    let u = await dP(t);
    const webcrypto = crypto.webcrypto as any;
    let d = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv: n }, u, o);
    let h = new TextDecoder().decode(d);
    return JSON.parse(h);
  } catch (err: any) {
    console.error("AES-GCM decryption failed:", err.message);
    return null;
  }
}

// --- Browser TLS Spoofing Helper ---

function fetchWithBrowserTls(urlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const ciphers = [
        'TLS_AES_128_GCM_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305'
      ].join(':');

      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://peachify.pro/',
          'Origin': 'https://peachify.pro',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        ciphers,
        honorCipherOrder: true,
        minVersion: 'TLSv1.3' as any
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e: any) {
              reject(new Error(`Failed to parse response JSON: ${e.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 150)}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// --- Peachify Stream Scraper Config & Handler ---

const servers = [
  { name: "Iron", path: "moviebox", api: "https://uwu.eat-peach.sbs" },
  { name: "Spider", path: "holly", api: "https://usa.eat-peach.sbs" },
  { name: "Wolf", path: "air", api: "https://usa.eat-peach.sbs" },
  { name: "Multi", path: "multi", api: "https://usa.eat-peach.sbs" },
  { name: "Dark", path: "net", api: "https://uwu.eat-peach.sbs" }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let { tmdbId, mediaType, seasonId, episodeId } = req.query;

  if (!tmdbId || typeof tmdbId !== 'string') {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }
  if (!mediaType || typeof mediaType !== 'string' || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return res.status(400).json({ error: 'mediaType parameter is required (movie or tv)' });
  }

  const seasonNum = seasonId ? String(seasonId) : '1';
  const episodeNum = episodeId ? String(episodeId) : '1';

  let successData: any = null;
  let successfulProvider = '';
  const errors: string[] = [];

  for (const server of servers) {
    let url = `${server.api}/${server.path}/${mediaType}/${tmdbId}`;
    if (mediaType === 'tv') {
      url += `/${seasonNum}/${episodeNum}`;
    }

    try {
      const o = await fetchWithBrowserTls(url);
      if (!o) {
        errors.push(`${server.name}: Empty response`);
        continue;
      }

      let decrypted = o;
      if (o.isEncrypted && o.data) {
        decrypted = await dD(o.data, "a8f2a1b5e9c470814f6b2c3a5d8e7f9c1a2b3c4d5e3f7a8b8cad1e2d0a4d5c5d");
      }

      if (decrypted && decrypted.sources && decrypted.sources.length > 0) {
        successData = decrypted;
        successfulProvider = server.name;
        break; // Found working streams
      } else {
        errors.push(`${server.name}: No active sources returned`);
      }
    } catch (err: any) {
      errors.push(`${server.name}: ${err.message || err}`);
    }
  }

  if (successData) {
    return res.status(200).json({
      success: true,
      provider: successfulProvider,
      data: successData
    });
  } else {
    return res.status(502).json({
      success: false,
      error: `All Peachify providers failed — ${errors.join('; ')}`
    });
  }
}
