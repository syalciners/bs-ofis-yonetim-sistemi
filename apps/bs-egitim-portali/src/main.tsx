import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PreviewApp from './PreviewApp'
import './styles.css'
import './student-week-premium.css'

const RootApp = import.meta.env.VITE_PORTAL_DESIGN_PREVIEW === 'true' ? PreviewApp : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)
