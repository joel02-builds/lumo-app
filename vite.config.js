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
        // Content-Hashes in Dateinamen einbaut.
        // PNG bleibt für PWA-Manifest-Icons (icon-192.png, icon-512.png).
        // Mascot-PNGs werden via globIgnores ausgeschlossen — sie wurden nach
        // WebP konvertiert und laufen über die Runtime-CacheFirst-Strategie.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['mascot/*.png'],  // P-PWA-01: Mascot-PNGs (4,18 MB) nicht precachen

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
  build: {
    // P-FE-11: Vendor-Chunks trennen — React und ts-fsrs ändern sich selten,
    // daher profitieren sie am meisten von separatem Browser-Caching.
    // react-dom ist das schwerste Paket (~130 KB min); nach dem ersten Besuch
    // wird es aus dem SW-Cache bedient statt neu heruntergeladen.
    rollupOptions: {
      output: {
        // P-FE-11: Rolldown benötigt manualChunks als Funktion (kein Objekt)
        manualChunks(id) {
          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/ts-fsrs')) {
            return 'vendor-fsrs';
          }
        },
      },
    },
  },
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
