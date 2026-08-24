import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two ways to run the panel:
//   npm run dev    → Vite on :5173, /config and /send proxied to FastAPI
//   npm run build  → static bundle in ui/dist, which serve.py mounts at /
// SB_PORT=8002 npm run dev → talk to session 2 instead (default is session 1)
const API = `http://127.0.0.1:${process.env.SB_PORT || 8001}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/config': API, '/send': API },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
