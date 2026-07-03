import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OMSSServer } from '@omss/framework';

// Import providers
import { MovieDownloader as MovieDownloader02 } from '../cinepro-core/src/providers/02moviedownloader/02moviedownloader';
import { AnyEmbed } from '../cinepro-core/src/providers/anyembed/anyembed';
import { CineSuProvider } from '../cinepro-core/src/providers/cinesu/cinesu';
import { Fmovies4U } from '../cinepro-core/src/providers/fmovies4u/fmovies4u';
import { FsharetvProvider } from '../cinepro-core/src/providers/fshare/fshare';
import { IcefyProvider } from '../cinepro-core/src/providers/icefy/icefy';
import { PeachifyProvider } from '../cinepro-core/src/providers/peachify/peachify';
import { PoprProvider } from '../cinepro-core/src/providers/popr/popr';
import { StreamMafiaProvider } from '../cinepro-core/src/providers/streammafia/streammafia';
import { TulnexProvider } from '../cinepro-core/src/providers/tulnex/tulnex';
import { VidApiProvider } from '../cinepro-core/src/providers/vidapi/vidapi';
import { VideasyProvider } from '../cinepro-core/src/providers/videasy/videasy';
import { VidNestProvider } from '../cinepro-core/src/providers/vidnest/vidnest';
import { VidRockProvider } from '../cinepro-core/src/providers/vidrock/vidrock';
import { VidSrcProvider } from '../cinepro-core/src/providers/vidsrc/vidsrc';
import { VidZeeProvider } from '../cinepro-core/src/providers/vidzee/vidzee';
import { VixSrcProvider } from '../cinepro-core/src/providers/vixsrc/vixsrc';

// We initialize the serverless instance of OMSSServer once globally
let serverInstance: OMSSServer | null = null;

function getServerInstance() {
  if (serverInstance) return serverInstance;

  const apiKey = process.env.VITE_TMDB_API_KEY || 'fe42b660a036f4d6a2bfeb4d0f523ce9';

  const server = new OMSSServer({
    name: 'CineProServerless',
    version: '1.0.0',
    host: 'localhost',
    port: 3001,
    cache: {
      type: 'memory',
      ttl: {
        sources: 60 * 60,
        subtitles: 60 * 60 * 24
      }
    },
    tmdb: {
      apiKey: apiKey,
      cacheTTL: 24 * 60 * 60
    }
  });

  const registry = server.getRegistry();
  registry.register(new MovieDownloader02() as any);
  registry.register(new AnyEmbed() as any);
  registry.register(new CineSuProvider() as any);
  registry.register(new Fmovies4U() as any);
  registry.register(new FsharetvProvider() as any);
  registry.register(new IcefyProvider() as any);
  registry.register(new PeachifyProvider() as any);
  registry.register(new PoprProvider() as any);
  registry.register(new StreamMafiaProvider() as any);
  registry.register(new TulnexProvider() as any);
  registry.register(new VidApiProvider() as any);
  registry.register(new VideasyProvider() as any);
  registry.register(new VidNestProvider() as any);
  registry.register(new VidRockProvider() as any);
  registry.register(new VidSrcProvider() as any);
  registry.register(new VidZeeProvider() as any);
  registry.register(new VixSrcProvider() as any);

  serverInstance = server;
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { tmdbId, mediaType, seasonId, episodeId } = req.query;

  if (!tmdbId || typeof tmdbId !== 'string') {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }
  if (!mediaType || typeof mediaType !== 'string' || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return res.status(400).json({ error: 'mediaType parameter is required (movie or tv)' });
  }

  try {
    const server = getServerInstance();
    let scrapersRes: any;

    if (mediaType === 'movie') {
      scrapersRes = await (server as any).sourceService.getMovieSources(tmdbId);
    } else {
      const s = Number(seasonId || 1);
      const e = Number(episodeId || 1);
      scrapersRes = await (server as any).sourceService.getTVSources(tmdbId, s, e);
    }

    // Rewrite CinePro proxy URLs to project's own /api/m3u8-proxy serverless proxy
    if (scrapersRes && scrapersRes.sources) {
      scrapersRes.sources = scrapersRes.sources.map((s: any) => {
        if (s.url && s.url.includes('data=')) {
          try {
            const dataStr = s.url.split('data=')[1];
            const parsedData = JSON.parse(decodeURIComponent(dataStr));
            if (parsedData.url) {
              const referer = parsedData.headers?.Referer || parsedData.headers?.referer || '';
              const refererParam = referer ? `&referer=${encodeURIComponent(referer)}` : '';
              
              // Rewrite to local /api/m3u8-proxy
              s.url = `/api/m3u8-proxy?url=${encodeURIComponent(parsedData.url)}${refererParam}`;
            }
          } catch (e) {
            console.warn("Failed to rewrite source URL proxy parameters:", e);
          }
        }
        return s;
      });
    }

    return res.status(200).json({
      success: true,
      data: scrapersRes
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: `Failed to resolve CinePro Core serverless sources: ${err.message || err}`
    });
  }
}
