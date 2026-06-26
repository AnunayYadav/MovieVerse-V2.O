import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MOVIES, ANIME } from '@consumet/extensions';

// Initialize providers
const movieProviders: Record<string, any> = {
  flixhq: new MOVIES.FlixHQ(),
  sflix: new MOVIES.SFlix(),
  goku: new MOVIES.Goku(),
  himovies: new MOVIES.HiMovies()
};

const animeProviders: Record<string, any> = {
  hianime: new ANIME.Hianime(),
  animepahe: new ANIME.AnimePahe()
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { tmdbId, mediaType, title: queryTitle, season: querySeason, episode: queryEpisode, isAnime: queryIsAnime, anilistId: queryAnilistId, animeLanguage = 'sub' } = req.query;

  const isAnime = queryIsAnime === 'true';
  const season = querySeason ? parseInt(querySeason as string, 10) : 1;
  const episode = queryEpisode ? parseInt(queryEpisode as string, 10) : 1;
  
  let title = queryTitle as string;

  try {
    // 1. Fetch title from TMDB if not provided
    if (!title && tmdbId) {
      const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType || 'movie'}/${tmdbId}?api_key=${apiKey}`;
      const tmdbRes = await fetch(tmdbUrl);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        title = tmdbData.title || tmdbData.name;
      }
    }

    if (!title) {
      return res.status(400).json({ error: 'Title or TMDB ID is required' });
    }

    // Clean title for search
    const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored)\)?\s*$/i, '').trim();

    if (isAnime) {
      // Handle Anime Stream Resolution
      const animeToTry = ['hianime', 'animepahe'];
      let lastAnimeError = null;

      for (const aName of animeToTry) {
        try {
          const provider = animeProviders[aName];
          console.log(`[Anime] Trying provider: ${aName} for "${cleanTitle}"...`);
          const searchRes = await provider.search(cleanTitle);
          const results = searchRes.results || [];
          
          if (results.length > 0) {
            const matchedId = results[0].id;
            console.log(`[Anime] [${aName}] Found ID: ${matchedId}. Fetching info...`);
            const info = await provider.fetchMediaInfo(matchedId);
            
            const targetEp = info.episodes?.find((e: any) => e.number === episode) || info.episodes?.[episode - 1] || info.episodes?.[0];
            if (targetEp) {
              console.log(`[Anime] [${aName}] Resolving sources for episode ID: ${targetEp.id}...`);
              const sources = await provider.fetchEpisodeSources(targetEp.id);
              if (sources && sources.sources && sources.sources.length > 0) {
                res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
                return res.status(200).json({
                  provider: aName,
                  ...sources
                });
              }
            }
          }
        } catch (e: any) {
          console.warn(`[Anime] Provider ${aName} failed:`, e.message || e);
          lastAnimeError = e;
        }
      }
      return res.status(404).json({ error: `No anime stream sources found for: ${cleanTitle}`, details: lastAnimeError?.message });
    } else {
      // Handle Movies & TV Series Stream Resolution
      const providersToTry = ['flixhq', 'sflix', 'himovies', 'goku'];
      let lastError = null;

      for (const pName of providersToTry) {
        try {
          const provider = movieProviders[pName];
          console.log(`[Movies] Trying provider: ${pName} for "${cleanTitle}"...`);
          const searchRes = await provider.search(cleanTitle);
          const results = searchRes.results || [];

          if (results.length > 0) {
            const expectedType = mediaType === 'tv' ? 'tv series' : 'movie';
            const matched = results.find(
              (r: any) => r.type?.toLowerCase() === expectedType || r.type?.toLowerCase()?.includes(mediaType as string)
            ) || results[0];

            console.log(`[Movies] [${pName}] Found ID: ${matched.id}. Fetching info...`);
            const info = await provider.fetchMediaInfo(matched.id);

            let targetEpId = matched.id;
            if (mediaType === 'tv' && info.episodes && info.episodes.length > 0) {
              const ep = info.episodes.find((e: any) => e.season === season && e.number === episode) || info.episodes[0];
              targetEpId = ep.id;
            } else if (info.episodes && info.episodes.length > 0) {
              targetEpId = info.episodes[0].id;
            }

            console.log(`[Movies] [${pName}] Resolving sources for episode ID: ${targetEpId}...`);
            const sources = await provider.fetchEpisodeSources(targetEpId);
            
            if (!sources || !sources.sources || sources.sources.length === 0) {
              throw new Error("No sources found");
            }

            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
            return res.status(200).json({
              provider: pName,
              ...sources
            });
          }
        } catch (e: any) {
          console.warn(`[Movies] Provider ${pName} failed:`, e.message || e);
          lastError = e;
        }
      }

      return res.status(404).json({ error: `No stream sources found for: ${cleanTitle}`, details: lastError?.message });
    }
  } catch (error: any) {
    console.error("Resolver API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
