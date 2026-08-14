import { Navigate, Route, Routes } from 'react-router-dom'
import { AppDataProvider, useAppData } from './components/AppDataProvider'
import { ToastProvider } from './components/Toast'
import { LoginScreen } from './components/LoginScreen'
import { AppHeader } from './components/AppHeader'
import { BottomNav } from './components/BottomNav'
import { OverviewPage } from './pages/OverviewPage'
import { CalendarPage } from './pages/CalendarPage'
import { StudentsPage } from './pages/StudentsPage'
import { FinancePage } from './pages/FinancePage'
import { MorePage } from './pages/MorePage'
import { TeachersPage } from './pages/TeachersPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { FixedProgramPage } from './pages/FixedProgramPage'
import { SettingsPage } from './pages/SettingsPage'
import { SystemPage } from './pages/SystemPage'
import { LoaderCircle } from 'lucide-react'

function ProtectedApp() {
  const { session, loading, error, data } = useAppData()
  if (loading) return <main className="boot"><img src="./bs-app-icon-192.png" alt="BS"/><LoaderCircle className="spin" size={24}/><span>BS Ofis hazırlanıyor…</span></main>
  if (!session) return <LoginScreen />
  if (error && !data) return <main className="boot error-boot"><img src="./bs-app-icon-192.png" alt="BS"/><strong>Uygulama açılamadı</strong><span>{error}</span></main>
  return <div className="app-shell"><AppHeader/><main className="page-container"><Routes>
    <Route path="/" element={<OverviewPage/>}/>
    <Route path="/takvim" element={<CalendarPage/>}/>
    <Route path="/ogrenciler" element={<StudentsPage/>}/>
    <Route path="/finans" element={<FinancePage/>}/>
    <Route path="/menu" element={<MorePage/>}/>
    <Route path="/ogretmenler" element={<TeachersPage/>}/>
    <Route path="/odevler" element={<AssignmentsPage/>}/>
    <Route path="/raporlar" element={<ReportsPage/>}/>
    <Route path="/sabit-program" element={<FixedProgramPage/>}/>
    <Route path="/ayarlar" element={<SettingsPage/>}/>
    <Route path="/sistem" element={<SystemPage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><BottomNav/></div>
}

export default function App() { return <ToastProvider><AppDataProvider><ProtectedApp/></AppDataProvider></ToastProvider> }
