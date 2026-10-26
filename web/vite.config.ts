import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mon Coach d\'Échecs',
        short_name: 'Coach',
        lang: 'fr',
        display: 'standalone',
        background_color: '#1e1e1e',
        theme_color: '#769656',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'], maximumFileSizeToCacheInBytes: 20 * 1024 * 1024 },
    }),
  ],
})
