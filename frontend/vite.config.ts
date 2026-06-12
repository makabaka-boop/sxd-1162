import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 8812,
    proxy: {
      '/api': {
        target: 'http://localhost:8117',
        changeOrigin: true,
      },
    },
  },
})
