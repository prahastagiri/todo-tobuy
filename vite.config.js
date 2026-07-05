import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA: bisa dipasang ke layar HP + jalan offline (sinyal pasar buruk).
// Lihat docs/spesifikasi-model-data.md Bagian 9.
export default defineConfig({
  // Port disamakan dengan Site URL/redirect di Supabase (lihat README).
  server: { port: 3220 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Todo Belanja',
        short_name: 'Belanja',
        description: 'Daftar belanja pribadi — jalan offline.',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache shell aplikasi agar bisa dibuka saat offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
