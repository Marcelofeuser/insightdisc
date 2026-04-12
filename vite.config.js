import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        // Preserve the `/api` prefix. In production the app uses `/api/*` routes
        // (Vercel functions) and in local dev we want `/api/report/pdf` to map
        // to the backend route without rewriting the path.
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      }
    }
  }
})
