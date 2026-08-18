import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
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

// Mevcut service worker varsa uygulama açılışında sunucudan güncel sürümü açıkça kontrol et.
registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => {
    if (!registration) return
    const checkForUpdate = registration.update.bind(registration)
    void checkForUpdate().catch(() => undefined)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
