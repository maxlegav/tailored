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
        name: 'Tailored',
        short_name: 'Tailored',
        lang: 'fr',
        display: 'standalone',
        background_color: '#312e2b',
        theme_color: '#262421',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json,png}'], maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [{ urlPattern: /\.wasm$/, handler: 'CacheFirst', options: { cacheName: 'engine' } }] },
    }),
  ],
})
