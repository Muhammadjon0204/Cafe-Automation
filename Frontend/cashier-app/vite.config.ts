import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A separate, single-purpose app for Cashier staff — logging in here lands
// directly on the payments board, no admin shell/sidebar/other-role pages to
// navigate past. Mirrors waiter-app/kitchen-app's dev proxy setup on its own port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5186,
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
