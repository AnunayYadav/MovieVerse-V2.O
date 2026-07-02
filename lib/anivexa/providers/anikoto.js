const __name = (fn, _) => fn;
import { getMedia } from '../core/anilist.js';

var ANIKOTO = "https://anikototv.to";
var MEGAPLAY = "https://megaplay.buzz";
var VIDWISH = "https://vidwish.live";
var ANIZIP3 = "https://api.ani.zip/mappings";
var MAPPER = "https://mapper.mewcdn.online/api/mal";
var JIKAN4 = "https://api.jikan.moe/v4";
var SPOOF_REF = "https://hianimes.re/";
var UA6 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
async function httpGet(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA6, Accept: "text/html,*/*", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}
__name(httpGet, "httpGet");
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
__name(sleep, "sleep");
async function getJSON(url, headers = {}, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA6, Accept: "application/json, */*", ...headers } });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "1") || 1;
      const wait = retryAfter * 1e3 + attempt * 500;
      if (attempt < retries) {
        await sleep(wait);
        continue;
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.json();
  }
  throw new Error(`HTTP 429 fetching ${url} (exhausted retries)`);
}
__name(getJSON, "getJSON");
function extractEpisodes(html) {
  const episodes = [];
  const re = /<a\s[^>]*data-id="[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const get2 = __name((a) => {
      const x = tag.match(new RegExp(`data-${a}="([^"]*)"`));
      return x ? x[1] : "";
    }, "get");
    const id = get2("id"), num = get2("num");
    if (!id || !num) continue;
    episodes.push({ id, num: parseInt(num), slug: get2("slug"), mal: get2("mal"), timestamp: get2("timestamp"), hasSub: get2("sub") === "1", hasDub: get2("dub") === "1", ids: get2("ids") });
  }
  return episodes;
}
__name(extractEpisodes, "extractEpisodes");
function extractSearchCandidates(html) {
  const results = [];
  const re = /<a class="item" href="https:\/\/anikototv\.to\/watch\/([^"]+)"([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const block = m[2];
    const enM = block.match(/class="name d-title"[^>]*>([^<]*)</);
    const jpM = block.match(/data-jp="([^"]*)"/);
    const yearM = block.match(/<span class="dot">(\d{4})<\/span>/);
    const typeM = block.match(/<span class="dot">(TV|Movie|OVA|ONA|Special)<\/span>/);
    results.push({ slug: m[1], titleEn: enM ? enM[1].trim() : "", titleJp: jpM ? jpM[1].trim() : "", year: yearM ? yearM[1] : "", type: typeM ? typeM[1] : "" });
  }
  return results;
}
__name(extractSearchCandidates, "extractSearchCandidates");
function normalize2(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
__name(normalize2, "normalize");
function scoreCandidate(c, jikan) {
  let score = 0;
  const normEn = normalize2(jikan?.title_english ?? jikan?.title ?? "");
  const normJp = normalize2(jikan?.title_japanese ?? "");
  const normRom = normalize2(jikan?.title ?? "");
  const cEn = normalize2(c.titleEn), cJp = normalize2(c.titleJp);
  if (normEn && cEn === normEn) score += 50;
  else if (normRom && cEn === normRom) score += 45;
  else if (normEn && cEn.startsWith(normEn)) score += 15;
  if (normJp && cJp === normJp) score += 40;
  else if (normRom && cJp === normRom) score += 35;
  const jikanType = jikan?.type ?? "";
  if (c.type && jikanType) {
    if (c.type.toLowerCase() === jikanType.toLowerCase()) score += 20;
    else score -= 30;
  }
  const jikanYear = jikan?.year ?? (jikan?.aired?.from ? new Date(jikan.aired.from).getFullYear() : null);
  if (c.year && jikanYear) {
    if (parseInt(c.year) === jikanYear) score += 20;
    else score -= 15;
  }
  return score;
}
__name(scoreCandidate, "scoreCandidate");
async function searchAnikoto(keyword) {
  const data = await getJSON(`${ANIKOTO}/ajax/anime/search?keyword=${encodeURIComponent(keyword)}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
  const results = extractSearchCandidates(data.result?.html ?? "");
  const html = await httpGet(`${ANIKOTO}/filter?keyword=${encodeURIComponent(keyword)}`, { Referer: `${ANIKOTO}/` }).catch(() => "");
  for (const m of html.matchAll(/<a class="name d-title" href="https:\/\/anikototv\.to\/watch\/([^"/]+)(?:\/ep-\d+)?" data-jp="([^"]*)">([\s\S]*?)<\/a>/g)) {
    results.push({
      slug: m[1],
      titleEn: m[3].replace(/<[^>]*>/g, "").trim(),
      titleJp: m[2].trim(),
      year: "",
      type: ""
    });
  }
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });
}
__name(searchAnikoto, "searchAnikoto");
async function findAnikotoShow(enTitle, jikanData) {
  const jpTitle = jikanData?.data?.title_japanese ?? "";
  const romTitle = jikanData?.data?.title ?? "";
  const keywords = [...new Set([enTitle, romTitle, jpTitle].filter(Boolean))];
  const searches = await Promise.all(keywords.map((k) => searchAnikoto(k).catch(() => [])));
  const seen = new Set();
  const candidates = searches.flat().filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
  if (!candidates.length) throw new Error(`Anime not found on anikoto: "${enTitle}"`);
  let chosenSlug;
  if (jikanData?.data) {
    const scored = candidates.map((c) => ({ ...c, score: scoreCandidate(c, jikanData.data) })).sort((a, b) => b.score - a.score);
    chosenSlug = scored[0].slug;
  } else {
    chosenSlug = candidates[0].slug;
  }
  const pageHtml = await httpGet(`${ANIKOTO}/watch/${chosenSlug}`, { Referer: `${ANIKOTO}/` });
  const idM = pageHtml.match(/data-id="(\d+)"/);
  if (!idM) throw new Error(`Could not find show ID for slug: ${chosenSlug}`);
  return { slug: chosenSlug, showId: idM[1] };
}
__name(findAnikotoShow, "findAnikotoShow");
async function extractVidWish(realId, audio) {
  try {
    const page = await httpGet(`${VIDWISH}/stream/s-2/${realId}/${audio}`, { Referer: SPOOF_REF, "Accept-Language": "en-US,en;q=0.9" });
    const m = page.match(/data-id="([^"]*)"/);
    if (!m?.[1]) return null;
    const fileId = m[1];
    const data = await getJSON(`${VIDWISH}/stream/getSources?id=${fileId}&id=${fileId}`, { Referer: `${VIDWISH}/`, "X-Requested-With": "XMLHttpRequest" });
    return { fileId, data };
  } catch {
    return null;
  }
}
__name(extractVidWish, "extractVidWish");
const LANG_MAP = { en: "en", english: "en", ja: "ja", japanese: "ja", fr: "fr", french: "fr", de: "de", german: "de", es: "es", spanish: "es", pt: "pt", portuguese: "pt" };
function mapTrack(t, source) {
  return {
    file: t.file,
    label: t.label ?? "",
    kind: t.kind ?? "captions",
    default: t.default ?? false,
    language: LANG_MAP[(t.label ?? "").toLowerCase()] ?? "und",
    format: "vtt",
    encoding: "utf-8",
    source
  };
}
__name(mapTrack, "mapTrack");
function skipRange(value) {
  if (Array.isArray(value)) return { start: Number(value[0]) || 0, end: Number(value[1]) || 0 };
  if (value && typeof value === "object") return value;
  return null;
}
__name(skipRange, "skipRange");
async function extractEmbedSource(embedUrl, referer) {
  try {
    const page = await httpGet(embedUrl, { Referer: referer ?? SPOOF_REF, "Accept-Language": "en-US,en;q=0.9" });
    const m = page.match(/data-id="([^"]*)"/);
    if (!m?.[1]) return null;
    const fileId = m[1];
    const origin = new URL(embedUrl).origin;
    const data = await getJSON(`${origin}/stream/getSources?id=${fileId}&id=${fileId}`, { Referer: `${origin}/`, "X-Requested-With": "XMLHttpRequest" });
    return { fileId, data };
  } catch {
    return null;
  }
}
__name(extractEmbedSource, "extractEmbedSource");
function extractServerItems(html, audio) {
  const items = [];
  const typeRe = /<div class="type" data-type="(sub|dub)">([\s\S]*?)<\/ul>\s*<\/div>/g;
  let typeM;
  while ((typeM = typeRe.exec(html)) !== null) {
    if (typeM[1] !== audio) continue;
    for (const li of typeM[2].matchAll(/<li\s+([^>]*data-link-id[^>]*)>([\s\S]*?)<\/li>/g)) {
      const linkId = li[1].match(/data-link-id="([^"]+)"/)?.[1];
      const name = li[2].replace(/<[^>]+>/g, "").trim();
      if (linkId) items.push({ linkId, name });
    }
  }
  return items;
}
__name(extractServerItems, "extractServerItems");
async function getAnikotoEpisode(anilistId, epNum) {
  const anizip = await getJSON(`${ANIZIP3}?anilist_id=${anilistId}`);
  const enTitle = anizip.titles?.en ?? Object.values(anizip.titles ?? {})[0] ?? "";
  const malId = anizip.mappings?.mal_id;
  const jikanShow = malId ? await getJSON(`${JIKAN4}/anime/${malId}`).catch(() => null) : null;
  const { showId, slug } = await findAnikotoShow(enTitle, jikanShow);
  const listData = await getJSON(`${ANIKOTO}/ajax/episode/list/${showId}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/watch/${slug}` });
  return extractEpisodes(listData.result ?? "").find((e) => e.num === epNum) ?? null;
}
__name(getAnikotoEpisode, "getAnikotoEpisode");
async function extractRawAnikotoStreams(anilistId, audio, epNum) {
  const ep = await getAnikotoEpisode(anilistId, epNum);
  if (!ep?.ids) return { streams: [], subtitles: [], intro: null, outro: null };
  const serverData = await getJSON(`${ANIKOTO}/ajax/server/list?servers=${encodeURIComponent(ep.ids)}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
  const items = extractServerItems(serverData.result ?? "", audio);
  const streams = [];
  const subtitles = [];
  let intro = null;
  let outro = null;
  const seen = new Set();
  for (const item of items) {
    const resolved = await getJSON(`${ANIKOTO}/ajax/server?get=${encodeURIComponent(item.linkId)}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` }).catch(() => null);
    const embedUrl = resolved?.result?.url;
    if (!embedUrl || seen.has(embedUrl)) continue;
    seen.add(embedUrl);
    const origin = new URL(embedUrl).origin;
    const extracted = await extractEmbedSource(embedUrl, SPOOF_REF);
    if (extracted?.data?.sources?.file) {
      streams.push({ url: extracted.data.sources.file, type: "hls", referer: `${origin}/`, server: item.name, priority: 5, default: streams.length === 0 });
      for (const t of extracted.data.tracks ?? []) subtitles.push(mapTrack(t, item.name));
      intro ??= extracted.data.intro ?? skipRange(resolved?.result?.skip_data?.intro) ?? null;
      outro ??= extracted.data.outro ?? skipRange(resolved?.result?.skip_data?.outro) ?? null;
    }
    streams.push({ url: embedUrl, type: "embed", referer: `${origin}/`, server: `${item.name}-embed`, priority: 4 });
  }
  return { streams, subtitles, intro, outro };
}
__name(extractRawAnikotoStreams, "extractRawAnikotoStreams");
function json4(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
__name(json4, "json");
async function handleWatch4(anilistId, audio, epNum) {
  if (audio !== "sub" && audio !== "dub") return json4({ error: "audio must be sub or dub" }, 400);
  const audioKey = audio === "sub" ? "ssub" : "sdub";
  let embedUrl = `${MEGAPLAY}/stream/ani/${anilistId}/${epNum}/${audio}`;
  let megaHtml = await httpGet(embedUrl, { Referer: SPOOF_REF, "Accept-Language": "en-US,en;q=0.9" });
  const frameSrc = megaHtml.match(/<iframe\b[^>]*src="([^"]+)"/i)?.[1];
  if (!megaHtml.match(/data-id="([^"]*)"/) && frameSrc) {
    embedUrl = frameSrc.startsWith("http") ? frameSrc : `${MEGAPLAY}${frameSrc}`;
    megaHtml = await httpGet(embedUrl, { Referer: SPOOF_REF, "Accept-Language": "en-US,en;q=0.9" });
  }
  const attr = __name((name) => {
    const m = megaHtml.match(new RegExp(`data-${name}="([^"]*)"`));
    return m ? m[1] : null;
  }, "attr");
  const fileId = attr("id");
  if (!fileId) {
    const raw = await extractRawAnikotoStreams(anilistId, audio, epNum);
    if (!raw.streams.length) return json4({ error: `Megaplay player not found for AniList ${anilistId} ep ${epNum}` }, 502);
    return json4({
      [audioKey]: {
        streams: raw.streams,
        subtitles: raw.subtitles,
        intro: raw.intro ?? { start: 0, end: 0 },
        outro: raw.outro ?? { start: 0, end: 0 },
        provider: "megaplay+vidwish"
      }
    });
  }
  const realId = attr("realid");
  const [megaSources, vidwishResult, mapperResult] = await Promise.allSettled([
    getJSON(`${MEGAPLAY}/stream/getSources?id=${fileId}&id=${fileId}`, { Referer: `${MEGAPLAY}/`, "X-Requested-With": "XMLHttpRequest" }),
    realId ? extractVidWish(realId, audio) : Promise.resolve(null),
    (async () => {
      const anizip = await getJSON(`${ANIZIP3}?anilist_id=${anilistId}`);
      const enTitle = anizip.titles?.en ?? Object.values(anizip.titles ?? {})[0] ?? "";
      const malId = anizip.mappings?.mal_id;
      const jikanShow = malId ? await getJSON(`${JIKAN4}/anime/${malId}`).catch(() => null) : null;
      const { showId } = await findAnikotoShow(enTitle, jikanShow);
      const listData = await getJSON(`${ANIKOTO}/ajax/episode/list/${showId}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
      const ep = extractEpisodes(listData.result ?? "").find((e) => e.num === epNum);
      if (!ep?.mal || !ep?.slug || !ep?.timestamp) return null;
      return getJSON(`${MAPPER}/${ep.mal}/${ep.slug}/${ep.timestamp}`, { Referer: `${ANIKOTO}/` });
    })()
  ]);
  const mega = megaSources.status === "fulfilled" ? megaSources.value : null;
  const vidwish = vidwishResult.status === "fulfilled" ? vidwishResult.value : null;
  const mapper = mapperResult.status === "fulfilled" ? mapperResult.value : null;
  const streams = [];
  if (mega?.sources?.file) {
    streams.push({ url: mega.sources.file, type: "hls", referer: `${MEGAPLAY}/`, server: "Megaplay", priority: 5, default: true });
  }
  streams.push({ url: embedUrl, type: "embed", referer: `${MEGAPLAY}/`, server: "Megaplay-embed", priority: 4 });
  if (vidwish?.data?.sources?.file) {
    streams.push({ url: vidwish.data.sources.file, type: "hls", referer: `${VIDWISH}/`, server: "VidWish", priority: 4 });
  }
  if (realId) {
    streams.push({ url: `${VIDWISH}/stream/s-2/${realId}/${audio}`, type: "embed", referer: `${VIDWISH}/`, server: "VidWish-embed", priority: 3 });
  }
  if (mapper) {
    const { status: _s, ...providers } = mapper;
    for (const [name, data] of Object.entries(providers)) {
      if (/^kiwi.?stream/i.test(name)) continue;
      const url = audio === "sub" ? data.sub?.url : data.dub?.url;
      if (url) streams.push({ url, type: "embed", referer: `${ANIKOTO}/`, server: name, priority: 2 });
    }
  }
  const subtitles = [
    ...(mega?.tracks ?? []).map((t) => mapTrack(t, "Megaplay")),
    ...(vidwish?.data?.tracks ?? []).map((t) => mapTrack(t, "VidWish"))
  ];
  return json4({
    [audioKey]: {
      streams,
      subtitles,
      intro: mega?.intro ?? vidwish?.sources?.intro ?? { start: 0, end: 0 },
      outro: mega?.outro ?? vidwish?.sources?.outro ?? { start: 0, end: 0 },
      provider: "megaplay+vidwish"
    }
  });
}
__name(handleWatch4, "handleWatch");
async function handleEpisodes4(anilistId, page = 1) {
  const anizip = await getJSON(`${ANIZIP3}?anilist_id=${anilistId}`);
  const malId = anizip.mappings?.mal_id;
  if (!malId) throw new Error("Could not find MAL ID from AniZip");
  const enTitle = anizip.titles?.en ?? Object.values(anizip.titles ?? {})[0] ?? "";
  const [jikanEps, jikanShow] = await Promise.all([
    getJSON(`${JIKAN4}/anime/${malId}/episodes?page=${page}`),
    getJSON(`${JIKAN4}/anime/${malId}`).catch(() => null)
  ]);
  if (!jikanEps.data?.length) throw new Error(`No episodes found on Jikan for MAL ID ${malId}`);
  let anikotoEpMap = new Map();
  try {
    const { showId } = await findAnikotoShow(enTitle, jikanShow);
    const listData = await getJSON(`${ANIKOTO}/ajax/episode/list/${showId}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
    extractEpisodes(listData.result ?? "").forEach((e) => anikotoEpMap.set(e.num, { hasSub: e.hasSub, hasDub: e.hasDub }));
  } catch {
  }
  const hasSubFallback = anikotoEpMap.size === 0;
  const hasDubFallback = anikotoEpMap.size === 0;
  const episodes = jikanEps.data.map((ep) => {
    const epNum = ep.mal_id;
    const meta = anizip.episodes?.[String(epNum)] ?? {};
    const avail = anikotoEpMap.get(epNum);
    return {
      id: `watch/anikoto/${anilistId}/sub/anikoto-${epNum}`,
      number: epNum,
      title: ep.title ?? meta.title?.en ?? `Episode ${epNum}`,
      titleJapanese: ep.title_japanese ?? null,
      titleRomanji: ep.title_romanji ?? null,
      image: meta.image ?? null,
      airDate: ep.aired ?? meta.airDate ?? null,
      duration: meta.runtime ? meta.runtime * 60 : null,
      score: ep.score ?? null,
      filler: ep.filler,
      recap: ep.recap,
      description: meta.overview ?? null,
      hasSub: hasSubFallback ? true : (avail?.hasSub ?? false),
      hasDub: hasDubFallback ? false : (avail?.hasDub ?? false)
    };
  });
  return {
    episodes,
    pagination: {
      currentPage: page,
      lastPage: jikanEps.pagination.last_visible_page,
      hasNextPage: jikanEps.pagination.has_next_page
    }
  };
}
__name(handleEpisodes4, "handleEpisodes");
async function getEpisodes4(anilistId, ctx = {}) {
  const anizip = ctx.anizip ?? await getJSON(`${ANIZIP3}?anilist_id=${anilistId}`);
  const malId = ctx.media?.idMal ?? anizip.mappings?.mal_id ?? null;
  const enTitle = anizip.titles?.en
    ?? ctx.media?.title?.english
    ?? ctx.media?.title?.romaji
    ?? Object.values(anizip.titles ?? {})[0]
    ?? "";

  const jikanShow = malId
    ? (ctx.media ? { data: {
        title: ctx.media.title.romaji,
        title_english: ctx.media.title.english,
        title_japanese: ctx.media.title.native,
        year: ctx.media.seasonYear,
        type: ctx.media.format
      } } : await getJSON(`${JIKAN4}/anime/${malId}`).catch(() => null))
    : (ctx.media ? { data: {
        title: ctx.media.title.romaji,
        title_english: ctx.media.title.english,
        title_japanese: ctx.media.title.native,
        year: ctx.media.seasonYear,
        type: ctx.media.format
      } } : null);

  if (!malId) {
    const anizipEps = anizip?.episodes ? Object.entries(anizip.episodes) : [];
    if (!anizipEps.length) throw new Error("Could not find MAL ID and no AniZip episodes available");

    let anikotoEpMap = new Map();
    if (enTitle) {
      try {
        const { showId } = await findAnikotoShow(enTitle, jikanShow);
        const listData = await getJSON(`${ANIKOTO}/ajax/episode/list/${showId}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
        extractEpisodes(listData.result ?? "").forEach((e) => anikotoEpMap.set(e.num, { hasSub: e.hasSub, hasDub: e.hasDub }));
      } catch {}
    }
    const hasSubFallback = anikotoEpMap.size === 0;
    const hasDubFallback = anikotoEpMap.size === 0;
    const sub = [], dub = [];
    for (const [epKey, meta] of anizipEps) {
      const epNum = parseInt(epKey);
      const avail = anikotoEpMap.get(epNum);
      const epHasSub = hasSubFallback ? true : (avail?.hasSub ?? false);
      const epHasDub = hasDubFallback ? true : (avail?.hasDub ?? false);
      const base = {
        number: epNum,
        title: meta.title?.en ?? meta.title?.["x-jat"] ?? `Episode ${epNum}`,
        duration: meta.runtime ? meta.runtime * 60 : null,
        filler: meta.filler ?? false,
        uncensored: false,
        description: meta.overview ?? null,
        image: meta.image ?? null,
        airDate: meta.airdate ?? null,
        hasSub: epHasSub,
        hasDub: epHasDub,
      };
      if (epHasSub) sub.push({ ...base, id: `watch/anikoto/${anilistId}/sub/anikoto-${epNum}`, audio: "sub" });
      if (epHasDub) dub.push({ ...base, id: `watch/anikoto/${anilistId}/dub/anikoto-${epNum}`, audio: "dub" });
    }
    sub.sort((a, b) => a.number - b.number);
    dub.sort((a, b) => a.number - b.number);
    return { meta: { malId: null }, episodes: { sub, dub } };
  }

  const allEps = ctx.jikanEps ?? await (async () => {
    const first = await getJSON(`${JIKAN4}/anime/${malId}/episodes?page=1`);
    const lastPage = first.pagination?.last_visible_page ?? 1;
    let eps = [...first.data ?? []];
    if (lastPage > 1) {
      const rest = await Promise.all(
        Array.from(
          { length: lastPage - 1 },
          (_, i) => getJSON(`${JIKAN4}/anime/${malId}/episodes?page=${i + 2}`)
        )
      );
      for (const r of rest) eps = eps.concat(r.data ?? []);
    }
    return eps;
  })();
  let anikotoEpMap = new Map();
  try {
    const { showId } = await findAnikotoShow(enTitle, jikanShow);
    const listData = await getJSON(`${ANIKOTO}/ajax/episode/list/${showId}`, { "X-Requested-With": "XMLHttpRequest", Referer: `${ANIKOTO}/` });
    extractEpisodes(listData.result ?? "").forEach((e) => anikotoEpMap.set(e.num, { hasSub: e.hasSub, hasDub: e.hasDub }));
  } catch {
  }
  const hasSubFallback = anikotoEpMap.size === 0;
  const hasDubFallback = anikotoEpMap.size === 0;
  const sub = [], dub = [];
  for (const ep of allEps) {
    const epNum = ep.mal_id;
    const meta = anizip.episodes?.[String(epNum)] ?? {};
    const avail = anikotoEpMap.get(epNum);
    const epHasSub = hasSubFallback ? true : (avail?.hasSub ?? false);
    const epHasDub = hasDubFallback ? true : (avail?.hasDub ?? false);
    const base = {
      number: epNum,
      title: ep.title ?? meta.title?.en ?? `Episode ${epNum}`,
      duration: meta.runtime ? meta.runtime * 60 : null,
      filler: ep.filler,
      uncensored: false,
      description: meta.overview ?? null,
      image: meta.image ?? null,
      airDate: ep.aired ?? meta.airDate ?? null,
      hasSub: epHasSub,
      hasDub: epHasDub
    };
    if (epHasSub) sub.push({ ...base, id: `watch/anikoto/${anilistId}/sub/anikoto-${epNum}`, audio: "sub" });
    if (epHasDub) dub.push({ ...base, id: `watch/anikoto/${anilistId}/dub/anikoto-${epNum}`, audio: "dub" });
  }
  return {
    meta: { malId },
    episodes: { sub, dub }
  };
}
__name(getEpisodes4, "getEpisodes");
var anikoto_default = {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }
    try {
      let m;
      m = path.match(/^\/watch\/anikoto\/(\d+)\/(sub|dub)\/anikoto-(\d+)\/?$/);
      if (m) return await handleWatch4(m[1], m[2], parseInt(m[3]));
      m = path.match(/^\/episodes\/anikoto\/(\d+)\/?$/);
      if (m) {
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
        const data = await handleEpisodes4(m[1], page);
        return json4(data);
      }
      return json4({ error: "Not found" }, 404);
    } catch (err) {
      return json4({ error: err.message }, 500);
    }
  }
};
export default anikoto_default;
export { getEpisodes4 as getEpisodes };
