import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const REQUIRED_INSTANCE_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  for (const name of REQUIRED_INSTANCE_ENV) {
    if (!String(env[name] || '').trim()) throw new Error(`Uygulama yapılandırması eksik: ${name}`)
  }

  return {
    root: 'app',
    envDir: '..',
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
        includeAssets: ['bs-egitim-favicon-16-v2.png','bs-egitim-favicon-32-v2.png','bs-egitim-favicon-48-v2.png','bs-egitim-apple-touch-v2.png'],
        manifest: {
          name: 'BS Eğitim Yönetimi',
          short_name: 'BS Eğitim',
          description: 'BS Eğitim için ders, öğrenci, öğretmen ve finans yönetimi',
          theme_color: '#f7f9fc',
          background_color: '#f7f9fc',
          display: 'standalone',
          lang: 'tr-TR',
          icons: [
            { src: 'bs-egitim-icon-192-v2.png', sizes: '192x192', type: 'image/png' },
            { src: 'bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png' },
            { src: 'bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ]
  }
})
