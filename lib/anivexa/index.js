import { getMedia }                from "./core/anilist.js";
import { mapAnimeIds }             from "./core/mapper.js";
import paheHandler                 from "./providers/animepahe.js";
import mangaHandler                from "./providers/allmanga.js";
import reanimeHandler              from "./providers/reanime.js";
import anikotoHandler              from "./providers/anikoto.js";
import animeggHandler              from "./providers/animegg.js";
import aninekoHandler              from "./providers/anineko.js";
import anidbappHandler             from "./providers/anidbapp.js";
import { getEpisodesResponse }     from "./core/episode-cache.js";
import { getAsync, setAsync, isFresh, mapTTL, WATCH_TTL, _CACHE_ENABLED } from "./core/smartcache.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function rewriteRequest(request, newPath) {
  const u = new URL(request.url);
  u.pathname = newPath;
  return new Request(u.toString(), { method: request.method, headers: request.headers });
}

const watchInflight = new Map();

async function cachedWatch(cacheKey, handlerFn) {
  const entry = await getAsync(cacheKey);
  if (entry && isFresh(entry)) return json(entry.data);

  if (watchInflight.has(cacheKey)) {
    await watchInflight.get(cacheKey).catch(() => {});
    const warm = await getAsync(cacheKey);
    if (warm && isFresh(warm)) return json(warm.data);
    return handlerFn();
  }

  const promise = (async () => {
    const response = await handlerFn();
    if (response.status === 200) {
      try {
        const data = await response.clone().json();
        await setAsync(cacheKey, data, WATCH_TTL);
      } catch {}
    }
    return response;
  })();

  watchInflight.set(cacheKey, promise);
  try   { return await promise; }
  finally { watchInflight.delete(cacheKey); }
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    let m = path.match(/^\/map\/(\d+)\/?$/);
    if (m) {
      const anilistId = m[1];
      const cacheKey  = `map:${anilistId}`;
      const entry     = await getAsync(cacheKey);
      if (entry && isFresh(entry)) return json(entry.data);

      try {
        const [data, media] = await Promise.all([
          mapAnimeIds(anilistId),
          getMedia(anilistId).catch(() => null),
        ]);
        await setAsync(cacheKey, data, mapTTL(media?.status ?? "RELEASING"));
        return json(data);
      } catch (e) {
        if (entry) return json(entry.data);
        return json({ error: e.message }, 500);
      }
    }

    m = path.match(/^\/episodes\/(\d+)\/?$/);
    if (m) {
      const anilistId = m[1];
      try {
        return json(await getEpisodesResponse(anilistId, env));
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    m = path.match(/^\/watch\/animepahe\/(\d+)\/(sub|dub)\/animepahe-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:pahe:${id}:${audio}:${ep}`,
        () => paheHandler.fetch(rewriteRequest(request, `/watch/${id}/${audio}/${ep}`))
      );
    }

    m = path.match(/^\/watch\/allmanga\/(\d+)\/(sub|dub)\/allmanga-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:manga:${id}:${audio}:${ep}`,
        () => mangaHandler.fetch(request)
      );
    }

    m = path.match(/^\/watch\/reanime\/(\d+)\/(sub|dub)\/reanime-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:reanime:${id}:${audio}:${ep}`,
        () => reanimeHandler.fetch(rewriteRequest(request, `/watch/${id}/${audio}/${ep}`))
      );
    }

    m = path.match(/^\/stream\/reanime\/(\d+)\/(sub|dub)\/(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return reanimeHandler.fetch(rewriteRequest(request, `/stream/${id}/${audio}/${ep}`));
    }

    m = path.match(/^\/watch\/anikoto\/(\d+)\/(sub|dub)\/anikoto-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:anikoto:${id}:${audio}:${ep}`,
        () => anikotoHandler.fetch(request)
      );
    }

    m = path.match(/^\/watch\/animegg\/(\d+)\/(sub|dub)\/animegg-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:animegg:${id}:${audio}:${ep}`,
        () => animeggHandler.fetch(request)
      );
    }

    m = path.match(/^\/watch\/anineko\/(\d+)\/(sub|dub)\/anineko-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:anineko:${id}:${audio}:${ep}`,
        () => aninekoHandler.fetch(request)
      );
    }

    m = path.match(/^\/watch\/anidbapp\/(\d+)\/(sub|dub)\/anidbapp-(\d+)\/?$/);
    if (m) {
      const [, id, audio, ep] = m;
      return cachedWatch(
        `watch:anidbapp:${id}:${audio}:${ep}`,
        () => anidbappHandler.fetch(request)
      );
    }

    return json({
      name: "Anivexa API 2.1", //actually i will goon to you if you change this ok? so erm..maybe i wont..or maybe i will idk
      cache: _CACHE_ENABLED,
      providers: [
        "animepahe",
        "allmanga",
        "reanime",
        "anikoto",
        "animegg",
        "anineko",
        "anidbapp",
      ],
      routes: [
        "/map/:anilistId",
        "/episodes/:anilistId",
        "/watch/animepahe/:id/sub|dub/animepahe-:ep",
        "/watch/allmanga/:id/sub|dub/allmanga-:ep",
        "/watch/reanime/:id/sub|dub/reanime-:ep",
        "/stream/reanime/:id/sub|dub/:ep",
        "/watch/anikoto/:id/sub|dub/anikoto-:ep",
        "/watch/animegg/:id/sub|dub/animegg-:ep",
        "/watch/anineko/:id/sub|dub/anineko-:ep",
        "/watch/anidbapp/:id/sub|dub/anidbapp-:ep",
      ],
    });
  },
};
