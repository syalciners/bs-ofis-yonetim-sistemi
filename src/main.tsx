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
