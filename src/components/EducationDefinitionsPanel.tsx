import { BookOpenCheck, ChevronRight, MapPinned, Plus, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { Brans, Derslik } from '../lib/types'
import { saveBranch, saveRoom } from '../services/educationDefinitionsService'
import { useToast } from './Toast'

type Mode='brans'|'derslik'
type BranchDraft={brans_id?:string;brans_adi:string;aktif:boolean}
type RoomDraft={derslik_id?:string;mekan_adi:string;mekan_turu:string;kapasite:number;aktif:boolean;aciklama:string}

export function EducationDefinitionsPanel({branches,rooms,onUpdated}:{branches:Brans[];rooms:Derslik[];onUpdated:()=>Promise<void>}){
  const{toast}=useToast()
  const[mode,setMode]=useState<Mode>('brans')
  const[branchDraft,setBranchDraft]=useState<BranchDraft|null>(null)
  const[roomDraft,setRoomDraft]=useState<RoomDraft|null>(null)
  const[busy,setBusy]=useState(false)

  const switchMode=(next:Mode)=>{setMode(next);setBranchDraft(null);setRoomDraft(null)}
  const selectBranch=(item:Brans)=>setBranchDraft({brans_id:item.brans_id,brans_adi:item.brans_adi,aktif:item.aktif!==false})
  const selectRoom=(item:Derslik)=>setRoomDraft({derslik_id:item.derslik_id,mekan_adi:item.mekan_adi,mekan_turu:item.mekan_turu||'',kapasite:Number(item.kapasite||1),aktif:item.aktif!==false,aciklama:item.aciklama||''})

  return <div className="settings-definitions-panel">
    <div className="settings-info-note settings-definitions-safety"><ShieldCheck size={17}/><span>Kimlikler sistem tarafından korunur ve kayıtlar silinmez. Aktif sabit programda kullanılan branş veya derslik, program pasif hale getirilmeden pasifleştirilemez.</span></div>

    <div className="settings-definition-tabs" role="tablist" aria-label="Eğitim tanımları">
      <button type="button" className={mode==='brans'?'active':''} onClick={()=>switchMode('brans')}><BookOpenCheck size={16}/>Branşlar <span>{branches.length}</span></button>
      <button type="button" className={mode==='derslik'?'active':''} onClick={()=>switchMode('derslik')}><MapPinned size={16}/>Derslikler <span>{rooms.length}</span></button>
    </div>

    {mode==='brans'?<div className="settings-definition-layout">
      <div className="settings-definition-list">
        <button type="button" className="settings-definition-add" onClick={()=>setBranchDraft({brans_adi:'',aktif:true})}><Plus size={16}/>Yeni Branş</button>
        {branches.map(item=><button key={item.brans_id} type="button" className={`settings-definition-row${branchDraft?.brans_id===item.brans_id?' selected':''}`} onClick={()=>selectBranch(item)}>
          <span className={`settings-user-status ${item.aktif!==false?'active':'passive'}`}/><span><strong>{item.brans_adi}</strong><small>{item.aktif!==false?'Aktif':'Pasif'}</small></span><ChevronRight size={16}/>
        </button>)}
      </div>
      <div className="settings-definition-editor">
        {!branchDraft?<div className="settings-users-empty"><BookOpenCheck/><strong>Branş seçin veya yeni branş ekleyin</strong><span>Ad ve aktiflik güvenli olarak yönetilir.</span></div>:<form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await saveBranch(branchDraft);await onUpdated();toast(branchDraft.brans_id?'Branş güncellendi.':'Yeni branş eklendi.');setBranchDraft(null)}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
          <label className="wide">Branş Adı<input value={branchDraft.brans_adi} onChange={e=>setBranchDraft({...branchDraft,brans_adi:e.target.value})} required autoFocus/></label>
          <label className="wide">Durum<select value={branchDraft.aktif?'Aktif':'Pasif'} onChange={e=>setBranchDraft({...branchDraft,aktif:e.target.value==='Aktif'})}><option>Aktif</option><option>Pasif</option></select></label>
          <div className="wide settings-user-readonly"><span>Branş Kimliği</span><strong>{branchDraft.brans_id||'Otomatik oluşturulacak'}</strong><small>Bağlı ders ve programların bütünlüğü için kimlik değiştirilemez.</small></div>
          <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setBranchDraft(null)}>Vazgeç</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Branşı Kaydet'}</button></div>
        </form>}
      </div>
    </div>:<div className="settings-definition-layout">
      <div className="settings-definition-list">
        <button type="button" className="settings-definition-add" onClick={()=>setRoomDraft({mekan_adi:'',mekan_turu:'Derslik',kapasite:1,aktif:true,aciklama:''})}><Plus size={16}/>Yeni Derslik</button>
        {rooms.map(item=><button key={item.derslik_id} type="button" className={`settings-definition-row${roomDraft?.derslik_id===item.derslik_id?' selected':''}`} onClick={()=>selectRoom(item)}>
          <span className={`settings-user-status ${item.aktif!==false?'active':'passive'}`}/><span><strong>{item.mekan_adi}</strong><small>{item.mekan_turu||'Tür belirtilmemiş'} · Kapasite {item.kapasite||1} · {item.aktif!==false?'Aktif':'Pasif'}</small></span><ChevronRight size={16}/>
        </button>)}
      </div>
      <div className="settings-definition-editor">
        {!roomDraft?<div className="settings-users-empty"><MapPinned/><strong>Derslik seçin veya yeni derslik ekleyin</strong><span>Ad, tür, kapasite ve aktiflik güvenli olarak yönetilir.</span></div>:<form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await saveRoom(roomDraft);await onUpdated();toast(roomDraft.derslik_id?'Derslik güncellendi.':'Yeni derslik eklendi.');setRoomDraft(null)}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
          <label className="wide">Derslik Adı<input value={roomDraft.mekan_adi} onChange={e=>setRoomDraft({...roomDraft,mekan_adi:e.target.value})} required autoFocus/></label>
          <label>Derslik Türü<input value={roomDraft.mekan_turu} onChange={e=>setRoomDraft({...roomDraft,mekan_turu:e.target.value})} placeholder="Derslik, Salon, Online…"/></label>
          <label>Kapasite<input type="number" min="1" step="1" value={roomDraft.kapasite} onChange={e=>setRoomDraft({...roomDraft,kapasite:Math.max(1,Number(e.target.value)||1)})} required/></label>
          <label className="wide">Durum<select value={roomDraft.aktif?'Aktif':'Pasif'} onChange={e=>setRoomDraft({...roomDraft,aktif:e.target.value==='Aktif'})}><option>Aktif</option><option>Pasif</option></select></label>
          <label className="wide">Açıklama<textarea value={roomDraft.aciklama} onChange={e=>setRoomDraft({...roomDraft,aciklama:e.target.value})} rows={3}/></label>
          <div className="wide settings-user-readonly"><span>Derslik Kimliği</span><strong>{roomDraft.derslik_id||'Otomatik oluşturulacak'}</strong><small>Bağlı ders ve programların bütünlüğü için kimlik değiştirilemez.</small></div>
          <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setRoomDraft(null)}>Vazgeç</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Dersliği Kaydet'}</button></div>
        </form>}
      </div>
    </div>}

    <div className="settings-info-note"><BookOpenCheck size={17}/><span>Pasif kayıtlar geçmiş derslerde korunur; yeni seçimlerde kullanılmaması için aktiflik alanı üzerinden yönetilir.</span></div>
  </div>
}
