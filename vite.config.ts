import path from 'path';
import url from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Copy all loaded env variables to process.env for local serverless routes
    for (const key in env) {
      process.env[key] = env[key];
    }
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/tmdb': {
            target: 'https://api.themoviedb.org/3',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
          },
          '/api/mangadex': {
            target: 'https://api.mangadex.org',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/mangadex/, ''),
          }
        }
      },
      // Ensure all routes fall back to index.html for SPA pathname routing
      appType: 'spa',
      plugins: [
        react(),
        {
          name: 'vercel-api-dev-server',
          configureServer(server) {
            // Return a function to add middleware AFTER Vite internals
            // But we actually want it BEFORE — so we use server.middlewares.use directly
            server.middlewares.use(async (req, res, next) => {
              const parsedUrl = url.parse(req.url || '', true);
              const pathname = parsedUrl.pathname;
              
              // Only handle our serverless API routes
              const apiRoutes: Record<string, string> = {
                '/api/manga': './api/manga-novels.ts',
                '/api/manga-novels': './api/manga-novels.ts',
                '/api/anime': './api/anime.ts',
                '/api/anilist': './api/metadata.ts',
                '/api/metadata': './api/metadata.ts',
                '/api/mangadex': './api/manga-novels.ts',
                '/api/nyaa': './api/anime.ts',
                '/api/tmdb': './api/metadata.ts',
                '/api/videasy': './api/stream-resolvers.ts',
                '/api/encdec': './api/stream-resolvers.ts',
                '/api/stream-resolvers': './api/stream-resolvers.ts',
                '/api/subtitles': './api/subtitles.ts',
                '/api/opensubtitles': './api/subtitles.ts',
                '/api/ai-search': './api/ai-search.ts',
              };
              
              let matchedPath = pathname || '';
              let isDramaDev = false;
              let isTmdbDev = false;
              let isMangadexDev = false;
              let isMangaPathDev = false;
              let isNyaaDev = false;
              let isAnilistDev = false;
              let isVideasyDev = false;

              if (matchedPath.startsWith('/api/anime/')) {
                matchedPath = '/api/anime';
              }
              if (matchedPath.startsWith('/api/drama/')) {
                matchedPath = '/api/mangadex';
                isDramaDev = true;
              }
              if (matchedPath.startsWith('/api/tmdb/')) {
                matchedPath = '/api/tmdb';
                isTmdbDev = true;
              }
              if (matchedPath.startsWith('/api/mangadex/')) {
                matchedPath = '/api/mangadex';
                isMangadexDev = true;
              }
              if (matchedPath.startsWith('/api/manga/')) {
                matchedPath = '/api/manga';
                isMangaPathDev = true;
              }
              if (matchedPath === '/api/nyaa') {
                isNyaaDev = true;
              }
              if (matchedPath === '/api/anilist') {
                isAnilistDev = true;
              }
              if (matchedPath === '/api/videasy') {
                isVideasyDev = true;
              }
              
              const modulePath = apiRoutes[matchedPath];
              if (!modulePath) {
                return next();
              }

              try {
                const { default: handler } = await server.ssrLoadModule(modulePath);
                
                // Build a complete mock VercelResponse
                let statusCode = 200;
                const mockRes: any = {
                  statusCode: 200,
                  status(code: number) {
                    statusCode = code;
                    res.statusCode = code;
                    return mockRes;
                  },
                  setHeader(name: string, value: string | string[]) {
                    res.setHeader(name, value);
                    return mockRes;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return mockRes;
                  },
                  send(data: any) {
                    res.end(typeof data === 'object' ? JSON.stringify(data) : data);
                    return mockRes;
                  },
                  end(data?: any) {
                    res.end(data);
                    return mockRes;
                  },
                };
                
                // Build mock VercelRequest
                const mockReq: any = Object.create(req);
                let mockQuery: any = { ...parsedUrl.query };
                if (isDramaDev) {
                  mockQuery.service = 'drama';
                  mockQuery.path = pathname.replace(/^\/api\/drama/, '');
                } else if (isTmdbDev) {
                  mockQuery.path = pathname.replace(/^\/api\/tmdb/, '');
                } else if (isMangadexDev) {
                  mockQuery.path = pathname.replace(/^\/api\/mangadex/, '');
                  mockQuery.provider = 'mangadex';
                } else if (isMangaPathDev) {
                  mockQuery.path = pathname.replace(/^\/api\/manga/, '');
                } else if (isNyaaDev) {
                  mockQuery.action = 'nyaa';
                } else if (isAnilistDev) {
                  mockQuery.action = 'anilist';
                } else if (isVideasyDev) {
                  mockQuery.provider = 'videasy';
                }
                
                mockReq.query = mockQuery;
                mockReq.method = req.method;
                
                await handler(mockReq, mockRes);
              } catch (err: any) {
                console.error(`Dev API handler failed for ${pathname}:`, err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
