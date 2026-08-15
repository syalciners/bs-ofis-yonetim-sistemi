import { Cloud, RefreshCw, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from './AppDataProvider'

export function AppHeader() {
  const { refreshing, refresh, profile } = useAppData()
  const nav = useNavigate()
  return <header className="app-header-wrap">
    <div className="app-header">
      <button className="brand" type="button" onClick={() => nav('/')}>
        <img src="./bs-app-icon-192.png" alt="BS Eğitim" />
        <span><strong>BS Eğitim</strong><small>Yönetimi</small></span>
      </button>
      <div className="header-actions">
        <span className="cloud-chip"><Cloud size={13}/> Bulut</span>
        <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Yenile"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button>
        <button className="icon-btn" type="button" onClick={() => nav('/ayarlar')} aria-label="Ayarlar"><Settings size={17}/></button>
      </div>
    </div>
    {profile && <div className="desktop-user">{profile.ad_soyad} · {profile.rol}</div>}
  </header>
}
