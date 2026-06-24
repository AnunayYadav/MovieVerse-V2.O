import path from 'path';
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
      plugins: [react()],
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
