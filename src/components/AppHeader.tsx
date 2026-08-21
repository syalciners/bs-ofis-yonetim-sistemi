import { Bell, Cloud, RefreshCw, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { productProfile, t } from '../lib/productProfile'
import { APP_MODE } from '../lib/supabase'
import { useAppData } from './AppDataProvider'

const upper=(value:string)=>value.toLocaleUpperCase('tr-TR')

const pageSection=(pathname:string)=>{
  if(pathname==='/')return 'YÖNETİM ÖZETİ'
  if(pathname.startsWith('/takvim'))return 'DERS PROGRAMI'
  if(pathname.startsWith('/portal-onizleme'))return 'PORTAL ÖNİZLEMESİ'
  const labels:Record<string,string>={
    '/ogrenciler':`${upper(t.student)} YÖNETİMİ`,
    '/finans':'FİNANS',
    '/menu':'DİĞER İŞLEMLER',
    '/ogretmenler':'PERSONEL',
    '/ogretmen-odemeleri':`${upper(t.teacher)} YÖNETİMİ`,
    '/gruplar':'GRUP YÖNETİMİ',
    '/odevler':'ÇALIŞMA TAKİBİ',
    '/raporlar':'RAPORLAR',
    '/sabit-program':'PROGRAM ŞABLONLARI',
    '/bildirimler':'BİLDİRİM MERKEZİ',
    '/ayarlar':'AYARLAR',
    '/sistem':'SİSTEM',
  }
  return labels[pathname]||upper(productProfile.brandShort)
}

export function AppHeader() {
  const { refreshing, refresh, profile, unreadNotifications } = useAppData()
  const nav = useNavigate()
  const location = useLocation()
  const sectionLabel=pageSection(location.pathname)
  const isDemo=APP_MODE==='demo'
  const isManager=profile?.rol==='Yönetici'
  const notificationLabel=unreadNotifications>99?'99+':String(unreadNotifications)
  return <header className="app-header-wrap">
    <div className="app-header">
      <div className="app-header-main">
        <button className="brand" type="button" onClick={() => nav('/')}>
          <img src="./bs-logo.svg" alt={productProfile.brandShort} />
          <span><strong>{productProfile.brandShort}</strong><small>{productProfile.brandSuffix}</small></span>
        </button>
        <div className="header-actions">
          <span className="cloud-chip"><Cloud size={13}/> {isDemo?'DEMO':'Bulut'}</span>
          {isManager&&<button className="icon-btn header-notification-btn" type="button" onClick={() => nav('/bildirimler')} aria-label={unreadNotifications>0?`${unreadNotifications} okunmamış bildirim`:'Bildirimler'}>
            <Bell size={17}/>
            {unreadNotifications>0&&<span className="header-notification-badge">{notificationLabel}</span>}
          </button>}
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
