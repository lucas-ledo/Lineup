import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/sports-images': {
        target: 'https://sports.bzzoiro.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sports-images/, '/img'),
      },
    },
  },
})
