import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import legacy from '@vitejs/plugin-legacy';

// `npm run dev:https` uses --mode https so phones on the LAN get a secure
// context (needed for the live camera barcode scanner on iOS/Android).
export default defineConfig(({ mode }) => ({
  build: {
    // Vite 8's default only targets ~2023+ browsers (Safari 16.4 / Chrome 111).
    // Lower the modern build so phones from ~2020 on run it directly...
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
  plugins: [
    react(),
    mode === 'https' && basicSsl(),
    // ...and ship a second, transpiled + polyfilled build for anything older
    // (iOS 12-13, old Android Chrome / Samsung Internet). Browsers pick the right one.
    legacy({
      targets: ['defaults', 'iOS >= 12', 'Chrome >= 64', 'Samsung >= 9', 'Firefox >= 68'],
      modernPolyfills: true,
    }),
    VitePWA({
      // 'prompt': a new version waits in the background instead of taking over
      // mid-session; src/lib/pwa.js applies it when the app is hidden or the user taps "Update".
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'favicon-64.png'],
      manifest: {
        name: 'Wafi وافي – Bowel Health Jordan',
        short_name: 'Wafi',
        description:
          'Scan food, see colorectal-cancer diet risk based on evidence, find healthier swaps, and get screening reminders.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        theme_color: '#0d2047',
        background_color: '#f3f5fa',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Product photos from Open Food / Beauty / Products Facts
            urlPattern: /^https:\/\/[a-z.]*open(food|beauty|products)facts\.org\/images\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Tesseract worker/core/language data from CDNs
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|tessdata\.projectnaptha\.com)\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'ocr-assets', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
}));
