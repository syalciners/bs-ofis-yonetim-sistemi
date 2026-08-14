import { FileText, ImagePlus, Paperclip } from 'lucide-react'
import { useState } from 'react'
import type { Odev } from '../lib/types'
import { todayISO, uid } from '../lib/format'
import { saveAssignment } from '../services/officeService'
import { assignmentAttachmentName, saveAssignmentAttachments } from '../services/assignmentAttachmentService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function AssignmentEditorForm({ assignment, studentId, onDone, onCancel }: { assignment?:Odev; studentId?:string; onDone:()=>void; onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[file,setFile]=useState<File|null>(null);const[image,setImage]=useState<File|null>(null)
  if(!data)return null
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const id=assignment?.odev_id||uid('ODV');try{
    await saveAssignment({odev_id:id,ogrenci_id:String(f.get('ogrenci_id')),ogretmen_id:String(f.get('ogretmen_id')),konu:String(f.get('konu')),aciklama:String(f.get('aciklama')||'')||null,verilis_tarihi:String(f.get('verilis_tarihi')),son_teslim_tarihi:String(f.get('son_teslim_tarihi')||'')||null,oncelik:String(f.get('oncelik')||'Normal')})
    if(file||image)await saveAssignmentAttachments({assignmentId:id,file,image,existingFile:assignment?.odev_dosyasi||null,existingImage:assignment?.odev_fotografi||null})
    await refresh();toast(assignment?'Ödev güncellendi.':'Ödev oluşturuldu.');onDone()
  }catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}
  return <form className="form-grid assignment-editor" onSubmit={submit}>
    <label>Öğrenci<select name="ogrenci_id" defaultValue={assignment?.ogrenci_id||studentId||''} required><option value="">Öğrenci seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Öğretmen<select name="ogretmen_id" defaultValue={assignment?.ogretmen_id||''} required><option value="">Öğretmen seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label className="wide">Ödev Başlığı<input name="konu" defaultValue={assignment?.odev_basligi||assignment?.konu||''} placeholder="Örn. Temel Kavramlar - Test 1" required/></label>
    <label className="wide">Ödev Metni<textarea name="aciklama" rows={4} defaultValue={assignment?.odev_aciklamasi||''} placeholder="Öğrenciye gönderilecek ödev açıklamasını buraya yazın."/></label>
    <label>Veriliş Tarihi<input name="verilis_tarihi" type="date" defaultValue={assignment?.verilis_tarihi||todayISO()} required/></label>
    <label>Son Teslim<input name="son_teslim_tarihi" type="date" defaultValue={assignment?.son_teslim_tarihi||''}/></label>
    <label className="wide">Öncelik<select name="oncelik" defaultValue={assignment?.oncelik||'Normal'}><option>Düşük</option><option>Normal</option><option>Yüksek</option></select></label>
    <div className="wide assignment-files">
      <span className="field-label">Ekler</span>
      <div className="assignment-file-grid">
        <label className="assignment-file-picker"><ImagePlus size={18}/><span><b>Görsel Ekle</b><small>{image?.name||assignmentAttachmentName(assignment?.odev_fotografi)||'JPG, PNG veya WEBP · en fazla 15 MB'}</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImage(e.target.files?.[0]||null)}/></label>
        <label className="assignment-file-picker"><Paperclip size={18}/><span><b>Dosya Ekle</b><small>{file?.name||assignmentAttachmentName(assignment?.odev_dosyasi)||(assignment?.odev_dosya_linki?'Mevcut bağlantılı dosya':'PDF, Word veya Excel · en fazla 15 MB')}</small></span><input type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      </div>
      <div className="form-hint"><FileText size={14}/>Ekler özel depoda tutulur. WhatsApp gönderiminde ödev metniyle birlikte süreli bağlantı olarak paylaşılır.</div>
    </div>
    <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':assignment?'Ödevi Güncelle':'Ödevi Kaydet'}</button></div>
  </form>
}
