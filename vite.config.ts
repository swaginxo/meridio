import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Die App liegt bei GitHub Pages unter /meridio/. Lokal (npm run dev) bleibt sie unter /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/meridio/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Meridio',
        short_name: 'Meridio',
        description: 'Länder, Hauptstädte und Flaggen der Welt lernen.',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0d241c',
        background_color: '#0d241c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4_000_000,
      },
    }),
  ],
}))
