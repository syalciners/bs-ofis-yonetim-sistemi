import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppDataProvider, useAppData } from './components/AppDataProvider'
import { ToastProvider } from './components/Toast'
import { LoginScreen } from './components/LoginScreen'
import { AppHeader } from './components/AppHeader'
import { DemoBanner } from './components/DemoBanner'
import { BottomNav } from './components/BottomNav'
import { OverviewPage } from './pages/OverviewPage'
import { CalendarPage } from './pages/CalendarPage'
import { DailyCalendarPage } from './pages/DailyCalendarPage'
import { StudentsPage } from './pages/StudentsPage'
import { FinancePage } from './pages/FinancePage'
import { MorePage } from './pages/MorePage'
import { TeachersPage } from './pages/TeachersPage'
import { TeacherPaymentsPage } from './pages/TeacherPaymentsPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { FixedProgramPage } from './pages/FixedProgramPage'
import { SettingsPage } from './pages/SettingsPage'
import { SystemPage } from './pages/SystemPage'
import { PortalPreviewPage } from './pages/PortalPreviewPage'
import { LoaderCircle } from 'lucide-react'

function ProtectedApp() {
  const { session, loading, error, data } = useAppData()
  const location = useLocation()
  const portalDetail = /^\/portal-onizleme\/(ogretmen|ogrenci)\/[^/]+$/.test(location.pathname)
  if (loading) return <main className="boot"><img src="./bs-logo.svg" alt="BS Eğitim"/><LoaderCircle className="spin" size={24}/><span>BS Eğitim hazırlanıyor…</span></main>
  if (!session) return <LoginScreen />
  if (error && !data) return <main className="boot error-boot"><img src="./bs-logo.svg" alt="BS Eğitim"/><strong>Uygulama açılamadı</strong><span>{error}</span></main>
  return <div className="app-shell"><AppHeader/><DemoBanner/><main className="page-container"><Routes>
    <Route path="/" element={<OverviewPage/>}/>
    <Route path="/takvim" element={<CalendarPage/>}/>
    <Route path="/takvim/gunluk" element={<DailyCalendarPage/>}/>
    <Route path="/ogrenciler" element={<StudentsPage/>}/>
    <Route path="/finans" element={<FinancePage/>}/>
    <Route path="/menu" element={<MorePage/>}/>
    <Route path="/ogretmenler" element={<TeachersPage/>}/>
    <Route path="/ogretmen-odemeleri" element={<TeacherPaymentsPage/>}/>
    <Route path="/odevler" element={<AssignmentsPage/>}/>
    <Route path="/raporlar" element={<ReportsPage/>}/>
    <Route path="/sabit-program" element={<FixedProgramPage/>}/>
    <Route path="/ayarlar" element={<SettingsPage/>}/>
    <Route path="/sistem" element={<SystemPage/>}/>
    <Route path="/portal-onizleme/ogretmen" element={<PortalPreviewPage role="Öğretmen"/>}/>
    <Route path="/portal-onizleme/ogretmen/:personId" element={<PortalPreviewPage role="Öğretmen"/>}/>
    <Route path="/portal-onizleme/ogrenci" element={<PortalPreviewPage role="Öğrenci"/>}/>
    <Route path="/portal-onizleme/ogrenci/:personId" element={<PortalPreviewPage role="Öğrenci"/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main>{!portalDetail&&<BottomNav/>}</div>
}

export default function App() { return <ToastProvider><AppDataProvider><ProtectedApp/></AppDataProvider></ToastProvider> }
