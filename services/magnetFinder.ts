/**
 * Hyper-Fast, Multi-Source Robust Magnet Links Finder Service
 * Queries AniZip, YTS, Torrentio, AnimeTosho, and Nyaa concurrently in parallel.
 * Returns top-ranked magnet streams sorted by live seeder count.
 */

export interface MagnetCandidate {
  magnet: string;
  infoHash: string;
  title: string;
  seeders: number;
  source: 'AniZip' | 'YTS' | 'Torrentio' | 'AnimeTosho' | 'Nyaa';
  quality?: string;
}

export interface MagnetSearchOptions {
  title: string;
  tmdbId?: number;
  anilistId?: number | null;
  imdbId?: string | null;
  mediaType?: 'movie' | 'tv' | string;
  season?: number;
  episode?: number;
  isAnime?: boolean;
}

const HIGH_SPEED_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
].map(t => `&tr=${encodeURIComponent(t)}`).join('');

export function extractInfoHash(magnetOrHash: string): string | null {
  if (!magnetOrHash) return null;
  const match = magnetOrHash.match(/urn:btih:([a-fA-F0-9]{40})/i) || magnetOrHash.match(/^[a-fA-F0-9]{40}$/);
  return match ? match[1].toLowerCase() : null;
}

export function buildMagnetLink(infoHash: string, displayName: string): string {
  const hash = infoHash.toLowerCase();
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(displayName)}${HIGH_SPEED_TRACKERS}`;
}

/**
 * Hyper-Fast Parallel Search for Magnet Links
 */
export async function findBestMagnetStream(options: MagnetSearchOptions): Promise<MagnetCandidate[]> {
  const { title, tmdbId, anilistId, imdbId, mediaType = 'movie', season = 1, episode = 1, isAnime = false } = options;

  const cleanTitle = (title || '')
    .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
    .trim();
  const epNum = episode ? episode.toString().padStart(2, '0') : '01';

  const candidates: MagnetCandidate[] = [];

  // Query variations for anime / TV releases
  const searchQueries = Array.from(new Set([
    `${cleanTitle} - ${epNum}`,
    `${cleanTitle} ${epNum}`,
    `${cleanTitle} S${season.toString().padStart(2, '0')}E${epNum}`,
    cleanTitle
  ])).filter(Boolean);

  const fetchPromises: Array<Promise<void>> = [];

  // ── 1. AniZip Direct Lookup (Anime Only - ~80ms response) ──────────────────
  if (isAnime && anilistId) {
    fetchPromises.push((async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          const epData = data?.episodes?.[String(episode)];
          if (epData && epData.anidbEid) {
            // Check torrents array in AniZip payload
            const torrents = epData.torrents || data.torrents || [];
            torrents.slice(0, 5).forEach((t: any) => {
              if (t.infoHash || t.hash) {
                const hash = (t.infoHash || t.hash).toLowerCase();
                candidates.push({
                  magnet: buildMagnetLink(hash, `${cleanTitle} E${episode}`),
                  infoHash: hash,
                  title: t.name || `${cleanTitle} E${episode}`,
                  seeders: t.seeders || 80,
                  source: 'AniZip',
                  quality: t.quality || '1080p'
                });
              }
            });
          }
        }
      } catch (e) {}
    })());
  }

  // ── 2. YTS.mx API (Movies - ~120ms response) ─────────────────────────────
  if (!isAnime && (mediaType === 'movie' || !season)) {
    fetchPromises.push((async () => {
      try {
        const queryTerm = imdbId || cleanTitle;
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(queryTerm)}`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const movie = json?.data?.movies?.[0];
          if (movie && Array.isArray(movie.torrents)) {
            movie.torrents.forEach((t: any) => {
              if (t.hash) {
                const hash = t.hash.toLowerCase();
                candidates.push({
                  magnet: buildMagnetLink(hash, `${movie.title} (${t.quality})`),
                  infoHash: hash,
                  title: `${movie.title} [${t.quality}]`,
                  seeders: t.seeds || 100,
                  source: 'YTS',
                  quality: t.quality
                });
              }
            });
          }
        }
      } catch (e) {}
    })());
  }

  // ── 3. Torrentio P2P Swarm Engine (~200ms response) ──────────────────────
  if (imdbId) {
    fetchPromises.push((async () => {
      try {
        const type = (mediaType === 'tv' || (season && episode)) ? 'series' : 'movie';
        const query = type === 'series' ? `${imdbId}:${season}:${episode}` : imdbId;
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://torrentio.strem.fun/stream/${type}/${query}.json`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data?.streams) {
            data.streams.slice(0, 6).forEach((s: any) => {
              if (s.infoHash) {
                const hash = s.infoHash.toLowerCase();
                const matchSeeders = typeof s.title === 'string' ? s.title.match(/👤\s*(\d+)/) : null;
                const seeds = matchSeeders ? parseInt(matchSeeders[1], 10) : (s.seeders || 50);
                candidates.push({
                  magnet: buildMagnetLink(hash, cleanTitle),
                  infoHash: hash,
                  title: s.title || cleanTitle,
                  seeders: seeds,
                  source: 'Torrentio',
                  quality: s.name || '1080p'
                });
              }
            });
          }
        }
      } catch (e) {}
    })());
  }

  // ── 4. AnimeTosho API (~220ms response) ──────────────────────────────────
  searchQueries.slice(0, 2).forEach(q => {
    fetchPromises.push((async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://feed.animetosho.org/json?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            items.slice(0, 4).forEach((item: any) => {
              if (item.magnet_uri || item.info_hash) {
                const hash = item.info_hash ? item.info_hash.toLowerCase() : extractInfoHash(item.magnet_uri);
                if (hash) {
                  candidates.push({
                    magnet: item.magnet_uri || buildMagnetLink(hash, item.title || cleanTitle),
                    infoHash: hash,
                    title: item.title || cleanTitle,
                    seeders: item.seeders || 30,
                    source: 'AnimeTosho'
                  });
                }
              }
            });
          }
        }
      } catch (e) {}
    })());
  });

  // ── 5. Nyaa RSS Scraper API (~250ms response) ───────────────────────────
  if (isAnime || mediaType === 'tv') {
    searchQueries.slice(0, 2).forEach(q => {
      fetchPromises.push((async () => {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 2200);
          const res = await fetch(`/api/nyaa?q=${encodeURIComponent(q)}`, { signal: controller.signal });
          clearTimeout(tid);
          if (res.ok) {
            const xmlText = await res.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 4);
            items.forEach(item => {
              const link = item.querySelector('link')?.textContent;
              const titleNode = item.querySelector('title')?.textContent;
              const seedersNode = item.getElementsByTagName('nyaa:seeders')[0] || item.querySelector('seeders');
              const seeds = seedersNode ? parseInt(seedersNode.textContent || '0', 10) : 0;
              
              if (link && link.startsWith('magnet:')) {
                const hash = extractInfoHash(link);
                if (hash) {
                  candidates.push({
                    magnet: link,
                    infoHash: hash,
                    title: titleNode || cleanTitle,
                    seeders: seeds,
                    source: 'Nyaa'
                  });
                }
              }
            });
          }
        } catch (e) {}
      })());
    });
  }

  // Execute all engines concurrently in parallel
  await Promise.allSettled(fetchPromises);

  // Deduplicate by infoHash
  const uniqueMap = new Map<string, MagnetCandidate>();
  candidates.forEach(item => {
    if (!uniqueMap.has(item.infoHash) || (uniqueMap.get(item.infoHash)!.seeders < item.seeders)) {
      uniqueMap.set(item.infoHash, item);
    }
  });

  const sortedCandidates = Array.from(uniqueMap.values());
  sortedCandidates.sort((a, b) => b.seeders - a.seeders);

  return sortedCandidates;
}
