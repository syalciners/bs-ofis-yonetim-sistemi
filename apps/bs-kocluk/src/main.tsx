import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './premium-dashboard.css'
import './student-360.css'
import './quick-study.css'
import './book-add.css'
import './book-ai.css'
import './book-capture.css'
import './student-pulse.css'
import './student-development.css'
import './premium-readability.css'
import './weekly-plan.css'
import './ai-weekly-plan.css'
import './exam-center-premium.css'
import './exam-photo.css'
import './exam-quick-confirm.css'
import './meeting-center.css'
import './meeting-action.css'
import './parent-summary.css'
import './coach-assistant.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
