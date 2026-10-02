import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/rpc': {
        target: 'https://bsc-dataseed.binance.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/rpc/, ''),
      },
      '/api/dexscreener': {
        target: 'https://api.dexscreener.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/dexscreener/, ''),
      },
      '/api/gecko': {
        target: 'https://api.geckoterminal.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/gecko/, ''),
      },
    },
  },
});
