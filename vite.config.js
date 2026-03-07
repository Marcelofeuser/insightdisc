import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const devPort = Number(process.env.VITE_PORT || 5173)

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    strictPort: true,
  },
  preview: {
    port: devPort,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      zustand: path.resolve(__dirname, './src/vendor/zustand.js'),
    },
  },
})
