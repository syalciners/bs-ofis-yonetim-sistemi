import { Cloud, RefreshCw, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP_MODE } from '../lib/supabase'
import { useAppData } from './AppDataProvider'

const pageSection=(pathname:string)=>{
  if(pathname==='/')return 'YÖNETİM ÖZETİ'
  if(pathname.startsWith('/takvim'))return 'DERS PROGRAMI'
  if(pathname.startsWith('/portal-onizleme'))return 'PORTAL ÖNİZLEMESİ'
  const labels:Record<string,string>={
    '/ogrenciler':'ÖĞRENCİ YÖNETİMİ',
    '/finans':'FİNANS',
    '/menu':'DİĞER İŞLEMLER',
    '/ogretmenler':'PERSONEL',
    '/ogretmen-odemeleri':'ÖĞRETMEN YÖNETİMİ',
    '/odevler':'ÖDEV TAKİBİ',
    '/raporlar':'RAPORLAR',
    '/sabit-program':'PROGRAM ŞABLONLARI',
    '/ayarlar':'AYARLAR',
    '/sistem':'SİSTEM',
  }
  return labels[pathname]||'BS EĞİTİM'
}

export function AppHeader() {
  const { refreshing, refresh, profile } = useAppData()
  const nav = useNavigate()
  const location = useLocation()
  const sectionLabel=pageSection(location.pathname)
  const isDemo=APP_MODE==='demo'
  return <header className="app-header-wrap">
    <div className="app-header">
      <div className="app-header-main">
        <button className="brand" type="button" onClick={() => nav('/')}>
          <img src="./bs-egitim-icon-192-v2.png" alt="BS Eğitim" />
          <span><strong>BS Eğitim</strong><small>Yönetimi</small></span>
        </button>
        <div className="header-actions">
          <span className="cloud-chip"><Cloud size={13}/> {isDemo?'DEMO':'Bulut'}</span>
          <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Yenile"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button>
          <button className="icon-btn" type="button" onClick={() => nav('/ayarlar')} aria-label="Ayarlar"><Settings size={17}/></button>
        </div>
      </div>
      <div className="app-header-meta">
        <span className="app-header-section">{sectionLabel}</span>
        {profile&&<div className="app-header-profile" aria-label={`${profile.ad_soyad}, ${profile.rol}`}>
          <strong>{profile.ad_soyad.toLocaleUpperCase('tr-TR')}</strong>
          <small>{profile.rol}</small>
        </div>}
      </div>
    </div>
  </header>
}
