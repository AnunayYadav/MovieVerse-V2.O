import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------
// 0. AnimeKai Scraper & Hoster Resolver (from encdec)
// ----------------------------------------------------
async function resolveHosterEmbed(embed: string) {
  const referer = embed.split('/e/')[0] + '/';
  const mediaUrl = embed.replace('/e/', '/media/');

  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  const mediaRes = await fetch(mediaUrl, {
    headers: {
      "User-Agent": userAgent,
      "Referer": referer
    }
  });

  if (!mediaRes.ok) {
    throw new Error(`Failed to fetch media data from hoster: HTTP ${mediaRes.status}`);
  }

  const mediaJson = await mediaRes.json();
  const encrypted = mediaJson.result;

  const decRes = await fetch("https://enc-dec.app/api/dec-mega", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: encrypted,
      agent: userAgent
    })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt hoster media: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Hoster decryption failed: ${decJson.error || 'unknown'}`);
  }

  return decJson.result;
}

async function resolveAnimekai(
  title: string,
  year: string,
  season: string,
  episode: string,
  anilistId?: string,
  requestedServer?: string
) {
  let entry: any = null;

  if (anilistId) {
    try {
      const findRes = await fetch(`https://enc-dec.app/db/kai/find?anilist_id=${anilistId}`);
      if (findRes.ok) {
        const findJson = await findRes.json();
        if (Array.isArray(findJson) && findJson.length > 0) {
          entry = findJson[0];
        }
      }
    } catch (e) {
      console.warn("Failed to find AnimeKai by Anilist ID:", e);
    }
  }

  if (!entry) {
    try {
      const searchRes = await fetch(`https://enc-dec.app/db/kai/search?q=${encodeURIComponent(title)}`);
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (Array.isArray(searchJson) && searchJson.length > 0) {
          const yearNum = parseInt(year, 10);
          if (!isNaN(yearNum)) {
            entry = searchJson.find((item: any) => Math.abs(item.year - yearNum) <= 1) || searchJson[0];
          } else {
            entry = searchJson[0];
          }
        }
      }
    } catch (e) {
      console.warn("Failed to search AnimeKai by title:", e);
    }
  }

  if (!entry) {
    throw new Error(`Anime not found on AnimeKai database`);
  }

  const epUrl = `https://enc-dec.app/db/kai/episodes?id=${entry.id}&episode=${episode}`;
  const epRes = await fetch(epUrl);
  if (!epRes.ok) {
    throw new Error(`Failed to fetch episodes data from AnimeKai: HTTP ${epRes.status}`);
  }

  const epJson = await epRes.json();
  if (!epJson.success || !epJson.servers) {
    throw new Error(`AnimeKai returned no stream servers for episode ${episode}`);
  }

  const servers = epJson.servers;
  let activeServer = requestedServer;
  if (!activeServer || !servers.includes(activeServer)) {
    activeServer = servers[0];
  }

  const embedUrl = `https://enc-dec.app/db/kai/embed?id=${entry.id}&episode=${episode}&server=${activeServer}`;
  const embedRes = await fetch(embedUrl);
  if (!embedRes.ok) {
    throw new Error(`Failed to resolve AnimeKai embed: HTTP ${embedRes.status}`);
  }

  const embedJson = await embedRes.json();
  if (!embedJson.success || !embedJson.embed) {
    throw new Error(`AnimeKai embed resolution failed`);
  }

  const hosterResult = await resolveHosterEmbed(embedJson.embed);
  return {
    success: true,
    provider: activeServer,
    availableServers: servers,
    data: hosterResult
  };
}

// ----------------------------------------------------
// 1. Hexa Scraper & Decryptor (from encdec)
// ----------------------------------------------------
async function resolveHexa(
  type: string,
  tmdbId: string,
  season: string,
  episode: string
) {
  const key = crypto.randomBytes(32).toString('hex');

  const encRes = await fetch("https://enc-dec.app/api/enc-hexa");
  if (!encRes.ok) {
    throw new Error(`Failed to fetch Hexa challenge token: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (encJson.status !== 200 || !encJson.result) {
    throw new Error(`Hexa token request failed: ${encJson.error || 'unknown'}`);
  }

  const token = encJson.result.token;
  const url = type === 'movie'
    ? `https://theemoviedb.hexa.su/api/tmdb/movie/${tmdbId}/images`
    : `https://theemoviedb.hexa.su/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}/images`;

  const payloadRes = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://hexa.su/",
      "Accept": "text/plain",
      "X-Fingerprint-Lite": "e9136c41504646444",
      "X-Api-Key": key,
      "X-Cap-Token": token
    }
  });

  if (!payloadRes.ok) {
    throw new Error(`Failed to load Hexa payload: HTTP ${payloadRes.status}`);
  }

  const encryptedText = await payloadRes.text();

  const decRes = await fetch("https://enc-dec.app/api/dec-hexa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: encryptedText, key })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt Hexa stream: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`Hexa stream decryption failed: ${decJson.error || 'unknown'}`);
  }

  const sources = decJson.result.sources || [];
  const tracks = decJson.result.subtitles || [];

  const formattedSources = sources.map((s: any) => ({
    url: s.file || s.url,
    quality: s.label || s.quality || 'Auto',
    isM3U8: (s.file || s.url || '').includes('.m3u8')
  }));

  const formattedSubs = tracks.map((t: any) => ({
    url: t.file || t.url,
    label: t.label || t.language || 'Unknown',
    language: t.label || t.language || 'Unknown',
    kind: 'captions',
    default: t.default || false
  }));

  return {
    success: true,
    provider: 'Hexa',
    data: {
      sources: formattedSources,
      subtitles: formattedSubs
    }
  };
}

// ----------------------------------------------------
// 2. Vidlink Decryptor (from encdec)
// ----------------------------------------------------
async function resolveVidlink(
  type: string,
  tmdbId: string,
  season: string,
  episode: string
) {
  const encUrl = type === 'movie'
    ? `https://enc-dec.app/api/enc-vidlink?id=${tmdbId}`
    : `https://enc-dec.app/api/enc-vidlink?id=${tmdbId}&s=${season}&e=${episode}`;

  const encRes = await fetch(encUrl);
  if (!encRes.ok) {
    throw new Error(`Failed to load VidLink encryption payload: HTTP ${encRes.status}`);
  }

  const encJson = await encRes.json();
  if (!encJson.success || !encJson.url) {
    throw new Error(`VidLink signature request failed`);
  }

  const response = await fetch(encJson.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Referer": "https://vidlink.pro/"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch encrypted data from VidLink: HTTP ${response.status}`);
  }

  const cipherText = await response.text();

  const decRes = await fetch("https://enc-dec.app/api/dec-vidlink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: cipherText })
  });

  if (!decRes.ok) {
    throw new Error(`Failed to decrypt VidLink stream: HTTP ${decRes.status}`);
  }

  const decJson = await decRes.json();
  if (decJson.status !== 200 || !decJson.result) {
    throw new Error(`VidLink decryption failed: ${decJson.error || 'unknown'}`);
  }

  const sources = decJson.result.sources || [];
  const tracks = decJson.result.subtitles || [];

  const formattedSources = sources.map((s: any) => ({
    url: s.file || s.url,
    quality: s.label || s.quality || 'Auto',
    isM3U8: (s.file || s.url || '').includes('.m3u8')
  }));

  const formattedSubs = tracks.map((t: any) => ({
    url: t.file || t.url,
    label: t.label || t.language || 'Unknown',
    language: t.label || t.language || 'Unknown',
    kind: 'captions',
    default: t.default || false
  }));

  return {
    success: true,
    provider: 'VidLink',
    data: {
      sources: formattedSources,
      subtitles: formattedSubs
    }
  };
}

// ----------------------------------------------------
// 3. Cryptographic Core ported from videasy.ts
// ----------------------------------------------------
function md5(data: Uint8Array): Uint8Array {
  const len = data.length;
  const pad = len + 1 + ((len + 1) % 64 < 56 ? 56 - ((len + 1) % 64) : 120 - ((len + 1) % 64)) + 8;
  const buf = new Uint8Array(pad);
  buf.set(data);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(pad - 8, (len * 8) & 0xffffffff, true);
  dv.setUint32(pad - 4, 0, true);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K = Int32Array.from([0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391]);
  for (let off = 0; off < pad; off += 64) {
    let A = a, B = b, C = c, D = d;
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = buf[off+i*4] | (buf[off+i*4+1]<<8) | (buf[off+i*4+2]<<16) | (buf[off+i*4+3]<<24);
    for (let i = 0; i < 64; i++) {
      let f, g;
      if      (i < 16) { f = (B & C) | (~B & D); g = i; }
      else if (i < 32) { f = (D & B) | (~D & C); g = (5*i+1)%16; }
      else if (i < 48) { f = B ^ C ^ D;           g = (3*i+5)%16; }
      else             { f = C ^ (B | ~D);         g = (7*i)%16; }
      const t = D; D = C; C = B;
      B = (B + (((A+f+K[i]+M[g])<<S[i]) | ((A+f+K[i]+M[g])>>>(32-S[i])))) | 0;
      A = t;
    }
    a=(a+A)|0; b=(b+B)|0; c=(c+C)|0; d=(d+D)|0;
  }
  const out = new Uint8Array(16);
  for (let i = 0; i < 4; i++) { out[i]=a>>>(i*8); out[i+4]=b>>>(i*8); out[i+8]=c>>>(i*8); out[i+12]=d>>>(i*8); }
  return out;
}

function evpBytesToKey(salt: Uint8Array, password = "", keySize = 32, ivSize = 16) {
  const pw = new TextEncoder().encode(password);
  let hash: Uint8Array = new Uint8Array(0);
  let derived: Uint8Array = new Uint8Array(0);
  while (derived.length < keySize + ivSize) {
    const input = new Uint8Array(hash.length + pw.length + salt.length);
    input.set(hash); 
    input.set(pw, hash.length); 
    input.set(salt, hash.length + pw.length);
    hash = md5(input);
    const tmp = new Uint8Array(derived.length + hash.length);
    tmp.set(derived); 
    tmp.set(hash, derived.length);
    derived = tmp;
  }
  return { key: derived.slice(0, keySize), iv: derived.slice(keySize, keySize + ivSize) };
}

async function aesDecrypt(base64Data: string) {
  const bin = globalThis.atob(base64Data);
  const raw = Uint8Array.from(bin, c => c.charCodeAt(0));
  if (raw.length < 16 || new TextDecoder().decode(raw.slice(0, 8)) !== "Salted__")
    throw new Error("Unexpected WASM output format (not OpenSSL salted)");
  const salt       = raw.slice(8, 16);
  const ciphertext = raw.slice(16);
  const { key, iv } = evpBytesToKey(salt);
  
  const webcrypto = crypto.webcrypto as any;
  const cryptoKey  = await webcrypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const pt         = await webcrypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(pt);
}

function patchPow(code: string) {
  const primary = code.replace(/_0x24\(\),_0x36\(/g, "_0x36(");
  if (primary !== code) return primary;
  const cutoff = Math.max(0, code.length - 2000);
  const tail   = code.slice(cutoff).replace(/_0x[a-f0-9]+\(\),(_0x[a-f0-9]+\()/g, "$1");
  return code.slice(0, cutoff) + tail;
}

let _wasmModule: any = null;

async function loadWasm() {
  if (_wasmModule) return _wasmModule;
  
  let wasmPath = path.join(process.cwd(), 'api', 'module1.wasm');
  if (!fs.existsSync(wasmPath)) {
    wasmPath = path.join(__dirname, 'module1.wasm');
  }
  if (!fs.existsSync(wasmPath)) {
    wasmPath = path.join(__dirname, '..', 'api', 'module1.wasm');
  }
  
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`module1.wasm not found at path: ${wasmPath}`);
  }
  
  const wasmBytes = fs.readFileSync(wasmPath);
  const { instance } = await WebAssembly.instantiate(wasmBytes, {
    env: { seed: () => Date.now() * Math.random(), abort() {} },
  });
  const exp = instance.exports as any;
  const mem = exp.memory;

  function readStr(ptr: number) {
    ptr = ptr >>> 0;
    if (!ptr) return null;
    const u32 = new Uint32Array(mem.buffer);
    const u16 = new Uint16Array(mem.buffer);
    const end = (ptr + u32[(ptr - 4) >>> 2]) >>> 1;
    let n = ptr >>> 1, s = "";
    while (end - n > 1024) s += String.fromCharCode(...u16.subarray(n, n += 1024));
    return s + String.fromCharCode(...u16.subarray(n, end));
  }

  function writeStr(str: string) {
    const ptr = exp.__new(str.length << 1, 2) >>> 0;
    const u16 = new Uint16Array(mem.buffer);
    for (let i = 0; i < str.length; i++) u16[(ptr >>> 1) + i] = str.charCodeAt(i);
    return ptr;
  }

  _wasmModule = {
    serve:   ()       => readStr(exp.serve()),
    verify:  (h: string)      => exp.verify(writeStr(h)) !== 0,
    decrypt: (ct: string, id: number) => readStr(exp.decrypt(writeStr(ct), id)),
  };
  return _wasmModule;
}

let _cachedHash: string | null = null;

async function getHash(wasm: any) {
  if (_cachedHash) return _cachedHash;
  const patched = patchPow(wasm.serve());
  const fakeWin: any = {
    location: { hostname: "vidking.net", href: `https://www.vidking.net/` },
    hash: undefined,
  };
  
  const webcrypto = crypto.webcrypto as any;
  new Function("window", "crypto", "TextEncoder", patched)(fakeWin, webcrypto, TextEncoder);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (fakeWin.hash !== undefined) break;
  }
  const hash = String(fakeWin.hash);
  if (!hash || hash === "undefined") throw new Error("serve() did not set window.hash");
  _cachedHash = hash;
  return hash;
}

async function decryptCipher(ciphertextHex: string, tmdbId: number) {
  const wasm = await loadWasm();
  const hash = await getHash(wasm);
  if (!wasm.verify(hash)) throw new Error("WASM verify() failed");
  const intermediate = wasm.decrypt(ciphertextHex, tmdbId);
  if (!intermediate) throw new Error("WASM decrypt() returned null");
  const plaintext = await aesDecrypt(intermediate);
  return JSON.parse(plaintext);
}

// ----------------------------------------------------
// Main Handler
// ----------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, url, provider } = req.query;

  // --- 4. check-source ACTION (presence checking) ---
  if (action === 'check-source') {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Valid url query parameter is required for action check-source' });
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

      if (response.status === 404) {
        return res.status(200).json({ exists: false, status: 404 });
      }

      if (response.status === 403 || response.status === 503 || response.status === 401) {
        return res.status(200).json({ exists: true, status: response.status, reason: 'blocked_cloudflare_fallback' });
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => ({}));
        if (
          data.error === 'Not Found' ||
          data.message === 'Not Found' ||
          data.success === false ||
          (typeof data.error === 'string' && data.error.toLowerCase().includes('not found'))
        ) {
          return res.status(200).json({ exists: false, status: 200, reason: 'json_error_not_found' });
        }
      } else {
        const text = await response.text().catch(() => '');
        const textLower = text.toLowerCase();
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
      try {
        const rootDomain = new URL(url).origin;
        const favController = new AbortController();
        const favTimeout = setTimeout(() => favController.abort(), 2000);

        const favResponse = await fetch(`${rootDomain}/favicon.ico`, {
          mode: 'no-cors',
          signal: favController.signal
        });
        clearTimeout(favTimeout);

        if (favResponse.ok || favResponse.status === 0 || favResponse.status === 404) {
          return res.status(200).json({ exists: true, status: 200, reason: 'favicon_fallback_success' });
        }
      } catch (_) {
        // Ignore
      }
      return res.status(200).json({ exists: false, status: 0, reason: error.message || 'fetch_failed' });
    }
  }

  let { tmdbId, mediaType, seasonId, episodeId, title, year, server } = req.query;

  if (!tmdbId || typeof tmdbId !== 'string') {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }
  if (!mediaType || typeof mediaType !== 'string' || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return res.status(400).json({ error: 'mediaType parameter is required (movie or tv)' });
  }

  const seasonNum = seasonId ? String(seasonId) : '1';
  const episodeNum = episodeId ? String(episodeId) : '1';
  const providerStr = typeof provider === 'string' ? provider.toLowerCase() : '';
  const serverStr = typeof server === 'string' ? server : undefined;

  // TMDB details lookup for title and year if missing
  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
  let cleanTitle = typeof title === 'string' ? title : Array.isArray(title) ? title[0] : '';
  let cleanYear = typeof year === 'string' ? year : Array.isArray(year) ? year[0] : '';

  if (!cleanTitle || !cleanYear) {
    try {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        if (mediaType === 'movie') {
          cleanTitle = cleanTitle || tmdbData.title || tmdbData.original_title;
          cleanYear = cleanYear || (tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '');
        } else {
          cleanTitle = cleanTitle || tmdbData.name || tmdbData.original_name;
          cleanYear = cleanYear || (tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : '');
        }
      }
    } catch (e) {
      console.warn("Failed to fetch metadata from TMDB:", e);
    }
  }

  if (!cleanTitle) {
    return res.status(400).json({ error: 'title parameter is required or could not be resolved from TMDB' });
  }

  // --- VIDEASY RESOLVER SECTION ---
  if (providerStr === 'videasy') {
    const serverName = typeof server === 'string' ? server.toLowerCase() : '';
    let videasyProviders: { name: string; endpoint: string; queryParams?: Record<string, string> }[] = [];

    if (serverName.includes('neon')) {
      videasyProviders = [{ name: 'Neon', endpoint: 'neon2' }];
    } else if (serverName.includes('jett')) {
      videasyProviders = [{ name: 'Jett', endpoint: 'jett' }];
    } else if (serverName.includes('tejo')) {
      videasyProviders = [{ name: 'Tejo', endpoint: 'tejo' }];
    } else if (serverName.includes('sage')) {
      videasyProviders = [{ name: 'Sage', endpoint: 'ym' }];
    } else if (serverName.includes('breach')) {
      videasyProviders = [{ name: 'Breach', endpoint: 'm4uhd' }];
    } else if (serverName.includes('hydrogen') || serverName.includes('cdn')) {
      videasyProviders = [{ name: 'Hydrogen', endpoint: 'cdn' }];
    } else if (serverName.includes('lithium') || serverName.includes('downloader2')) {
      videasyProviders = [{ name: 'Lithium', endpoint: 'downloader2' }];
    } else if (serverName.includes('oxygen') || serverName.includes('mb-flix')) {
      videasyProviders = [{ name: 'Oxygen', endpoint: 'mb-flix' }];
    } else if (serverName.includes('vyse')) {
      videasyProviders = [{ name: 'Vyse (English)', endpoint: 'hdmovie' }];
    } else if (serverName.includes('fade') || serverName.includes('hindi')) {
      videasyProviders = [{ name: 'Fade (Hindi)', endpoint: 'hdmovie' }];
    } else if (serverName.includes('omen') || serverName.includes('spanish')) {
      videasyProviders = [{ name: 'Omen (Spanish)', endpoint: 'lamovie' }];
    } else if (serverName.includes('raze') || serverName.includes('portuguese')) {
      videasyProviders = [{ name: 'Raze (Portuguese)', endpoint: 'superflix' }];
    } else if (serverName.includes('killjoy') || serverName.includes('german')) {
      videasyProviders = [{ name: 'Killjoy (German)', endpoint: 'meine', queryParams: { language: 'german' } }];
    } else {
      videasyProviders = [
        { name: 'Hydrogen', endpoint: 'cdn' },
        { name: 'Neon', endpoint: 'neon2' },
        { name: 'Vyse (English)', endpoint: 'hdmovie' },
        { name: 'Lithium', endpoint: 'downloader2' },
        { name: 'Oxygen', endpoint: 'mb-flix' }
      ];
    }

    let seed = '';
    try {
      const seedRes = await fetch(`https://api.wingsdatabase.com/seed?mediaId=${tmdbId}`, {
        headers: {
          "Accept": "*/*",
          "Origin": "https://player.videasy.to",
          "Referer": "https://player.videasy.to/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        }
      });
      if (seedRes.ok) {
        const seedData = await seedRes.json() as any;
        seed = seedData.seed || '';
      }
    } catch (e) {
      console.warn("Failed to fetch seed from wingsdatabase:", e);
    }

    const doubleEncodedTitle = encodeURIComponent(encodeURIComponent(String(cleanTitle)));

    const baseQueryParams: Record<string, string> = {
      title: doubleEncodedTitle,
      mediaType: String(mediaType),
      year: cleanYear ? String(cleanYear) : '',
      tmdbId: String(tmdbId),
      enc: '2',
      seed: seed
    };

    if (mediaType === 'tv') {
      baseQueryParams.episodeId = episodeNum;
      baseQueryParams.seasonId = seasonNum;
    }

    let successData: any = null;
    let successfulProvider = '';
    const errors: string[] = [];

    for (const vp of videasyProviders) {
      const mergedParams = { ...baseQueryParams, ...(vp.queryParams || {}) };
      const queryString = new URLSearchParams(mergedParams).toString();
      const vpUrl = `https://api.wingsdatabase.com/${vp.endpoint}/sources-with-title?${queryString}`;

      try {
        const fetchRes = await fetch(vpUrl, {
          headers: {
            "Accept": "*/*",
            "Origin": "https://player.videasy.to",
            "Referer": "https://player.videasy.to/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
          }
        });

        if (!fetchRes.ok) {
          errors.push(`${vp.name}: HTTP ${fetchRes.status}`);
          continue;
        }

        const cipherText = (await fetchRes.text()).trim();
        if (!cipherText) {
          errors.push(`${vp.name}: Empty response`);
          continue;
        }

        const decRes = await fetch("https://enc-dec.app/api/dec-videasy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: cipherText,
            id: tmdbId,
            seed: seed
          })
        });

        if (!decRes.ok) {
          errors.push(`${vp.name}: Decryption service failed (HTTP ${decRes.status})`);
          continue;
        }

        const decJson = await decRes.json() as any;
        if (decJson.status === 200 && decJson.result && decJson.result.sources && decJson.result.sources.length > 0) {
          let decrypted = decJson.result;

          if (serverName.includes('fade') || serverName.includes('hindi')) {
            const filtered = decrypted.sources.filter((s: any) => {
              const qualityStr = (s.quality || s.label || '').toLowerCase();
              return qualityStr.includes('hindi');
            });
            if (filtered.length > 0) {
              decrypted.sources = filtered;
            }
          } else if (serverName.includes('vyse') || serverName.includes('hydrogen') || serverName.includes('neon') || serverName.includes('lithium') || serverName.includes('oxygen')) {
            const filtered = decrypted.sources.filter((s: any) => {
              const qualityStr = (s.quality || s.label || '').toLowerCase();
              return !qualityStr.includes('hindi') && !qualityStr.includes('spanish') && !qualityStr.includes('portuguese') && !qualityStr.includes('german');
            });
            if (filtered.length > 0) {
              decrypted.sources = filtered;
            }
          }

          successData = decrypted;
          successfulProvider = vp.name;
          break;
        } else {
          errors.push(`${vp.name}: Decryption returned empty sources list or error`);
        }
      } catch (err: any) {
        errors.push(`${vp.name}: ${err.message || err}`);
      }
    }

    if (successData) {
      return res.status(200).json({
        success: true,
        provider: successfulProvider,
        data: successData
      });
    } else {
      console.warn(`All Videasy direct providers failed: ${errors.join('; ')}. Falling back to iframe.`);
      return res.status(200).json({
        success: true,
        provider: 'Videasy Iframe Fallback',
        data: {
          iframeUrl: mediaType === 'tv'
            ? `https://player.videasy.net/tv/${tmdbId}/${seasonNum}/${episodeNum}?autoplay=true`
            : `https://player.videasy.net/movie/${tmdbId}?autoplay=true`
        }
      });
    }
  }

  // --- ENCDEC SCRAIPERS SECTION (AnimeKai, Hexa, Vidlink) ---
  try {
    if (providerStr === 'animekai') {
      const result = await resolveAnimekai(
        cleanTitle,
        cleanYear,
        seasonNum,
        episodeNum,
        req.query.anilistId as string | undefined,
        serverStr
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'hexa') {
      const result = await resolveHexa(
        mediaType,
        tmdbId,
        seasonNum,
        episodeNum
      );
      return res.status(200).json(result);
    }

    if (providerStr === 'vidlink') {
      try {
        const result = await resolveVidlink(
          mediaType,
          tmdbId,
          seasonNum,
          episodeNum
        );
        return res.status(200).json(result);
      } catch (err: any) {
        console.warn(`VidLink direct decryption failed: ${err.message}. Falling back to iframe.`);
        return res.status(200).json({
          success: true,
          provider: 'VidLink Iframe Fallback',
          availableServers: ['VidLink Iframe Fallback'],
          data: {
            iframeUrl: mediaType === 'movie'
              ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=EF4444`
              : `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${episodeNum}?primaryColor=EF4444`
          }
        });
      }
    }

    return res.status(400).json({ error: `Unsupported provider: ${providerStr}` });
  } catch (error: any) {
    console.error(`${providerStr} extraction error:`, error);
    return res.status(502).json({
      success: false,
      error: `Stream extraction for ${providerStr} failed: ${error.message || error}`
    });
  }
}
