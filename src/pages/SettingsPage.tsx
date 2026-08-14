import { Edit3, LogOut, Mail, Phone, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { ProfileSettingsForm } from '../components/ProfileSettingsForm'
import { Sheet } from '../components/Sheet'

export function SettingsPage(){
  const{profile,user,signOut}=useAppData();const[editing,setEditing]=useState(false)
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">AYARLAR</span><h1>Ayarlar</h1><p>Hesap bilgilerinizi görüntüleyin ve kendi profilinizi düzenleyin.</p></div></section>
    <section className="settings-card"><div className="settings-avatar"><UserCircle2/></div><div><strong>{profile?.ad_soyad||user?.user_metadata?.full_name||'Kullanıcı'}</strong><span>{profile?.rol||'Yetkili Kullanıcı'}</span></div><button className="secondary-btn" onClick={()=>setEditing(true)}><Edit3 size={16}/>Profili Düzenle</button></section>
    <section className="settings-list"><div><Mail/><span><b>E-posta</b><small>{profile?.email||user?.email}</small></span></div><div><Phone/><span><b>Telefon</b><small>{profile?.telefon||'Telefon eklenmemiş'}</small></span></div><div><ShieldCheck/><span><b>Yetki</b><small>{profile?.aktif?'Aktif kullanıcı':'Pasif kullanıcı'} · {profile?.rol}</small></span></div></section>
    <button className="danger-btn full" onClick={()=>void signOut()}><LogOut size={17}/>Çıkış Yap</button>
    <Sheet open={editing} title="Profili Düzenle" subtitle="Kendi iletişim bilgileriniz" onClose={()=>setEditing(false)}><ProfileSettingsForm onDone={()=>setEditing(false)} onCancel={()=>setEditing(false)}/></Sheet>
  </div>
}
