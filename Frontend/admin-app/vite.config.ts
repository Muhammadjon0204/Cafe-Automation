import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    proxy: {
      // No CORS is configured on the backend yet — proxy keeps API calls
      // same-origin in dev instead. Backend must run its "http" launch
      // profile: the "https" profile's UseHttpsRedirection() 307s this.
      '/api': {
        target: 'http://localhost:5082',
        changeOrigin: true,
      },
      // Zone floor-plan background images (ZonesController's upload endpoint) are served
      // from the backend's wwwroot as plain relative URLs — proxy them same-origin too,
      // same reasoning as the /api rule above.
      '/uploads': {
        target: 'http://localhost:5082',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // @cafe/shared is workspace source, not a prebuilt dependency — exclude
    // it from esbuild's prebundler so edits hot-reload and Fast Refresh applies.
    exclude: ['@cafe/shared'],
  },
})
