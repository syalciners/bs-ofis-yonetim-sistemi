import { useState } from 'react'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'
import { updateOwnProfile } from '../services/profileService'

export function ProfileSettingsForm({ onDone, onCancel }: { onDone:()=>void;onCancel:()=>void }) {
  const {profile,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  if(!profile)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);try{await updateOwnProfile({ad_soyad:String(f.get('ad_soyad')||''),telefon:String(f.get('telefon')||'')||null});await refresh();toast('Profil bilgileri güncellendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label className="wide">Ad Soyad<input name="ad_soyad" defaultValue={profile.ad_soyad} required autoFocus/></label>
    <label className="wide">Telefon<input name="telefon" defaultValue={profile.telefon||''} inputMode="tel"/></label>
    <div className="wide form-hint">E-posta, kullanıcı rolü ve hesap durumu güvenlik nedeniyle bu ekrandan değiştirilemez.</div>
    <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy?'Kaydediliyor…':'Profili Kaydet'}</button></div>
  </form>
}
