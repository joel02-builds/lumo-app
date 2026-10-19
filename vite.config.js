import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' lädt neuen SW sofort, ohne Nutzer zu blockieren.
      // ADHS-freundlich: keine "Update available"-Dialoge die ablenken.
      registerType: 'autoUpdate',

      // Manifest aus public/manifest.json übernehmen
      manifest: false,

      // Workbox-Konfiguration
      // Strategie: Cache-First für Assets, Network-First für API-Calls
      workbox: {
        // App-Shell (JS/CSS/HTML) cachen — CacheFirst ist OK da Vite
        // Content-Hashes in Dateinamen einbaut
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Navigations-Fallback: immer index.html ausliefern (SPA)
        navigateFallback: '/index.html',

        // API-Routen NICHT cachen (Antworten sind dynamisch/personalisiert)
        navigateFallbackDenylist: [/^\/api\//],

        // Runtime-Caching: Bilder und statische Assets Cache-First
        runtimeCaching: [
          {
            // Mascot-Bilder und Icons: Cache-First, 30 Tage
            urlPattern: /\/mascot\/.*\.(png|svg|jpg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lumo-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Tage
              },
            },
          },
          {
            // Google Fonts (falls eingebunden): StaleWhileRevalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // Font-Dateien selbst: CacheFirst
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Jahr
              },
            },
          },
        ],

        // Entwicklungs-Logs unterdrücken
        cleanupOutdatedCaches: true,
      },

      // DevOptions: Service Worker im Dev-Modus aktivieren (zum Testen)
      devOptions: {
        enabled: false, // Nur in Produktion aktiv
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
