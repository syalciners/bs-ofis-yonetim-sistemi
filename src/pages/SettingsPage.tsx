import { Edit3, LogOut, Mail, Phone, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { updateOwnProfile } from '../services/profileService'

export function SettingsPage(){
  const{profile,user,signOut,refresh}=useAppData();const{toast}=useToast();const[edit,setEdit]=useState(false);const[busy,setBusy]=useState(false)
  const name=profile?.ad_soyad||user?.user_metadata?.full_name||'Kullanıcı'
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">AYARLAR</span><h1>Ayarlar</h1><p>Hesabın ve kişisel iletişim bilgilerin.</p></div></section>
    <section className="settings-card"><div className="settings-avatar"><UserCircle2/></div><div><strong>{name}</strong><span>{profile?.rol||'Yetkili Kullanıcı'}</span></div><button className="secondary-btn" onClick={()=>setEdit(true)}><Edit3 size={16}/>Profili Düzenle</button></section>
    <section className="settings-list"><div><Mail/><span><b>E-posta</b><small>{profile?.email||user?.email||'—'}</small></span></div><div><Phone/><span><b>Telefon</b><small>{profile?.telefon||'Eklenmemiş'}</small></span></div><div><ShieldCheck/><span><b>Yetki</b><small>{profile?.aktif?'Aktif kullanıcı':'Pasif kullanıcı'} · {profile?.rol||'—'}</small></span></div></section>
    <div className="form-hint">E-posta, rol ve kullanıcı yetkisi güvenlik nedeniyle bu ekrandan değiştirilemez.</div>
    <button className="danger-btn full" onClick={()=>void signOut()}><LogOut size={17}/>Çıkış Yap</button>

    <Sheet open={edit} title="Profilimi Düzenle" subtitle="Kişisel iletişim bilgileri" onClose={()=>setEdit(false)}>
      <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await updateOwnProfile({ad_soyad:String(f.get('ad_soyad')||''),telefon:String(f.get('telefon')||'')||null});await refresh();toast('Profil bilgileri güncellendi.');setEdit(false)}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
        <label className="wide">Ad Soyad<input name="ad_soyad" defaultValue={name} required autoFocus/></label>
        <label className="wide">Telefon<input name="telefon" defaultValue={profile?.telefon||''} inputMode="tel" placeholder="05xx xxx xx xx"/></label>
        <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setEdit(false)}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy?'Kaydediliyor…':'Kaydet'}</button></div>
      </form>
    </Sheet>
  </div>
}
