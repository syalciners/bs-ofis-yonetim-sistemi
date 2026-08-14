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

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
