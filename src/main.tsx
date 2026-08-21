import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { productProfile } from './lib/productProfile'
import { MusicDanceApp } from './music-dance/MusicDanceApp'
import './styles.css'
import './ux-overrides.css'
import './detail-polish.css'
import './navigation-stability.css'
import './detail-layout-fixes.css'
import './teacher-form-fix.css'
import './lesson-status-colors.css'
import './lesson-form-fix.css'
import './sheet-standard.css'
import './sheet-footer-fixed.css'
import './report-corporate.css'
import './assignment-whatsapp.css'
import './program-share.css'
import './program-week-layout.css'
import './daily-calendar.css'
import './fixed-program-calendar.css'
import './premium-lesson-form.css'
import './premium-typography.css'
import './page-title-standard.css'
import './portal-preview.css'
import './brand-palette.css'
import './demo-discovery.css'
import './music-dance-art-direction.css'
import './music-dance-groups-art.css'
import './music-dance-overview-art.css'
import './music-dance/music-dance-shell.css'
import './music-dance/brand-assets.css'
import './music-dance/login-brand-art.css'
import './music-dance/finance-art.css'
import './music-dance/cash-art.css'
import './music-dance/report-art.css'

const musicDanceProfile = productProfile.key !== 'egitim'

if (musicDanceProfile) {
  document.title = productProfile.brand
  const iconHref = '/brand/music-dance/bs-md-favicon-32.png'
  const touchHref = '/brand/music-dance/bs-md-apple-touch-180.png'
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.type = 'image/png'
  icon.sizes = '32x32'
  icon.href = iconHref

  let touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (!touch) {
    touch = document.createElement('link')
    touch.rel = 'apple-touch-icon'
    document.head.appendChild(touch)
  }
  touch.sizes = '180x180'
  touch.href = touchHref

  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (theme) theme.content = '#F7F9FC'
}

// Mevcut service worker varsa uygulama açılışında sunucudan güncel sürümü açıkça kontrol et.
registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => {
    if (!registration) return
    const checkForUpdate = registration.update.bind(registration)
    void checkForUpdate().catch(() => undefined)
  },
})

const RootApp = productProfile.key === 'egitim' ? App : MusicDanceApp

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <RootApp />
    </HashRouter>
  </React.StrictMode>,
)
