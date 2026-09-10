import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // No CORS is configured on the backend yet — proxy keeps API calls same-origin in
      // dev instead. Backend must run its "http" launch profile: the "https" profile's
      // UseHttpsRedirection() 307s this. Mirrors Frontend/admin-app/vite.config.ts.
      '/api': {
        target: 'http://localhost:5082',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@cafe/shared'],
  },
})
