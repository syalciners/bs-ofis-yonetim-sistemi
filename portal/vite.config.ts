import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'bs-egitim-favicon-16-v2.png',
        'bs-egitim-favicon-32-v2.png',
        'bs-egitim-favicon-48-v2.png',
        'bs-egitim-apple-touch-v2.png'
      ],
      manifest: {
        name: 'BS Eğitim Portalı',
        short_name: 'BS Portal',
        description: 'Öğrenci ve öğretmenler için güvenli, salt okunur BS Eğitim portalı.',
        theme_color: '#0B1F3A',
        background_color: '#F7F9FC',
        display: 'standalone',
        lang: 'tr-TR',
        start_url: '/',
        icons: [
          { src: '/bs-egitim-icon-192-v2.png', sizes: '192x192', type: 'image/png' },
          { src: '/bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png' },
          { src: '/bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
