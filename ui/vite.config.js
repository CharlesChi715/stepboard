import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two ways to run the panel:
//   npm run dev    → Vite on :5173, API routes proxied to FastAPI
//   npm run build  → static bundle in ui/dist, which serve.py mounts at /
// SB_PORT=8002 npm run dev → talk to session 2 instead (default is session 1)
const API = `http://127.0.0.1:${process.env.SB_PORT || 8001}`

// EVERY path the panel fetches. A route missing here does not 404 in dev — Vite
// falls through to index.html and answers 200 text/html, so the panel's
// `res.json()` throws and the feature just looks broken (that is exactly how
// /prompts shipped dead: the built panel served by serve.py was fine, and the
// tests only ever hit FastAPI directly, so nothing crossed Vite).
// tests/proxy.mjs fails if a fetch() in ui/src is not listed here.
export const API_ROUTES = ['/config', '/send', '/prompts']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(API_ROUTES.map(r => [r, API])),
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
