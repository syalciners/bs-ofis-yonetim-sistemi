import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const productProfile = env.VITE_PRODUCT_PROFILE || 'egitim'
  const musicDance = productProfile !== 'egitim'

  const includeAssets = musicDance
    ? [
        'brand/music-dance/bs-md-icon.svg',
        'brand/music-dance/bs-md-icon-white.svg',
        'brand/music-dance/bs-md-logo-horizontal.svg',
        'brand/music-dance/bs-md-logo-horizontal-white.svg',
        'brand/music-dance/bs-md-favicon-32.png',
        'brand/music-dance/bs-md-apple-touch-180.png',
        'brand/music-dance/bs-md-icon-192.png',
        'brand/music-dance/bs-md-icon-512.png',
        'brand/music-dance/bs-md-icon-maskable-512.png',
      ]
    : ['bs-logo.svg','bs-egitim-favicon-16-v2.png','bs-egitim-favicon-32-v2.png','bs-egitim-favicon-48-v2.png','bs-egitim-apple-touch-v2.png']

  const manifest = musicDance
    ? {
        name: 'BS Müzik & Dans Yönetimi',
        short_name: 'BS Müzik & Dans',
        description: 'Müzik ve dans kursları için kursiyer, eğitmen, program, grup ve finans yönetimi',
        theme_color: '#F7F9FC',
        background_color: '#F7F9FC',
        display: 'standalone' as const,
        lang: 'tr-TR',
        icons: [
          { src: 'brand/music-dance/bs-md-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' as const },
          { src: 'brand/music-dance/bs-md-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' as const },
          { src: 'brand/music-dance/bs-md-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
        ],
      }
    : {
        name: 'BS Eğitim Yönetimi',
        short_name: 'BS Eğitim',
        description: 'BS Eğitim için ders, öğrenci, öğretmen ve finans yönetimi',
        theme_color: '#f7f9fc',
        background_color: '#f7f9fc',
        display: 'standalone' as const,
        lang: 'tr-TR',
        icons: [
          { src: 'bs-egitim-icon-192-v2.png', sizes: '192x192', type: 'image/png' },
          { src: 'bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png' },
          { src: 'bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
        ],
      }

  return {
    root: 'app',
    publicDir: '../public',
    base: './',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets,
        manifest,
      }),
    ],
  }
})
