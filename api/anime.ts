import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import zlib from 'zlib';
import { META } from '@consumet/extensions';

// Initialize and cache AniList Meta provider instance
const anilist = new META.Anilist();

const ANIKAI_BASE = 'https://www3.anikai.cc';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Jikan (MAL) Episode Fetching ──────────────────────────────────────────────

async function fetchJikanEpisodes(malId: number): Promise<any[]> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=1`);
    if (!res.ok) return [];
    const json = await res.json();
    const page1Data = json?.data || [];
    const hasNext = json?.pagination?.has_next_page === true;

    if (hasNext) {
      try {
        const res2 = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=2`);
        if (res2.ok) {
          const json2 = await res2.json();
          const page2Data = json2?.data || [];
          return [...page1Data, ...page2Data];
        }
      } catch (err) {
        console.error("Failed to fetch Jikan page 2:", err);
      }
    }
    return page1Data;
  } catch (err) {
    console.error("Error fetching Jikan episodes:", err);
    return [];
  }
}

// ── Kitsu Episode Fetching ────────────────────────────────────────────────────

async function resolveKitsuAnimeId(malId: number): Promise<string | null> {
  try {
    const url = `https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item&fields[anime]=id`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/vnd.api+json' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const included = json?.included;
    if (Array.isArray(included) && included.length > 0) {
      return included[0].id;
    }
    const data = json?.data;
    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.relationships?.item?.data?.id || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchKitsuEpisodes(kitsuAnimeId: string): Promise<any[]> {
  const limit = 20;
  try {
    const firstPageUrl = `https://kitsu.io/api/edge/episodes?filter[mediaType]=Anime&filter[mediaId]=${kitsuAnimeId}&page[limit]=${limit}&page[offset]=0&fields[episodes]=canonicalTitle,synopsis,thumbnail,number,seasonNumber,airdate,length`;
    const firstPageRes = await fetch(firstPageUrl, {
      headers: { 'Accept': 'application/vnd.api+json' }
    });
    if (!firstPageRes.ok) return [];

    const firstPageJson = await firstPageRes.json();
    const firstPageData = firstPageJson?.data || [];
    const totalCount = firstPageJson?.meta?.count || firstPageData.length;

    if (totalCount <= limit) {
      return firstPageData;
    }

    const allEpisodes = [...firstPageData];
    const offsets: number[] = [];
    for (let offset = limit; offset < totalCount; offset += limit) {
      if (offset >= 500) break; // Cap at 500 episodes to prevent excessive network requests
      offsets.push(offset);
    }

    const promises = offsets.map(async (offsetVal) => {
      try {
        const url = `https://kitsu.io/api/edge/episodes?filter[mediaType]=Anime&filter[mediaId]=${kitsuAnimeId}&page[limit]=${limit}&page[offset]=${offsetVal}&fields[episodes]=canonicalTitle,synopsis,thumbnail,number,seasonNumber,airdate,length`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/vnd.api+json' }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data || [];
      } catch {
        return [];
      }
    });

    const remainingPagesResults = await Promise.all(promises);
    for (const pageData of remainingPagesResults) {
      allEpisodes.push(...pageData);
    }

    return allEpisodes;
  } catch (err) {
    console.error("Error fetching Kitsu episodes:", err);
    return [];
  }
}

// ── Merge Jikan + Kitsu Episodes ──────────────────────────────────────────────

function mergeEpisodes(jikanEps: any[], kitsuEps: any[]) {
  const kitsuMap = new Map<number, any>();
  for (const ep of kitsuEps) {
    const num = ep?.attributes?.number;
    if (num != null) {
      kitsuMap.set(num, ep.attributes);
    }
  }

  if (jikanEps.length > 0) {
    return jikanEps.map(jep => {
      const epNum = jep.mal_id;
      const kitsu = kitsuMap.get(epNum);
      return {
        episode_number: epNum,
        name: jep.title || kitsu?.canonicalTitle || `Episode ${epNum}`,
        name_japanese: jep.title_japanese || undefined,
        name_romanji: jep.title_romanji?.trim() || undefined,
        overview: kitsu?.synopsis || '',
        still_path: kitsu?.thumbnail?.original || null,
        air_date: jep.aired ? jep.aired.split('T')[0] : (kitsu?.airdate || ''),
        score: jep.score || undefined,
        filler: jep.filler === true,
        recap: jep.recap === true,
        runtime: kitsu?.length || undefined,
      };
    });
  }

  if (kitsuEps.length > 0) {
    return kitsuEps
      .map(ep => {
        const attr = ep.attributes;
        return {
          episode_number: attr.number || 0,
          name: attr.canonicalTitle || `Episode ${attr.number || '?'}`,
          overview: attr.synopsis || '',
          still_path: attr.thumbnail?.original || null,
          air_date: attr.airdate || '',
          filler: false,
          recap: false,
          runtime: attr.length || undefined,
        };
      })
      .filter(ep => ep.episode_number > 0)
      .sort((a, b) => a.episode_number - b.episode_number);
  }

  return [];
}

function getSeasonDescriptors(seasonNum: number) {
  const rom = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  const ord = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
  
  const descriptors: string[] = [
    `season ${seasonNum}`,
    `s${seasonNum}`,
    `${ord[seasonNum]} season` || `${seasonNum}th season`,
    `part ${seasonNum}`,
    `part ${rom[seasonNum]}` || "",
  ].filter(Boolean);

  // Support split-cour season naming conventions (e.g., Season N on AniList is Season N-1 Part 2 on other sites)
  if (seasonNum > 1) {
    const prevSeason = seasonNum - 1;
    descriptors.push(
      `season ${prevSeason} part 2`,
      `${ord[prevSeason]} season part 2`,
      `season ${prevSeason} cour 2`,
      `${ord[prevSeason]} season cour 2`,
      `season ${prevSeason} part ii`,
      `${ord[prevSeason]} season part ii`,
      `s${prevSeason} part 2`,
      `s${prevSeason} cour 2`,
      `s${prevSeason} part ii`,
      `s${prevSeason} cour ii`
    );
  }
  
  return descriptors;
}

function findBestMatch(
  searchItems: { id: string; name: string; totalEpisodes: number }[],
  cleanTitle: string,
  seasonNum: number,
  seasonName: string
) {
  if (searchItems.length === 0) return null;
  const target = cleanTitle.toLowerCase();
  
  // Extract significant words from seasonName
  const stopwords = new Set(["the", "season", "part", "arc", "series", "show", "anime", "of", "and", "in", "to", "a", "an"]);
  const seasonWords = seasonName
    ? seasonName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopwords.has(w))
    : [];

  const targetSeasonDescriptors = getSeasonDescriptors(seasonNum);
  
  // Get descriptors for other seasons (1 to 10, excluding target and split-cour parent)
  const otherSeasonDescriptors: string[] = [];
  for (let s = 1; s <= 10; s++) {
    if (s !== seasonNum && s !== (seasonNum - 1)) {
      otherSeasonDescriptors.push(...getSeasonDescriptors(s));
    }
  }

  let bestItem: any = searchItems[0];
  let bestScore = -9999;

  for (const item of searchItems) {
    const itemLower = item.name.toLowerCase();
    
    // 1. Calculate base text similarity score
    let score = 0;
    const targetWords = target.split(/\s+/).filter(w => w.length > 2);
    for (const word of targetWords) {
      if (itemLower.includes(word)) {
        score += 2;
      }
    }
    
    if (itemLower.startsWith(target) || target.startsWith(itemLower)) {
      score += 5;
    }
    
    if (itemLower === target) {
      score += 10;
    }

    // 2. Adjust score based on season matching
    // Bonus for matching significant words from the TMDB season name
    for (const word of seasonWords) {
      if (itemLower.includes(word)) {
        score += 20;
      }
    }

    // Bonus for matching target season descriptors
    for (const desc of targetSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        score += 15;
      }
    }
    // Also support standalone number suffix (e.g. "One Punch Man 2")
    if (seasonNum > 1) {
      const numPattern = new RegExp(`\\b${seasonNum}\\b`);
      if (numPattern.test(itemLower)) {
        score += 10;
      }
    }

    // Penalize for matching descriptors of other seasons
    for (const desc of otherSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        score -= 15;
      }
    }
    if (seasonNum === 1) {
      // For season 1, penalize standalone number suffixes > 1
      for (let s = 2; s <= 10; s++) {
        const numPattern = new RegExp(`\\b${s}\\b`);
        if (numPattern.test(itemLower)) {
          score -= 10;
        }
      }
    } else {
      // For season > 1, penalize standalone number suffixes of other seasons > 1 (excluding prevSeason)
      for (let s = 2; s <= 10; s++) {
        if (s !== seasonNum && s !== (seasonNum - 1)) {
          const numPattern = new RegExp(`\\b${s}\\b`);
          if (numPattern.test(itemLower)) {
            score -= 10;
          }
        }
      }
    }

    // For season > 1, penalize entries that do not match the target season or parent season descriptors
    if (seasonNum > 1) {
      const acceptableDescriptors = [...targetSeasonDescriptors, ...getSeasonDescriptors(seasonNum - 1)];
      const hasAcceptableSeason = acceptableDescriptors.some(desc => itemLower.includes(desc));
      if (!hasAcceptableSeason) {
        score -= 20;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

async function resolveAnikai(
  cleanTitle: string,
  season: any,
  episode: any,
  lang: any,
  seasonName: string,
  seasonEpisodeCount: number,
  absoluteEpisode: number,
  prequelEpisodes: number = 0
) {
  const seasonNum = season ? parseInt(String(season), 10) : 1;
  const initialEpNum = episode ? parseInt(String(episode), 10) : 1;
  const subdub = lang === 'dub' ? 'dub' : 'sub';

  const searchUrl = `${ANIKAI_BASE}/browser?keyword=${encodeURIComponent(cleanTitle)}`;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!searchRes.ok) {
    throw new Error(`Search failed: HTTP ${searchRes.status}`);
  }

  const searchHtml = await searchRes.text();
  const $ = cheerio.load(searchHtml);
  const searchItems: { id: string; name: string; totalEpisodes: number }[] = [];

  $('.aitem-wrapper.regular .aitem').each((_, el) => {
    const href = $(el).attr('href') || $(el).find('a.poster').attr('href');
    if (href) {
      const id = href.replace('/watch/', '').split('#')[0].trim();
      const name = $(el).find('a.title').text().trim() || $(el).find('h6.title').text().trim();
      
      const totalEpisodesText = $(el).find('.info .sub').text().trim() || $(el).find('.info span').first().text().trim();
      const totalEpisodes = totalEpisodesText ? parseInt(totalEpisodesText, 10) : 0;
      
      searchItems.push({ id, name, totalEpisodes });
    }
  });

  if (searchItems.length === 0) {
    throw new Error(`No search results on Anikai.`);
  }

  const bestMatch = findBestMatch(searchItems, cleanTitle, seasonNum, seasonName);
  if (!bestMatch) {
    throw new Error(`No match found on Anikai.`);
  }

  // Verify matched entry corresponds to the requested season
  if (seasonNum > 1) {
    const itemLower = bestMatch.name.toLowerCase();
    const cleanTitleLower = cleanTitle.toLowerCase();
    
    const targetSeasonDescriptors = getSeasonDescriptors(seasonNum);
    const hasTargetSeason = targetSeasonDescriptors.some(desc => itemLower.includes(desc));
    
    const isExactMatch = cleanTitleLower === itemLower || 
      cleanTitleLower.replace(/[^a-z0-9]+/g, '') === itemLower.replace(/[^a-z0-9]+/g, '');
      
    let hasOtherSeason = false;
    for (let s = 1; s <= 10; s++) {
      if (s !== seasonNum && s !== (seasonNum - 1)) { // Allow parent season mapping in validation
        const otherDescriptors = getSeasonDescriptors(s);
        if (otherDescriptors.some(desc => itemLower.includes(desc))) {
          hasOtherSeason = true;
          break;
        }
      }
    }
    
    // Also check parent season mapping
    const prevSeasonNum = seasonNum - 1;
    const prevDescriptors = getSeasonDescriptors(prevSeasonNum);
    const hasParentSeason = prevDescriptors.some(desc => itemLower.includes(desc));

    if (hasOtherSeason || (!hasTargetSeason && !hasParentSeason && !isExactMatch && bestMatch.totalEpisodes < 36)) {
      throw new Error(`Matched entry "${bestMatch.name}" does not correspond to Season ${seasonNum}.`);
    }

    if (absoluteEpisode > bestMatch.totalEpisodes && bestMatch.totalEpisodes > 0) {
      throw new Error(`Matched entry "${bestMatch.name}" has only ${bestMatch.totalEpisodes} episodes, but absolute episode ${absoluteEpisode} was requested.`);
    }
  }

  // Determine whether to play seasonal episode or absolute episode
  let epNum = initialEpNum;
  if (seasonNum > 1) {
    const itemLower = bestMatch.name.toLowerCase();
    
    // Check if the best match is a seasonal entry
    const targetSeasonDescriptors = getSeasonDescriptors(seasonNum);
    let isSeasonalMatch = false;
    for (const desc of targetSeasonDescriptors) {
      if (itemLower.includes(desc)) {
        isSeasonalMatch = true;
        break;
      }
    }
    
    // Check if the TMDB season name (if any) is included in the match name
    if (seasonName && !isSeasonalMatch) {
      const stopwords = new Set(["the", "season", "part", "arc", "series", "show", "anime", "of", "and", "in", "to", "a", "an"]);
      const seasonWords = seasonName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopwords.has(w));
      for (const word of seasonWords) {
        if (itemLower.includes(word)) {
          isSeasonalMatch = true;
          break;
        }
      }
    }

    // Check if it has a small/matching number of total episodes
    const isSmallEpisodeCount = seasonEpisodeCount > 0 && bestMatch.totalEpisodes > 0 && bestMatch.totalEpisodes <= seasonEpisodeCount + 5;
    
    // Support playing split-cour parent entries (e.g. Season 3 entry matched when Season 4 is requested)
    const prevSeasonNum = seasonNum - 1;
    const prevDescriptors = getSeasonDescriptors(prevSeasonNum);
    const matchedPrevSeason = prevDescriptors.some(desc => itemLower.includes(desc));

    if (matchedPrevSeason && prequelEpisodes > 0 && !isSeasonalMatch) {
      epNum = initialEpNum + prequelEpisodes;
    } else if (isSeasonalMatch || isSmallEpisodeCount) {
      // Seasonal entry, use the requested episode number as is
      epNum = initialEpNum;
    } else {
      // Combined entry, use the calculated absolute episode number
      epNum = absoluteEpisode;
    }
  }

  // Fetch watch details page of the best match for the specific episode to get direct video URLs
  const watchUrl = `${ANIKAI_BASE}/watch/${bestMatch.id}/ep-${epNum}`;
  const detailRes = await fetch(watchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!detailRes.ok) {
    throw new Error(`Failed to load watch page on Anikai: ${watchUrl}`);
  }

  const detailHtml = await detailRes.text();
  const $$ = cheerio.load(detailHtml);
  
  const targetTab = subdub === 'dub' ? 'tab_2' : 'tab_1';
  let matchedVideoUrl = '';

  // 1. Try finding HD-1 or HD-2 on the target tab
  $$('.server-video').each((_, el) => {
    const tab = $$(el).attr('data-tab');
    const video = $$(el).attr('data-video');
    const text = $$(el).text().trim();
    if (tab === targetTab && video && (text.includes('HD-1') || text.includes('HD-2'))) {
      matchedVideoUrl = video;
      return false; // Break
    }
  });

  // 2. Try finding any server on the target tab
  if (!matchedVideoUrl) {
    $$('.server-video').each((_, el) => {
      const tab = $$(el).attr('data-tab');
      const video = $$(el).attr('data-video');
      if (tab === targetTab && video) {
        matchedVideoUrl = video;
        return false;
      }
    });
  }

  // 3. Fallback to any tab with HD-1/HD-2
  if (!matchedVideoUrl) {
    $$('.server-video').each((_, el) => {
      const video = $$(el).attr('data-video');
      const text = $$(el).text().trim();
      if (video && (text.includes('HD-1') || text.includes('HD-2'))) {
        matchedVideoUrl = video;
        return false;
      }
    });
  }

  // 4. Final fallback: first available server
  if (!matchedVideoUrl) {
    matchedVideoUrl = $$('.server-video').first().attr('data-video') || '';
  }

  if (!matchedVideoUrl) {
    throw new Error("Could not extract video stream URL from Anikai.");
  }

  return matchedVideoUrl;
}



export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { provider, action, tmdbId, mediaType, season, episode, anilistId, title, lang, episodeId, mappedEpisode } = req.query;

  // Resolve clean title if missing or provided
  let cleanTitle = '';
  if (title) {
    cleanTitle = String(title)
      .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '')
      .trim();
  }

  let seasonName = '';
  let seasonEpisodeCount = 0;
  // If mappedEpisode is provided, the client already did the AniList mapping — use it directly
  let absoluteEpisode = mappedEpisode ? parseInt(String(mappedEpisode), 10) : (episode ? parseInt(String(episode), 10) : 1);

  const isAnimeRequest = provider === 'anikai' || !!anilistId || action === 'mal-episodes' || action === 'episodes';

  if (tmdbId && !isAnimeRequest) {
    try {
      const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
      const typeStr = mediaType === 'tv' ? 'tv' : 'movie';
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}?api_key=${apiKey}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json() as any;
        if (!cleanTitle) {
          cleanTitle = typeStr === 'movie'
            ? (tmdbData.title || tmdbData.original_title)
            : (tmdbData.name || tmdbData.original_name);
        }

        // Only compute absolute episode from TMDB if mappedEpisode was NOT provided
        if (typeStr === 'tv' && !mappedEpisode) {
          const seasonNum = season ? parseInt(String(season), 10) : 1;
          const seasons = tmdbData.seasons || [];
          let prevEpisodesSum = 0;
          for (const s of seasons) {
            if (s.season_number < seasonNum && s.season_number > 0) {
              prevEpisodesSum += s.episode_count || 0;
            }
            if (s.season_number === seasonNum) {
              seasonEpisodeCount = s.episode_count || 0;
              seasonName = s.name || '';
            }
          }
          const epNum = episode ? parseInt(String(episode), 10) : 1;
          absoluteEpisode = prevEpisodesSum + epNum;
        }
      }
    } catch {}
  }

  let prequelEpisodes = 0;
  // If title was not resolved by TMDB, or if tmdbId is actually an AniList ID, resolve via AniList
  if (!cleanTitle && (anilistId || tmdbId)) {
    const targetId = anilistId ? String(anilistId) : String(tmdbId);
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            title {
              english
              romaji
              userPreferred
            }
            episodes
            format
            status
            relations {
              edges {
                relationType
                node {
                  id
                  episodes
                }
              }
            }
          }
        }
      `;
      const resAni = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { id: parseInt(targetId, 10) } })
      });
      if (resAni.ok) {
        const aniData = await resAni.json();
        const media = aniData?.data?.Media;
        if (media) {
          cleanTitle = media.title.english || media.title.userPreferred || media.title.romaji;
          if (!mappedEpisode) {
            absoluteEpisode = episode ? parseInt(String(episode), 10) : 1;
          }
          const prequelEdge = media.relations?.edges?.find((e: any) => e.relationType === 'PREQUEL');
          if (prequelEdge?.node?.episodes) {
            prequelEpisodes = parseInt(String(prequelEdge.node.episodes), 10) || 0;
          }
        }
      }
    } catch (err) {
      console.error("Failed AniList lookup in api/anime.ts:", err);
    }
  }

  // 0. Route to Nyaa Torrent Search
  if (action === 'nyaa') {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    try {
      const nyaaUrl = `https://nyaa.si/?page=rss&q=${encodeURIComponent(q)}`;
      const response = await fetch(nyaaUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `Nyaa.si error: ${response.statusText}` });
      }

      const text = await response.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(text)) !== null) {
        const itemXml = match[1];

        const getField = (tagName: string) => {
          const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`);
          const m = regex.exec(itemXml);
          return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
        };

        const itemTitle = getField('title');
        const link = getField('link');
        const guid = getField('guid');
        const pubDate = getField('pubDate');
        const seeders = getField('nyaa:seeders');
        const leechers = getField('nyaa:leechers');
        const downloads = getField('nyaa:downloads');
        const infoHash = getField('nyaa:infoHash');
        const size = getField('nyaa:size');
        const category = getField('nyaa:category');

        const magnet = infoHash ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(itemTitle)}` : '';

        items.push({
          title: itemTitle,
          link,
          guid,
          pubDate,
          seeders: Number(seeders) || 0,
          leechers: Number(leechers) || 0,
          downloads: Number(downloads) || 0,
          infoHash,
          size,
          category,
          magnet
        });
      }

      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      return res.status(200).json(items);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  // 1. Route to Anikai Scraper
  if (provider === 'anikai') {
    if (!cleanTitle) {
      return res.status(400).send("Could not resolve anime title.");
    }
    try {
      const embedUrl = await resolveAnikai(
        cleanTitle,
        season,
        episode,
        lang,
        seasonName,
        seasonEpisodeCount,
        absoluteEpisode,
        prequelEpisodes
      );
      res.writeHead(302, { Location: embedUrl });
      return res.end();
    } catch (e: any) {
      console.error("Anikai redirect error:", e);
      return res.status(502).send(`Anikai extraction error: ${e.message}`);
    }
  }

  // 2. Route to MAL Episodes (Jikan + Kitsu merge)
  if (action === 'mal-episodes') {
    const { malId } = req.query;
    if (!malId || typeof malId !== 'string') {
      return res.status(400).json({ error: 'malId parameter is required' });
    }
    const malIdNum = parseInt(malId, 10);
    if (isNaN(malIdNum)) {
      return res.status(400).json({ error: 'malId must be a valid integer' });
    }
    try {
      const [jikanEps, kitsuAnimeId] = await Promise.all([
        fetchJikanEpisodes(malIdNum),
        resolveKitsuAnimeId(malIdNum),
      ]);
      let kitsuEps: any[] = [];
      if (kitsuAnimeId) {
        kitsuEps = await fetchKitsuEpisodes(kitsuAnimeId);
      }
      const episodes = mergeEpisodes(jikanEps, kitsuEps);
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).json({ episodes, source: jikanEps.length > 0 ? 'jikan+kitsu' : kitsuEps.length > 0 ? 'kitsu' : 'none' });
    } catch (error: any) {
      console.error('mal-episodes error:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  // 3. Default: Consumet AniList Meta logic
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action or provider parameter is required' });
  }

  try {
    if (action === 'episodes') {
      if (!anilistId || typeof anilistId !== 'string') {
        return res.status(400).json({ error: 'anilistId parameter is required' });
      }

      const data = await anilist.fetchAnimeInfo(anilistId);
      
      return res.status(200).json({
        id: data.id,
        title: data.title,
        episodes: data.episodes || [],
      });
    }

    if (action === 'watch') {
      if (!episodeId || typeof episodeId !== 'string') {
        return res.status(400).json({ error: 'episodeId parameter is required' });
      }

      const data = await anilist.fetchEpisodeSources(episodeId);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: `Invalid action: ${action}` });
  } catch (error: any) {
    console.error(`Anime API error [action=${action}]:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
