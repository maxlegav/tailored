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
        icons: [{ src: 'icon-v2-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'icon.svg?v=2', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,svg,png}'], maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, navigateFallback: null,
        runtimeCaching: [
          { urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'pages', networkTimeoutSeconds: 4 } },
          { urlPattern: /data\.json$/, handler: 'NetworkFirst', options: { cacheName: 'data', networkTimeoutSeconds: 6 } },
          { urlPattern: /\.wasm$/, handler: 'CacheFirst', options: { cacheName: 'engine' } }] },
    }),
  ],
})
