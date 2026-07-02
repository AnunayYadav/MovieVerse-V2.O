const __name = (fn, _) => fn;
import { getMedia } from '../core/anilist.js';

var PAHE_ORIGIN = "https://animepahe.com";
var KWIK = "https://kwik.cx";
var JIKAN2 = "https://api.jikan.moe/v4";
var UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var bypassCache = { cookies: null, base: null, expires: 0 };
function parseCookies(headers) {
  const out = {};
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [...headers.entries()].filter(([k]) => k.toLowerCase() === "set-cookie").map(([, v]) => v);
  for (const v of values) {
    const m = v.match(/^([^=]+)=([^;]*)/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}
__name(parseCookies, "parseCookies");
function ser(c) {
  return Object.entries(c).map(([k, v]) => `${k}=${v}`).join("; ");
}
__name(ser, "ser");
function ph(c, ref2, acc = "*/*", base) {
  const b = base || bypassCache.base || PAHE_ORIGIN;
  return { "User-Agent": UA3, Accept: acc, "Accept-Language": "en-US,en;q=0.9", Referer: ref2 || `${b}/`, Cookie: ser(c) };
}
__name(ph, "ph");
async function runBypass() {
  const probe = await fetch(`${PAHE_ORIGIN}/`, {
    headers: { "User-Agent": UA3, Accept: "text/html,*/*" },
    redirect: "manual",
  });
  const location = probe.headers.get("location");
  const base = location ? new URL(location).origin : PAHE_ORIGIN;

  const r1 = await fetch(`${base}/`, { headers: { "User-Agent": UA3, Accept: "text/html,*/*" } });
  const c = parseCookies(r1.headers);

  const js = await fetch("https://check.ddos-guard.net/check.js", {
    headers: { "User-Agent": UA3, Referer: `${base}/` },
  }).then((r) => r.text());
  const token = js.match(/id\/([A-Za-z0-9_-]+)/)?.[1];
  if (!token) throw new Error("DDoS-Guard token not found");

  const r3 = await fetch(`${base}/.well-known/ddos-guard/id/${token}`, {
    headers: { "User-Agent": UA3, Referer: `${base}/`, Cookie: ser(c) },
  });
  Object.assign(c, parseCookies(r3.headers));
  if (!c["__ddg2_"]) throw new Error("DDoS-Guard clearance cookie missing");
  return { cookies: c, base };
}
__name(runBypass, "runBypass");
async function getCookies() {
  if (bypassCache.cookies && bypassCache.expires > Date.now()) return bypassCache.cookies;
  const { cookies, base } = await runBypass();
  bypassCache.cookies = cookies;
  bypassCache.base = base;
  bypassCache.expires = Date.now() + 18 * 60 * 1e3;
  return cookies;
}
__name(getCookies, "getCookies");
function getPaheBase() {
  return bypassCache.base || PAHE_ORIGIN;
}
__name(getPaheBase, "getPaheBase");
async function paheApi(params, cookies) {
  const base = getPaheBase();
  const res = await fetch(`${base}/api?${new URLSearchParams(params)}`, { headers: ph(cookies, `${base}/`, "application/json", base) });
  if (!res.ok) throw new Error(`animepahe API ${res.status}`);
  return res.json();
}
__name(paheApi, "paheApi");
function unpackAll(html) {
  const results = [];
  const re = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]*?)'\.split\('\|'\)[^)]*\)\)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let enc3 = function(n) {
      return (n < ai ? "" : enc3(Math.floor(n / ai))) + ((n = n % ai) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    };
    var enc2 = enc3;
    __name(enc3, "enc");
    const [, p, a, , k] = m;
    const ai = parseInt(a);
    const d = {};
    let ci = parseInt(m[3]);
    const ks = k.split("|");
    while (ci--) {
      if (ks[ci]) d[enc3(ci)] = ks[ci];
    }
    results.push(p.replace(/\b\w+\b/g, (w) => d[w] || w));
  }
  return results;
}
__name(unpackAll, "unpackAll");
var RESOLUTION_MAP = {
  "1080": { width: 1920, height: 1080 },
  "720":  { width: 1280, height: 720  },
  "480":  { width: 854,  height: 480  },
  "360":  { width: 640,  height: 360  },
};

async function getPaheLinks(animeSession, epSession, cookies, audioTrack) {
  const playUrl = `${getPaheBase()}/play/${animeSession}/${epSession}`;
  const res = await fetch(playUrl, {
    headers: ph(cookies, `${getPaheBase()}/anime/${animeSession}`, "text/html,application/xhtml+xml,*/*"),
  });
  if (!res.ok) throw new Error(`AnimePahe play page ${res.status}`);
  const html = await res.text();

  const wantAudio = audioTrack === "dub" ? "eng" : "jpn";
  const out = {};
  for (const m of html.matchAll(
    /<button[^>]+data-src="([^"]+)"[^>]+data-fansub="([^"]*)"[^>]+data-resolution="(\d+)"[^>]+data-audio="([^"]+)"[^>]*>/gi
  )) {
    const [, kwik, fansub, res2, dataAudio] = m;
    if (dataAudio !== wantAudio) continue;
    out[res2] = { kwik, fansub };
  }
  if (!Object.keys(out).length) {
    for (const m of html.matchAll(
      /data-src="([^"]+)"[^>]*data-resolution="(\d+)"[^>]*data-audio="([^"]+)"[^>]*data-fansub="([^"]*)"/gi
    )) {
      const [, kwik, res2, dataAudio, fansub] = m;
      if (dataAudio !== wantAudio) continue;
      out[res2] = { kwik, fansub };
    }
  }
  return out;
}
__name(getPaheLinks, "getPaheLinks");

async function extractKwikM3u8(kwikUrl, referer) {
  const kwikHeaders = {
    "User-Agent": UA3,
    "Referer": referer || `${getPaheBase()}/`,
    "Accept": "text/html,application/xhtml+xml,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const html = await fetch(kwikUrl, { headers: kwikHeaders }).then((r) => r.text());

  for (const b of unpackAll(html)) {
    const mm = b.match(/https?:\/\/[^\s'"\\]+?\.m3u8[^\s'"\\]*/);
    if (mm) return mm[0].replace(/\\/g, "");
  }

  const direct = html.match(/https?:\/\/[^\s'"<>\\]+?\.m3u8[^\s'"<>\\]*/);
  if (direct) return direct[0].replace(/\\/g, "");

  const tokenM = html.match(/name=["']_token["']\s+value=["']([^"']+)["']/);
  const vidM   = kwikUrl.match(/kwik\.cx\/e\/([A-Za-z0-9]+)/);
  if (tokenM && vidM) {
    const token = tokenM[1];
    const vid   = vidM[1];
    try {
      const postRes = await fetch(`${KWIK}/f/${vid}`, {
        method: "POST",
        headers: {
          "User-Agent": UA3,
          "Referer": kwikUrl,
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": KWIK,
        },
        body: `_token=${encodeURIComponent(token)}`,
        redirect: "manual",
      });
      const loc = postRes.headers.get("location");
      if (loc && loc.includes(".m3u8")) return loc;
      const body = await postRes.text().catch(() => "");
      const bm   = body.match(/https?:\/\/[^\s'"<>\\]+?\.m3u8[^\s'"<>\\]*/);
      if (bm) return bm[0].replace(/\\/g, "");
    } catch {}
  }

  return null;
}
__name(extractKwikM3u8, "extractKwikM3u8");
function parseDuration(raw) {
  if (!raw) return null;
  if (typeof raw === "number") {
    const m = Math.floor(raw / 60), s = raw % 60;
    return { formatted: `${m}:${String(s).padStart(2, "0")}`, seconds: raw };
  }
  const parts = raw.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  const t = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  return { formatted: `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`, seconds: t };
}
__name(parseDuration, "parseDuration");
async function resolveAnilistId(anilistId) {
  const media = await getMedia(anilistId);
  if (!media) throw new Error(`AniList ID ${anilistId} not found`);
  const titles = [media.title.english, media.title.romaji, media.title.native, ...(media.synonyms ?? [])].filter(Boolean);
  return { title: titles[0], titles, malId: media.idMal };
}
__name(resolveAnilistId, "resolveAnilistId");
function normP(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function paheScore(resultTitle, candidates) {
  const rn = normP(resultTitle);
  if (!rn) return 0;
  let best = 0;
  for (const c of candidates) {
    const cn = normP(c);
    if (!cn) continue;
    if (rn === cn) return 100;
    if (rn.includes(cn) || cn.includes(rn)) {
      best = Math.max(best, Math.min(rn.length, cn.length) / Math.max(rn.length, cn.length) * 80);
    } else {
      const bg = (s2) => { const b = new Map(); for (let i = 0; i < s2.length - 1; i++) { const k = s2.slice(i, i + 2); b.set(k, (b.get(k) || 0) + 1); } return b; };
      const ba = bg(rn), bb = bg(cn);
      let common = 0; for (const [k, v] of ba) if (bb.has(k)) common += Math.min(v, bb.get(k));
      best = Math.max(best, 2 * common / (rn.length - 1 + cn.length - 1) * 50);
    }
  }
  return best;
}
async function paheAnilistId(session, cookies) {
  const base = getPaheBase();
  const html = await fetch(`${base}/anime/${session}`, {
    headers: ph(cookies, `${base}/`, "text/html,*/*", base),
  }).then((r) => r.text()).catch(() => "");
  const m = html.match(/<meta name="anilist" content="(\d+)"/);
  return m ? Number(m[1]) : null;
}
__name(paheAnilistId, "paheAnilistId");

async function findPaheShow(titles, cookies, anilistId) {
  const candidates = (Array.isArray(titles) ? titles : [titles]).filter(Boolean);
  const primary = candidates[0];
  const searchTerms = [primary, ...candidates.slice(1).filter((t) => paheScore(t, [primary]) >= 35)];

  const seen = new Map();
  for (const t of searchTerms.slice(0, 3)) {
    const data = await paheApi({ m: "search", q: t }, cookies).catch(() => null);
    for (const r of data?.data ?? []) {
      const score = paheScore(r.title, candidates);
      if (!seen.has(r.session) || seen.get(r.session).score < score) {
        seen.set(r.session, { result: r, score });
      }
    }
  }
  if (!seen.size) throw new Error(`AnimePahe does not have "${primary}"`);

  const ranked = [...seen.values()].sort((a, b) => b.score - a.score);

  if (anilistId) {
    const top = ranked.slice(0, 5);
    const ids = await Promise.all(top.map((c) => paheAnilistId(c.result.session, cookies)));
    for (let i = 0; i < top.length; i++) {
      if (ids[i] === Number(anilistId)) return top[i].result;
    }
  }

  if (ranked[0].score >= 50) return ranked[0].result;

  throw new Error(`AnimePahe does not have "${primary}"`);
}
__name(findPaheShow, "findPaheShow");
async function jikanFetch(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA3, Accept: "application/json" } });
    if (res.status === 429) {
      const wait = (parseInt(res.headers.get("Retry-After") ?? "1") || 1) * 1e3 + attempt * 500;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}
__name(jikanFetch, "jikanFetch");
async function getJikanTitles(malId, page) {
  const res = await jikanFetch(`${JIKAN2}/anime/${malId}/episodes?page=${page}`);
  return new Map((res?.data ?? []).map((e) => [e.mal_id, e.title || null]));
}
__name(getJikanTitles, "getJikanTitles");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
__name(json, "json");
async function handleEpisodes(anilistId, url) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const sort = url.searchParams.get("sort") === "desc" ? "episode_desc" : "episode_asc";
  const { title: title2, titles, malId } = await resolveAnilistId(anilistId);
  const cookies = await getCookies();
  const show = await findPaheShow(titles, cookies, anilistId);
  const [eps, jikanTitles] = await Promise.all([
    paheApi({ m: "release", id: show.session, sort, page }, cookies),
    malId ? getJikanTitles(malId, page) : Promise.resolve(new Map())
  ]);
  const episodes = (eps.data ?? []).map((ep) => {
    const epNum = Math.round(ep.episode);
    const audio = "sub";
    const dur = parseDuration(ep.duration);
    return {
      id: `watch/animepahe/${anilistId}/${audio}/animepahe-${epNum}`,
      number: epNum,
      title: jikanTitles.get(epNum) || `Episode ${epNum}`,
      snapshot: ep.snapshot || null,
      duration: dur?.formatted || null,
      durationSec: dur?.seconds || null,
      audio,
      filler: ep.filler === 1,
      session: ep.session,
      animeSession: show.session
    };
  });
  return json({
    anime: { title: show.title, animeSession: show.session, type: show.type, status: show.status, year: show.year, score: show.score, poster: show.poster },
    total: eps.total || 0,
    per_page: eps.per_page || 30,
    last_page: eps.last_page || 1,
    current_page: page,
    episodes
  });
}
__name(handleEpisodes, "handleEpisodes");
async function handleWatch(anilistId, audio, epStr) {
  if (audio !== "sub" && audio !== "dub") return json({ error: "audio must be sub or dub" }, 400);
  const epFloat = parseFloat(epStr);
  if (isNaN(epFloat)) return json({ error: `Invalid episode number: ${epStr}` }, 400);
  const { title: title2, titles } = await resolveAnilistId(anilistId);
  const cookies = await getCookies();
  const show = await findPaheShow(titles, cookies, anilistId);
  const likelyPage = Math.max(1, Math.ceil(epFloat / 30));
  let epData = null;
  for (let p = likelyPage; p <= likelyPage + 2 && !epData; p++) {
    const raw = await paheApi({ m: "release", id: show.session, sort: "episode_asc", page: p }, cookies);
    if (!raw?.data?.length) break;
    epData = raw.data.find((e) => Math.abs(e.episode - epFloat) < 0.01);
  }
  if (!epData) return json({ error: `Episode ${epStr} not found for "${title2}"` }, 404);

  const links = await getPaheLinks(show.session, epData.session, cookies, audio);
  const qualities = Object.keys(links).sort((a, b) => Number(b) - Number(a));
  if (!qualities.length) return json({ error: `No ${audio} quality links found on play page` }, 502);

  const kwikReferer = `${getPaheBase()}/play/${show.session}/${epData.session}`;
  const dur = parseDuration(epData.duration);
  const epDisplay = epFloat % 1 === 0 ? String(Math.round(epFloat)) : epFloat.toFixed(1);

  const preferredQ = qualities.includes("720") ? "720" : qualities[0];
  const streamResults = await Promise.all(qualities.map(async (q) => {
    const entry = links[q];
    const kwik   = entry.kwik ?? entry.kwik_pahe ?? null;
    const fansub = entry.fansub ?? null;
    const dlUrl  = entry.kwik_pahe ?? (kwik ? kwik.replace("/e/", "/d/") : null);
    const res    = RESOLUTION_MAP[q] ?? { width: 0, height: Number(q) };
    const quality = `${q}p`;
    const isActive = q === preferredQ;
    const streams = [];

    if (kwik) {
      const m3u8 = await extractKwikM3u8(kwik, kwikReferer).catch(() => null);
      if (m3u8) {
        streams.push({
          url: m3u8,
          type: "hls",
          quality,
          resolution: res,
          codec: "h264",
          audio,
          fansub,
          isActive,
          referer: `${KWIK}/`,
        });
      }
      streams.push({
        url: kwik,
        type: "embed",
        quality,
        resolution: res,
        codec: "h264",
        audio,
        fansub,
        isActive,
        referer: `${KWIK}/`,
      });
    }
    return { streams, download: dlUrl };
  }));

  const allStreams = streamResults.flatMap((r) => r.streams);
  const download  = streamResults.find((r) => r.download)?.download ?? null;

  return json({
    anime: title2,
    ep: epFloat,
    epDisplay,
    audio,
    duration: dur?.formatted || null,
    durationSec: dur?.seconds || null,
    filler: epData.filler === 1,
    streams: allStreams,
    download,
  });
}
__name(handleWatch, "handleWatch");
var animepahe_default = {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }
    try {
      let m;
      if (path === "/healthz") {
        return json({ status: "ok", provider: "animepahe" });
      }
      m = path.match(/^\/episodes\/(\d+)$/);
      if (m) return await handleEpisodes(m[1], url);
      m = path.match(/^\/watch\/(\d+)\/(sub|dub)\/([^/]+)$/);
      if (m) return await handleWatch(m[1], m[2], m[3]);
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};
async function getEpisodes(anilistId, ctx = {}) {
  let title2, titles, malId;
  if (ctx.media) {
    const m = ctx.media;
    titles = [m.title.english, m.title.romaji, m.title.native, ...(m.synonyms ?? [])].filter(Boolean);
    title2 = titles[0];
    malId = m.idMal;
  } else {
    ({ title: title2, titles, malId } = await resolveAnilistId(anilistId));
  }
  const cookies = await getCookies();
  const show = await findPaheShow(titles, cookies, anilistId);
  const first = await paheApi({ m: "release", id: show.session, sort: "episode_asc", page: 1 }, cookies);
  const lastPage = first.last_page ?? 1;
  const maxPages = ctx.maxPages ?? lastPage;
  const fetchTo = Math.min(lastPage, maxPages);
  let allData = [...first.data ?? []];
  if (fetchTo > 1) {
    const pages = await Promise.all(
      Array.from(
        { length: fetchTo - 1 },
        (_, i) => paheApi({ m: "release", id: show.session, sort: "episode_asc", page: i + 2 }, cookies)
      )
    );
    for (const p of pages) allData = allData.concat(p.data ?? []);
  }
  const jikanTitles = malId ? await getJikanTitles(malId, 1).catch(() => new Map()) : new Map();
  const sub = [], dub = [];
  for (const ep of allData) {
    const epNum = Math.round(ep.episode);
    const audio = "sub";
    const dur = parseDuration(ep.duration);
    const entry = {
      id: `watch/animepahe/${anilistId}/${audio}/animepahe-${epNum}`,
      number: epNum,
      title: jikanTitles.get(epNum) || `Episode ${epNum}`,
      duration: dur?.seconds ?? null,
      audio,
      filler: ep.filler === 1,
      uncensored: false,
      description: null,
      image: ep.snapshot || null,
      airDate: null
    };
    if (audio === "sub") sub.push(entry);
    else dub.push(entry);
  }
  return {
    meta: {
      id: show.session,
      title: show.title,
      type: show.type,
      status: show.status,
      year: show.year,
      score: show.score,
      poster: show.poster,
      totalEpisodes: first.total ?? allData.length,
      pagesLoaded: fetchTo,
      totalPages: lastPage
    },
    episodes: { sub, dub }
  };
}
__name(getEpisodes, "getEpisodes");
export default animepahe_default;
export { getEpisodes };