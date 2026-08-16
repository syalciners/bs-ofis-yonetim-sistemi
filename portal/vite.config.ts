import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['portal-icon.svg'],
      manifest: {
        name: 'BS Eğitim Portalı',
        short_name: 'BS Portal',
        description: 'Öğrenci ve öğretmenler için güvenli, salt okunur BS Eğitim portalı.',
        theme_color: '#0d2d4f',
        background_color: '#f5f8fc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/portal-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
