import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A separate, single-purpose app for Kitchen staff — logging in here lands
// directly on the kitchen board, no admin shell/sidebar/other-role pages to
// navigate past. Mirrors admin-app's dev proxy setup (same backend, same
// same-origin-in-dev reasoning) on its own port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5184,
    proxy: {
      '/api': {
        target: 'http://localhost:5082',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5082',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@cafe/shared'],
  },
})
