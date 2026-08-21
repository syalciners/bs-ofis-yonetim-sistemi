import type { Session } from '@supabase/supabase-js'
import { BookOpenCheck, CalendarDays, GraduationCap, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Target, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useSearchParams } from 'react-router-dom'
import { BookAdd } from './BookAdd'
import { isCancelled, isCoachingAssignment, loadCoachData, shortDate, studentName, type CoachData } from './data'
import { ExamCenter } from './ExamCenter'
import { MeetingCenter } from './MeetingCenter'
import { PremiumDashboard } from './PremiumDashboard'
import { QuickStudy } from './QuickStudy'
import { StudentDetailWithPulse } from './StudentDetailWithPulse'
import { StudentDirectory } from './Student360'
import { supabase } from './supabase'
import { WeeklyPlan } from './WeeklyPlan'

function BrandLogo({ small = false }: { small?: boolean }) {
  return <img className={small ? 'brand-logo small' : 'brand-logo'} src="./bs-kocluk-ai-logo-v2.webp" alt="BS Koçluk AI" />
}

function Login({ error, onLogin }: { error: string | null; onLogin: () => void }) {
  return <main className="login-screen"><section className="login-card">
    <BrandLogo/><span className="eyebrow">BS KOÇLUK</span>
    <h1>Öğrenciyi sistem takip etsin.<br/>Koç insana odaklansın.</h1>
    <p>Plan, ödev, deneme ve görüşmeler BS Eğitim ile aynı güvenli veri çekirdeğini kullanır.</p>
    <button className="primary-button" onClick={onLogin}>Google ile Giriş Yap</button>
    {error && <div className="error-box">{error}</div>}
    <small className="security-note"><ShieldCheck size={14}/> Güvenli kurum hesabı</small>
  </section></main>
}

function PageTitle({ title, text }: { title: string; text: string }) {
  return <header className="page-title"><h1>{title}</h1><p>{text}</p></header>
}

function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }

function StudentFilterStrip({ data, studentId, clearTo }: { data: CoachData; studentId: string; clearTo: string }) {
  if (!studentId) return null
  return <div className="student-filter-strip">
    <div><UsersRound/><div><strong>{studentName(data, studentId)}</strong><span>Öğrenci filtresi aktif</span></div></div>
    <div><NavLink to={`/ogrenciler/${encodeURIComponent(studentId)}`}>360’a dön</NavLink><NavLink to={clearTo}>Tümünü göster</NavLink></div></div>
}

function Plan({ data, onRefresh }: { data: CoachData; onRefresh: () => void }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('ogrenci') || ''
  const studentId = data.coachingProfiles.some(x => x.ogrenci_id === requested) ? requested : ''
  const quickOpen = params.get('ekle') === '1'
  const weeklyRequested = params.get('hafta') === '1'
  const [weeklyOpen, setWeeklyOpen] = useState(weeklyRequested)
  const [bookStudentId, setBookStudentId] = useState('')
  const rows = data.assignments.filter(x => !isCancelled(x.durum) && (!studentId || x.ogrenci_id === studentId))

  useEffect(() => {
    if (weeklyRequested) setWeeklyOpen(true)
  }, [weeklyRequested])

  const setQuickOpen = (open: boolean) => {
    const next = new URLSearchParams(params)
    if (open) next.set('ekle', '1')
    else next.delete('ekle')
    setParams(next, { replace: true })
  }

  const closeWeekly = () => {
    setWeeklyOpen(false)
    if (!weeklyRequested) return
    const next = new URLSearchParams(params)
    next.delete('hafta')
    setParams(next, { replace: true })
  }

  const openQuickForStudent = (id: string) => {
    setWeeklyOpen(false)
    const next = new URLSearchParams(params)
    next.set('ogrenci', id)
    next.set('ekle', '1')
    next.delete('hafta')
    setParams(next, { replace: true })
  }

  const refreshAfterBook = async () => {
    await Promise.resolve(onRefresh())
  }

  return <div className="page-stack">
    <div className="plan-title-row">
      <PageTitle title="Plan ve Çalışmalar" text="Ders ödevi ve koçluk çalışması tek görev motorundan gelir."/>
      <div className="plan-title-actions">
        <button type="button" className="weekly-plan-trigger" onClick={() => setWeeklyOpen(true)}><Sparkles/> Haftayı Hazırla</button>
        <button type="button" className="quick-study-trigger secondary" onClick={() => setQuickOpen(true)}><Plus/> Çalışma Ekle</button>
      </div>
    </div>
    <StudentFilterStrip data={data} studentId={studentId} clearTo="/plan"/>
    {rows.length ? <section className="panel rows">{rows.map(x => <div className="row split" key={x.odev_id}><BookOpenCheck size={18}/><div><b>{x.odev_basligi || x.konu || 'Çalışma'}</b><span>{studentName(data,x.ogrenci_id)} · {x.kaynak_gorusme_id ? 'Görüşme Kararı' : isCoachingAssignment(x) ? 'Koçluk Çalışması' : 'Ders Ödevi'}</span></div><small>{x.durum}<br/>{shortDate(x.son_teslim_tarihi || x.verilis_tarihi)}</small></div>)}</section> : <Empty text={studentId ? 'Bu öğrenci için çalışma kaydı yok.' : 'Henüz çalışma kaydı yok.'}/>} 
    {weeklyOpen && <WeeklyPlan data={data} initialStudentId={studentId} onClose={closeWeekly} onSaved={onRefresh} onOpenQuickStudy={openQuickForStudent}/>} 
    {quickOpen && <QuickStudy data={data} initialStudentId={studentId} onClose={() => setQuickOpen(false)} onSaved={onRefresh} onNeedBook={id => setBookStudentId(id)}/>} 
    {bookStudentId && <BookAdd data={data} initialStudentId={bookStudentId} onClose={() => setBookStudentId('')} onSaved={refreshAfterBook}/>} 
  </div>
}

function Shell({ data, onRefresh, onSignOut }: { data: CoachData; onRefresh: () => void; onSignOut: () => void }) {
  const nav = [{to:'/',label:'Koç Masası',Icon:Target},{to:'/ogrenciler',label:'Öğrenciler',Icon:UsersRound},{to:'/plan',label:'Plan',Icon:BookOpenCheck},{to:'/denemeler',label:'Denemeler',Icon:GraduationCap},{to:'/gorusmeler',label:'Görüşmeler',Icon:CalendarDays}]
  return <div className="app-shell"><header className="topbar"><div className="brand"><BrandLogo small/><div><b>BS Koçluk</b><span>Premium öğrenci takip</span></div></div><div className="actions"><button aria-label="Verileri yenile" onClick={onRefresh}><RefreshCw size={17}/></button><strong>{data.profile.ad_soyad}</strong><button aria-label="Çıkış yap" onClick={onSignOut}><LogOut size={17}/></button></div></header>
    <main className="container"><Routes><Route path="/" element={<PremiumDashboard data={data}/>}/><Route path="/ogrenciler" element={<StudentDirectory data={data}/>}/><Route path="/ogrenciler/:studentId" element={<StudentDetailWithPulse data={data}/>}/><Route path="/plan" element={<Plan data={data} onRefresh={onRefresh}/>}/><Route path="/denemeler" element={<ExamCenter data={data} onRefresh={onRefresh}/>}/><Route path="/gorusmeler" element={<MeetingCenter data={data} onRefresh={onRefresh}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main>
    <nav className="bottom-nav" aria-label="Ana menü">{nav.map(({to,label,Icon}) => <NavLink key={to} to={to} end={to==='/' } className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
  </div>
}

function readableLoadError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return 'Verilere ulaşılamadı. Bağlantıyı kontrol edip yeniden deneyin.'
  }
  return raw
}

export default function App() {
  const [session, setSession] = useState<Session|null>(null)
  const [data, setData] = useState<CoachData|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const sessionRef = useRef<Session|null>(null)
  const lastLoadedTokenRef = useRef<string|null>(null)
  const requestRef = useRef(0)

  const refresh = useCallback(async(nextSession?: Session|null, force = false) => {
    const current = nextSession === undefined ? sessionRef.current : nextSession
    if (!current?.user) {
      setData(null)
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    if (force) setLoading(true)
    try {
      const nextData = await loadCoachData(current.user.id)
      if (requestId !== requestRef.current) return
      setData(nextData)
      setError(null)
    } catch (e) {
      if (requestId !== requestRef.current) return
      console.error('BS Koçluk veri yükleme hatası', e)
      setData(null)
      setError(readableLoadError(e))
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [])

  const applySession = useCallback((next: Session|null) => {
    sessionRef.current = next
    setSession(next)
    if (!next) {
      requestRef.current += 1
      lastLoadedTokenRef.current = null
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    if (lastLoadedTokenRef.current === next.access_token) return
    lastLoadedTokenRef.current = next.access_token
    setLoading(true)
    void refresh(next)
  }, [refresh])

  useEffect(() => {
    let live = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!live) return
      applySession(next)
    })
    void supabase.auth.getSession().then(({ data: authData, error: authError }) => {
      if (!live) return
      if (authError) {
        setError('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.')
        setLoading(false)
        return
      }
      applySession(authData.session)
    })
    return () => {
      live = false
      listener.subscription.unsubscribe()
    }
  }, [applySession])

  const login = async() => {
    setError(null)
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error: loginError } = await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } })
    if (loginError) setError(loginError.message)
  }

  const retry = () => void refresh(undefined, true)

  if (loading) return <main className="boot"><BrandLogo/><b>BS Koçluk hazırlanıyor…</b></main>
  if (!session) return <Login error={error} onLogin={() => void login()}/>
  if (!data) return <main className="boot"><BrandLogo/><b>BS Koçluk açılamadı</b><span>{error}</span><div className="boot-actions"><button className="primary-button" onClick={retry}>Yeniden Dene</button><button className="secondary-button" onClick={() => void supabase.auth.signOut()}>Farklı hesapla giriş</button></div></main>
  return <Shell data={data} onRefresh={() => void refresh(undefined, true)} onSignOut={() => void supabase.auth.signOut()}/>
}
