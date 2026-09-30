import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/rpc': {
        target: 'https://bsc-dataseed.binance.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/rpc/, ''),
      },
    },
  },
});
