import { Building2, ImageUp, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  institutionLogoPath,
  removeInstitutionLogo,
  saveInstitutionSettings,
  uploadInstitutionLogo,
  type KurumAyarlari,
} from '../services/institutionService'
import { useToast } from './Toast'

const DEFAULT_LOGO='./bs-egitim-icon-512-v2.png'

export function InstitutionSettingsPanel({settings,onUpdated}:{settings:KurumAyarlari;onUpdated:()=>Promise<void>}){
  const{toast}=useToast()
  const[draft,setDraft]=useState(settings)
  const[file,setFile]=useState<File|null>(null)
  const[preview,setPreview]=useState(settings.logo_url||DEFAULT_LOGO)
  const[busy,setBusy]=useState(false)

  useEffect(()=>{setDraft(settings);setFile(null);setPreview(settings.logo_url||DEFAULT_LOGO)},[settings])
  useEffect(()=>{
    if(!file){setPreview(draft.logo_url||DEFAULT_LOGO);return undefined}
    const objectUrl=URL.createObjectURL(file)
    setPreview(objectUrl)
    return()=>URL.revokeObjectURL(objectUrl)
  },[file,draft.logo_url])

  return <div className="institution-settings-panel">
    <div className="settings-info-note settings-definitions-safety"><ShieldCheck size={17}/><span>Kurum bilgileri tek merkezden yönetilir. Kurum logosu uygulama başlığı ve giriş ekranında kullanılır; yüklü PWA uygulama ikonu ve favicon ayrı ürün varlıkları olarak değişmez.</span></div>

    <div className="institution-logo-card">
      <div className="institution-logo-preview"><img src={preview} alt="Kurum logosu önizlemesi"/></div>
      <div className="institution-logo-copy"><strong>Kurum Logosu</strong><span>PNG, JPEG veya WebP · en fazla 2 MB</span><label className="secondary-btn institution-logo-button"><ImageUp size={16}/>Logo Seç<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div>
    </div>

    <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);let uploaded:{path:string;url:string}|null=null;try{
      let logoUrl=draft.logo_url||settings.logo_url||DEFAULT_LOGO
      if(file){uploaded=await uploadInstitutionLogo(file);logoUrl=uploaded.url}
      await saveInstitutionSettings({
        kurum_adi:draft.kurum_adi,
        marka_adi:draft.marka_adi,
        telefon:draft.telefon||null,
        email:draft.email||null,
        adres:draft.adres||null,
        logo_url:logoUrl,
      })
      const oldPath=institutionLogoPath(settings.logo_url)
      await onUpdated()
      if(uploaded&&oldPath&&oldPath!==uploaded.path){void removeInstitutionLogo(oldPath).catch(()=>{})}
      toast('Kurum bilgileri güncellendi.')
      setFile(null)
    }catch(err:any){if(uploaded)void removeInstitutionLogo(uploaded.path).catch(()=>{});toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
      <label className="wide">Kurum Adı<input value={draft.kurum_adi} onChange={e=>setDraft({...draft,kurum_adi:e.target.value})} required autoFocus/></label>
      <label className="wide">Marka Adı<input value={draft.marka_adi} onChange={e=>setDraft({...draft,marka_adi:e.target.value})} required/><small>Uygulama başlığındaki kısa ad. Örn. BS Eğitim</small></label>
      <label>Telefon<input value={draft.telefon||''} onChange={e=>setDraft({...draft,telefon:e.target.value})} inputMode="tel"/></label>
      <label>E-posta<input type="email" value={draft.email||''} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
      <label className="wide">Adres<textarea rows={3} value={draft.adres||''} onChange={e=>setDraft({...draft,adres:e.target.value})}/></label>
      <div className="wide settings-user-readonly"><span>Kurum Kaydı</span><strong>ANA</strong><small>Tek kurum kaydı sistem tarafından korunur; teknik kimlik kullanıcı tarafından değiştirilemez.</small></div>
      <div className="wide form-actions"><div className="form-hint institution-save-hint"><Building2 size={15}/>Kaydedilen ad ve logo uygulama markasına yansır.</div><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Kurum Bilgilerini Kaydet'}</button></div>
    </form>
  </div>
}
