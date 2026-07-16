import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Proxy API calls to the backend so the browser only ever talks to one
    // origin (127.0.0.1:5173). This makes the session cookie a first-party
    // same-origin cookie (no CORS, no cross-site cookie stripping) and lets the
    // whole OAuth flow stay on a single origin. Target is the Docker service name.
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
