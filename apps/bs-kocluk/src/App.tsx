import type { Session } from '@supabase/supabase-js'
import { BookOpenCheck, CalendarDays, GraduationCap, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Target, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useSearchParams } from 'react-router-dom'
import { BookAdd } from './BookAdd'
import { isCancelled, isCoachingAssignment, loadCoachData, shortDate, studentName, type CoachData } from './data'
import { PremiumDashboard } from './PremiumDashboard'
import { QuickStudy } from './QuickStudy'
import { StudentDetailWithPulse } from './StudentDetailWithPulse'
import { StudentDirectory } from './Student360'
import { supabase } from './supabase'
import { WeeklyPlan } from './WeeklyPlan'

function Login({ error, onLogin }: { error: string | null; onLogin: () => void }) {
  return <main className="login-screen"><section className="login-card">
    <div className="brand-mark">BS</div><span className="eyebrow">BS KOÇLUK</span>
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

function useStudentFilter(data: CoachData) {
  const [params] = useSearchParams()
  const requested = params.get('ogrenci') || ''
  return data.coachingProfiles.some(x => x.ogrenci_id === requested) ? requested : ''
}

function StudentFilterStrip({ data, studentId, clearTo }: { data: CoachData; studentId: string; clearTo: string }) {
  if (!studentId) return null
  return <div className="student-filter-strip">
    <div><UsersRound/><div><strong>{studentName(data, studentId)}</strong><span>Öğrenci filtresi aktif</span></div></div>
    <div><NavLink to={`/ogrenciler/${encodeURIComponent(studentId)}`}>360’a dön</NavLink><NavLink to={clearTo}>Tümünü göster</NavLink></div>
  </div>
}

function Plan({ data, onRefresh }: { data: CoachData; onRefresh: () => void }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('ogrenci') || ''
  const studentId = data.coachingProfiles.some(x => x.ogrenci_id === requested) ? requested : ''
  const quickOpen = params.get('ekle') === '1'
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [bookStudentId, setBookStudentId] = useState('')
  const rows = data.assignments.filter(x => !isCancelled(x.durum) && (!studentId || x.ogrenci_id === studentId))

  const setQuickOpen = (open: boolean) => {
    const next = new URLSearchParams(params)
    if (open) next.set('ekle', '1')
    else next.delete('ekle')
    setParams(next, { replace: true })
  }

  const openQuickForStudent = (id: string) => {
    setWeeklyOpen(false)
    const next = new URLSearchParams(params)
    next.set('ogrenci', id)
    next.set('ekle', '1')
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
    {rows.length ? <section className="panel rows">{rows.map(x => <div className="row split" key={x.odev_id}><BookOpenCheck size={18}/><div><b>{x.odev_basligi || x.konu || 'Çalışma'}</b><span>{studentName(data,x.ogrenci_id)} · {isCoachingAssignment(x) ? 'Koçluk Çalışması' : 'Ders Ödevi'}</span></div><small>{x.durum}<br/>{shortDate(x.son_teslim_tarihi || x.verilis_tarihi)}</small></div>)}</section> : <Empty text={studentId ? 'Bu öğrenci için çalışma kaydı yok.' : 'Henüz çalışma kaydı yok.'}/>} 
    {weeklyOpen && <WeeklyPlan data={data} initialStudentId={studentId} onClose={() => setWeeklyOpen(false)} onSaved={onRefresh} onOpenQuickStudy={openQuickForStudent}/>} 
    {quickOpen && <QuickStudy data={data} initialStudentId={studentId} onClose={() => setQuickOpen(false)} onSaved={onRefresh} onNeedBook={id => setBookStudentId(id)}/>} 
    {bookStudentId && <BookAdd data={data} initialStudentId={bookStudentId} onClose={() => setBookStudentId('')} onSaved={refreshAfterBook}/>} 
  </div>
}

function Exams({ data }: { data: CoachData }) {
  const studentId = useStudentFilter(data)
  const rows = data.exams.filter(x => !studentId || x.ogrenci_id === studentId)
  return <div className="page-stack"><PageTitle title="Deneme Merkezi" text="Gerçek sonuçlar ve anlamlı değişimler tek yerde."/>
    <StudentFilterStrip data={data} studentId={studentId} clearTo="/denemeler"/>
    {rows.length ? <section className="panel rows">{rows.map(x => <div className="row split" key={x.deneme_id}><GraduationCap size={18}/><div><b>{x.deneme_adi}</b><span>{studentName(data,x.ogrenci_id)} · {x.sinav_turu}</span></div><small>{shortDate(x.deneme_tarihi)}{x.puan != null ? <><br/>{x.puan} puan</> : null}</small></div>)}</section> : <Empty text={studentId ? 'Bu öğrenci için henüz gerçek deneme sonucu yok.' : 'Henüz gerçek deneme sonucu yok.'}/>} 
  </div>
}

function Meetings({ data }: { data: CoachData }) {
  const studentId = useStudentFilter(data)
  const rows = data.meetings.filter(x => x.durum !== 'İptal' && (!studentId || x.ogrenci_id === studentId))
  return <div className="page-stack"><PageTitle title="Koçluk Görüşmeleri" text="Görüşme hazırlığı ve kararlar burada toplanır."/>
    <StudentFilterStrip data={data} studentId={studentId} clearTo="/gorusmeler"/>
    {rows.length ? <section className="panel rows">{rows.map(x => <div className="row split" key={x.gorusme_id}><CalendarDays size={18}/><div><b>{studentName(data,x.ogrenci_id)}</b><span>{x.gundem || x.gorusme_turu || 'Koçluk görüşmesi'}</span></div><small>{x.durum}<br/>{shortDate(x.gorusme_tarihi)}</small></div>)}</section> : <Empty text={studentId ? 'Bu öğrenci için görüşme kaydı yok.' : 'Görüşme kaydı yok.'}/>} 
  </div>
}

function Shell({ data, onRefresh, onSignOut }: { data: CoachData; onRefresh: () => void; onSignOut: () => void }) {
  const nav = [{to:'/',label:'Koç Masası',Icon:Target},{to:'/ogrenciler',label:'Öğrenciler',Icon:UsersRound},{to:'/plan',label:'Plan',Icon:BookOpenCheck},{to:'/denemeler',label:'Denemeler',Icon:GraduationCap},{to:'/gorusmeler',label:'Görüşmeler',Icon:CalendarDays}]
  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark small">BS</div><div><b>BS Koçluk</b><span>Premium öğrenci takip</span></div></div><div className="actions"><button aria-label="Verileri yenile" onClick={onRefresh}><RefreshCw size={17}/></button><strong>{data.profile.ad_soyad}</strong><button aria-label="Çıkış yap" onClick={onSignOut}><LogOut size={17}/></button></div></header>
    <main className="container"><Routes><Route path="/" element={<PremiumDashboard data={data}/>}/><Route path="/ogrenciler" element={<StudentDirectory data={data}/>}/><Route path="/ogrenciler/:studentId" element={<StudentDetailWithPulse data={data}/>}/><Route path="/plan" element={<Plan data={data} onRefresh={onRefresh}/>}/><Route path="/denemeler" element={<Exams data={data}/>}/><Route path="/gorusmeler" element={<Meetings data={data}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main>
    <nav className="bottom-nav" aria-label="Ana menü">{nav.map(({to,label,Icon}) => <NavLink key={to} to={to} end={to==='/' } className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
  </div>
}

export default function App() {
  const [session,setSession]=useState<Session|null>(null), [data,setData]=useState<CoachData|null>(null), [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null)
  const refresh=useCallback(async(s?:Session|null)=>{ const current=s??session; if(!current?.user)return; try{setData(await loadCoachData(current.user.id));setError(null)}catch(e:any){setData(null);setError(e?.message||String(e))}finally{setLoading(false)} },[session])
  useEffect(()=>{let live=true; void supabase.auth.getSession().then(({data:a})=>{if(!live)return;setSession(a.session);if(a.session)void refresh(a.session);else setLoading(false)});const {data:l}=supabase.auth.onAuthStateChange((_e,n)=>{if(!live)return;setSession(n);if(n)void refresh(n);else{setData(null);setLoading(false)}});return()=>{live=false;l.subscription.unsubscribe()}},[refresh])
  const login=async()=>{setError(null);const redirectTo=`${window.location.origin}${window.location.pathname}`;const {error:e}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(e)setError(e.message)}
  if(loading)return <main className="boot"><div className="brand-mark">BS</div><b>BS Koçluk hazırlanıyor…</b></main>
  if(!session)return <Login error={error} onLogin={()=>void login()}/>
  if(!data)return <main className="boot"><div className="brand-mark">BS</div><b>BS Koçluk açılamadı</b><span>{error}</span><button className="primary-button" onClick={()=>void supabase.auth.signOut()}>Farklı hesapla giriş</button></main>
  return <Shell data={data} onRefresh={()=>void refresh()} onSignOut={()=>void supabase.auth.signOut()}/>
}
