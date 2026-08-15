import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','apple-touch-icon.png'],
      manifest: {
        name: 'BS Eğitim Yönetimi',
        short_name: 'BS Eğitim',
        description: 'BS Eğitim için ders, öğrenci, öğretmen ve finans yönetimi',
        theme_color: '#f7f9fc',
        background_color: '#f7f9fc',
        display: 'standalone',
        lang: 'tr-TR',
        icons: [
          { src: 'bs-app-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'bs-app-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'bs-app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
