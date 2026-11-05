import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // allow access through a Cloudflare quick tunnel (*.trycloudflare.com)
  // /api -> SomlengPit backend (server/index.mjs)
  server: { allowedHosts: ['.trycloudflare.com'], proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { port: 4173, allowedHosts: ['.trycloudflare.com'], proxy: { '/api': 'http://127.0.0.1:8787' } },
})
