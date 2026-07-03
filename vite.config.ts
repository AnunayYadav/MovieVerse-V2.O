import path from 'path';
import url from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
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
                '/api/manga': './api/manga.ts',
                '/api/anime': './api/anime.ts',
                '/api/anilist': './api/anilist.ts',
                '/api/mangadex': './api/mangadex.ts',
                '/api/nyaa': './api/nyaa.ts',
                '/api/tmdb': './api/tmdb.ts',
                '/api/videasy': './api/videasy.ts',
                '/api/encdec': './api/encdec.ts',
                '/api/cinepro': './api/cinepro.ts',
              };
              
              let matchedPath = pathname || '';
              if (matchedPath.startsWith('/api/anime/')) {
                matchedPath = '/api/anime';
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
                mockReq.query = parsedUrl.query;
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
