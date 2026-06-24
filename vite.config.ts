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
            server.middlewares.use(async (req, res, next) => {
              const parsedUrl = url.parse(req.url || '', true);
              const pathname = parsedUrl.pathname;
              
              if (pathname === '/api/manga') {
                try {
                  const modulePath = './api/manga.ts';
                  const { default: handler } = await server.ssrLoadModule(modulePath);
                  
                  // Mock VercelResponse
                  const mockRes = Object.create(res);
                  mockRes.status = (statusCode: number) => {
                    res.statusCode = statusCode;
                    return mockRes;
                  };
                  mockRes.json = (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return mockRes;
                  };
                  mockRes.send = (data: any) => {
                    res.end(data);
                    return mockRes;
                  };
                  mockRes.setHeader = (name: string, value: string) => {
                    res.setHeader(name, value);
                    return mockRes;
                  };
                  
                  // Mock VercelRequest
                  const mockReq = Object.create(req);
                  mockReq.query = parsedUrl.query;
                  
                  // Call the handler
                  await handler(mockReq, mockRes);
                } catch (err: any) {
                  console.error(`Dev API handler failed for ${pathname}:`, err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
                return;
              }
              
              next();
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
