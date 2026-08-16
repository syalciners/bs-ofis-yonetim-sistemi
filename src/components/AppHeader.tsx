import { Cloud, RefreshCw, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from './AppDataProvider'

export function AppHeader() {
  const { refreshing, refresh, profile } = useAppData()
  const nav = useNavigate()
  return <header className="app-header-wrap">
    <div className="app-header">
      <button className="brand" type="button" onClick={() => nav('/')}>
        <img src="./bs-egitim-icon-192-v2.png" alt="BS Eğitim" />
        <span><strong>BS Eğitim</strong><small>Yönetimi</small></span>
      </button>
      <div style={{display:'grid',justifyItems:'end',gap:4}}>
        <div className="header-actions">
          <span className="cloud-chip"><Cloud size={13}/> Bulut</span>
          <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Yenile"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button>
          <button className="icon-btn" type="button" onClick={() => nav('/ayarlar')} aria-label="Ayarlar"><Settings size={17}/></button>
        </div>
        {profile && <div aria-label={`${profile.ad_soyad}, ${profile.rol}`} style={{display:'grid',justifyItems:'end',gap:1,paddingRight:2,maxWidth:150,lineHeight:1.05}}>
          <strong style={{fontSize:9.5,fontWeight:900,letterSpacing:'.02em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{profile.ad_soyad.toLocaleUpperCase('tr-TR')}</strong>
          <small style={{fontSize:8.5,fontWeight:750,color:'#7b8798'}}>{profile.rol}</small>
        </div>}
      </div>
    </div>
  </header>
}
