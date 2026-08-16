import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bs-portal-icon-192.png', 'bs-portal-icon-512.png'],
      manifest: {
        name: 'BS Eğitim Portalı',
        short_name: 'BS Portal',
        description: 'Öğrenci ve öğretmenler için güvenli, salt okunur BS Eğitim portalı.',
        theme_color: '#0B1F3A',
        background_color: '#F7F9FC',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/bs-portal-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/bs-portal-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
