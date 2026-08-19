import type { Session } from '@supabase/supabase-js'
import { BookOpenCheck, CalendarDays, GraduationCap, LogOut, RefreshCw, ShieldCheck, Target, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { isCancelled, isCoachingAssignment, shortDate, studentName, type CoachData } from './data'
import { PremiumDashboard } from './PremiumDashboard'
import { supabase } from './supabase'

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

function Students({ data }: { data: CoachData }) {
  return <div className="page-stack"><PageTitle title="Öğrenci 360" text="Hedef, çalışma, deneme ve görüşme aynı öğrenci etrafında birleşir."/>
    {data.coachingProfiles.length ? <section className="cards">{data.coachingProfiles.map(p => <article className="student-card" key={p.ogrenci_id}><div className="avatar">{studentName(data,p.ogrenci_id).slice(0,2).toLocaleUpperCase('tr-TR')}</div><div><h3>{studentName(data,p.ogrenci_id)}</h3><p>{p.sinav_turu || 'Sınav türü yok'}</p><small>{[p.hedef_okul,p.hedef_bolum].filter(Boolean).join(' · ') || 'Hedef henüz girilmedi'}</small></div></article>)}</section> : <Empty text="Aktif koçluk öğrencisi bulunmuyor."/>}
  </div>
}

function Plan({ data }: { data: CoachData }) {
  const rows = data.assignments.filter(x => !isCancelled(x.durum))
  return <div className="page-stack"><PageTitle title="Plan ve Çalışmalar" text="Ders ödevi ve koçluk çalışması tek görev motorundan gelir."/>
    {rows.length ? <section className="panel rows">{rows.map(x => <div className="row split" key={x.odev_id}><BookOpenCheck size={18}/><div><b>{x.odev_basligi || x.konu || 'Çalışma'}</b><span>{studentName(data,x.ogrenci_id)} · {isCoachingAssignment(x) ? 'Koçluk Çalışması' : 'Ders Ödevi'}</span></div><small>{x.durum}<br/>{shortDate(x.son_teslim_tarihi || x.verilis_tarihi)}</small></div>)}</section> : <Empty text="Henüz çalışma kaydı yok."/>}
  </div>
}

function Exams({ data }: { data: CoachData }) {
  return <div className="page-stack"><PageTitle title="Deneme Merkezi" text="Gerçek sonuçlar ve anlamlı değişimler tek yerde."/>
    {data.exams.length ? <section className="panel rows">{data.exams.map(x => <div className="row split" key={x.deneme_id}><GraduationCap size={18}/><div><b>{x.deneme_adi}</b><span>{studentName(data,x.ogrenci_id)} · {x.sinav_turu}</span></div><small>{shortDate(x.deneme_tarihi)}{x.puan != null ? <><br/>{x.puan} puan</> : null}</small></div>)}</section> : <Empty text="Henüz gerçek deneme sonucu yok."/>}
  </div>
}

function Meetings({ data }: { data: CoachData }) {
  return <div className="page-stack"><PageTitle title="Koçluk Görüşmeleri" text="Görüşme hazırlığı ve kararlar burada toplanacak."/>
    {data.meetings.length ? <section className="panel rows">{data.meetings.filter(x=>x.durum!=='İptal').map(x => <div className="row split" key={x.gorusme_id}><CalendarDays size={18}/><div><b>{studentName(data,x.ogrenci_id)}</b><span>{x.gundem || x.gorusme_turu || 'Koçluk görüşmesi'}</span></div><small>{x.durum}<br/>{shortDate(x.gorusme_tarihi)}</small></div>)}</section> : <Empty text="Görüşme kaydı yok."/>}
  </div>
}

function Shell({ data, onRefresh, onSignOut }: { data: CoachData; onRefresh: () => void; onSignOut: () => void }) {
  const nav = [{to:'/',label:'Koç Masası',Icon:Target},{to:'/ogrenciler',label:'Öğrenciler',Icon:UsersRound},{to:'/plan',label:'Plan',Icon:BookOpenCheck},{to:'/denemeler',label:'Denemeler',Icon:GraduationCap},{to:'/gorusmeler',label:'Görüşmeler',Icon:CalendarDays}]
  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark small">BS</div><div><b>BS Koçluk</b><span>Premium öğrenci takip</span></div></div><div className="actions"><button aria-label="Verileri yenile" onClick={onRefresh}><RefreshCw size={17}/></button><strong>{data.profile.ad_soyad}</strong><button aria-label="Çıkış yap" onClick={onSignOut}><LogOut size={17}/></button></div></header>
    <main className="container"><Routes><Route path="/" element={<PremiumDashboard data={data}/>}/><Route path="/ogrenciler" element={<Students data={data}/>}/><Route path="/plan" element={<Plan data={data}/>}/><Route path="/denemeler" element={<Exams data={data}/>}/><Route path="/gorusmeler" element={<Meetings data={data}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main>
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
