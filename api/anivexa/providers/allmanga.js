const __name = (fn, _) => fn;

var UA4 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";
var API = "https://api.allanime.day";
var REFERER = "https://allmanga.to";
var ANIZIP = "https://api.ani.zip/mappings";
var PASSPHRASE = "Xot36i3lK3:v1";
var TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlYjdkMWM0ZTgwMGUzM2FiMmE3Y2I3NDA5YmM4NjQ2YSIsIm5iZiI6MTc3OTUzMDcxOS40MzIsInN1YiI6IjZhMTE3YmRmYTlhNjNlYmFiOWUzYjc4YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Z9pa96oJEyicf6wAoaKGKJd9ldapeiOdktoJd4xcgLo"; //i honestly forgot why i added it here, anyway it was created using tempmail so idc if its leaked or whatever
var HASHES = {
  episode: "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec"
};
var HEX_TABLE = {
  "79": "A",
  "7a": "B",
  "7b": "C",
  "7c": "D",
  "7d": "E",
  "7e": "F",
  "7f": "G",
  "70": "H",
  "71": "I",
  "72": "J",
  "73": "K",
  "74": "L",
  "75": "M",
  "76": "N",
  "77": "O",
  "68": "P",
  "69": "Q",
  "6a": "R",
  "6b": "S",
  "6c": "T",
  "6d": "U",
  "6e": "V",
  "6f": "W",
  "60": "X",
  "61": "Y",
  "62": "Z",
  "59": "a",
  "5a": "b",
  "5b": "c",
  "5c": "d",
  "5d": "e",
  "5e": "f",
  "5f": "g",
  "50": "h",
  "51": "i",
  "52": "j",
  "53": "k",
  "54": "l",
  "55": "m",
  "56": "n",
  "57": "o",
  "48": "p",
  "49": "q",
  "4a": "r",
  "4b": "s",
  "4c": "t",
  "4d": "u",
  "4e": "v",
  "4f": "w",
  "40": "x",
  "41": "y",
  "42": "z",
  "08": "0",
  "09": "1",
  "0a": "2",
  "0b": "3",
  "0c": "4",
  "0d": "5",
  "0e": "6",
  "0f": "7",
  "00": "8",
  "01": "9",
  "15": "-",
  "16": ".",
  "67": "_",
  "46": "~",
  "02": ":",
  "17": "/",
  "07": "?",
  "1b": "#",
  "63": "[",
  "65": "]",
  "78": "@",
  "19": "!",
  "1c": "$",
  "1e": "&",
  "10": "(",
  "11": ")",
  "12": "*",
  "13": "+",
  "14": ",",
  "03": ";",
  "05": "=",
  "1d": "%"
};
var _aesKey = null;
async function getAESKey() {
  if (_aesKey) return _aesKey;
  const raw = new TextEncoder().encode(PASSPHRASE);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  _aesKey = await crypto.subtle.importKey("raw", hash, { name: "AES-CTR" }, false, ["decrypt"]);
  return _aesKey;
}
__name(getAESKey, "getAESKey");
async function decryptTobeparsed(b64) {
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv12 = buf.slice(1, 13);
  const counter = new Uint8Array(16);
  counter.set(iv12, 0);
  counter[12] = 0;
  counter[13] = 0;
  counter[14] = 0;
  counter[15] = 2;
  const ctLen = buf.length - 13 - 16;
  const ciphertext = buf.slice(13, 13 + ctLen);
  const key = await getAESKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter, length: 32 },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plain);
}
__name(decryptTobeparsed, "decryptTobeparsed");
function decodeHexUrl(hex) {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const pair = hex.substring(i, i + 2).toLowerCase();
    out += HEX_TABLE[pair] ?? pair;
  }
  return out;
}
__name(decodeHexUrl, "decodeHexUrl");
function hexToBytes(hex) {
  const c = hex.replace(/[^0-9a-f]/gi, "");
  const b = new Uint8Array(c.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16);
  return b;
}
__name(hexToBytes, "hexToBytes");
async function aesDecrypt(hex) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("kiemtienmua911ca"),
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: new TextEncoder().encode("1234567890oiuytr") },
    key,
    hexToBytes(hex)
  );
  return new TextDecoder().decode(plain);
}
__name(aesDecrypt, "aesDecrypt");
async function extractMp4(id) {
  try {
    const r = await fetch(`https://www.mp4upload.com/embed-${id}.html`, {
      headers: { "User-Agent": UA4, Referer: "https://allanime.to/" }
    });
    if (!r.ok) return null;
    const h = await r.text();
    const m = h.match(/player\.src\s*\(\s*\{[^}]*\bsrc\s*:\s*"([^"]+)"/) || h.match(/"file"\s*:\s*"(https?:[^"]+\.mp4[^"]*)"/) || h.match(/\bsrc\s*:\s*"(https?:[^"]+\.mp4[^"]*)"/);
    return m?.[1]?.replace(/\\/g, "") || null;
  } catch {
    return null;
  }
}
__name(extractMp4, "extractMp4");
async function extractUns(id) {
  try {
    const base = "https://allanime.uns.bio";
    const r = await fetch(`${base}/api/v1/video?id=${id}&w=1280&h=720&r=`, {
      headers: { "User-Agent": UA4, Referer: `${base}/#${id}`, Origin: base }
    });
    if (!r.ok) return null;
    const hex = (await r.text()).trim();
    if (!hex || !/^[0-9a-f]+$/i.test(hex)) return null;
    const p = JSON.parse(await aesDecrypt(hex));
    return p.source || p.cf || null;
  } catch {
    return null;
  }
}
__name(extractUns, "extractUns");
async function extractOk(id) {
  try {
    const r = await fetch(`https://ok.ru/videoembed/${id}`, {
      headers: { "User-Agent": UA4, Referer: "https://ok.ru/" }
    });
    if (!r.ok) return null;
    const h = await r.text();
    const m = h.match(/ondemandHls\\&quot;:\\&quot;(https?:\/\/.*?)\\&quot;/);
    if (!m) return null;
    return m[1].replace(/\\u0026/g, "&");
  } catch {
    return null;
  }
}
__name(extractOk, "extractOk");
async function extractStreamSB(id) {
  try {
    const baseHeaders = {
      "User-Agent": UA4,
      "Referer": "https://allmanga.to/",
      "watchsb": "streamsb",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9"
    };
    const r1 = await fetch(`https://streamsb.net/api/v1/video?id=${id}`, { headers: baseHeaders });
    const sid = (r1.headers.get("set-cookie") || "").match(/sid=([^;]+)/)?.[1] ?? "";
    const html1 = await r1.text();
    const m = html1.match(/window\.location\.replace\('([^']+)'\)/);
    if (!m) return null;
    const r2 = await fetch(m[1], {
      headers: { ...baseHeaders, "Cookie": `sid=${sid}`, "Referer": `https://streamsb.net/e/${id}.html` }
    });
    if (!r2.ok) return null;
    const ct = r2.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    const data = await r2.json();
    return data?.stream_data?.file ?? data?.data?.file ?? null;
  } catch {
    return null;
  }
}
__name(extractStreamSB, "extractStreamSB");
async function extractStreamlare(id) {
  try {
    const r = await fetch("https://streamlare.com/api/video/stream/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA4,
        "Referer": "https://streamlare.com/",
        "Origin": "https://streamlare.com",
        "Accept": "application/json, */*"
      },
      body: JSON.stringify({ id })
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.data?.file ?? null;
  } catch {
    return null;
  }
}
__name(extractStreamlare, "extractStreamlare");
function embedMediaType(url) {
  if (!url) return null;
  if (url.includes(".m3u8")) return "hls";
  if (url.includes(".mp4")) return "mp4";
  return "direct";
}
__name(embedMediaType, "embedMediaType");
async function apiFetch(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA4, "Referer": REFERER, "Origin": REFERER }
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json6 = await res.json();
  if (json6?.data?.tobeparsed) {
    const decrypted = await decryptTobeparsed(json6.data.tobeparsed);
    json6.data = JSON.parse(decrypted);
  }
  return json6.data;
}
__name(apiFetch, "apiFetch");
function buildApiUrl(variables, hash) {
  const v = encodeURIComponent(JSON.stringify(variables));
  const e = encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));
  return `${API}/api?variables=${v}&extensions=${e}`;
}
__name(buildApiUrl, "buildApiUrl");
async function apiPost(query, variables) {
  const res = await fetch(`${API}/api`, {
    method: "POST",
    headers: {
      "User-Agent": UA4,
      "Referer": REFERER,
      "Origin": REFERER,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ variables, query })
  });
  if (!res.ok) throw new Error(`API POST ${res.status}`);
  const json6 = await res.json();
  if (json6?.data?.tobeparsed) {
    const decrypted = await decryptTobeparsed(json6.data.tobeparsed);
    json6.data = JSON.parse(decrypted);
  }
  return json6.data;
}
__name(apiPost, "apiPost");
async function searchAllAnime(query, mode = "sub") {
  const gql = `query($search:SearchInput $limit:Int $page:Int $translationType:VaildTranslationTypeEnumType $countryOrigin:VaildCountryOriginEnumType){shows(search:$search limit:$limit page:$page translationType:$translationType countryOrigin:$countryOrigin){edges{_id name englishName nativeName availableEpisodes availableEpisodesDetail aniListId __typename}}}`;
  const data = await apiPost(gql, {
    search: { allowAdult: false, allowUnknown: false, query },
    limit: 40,
    page: 1,
    translationType: mode,
    countryOrigin: "ALL"
  });
  return data?.shows?.edges ?? [];
}
__name(searchAllAnime, "searchAllAnime");
async function getEpisodeSources(showId, epNum, audio = "sub") {
  const url = buildApiUrl(
    { showId, translationType: audio, episodeString: String(epNum) },
    HASHES.episode
  );
  const data = await apiFetch(url);
  return data?.episode ?? null;
}
__name(getEpisodeSources, "getEpisodeSources");
async function fetchAniZip(anilistId) {
  const res = await fetch(`${ANIZIP}?anilist_id=${anilistId}`);
  if (!res.ok) return null;
  return res.json();
}
__name(fetchAniZip, "fetchAniZip");
function normalize(s) {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}
__name(normalize, "normalize");
function extractYear(title2) {
  if (!title2) return null;
  const m = title2.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}
__name(extractYear, "extractYear");
function findBestMatch(results, titles, targetYear, targetId) {
  const normalizedTitles = titles.map(normalize).filter(Boolean);
  let bestShow = null;
  let maxScore = -Infinity;
  for (const r of results) {
    if (targetId && r.aniListId && String(r.aniListId) === String(targetId)) {
      return r;
    }
    const names = [r.name, r.englishName, r.nativeName].map(normalize).filter(Boolean);
    let nameScore = 0;
    let isExact = false;
    for (const n of names) {
      if (normalizedTitles.includes(n)) {
        nameScore = 100;
        isExact = true;
        break;
      }
    }
    if (!isExact) {
      let maxFuzzy = 0;
      for (const rName of names) {
        for (const t of normalizedTitles) {
          if (t.includes(rName) || rName.includes(t)) {
            const score = Math.min(rName.length, t.length);
            const lengthPenalty = Math.abs(rName.length - t.length) * 0.1;
            const finalFuzzy = score - lengthPenalty;
            if (finalFuzzy > maxFuzzy) maxFuzzy = finalFuzzy;
          }
        }
      }
      nameScore = maxFuzzy;
    }
    let yearScore = 0;
    const rYear = extractYear(r.name) || extractYear(r.englishName) || extractYear(r.nativeName);
    if (targetYear && rYear) {
      yearScore = rYear === targetYear ? 50 : -200;
    }
    const totalScore = nameScore + yearScore;
    if (totalScore > maxScore) {
      maxScore = totalScore;
      bestShow = r;
    }
  }
  return bestShow || results[0];
}
__name(findBestMatch, "findBestMatch");
async function fetchAniListMedia(anilistId) {
  try {
    const q = "query ($id: Int) { Media (id: $id, type: ANIME) { seasonYear startDate { year } title { romaji english native } } }";
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA4,
        "Origin": "https://anilist.co"
      },
      body: JSON.stringify({ query: q, variables: { id: Number(anilistId) } })
    });
    if (!res.ok) return null;
    const json6 = await res.json();
    return json6.data?.Media ?? null;
  } catch (e) {
    console.error("AniList titles fetch failed:", e);
    return null;
  }
}
__name(fetchAniListMedia, "fetchAniListMedia");
async function resolveAllAnimeId(anilistId, ctx = {}) {
  const [anizipRes, alMedia] = await Promise.all([
    ctx.anizip ? Promise.resolve(ctx.anizip) : fetchAniZip(anilistId).catch(() => ({})),
    ctx.media ? Promise.resolve({
      title: ctx.media.title,
      seasonYear: ctx.media.seasonYear,
      startDate: ctx.media.startDate
    }) : fetchAniListMedia(anilistId).catch(() => null)
  ]);
  const anizip = anizipRes || {};
  let titlesToTry = [];
  if (anizip.titles) {
    titlesToTry = [
      anizip.titles.en,
      anizip.titles.ja,
      anizip.titles["x-jat"],
      ...Object.values(anizip.titles)
    ].filter(Boolean);
  }
  if (alMedia?.title) {
    const alTitles = [alMedia.title.english, alMedia.title.romaji, alMedia.title.native].filter(Boolean);
    titlesToTry = [...new Set([...alTitles, ...titlesToTry])];
  }
  if (!titlesToTry.length && anizip.mappings) {
    const apId = anizip.mappings.animeplanet_id;
    if (apId) {
      const cleanApTitle = apId.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      titlesToTry = [cleanApTitle];
    }
  }
  if (!titlesToTry.length) {
    throw new Error(`Could not resolve titles for AniList ID: ${anilistId}`);
  }
  const targetYear = alMedia?.seasonYear || alMedia?.startDate?.year || null;
  let allResults = [];
  for (const title2 of titlesToTry.slice(0, 3)) {
    const results = await searchAllAnime(title2, "sub");
    allResults.push(...results);
  }
  const seen = new Set();
  allResults = allResults.filter((r) => {
    if (seen.has(r._id)) return false;
    seen.add(r._id);
    return true;
  });
  if (!allResults.length) {
    throw new Error(`No AllAnime match for "${titlesToTry[0]}"`);
  }
  const match = findBestMatch(allResults, titlesToTry, targetYear, anilistId);
  return { showId: match._id, show: match, anizip };
}
__name(resolveAllAnimeId, "resolveAllAnimeId");
async function fetchAniListFull(anilistId) {
  const q = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { romaji english native }
      synonyms
      format
      episodes
      seasonYear
      startDate { year }
      type
      relations {
        edges { relationType(version: 2) node { id type format title { romaji english native } } }
      }
    }
  }`;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA4, "Origin": "https://anilist.co" },
    body: JSON.stringify({ query: q, variables: { id: Number(anilistId) } })
  });
  if (!res.ok) throw new Error("AniList fetch failed");
  const json6 = await res.json();
  return json6.data?.Media;
}
__name(fetchAniListFull, "fetchAniListFull");
async function fetchKitsuId(malId) {
  if (!malId) return null;
  try {
    const res = await fetch(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}`);
    const json6 = await res.json();
    const mapping = json6.data?.[0];
    if (mapping && mapping.relationships?.item?.links?.related) {
      const itemRes = await fetch(mapping.relationships.item.links.related);
      const itemJson = await itemRes.json();
      return itemJson.data?.id ? Number(itemJson.data.id) : null;
    }
  } catch (e) {
    console.error("Kitsu Error:", e);
  }
  return null;
}
__name(fetchKitsuId, "fetchKitsuId");
async function fetchTMDB(titles, year, format) {
  let tmdbType = format === "MOVIE" || format === "OVA" || format === "SPECIAL" ? "movie" : "tv";
  let result = null;
  for (const title2 of titles) {
    if (!title2) continue;
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(title2)}&first_air_date_year=${year}&year=${year}`;
      const res = await fetch(searchUrl, {
        headers: { "Authorization": `Bearer ${TMDB_TOKEN}`, "Accept": "application/json" }
      });
      const json6 = await res.json();
      if (json6.results && json6.results.length > 0) {
        result = json6.results[0];
        break;
      }
    } catch (e) {
      console.error("TMDB Search Error:", e);
    }
  }
  if (!result) return { themoviedbId: null, imdbId: null, thetvdbId: null };
  let externalIds = {};
  try {
    const extUrl = `https://api.themoviedb.org/3/${tmdbType}/${result.id}/external_ids`;
    const extRes = await fetch(extUrl, {
      headers: { "Authorization": `Bearer ${TMDB_TOKEN}`, "Accept": "application/json" }
    });
    externalIds = await extRes.json();
  } catch (e) {
    console.error("TMDB External IDs Error:", e);
  }
  return {
    themoviedbId: result.id,
    imdbId: externalIds.imdb_id || null,
    thetvdbId: externalIds.tvdb_id || null
  };
}
__name(fetchTMDB, "fetchTMDB");
async function handleMap(anilistId) {
  const al = await fetchAniListFull(anilistId);
  if (!al) throw new Error("AniList entry not found");
  const year = al.seasonYear || al.startDate?.year;
  const titlesToSearch = [al.title.english, al.title.romaji, al.title.native].filter(Boolean);
  const [kitsuId, tmdbData] = await Promise.all([
    fetchKitsuId(al.idMal),
    fetchTMDB(titlesToSearch, year, al.format)
  ]);
  return {
    mappings: {
      id: Number(anilistId),
      title: al.title.english || al.title.romaji,
      type: al.type,
      format: al.format,
      episodes: al.episodes,
      malId: al.idMal,
      aniId: Number(anilistId),
      anidbId: null,
      animePlanetId: null,
      kitsuId,
      imdbId: tmdbData.imdbId,
      themoviedbId: tmdbData.themoviedbId,
      thetvdbId: tmdbData.thetvdbId,
      livechartId: null,
      annId: null,
      synonyms: al.synonyms || [],
      franchise: al.relations?.edges?.map((e) => ({
        relation: e.relationType,
        id: e.node.id,
        title: e.node.title.romaji || e.node.title.english,
        type: e.node.type,
        format: e.node.format
      })) || []
    }
  };
}
__name(handleMap, "handleMap");
async function handleEpisodes2(anilistId) {
  const { showId, show, anizip } = await resolveAllAnimeId(anilistId);
  const epDetail = show.availableEpisodesDetail || {};
  const subEps = (epDetail.sub || []).map(Number).sort((a, b) => a - b);
  const dubEps = (epDetail.dub || []).map(Number).sort((a, b) => a - b);
  const buildEpList = __name((nums, audio) => nums.map((n) => {
    const meta = anizip.episodes?.[String(n)] ?? {};
    return {
      id: `watch/allmanga/${anilistId}/${audio}/allmanga-${n}`,
      number: n,
      title: meta.title?.en || meta.title?.["x-jat"] || `Episode ${n}`,
      duration: meta.runtime ?? meta.length ?? 0,
      audio,
      filler: meta.filler ?? false,
      uncensored: false,
      description: meta.overview || meta.summary || "",
      image: meta.image || anizip.images?.cover || "",
      airDate: meta.airdate || meta.aired || ""
    };
  }), "buildEpList");
  return {
    anilistId: Number(anilistId),
    allAnimeId: showId,
    title: show.englishName || show.name,
    sub: buildEpList(subEps, "sub"),
    dub: buildEpList(dubEps, "dub")
  };
}
__name(handleEpisodes2, "handleEpisodes");
async function handleWatch2(anilistId, audio, epNum) {
  const { showId, anizip } = await resolveAllAnimeId(anilistId);
  const episode = await getEpisodeSources(showId, epNum, audio);
  if (!episode) throw new Error("Episode not found");
  const sources = await Promise.all((episode.sourceUrls || []).map(async (src) => {
    let url = src.sourceUrl;
    if (url && url.startsWith("--")) url = decodeHexUrl(url.slice(2));
    if (url && url.startsWith("/apivtwo/clock")) {
      url = "https://allanime.day" + url.replace("/clock", "/clock.json");
    }
    let extractedUrl = null;
    const name = src.sourceName || "";
    if (url?.includes("mp4upload.com")) {
      const m = url.match(/embed-([a-zA-Z0-9]+)\.html/);
      if (m?.[1]) extractedUrl = await extractMp4(m[1]);
    } else if (url?.includes("allanime.uns.bio")) {
      const id = url.split("#").pop();
      if (id && id.length > 2) extractedUrl = await extractUns(id);
    } else if (url?.includes("ok.ru")) {
      const id = url.split("/").pop();
      if (id) extractedUrl = await extractOk(id);
    } else if (url?.includes("streamsb.net")) {
      const m = url.match(/\/(?:e\/|embed-)([a-zA-Z0-9]+)(?:\.html)?/);
      if (m?.[1]) extractedUrl = await extractStreamSB(m[1]);
    } else if (url?.includes("streamlare.com")) {
      const m = url.match(/\/e\/([a-zA-Z0-9]+)/);
      if (m?.[1]) extractedUrl = await extractStreamlare(m[1]);
    }
    return {
      name,
      url,
      extractedUrl,
      extractedType: embedMediaType(extractedUrl),
      type: src.type,
      priority: src.priority,
      headers: {
        "Referer": "https://allmanga.to",
        "User-Agent": UA4
      },
      downloads: src.downloads || null
    };
  }));
  sources.sort((a, b) => b.priority - a.priority);
  const epMeta = anizip?.episodes?.[String(epNum)] ?? {};
  const intro = epMeta.intro ?? null;
  const outro = epMeta.outro ?? null;
  return {
    anilistId: Number(anilistId),
    allAnimeId: showId,
    episode: Number(epNum),
    audio,
    intro,
    outro,
    sources
  };
}
__name(handleWatch2, "handleWatch");
function json2(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300"
    }
  });
}
__name(json2, "json");
function matchRoute(pathname) {
  let m = pathname.match(/^\/episodes\/(\d+)\/?$/);
  if (m) return { handler: "episodes", anilistId: m[1] };
  m = pathname.match(/^\/watch\/allmanga\/(\d+)\/(sub|dub)\/allmanga-(\d+)\/?$/);
  if (m) return { handler: "watch", anilistId: m[1], audio: m[2], ep: m[3] };
  m = pathname.match(/^\/map\/(\d+)\/?$/);
  if (m) return { handler: "map", anilistId: m[1] };
  return null;
}
__name(matchRoute, "matchRoute");
var allmanga_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }
    const route = matchRoute(url.pathname);
    if (!route) {
      return json2({
        error: "Not found",
        routes: [
          "GET /episodes/:anilistId",
          "GET /watch/allmanga/:anilistId/:audio/allmanga-:ep",
          "GET /map/:anilistId"
        ]
      }, 404);
    }
    try {
      if (route.handler === "map") {
        const data = await handleMap(route.anilistId);
        return json2(data);
      }
      if (route.handler === "episodes") {
        const data = await handleEpisodes2(route.anilistId);
        return json2(data);
      }
      if (route.handler === "watch") {
        const data = await handleWatch2(route.anilistId, route.audio, route.ep);
        return json2(data);
      }
    } catch (err) {
      return json2({ error: err.message, stack: err.stack }, 500);
    }
  }
};
async function getEpisodes2(anilistId, ctx = {}) {
  const { showId, show, anizip } = await resolveAllAnimeId(anilistId, ctx);
  const epDetail = show.availableEpisodesDetail || {};
  const subEps = (epDetail.sub || []).map(Number).sort((a, b) => a - b);
  const dubEps = (epDetail.dub || []).map(Number).sort((a, b) => a - b);
  const buildList = __name((nums, audio) => nums.map((n) => {
    const meta = anizip.episodes?.[String(n)] ?? {};
    return {
      id: `watch/allmanga/${anilistId}/${audio}/allmanga-${n}`,
      number: n,
      title: meta.title?.en || meta.title?.["x-jat"] || null,
      duration: meta.runtime ?? meta.length ?? 0,
      audio,
      filler: meta.filler ?? false,
      uncensored: false,
      description: meta.overview || meta.summary || null,
      image: meta.image || anizip.images?.cover || null,
      airDate: meta.airdate || meta.aired || null
    };
  }), "buildList");
  return {
    meta: {
      id: showId,
      title: show.englishName || show.name
    },
    episodes: {
      sub: buildList(subEps, "sub"),
      dub: buildList(dubEps, "dub"),
      raw: []
    }
  };
}
__name(getEpisodes2, "getEpisodes");
export default allmanga_default;
export { getEpisodes2 as getEpisodes };