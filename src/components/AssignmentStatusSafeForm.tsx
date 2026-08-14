import { useState } from 'react'
import type { Odev } from '../lib/types'
import { updateAssignmentStatus } from '../services/officeService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function AssignmentStatusSafeForm({assignment,onDone,onCancel}:{assignment:Odev;onDone:()=>void;onCancel:()=>void}){
  const{refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await updateAssignmentStatus(assignment.odev_id,String(f.get('durum')),String(f.get('ogretmen_notu')||'')||null,String(f.get('puan')||'')||null);await refresh();toast('Ödev durumu güncellendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Durum<select name="durum" defaultValue={assignment.durum}><option>Verildi</option><option>Eksik</option><option>Tamamlandı</option><option>İptal</option></select></label>
    <label>Puan / Not<input name="puan" defaultValue={assignment.puan||''} placeholder="İsteğe bağlı"/></label>
    <label className="wide">Öğretmen Notu<textarea name="ogretmen_notu" rows={3} defaultValue={assignment.ogretmen_notu||''}/></label>
    <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy?'Kaydediliyor…':'Durumu Kaydet'}</button></div>
  </form>
}
