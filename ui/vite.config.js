import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two ways to run the panel:
//   npm run dev    → Vite on :5173, /config and /send proxied to FastAPI
//   npm run build  → static bundle in ui/dist, which serve.py mounts at /
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/config': 'http://127.0.0.1:8010',
      '/send': 'http://127.0.0.1:8010',
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
