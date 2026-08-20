import { Bell, Cloud, RefreshCw, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
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
    '/bildirimler':'BİLDİRİM MERKEZİ',
    '/ayarlar':'AYARLAR',
    '/sistem':'SİSTEM',
  }
  return labels[pathname]||'YÖNETİM'
}

export function AppHeader() {
  const { refreshing, refresh, profile, institution, unreadNotifications } = useAppData()
  const nav = useNavigate()
  const location = useLocation()
  const sectionLabel=pageSection(location.pathname)
  const brandName=institution?.marka_adi||'BS Eğitim'
  const institutionName=institution?.kurum_adi||'BS Eğitim Yönetimi'
  const brandSuffix=institutionName.startsWith(brandName)?institutionName.slice(brandName.length).trim():institutionName===brandName?'':institutionName
  const logo=institution?.logo_url||'./bs-egitim-icon-512-v2.png'
  const isManager=profile?.rol==='Yönetici'
  const notificationLabel=unreadNotifications>99?'99+':String(unreadNotifications)
  return <header className="app-header-wrap">
    <div className="app-header">
      <div className="app-header-main">
        <button className="brand" type="button" onClick={() => nav('/')}>
          <img src={logo} alt={brandName} />
          <span><strong>{brandName}</strong>{brandSuffix&&<small>{brandSuffix}</small>}</span>
        </button>
        <div className="header-actions">
          <span className="cloud-chip"><Cloud size={13}/> Bulut</span>
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
