import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PreviewApp from './PreviewApp'
import { PortalNotifications } from './PortalNotifications'
import './styles.css'
import './student-week-premium.css'
import './portal-notifications.css'

const isPreview = import.meta.env.VITE_PORTAL_DESIGN_PREVIEW === 'true'
const RootApp = isPreview ? PreviewApp : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
    {!isPreview && <PortalNotifications />}
  </React.StrictMode>,
)
