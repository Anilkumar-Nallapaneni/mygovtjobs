import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n-vendor'
            // Single app vendor chunk (react + misc) — avoids vendor ↔ react-vendor cycle
            return 'react-vendor'
          }
          if (id.includes('localeOverrides')) return 'locales'
          if (id.includes('IndiaMap')) return 'map'
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@components', replacement: resolve(__dirname, 'src/components') },
      { find: '@styles', replacement: resolve(__dirname, 'src/styles') },
      { find: '@utils', replacement: resolve(__dirname, 'src/utils') },
      { find: '@hooks', replacement: resolve(__dirname, 'src/hooks') },
      { find: '@types', replacement: resolve(__dirname, 'src/types') },
    ],
  },
  server: {
    port: 2222,
    strictPort: false,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
