import { BookOpenCheck, CheckCircle2, Edit3, FileText, Image, MessageCircle, Paperclip, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AssignmentEditorForm } from '../components/AssignmentEditorForm'
import { AssignmentStatusSafeForm } from '../components/AssignmentStatusSafeForm'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import type { Odev, Ogrenci } from '../lib/types'
import { fullDate, todayISO } from '../lib/format'
import { studentName, teacherName } from '../services/metrics'
import { assignmentAttachmentName } from '../services/assignmentAttachmentService'
import { buildAssignmentWhatsAppUrl, openAssignmentAttachment } from '../services/assignmentShareService'

type Filter='bekleyen'|'geciken'|'tamamlanan'|'tumu'
const completed=(x:Odev)=>x.durum==='Tamamlandı'
const canceled=(x:Odev)=>x.durum==='İptal'
const pending=(x:Odev)=>!completed(x)&&!canceled(x)
const overdue=(x:Odev)=>pending(x)&&Boolean(x.son_teslim_tarihi&&x.son_teslim_tarihi<todayISO())
const assignmentSource=(x:Odev)=>x.ogrenci_kitap_id||x.calisma_turu?'Koçluk Çalışması':'Ders Ödevi'
const dayMs=24*60*60*1000
const deadlineInfo=(x:Odev)=>{
  if(!x.son_teslim_tarihi)return{label:'Teslim tarihi yok',tone:'neutral'}
  if(completed(x))return{label:'Tamamlandı',tone:'done'}
  if(canceled(x))return{label:'İptal edildi',tone:'neutral'}
  const today=new Date(`${todayISO()}T00:00:00`).getTime(),due=new Date(`${x.son_teslim_tarihi}T00:00:00`).getTime()
  const diff=Math.round((due-today)/dayMs)
  if(diff<0)return{label:`${Math.abs(diff)} gün gecikti`,tone:'late'}
  if(diff===0)return{label:'Bugün teslim',tone:'today'}
  if(diff===1)return{label:'Yarın teslim',tone:'soon'}
  if(diff<=3)return{label:`${diff} gün kaldı`,tone:'soon'}
  return{label:`${diff} gün kaldı`,tone:'normal'}
}
const maskPhone=(value?:string|null)=>{const d=String(value||'').replace(/\D/g,'');return d?`••• ${d.slice(-4)}`:''}
const recipientInfo=(student?:Ogrenci)=>student?.veli_telefon?`Veli · ${maskPhone(student.veli_telefon)}`:student?.ogrenci_telefon?`Öğrenci · ${maskPhone(student.ogrenci_telefon)}`:'Telefon bilgisi yok'

export function AssignmentsPage(){
  const{data}=useAppData();const{toast}=useToast();const[searchParams,setSearchParams]=useSearchParams();const driveArchiveEnabled=true;const[selected,setSelected]=useState<Odev|null>(null);const[edit,setEdit]=useState<Odev|null>(null);const[status,setStatus]=useState<Odev|null>(null);const[add,setAdd]=useState(false);const[filter,setFilter]=useState<Filter>('bekleyen');const[sharing,setSharing]=useState<string|null>(null)
  useEffect(()=>{if(searchParams.get('yeni')!=='1')return;setAdd(true);const next=new URLSearchParams([...searchParams.entries()].filter(([key])=>key!=='yeni'));setSearchParams(next,{replace:true})},[searchParams,setSearchParams])
  const rows=useMemo(()=>{if(!data)return[];return [...data.odevler].filter(x=>filter==='tumu'||filter==='tamamlanan'?filter==='tumu'||completed(x):filter==='geciken'?overdue(x):pending(x)).sort((a,b)=>String(a.son_teslim_tarihi||'9999').localeCompare(String(b.son_teslim_tarihi||'9999')))},[data,filter]);if(!data)return null
  const pendingCount=data.odevler.filter(pending).length,late=data.odevler.filter(overdue).length,done=data.odevler.filter(completed).length

  const sendWhatsApp=async(x:Odev)=>{const student=data.ogrenciler.find(s=>s.ogrenci_id===x.ogrenci_id);const teacher=data.ogretmenler.find(t=>t.ogretmen_id===x.ogretmen_id);if(!student){toast('Öğrenci kaydı bulunamadı.','error');return}setSharing(x.odev_id);try{const url=await buildAssignmentWhatsAppUrl(x,student,teacher);window.location.href=url}catch(err:any){toast(err.message||String(err),'error')}finally{setSharing(null)}}
  const openAttachment=async(x:Odev,kind:'file'|'image')=>{try{await openAssignmentAttachment(x,kind)}catch(err:any){toast(err.message||String(err),'error')}}

  return <div className="page-stack assignments-v2">
    <section className="page-title-row"><div><span className="eyebrow">ÖDEV TAKİBİ</span><h1>Ödevler</h1></div><button className="primary-btn" onClick={()=>setAdd(true)}><Plus size={17}/>Ödev Ekle</button></section>
    <div className="segmented four-seg"><button className={filter==='bekleyen'?'active':''} onClick={()=>setFilter('bekleyen')}>Bekleyen · {pendingCount}</button><button className={filter==='geciken'?'active':''} onClick={()=>setFilter('geciken')}>Geciken · {late}</button><button className={filter==='tamamlanan'?'active':''} onClick={()=>setFilter('tamamlanan')}>Tamamlanan · {done}</button><button className={filter==='tumu'?'active':''} onClick={()=>setFilter('tumu')}>Tümü</button></div>
    <section className="finance-list assignment-list">{rows.length?rows.map(x=>{const isLate=overdue(x),deadline=deadlineInfo(x),attachmentCount=Number(Boolean(x.odev_fotografi||x.odev_fotograf_linki))+Number(Boolean(x.odev_dosyasi||x.odev_dosya_linki));return <button className={`finance-card assignment-card ${isLate?'expense':''}`} key={x.odev_id} onClick={()=>setSelected(x)}><div className="finance-icon"><BookOpenCheck/></div><div className="assignment-card-copy"><strong>{x.odev_basligi||x.konu||'Ödev'}</strong><small>{studentName(data,x.ogrenci_id)} · {teacherName(data,x.ogretmen_id)} · {assignmentSource(x)}</small><span className={`assignment-deadline assignment-deadline-${deadline.tone}`}>{deadline.label}{attachmentCount?` · ${attachmentCount} ek`:''}</span></div><span className={`assignment-status assignment-status-${x.durum.toLocaleLowerCase('tr-TR').replaceAll(' ','-')}`}>{isLate?'Gecikti':x.durum}</span></button>}):<div className="calm-empty"><BookOpenCheck/><b>{filter==='bekleyen'?'Bekleyen ödev yok.':filter==='geciken'?'Geciken ödev yok.':'Bu filtrede ödev yok.'}</b><span>{filter==='bekleyen'?'Yeni ödev ekleyebilir veya tamamlananları görüntüleyebilirsin.':'Başka bir filtre seçebilirsin.'}</span></div>}</section>

    <Sheet open={!!selected&&!edit&&!status} title={selected?.odev_basligi||selected?.konu||'Ödev'} subtitle={selected?studentName(data,selected.ogrenci_id):''} onClose={()=>setSelected(null)}>{selected&&(()=>{const student=data.ogrenciler.find(s=>s.ogrenci_id===selected.ogrenci_id);const hasImage=Boolean(selected.odev_fotografi||selected.odev_fotograf_linki);const hasFile=Boolean(selected.odev_dosyasi||selected.odev_dosya_linki);const attachmentCount=Number(hasImage)+Number(hasFile);const imageName=assignmentAttachmentName(selected.odev_fotografi)||(selected.odev_fotograf_linki?'Bağlantılı görsel':'Görsel');const fileName=assignmentAttachmentName(selected.odev_dosyasi)||(selected.odev_dosya_linki?'Bağlantılı dosya':'Dosya');const deadline=deadlineInfo(selected);const recipient=recipientInfo(student);return <div className="detail-stack assignment-detail">
      <section className="assignment-detail-hero"><div><span>{assignmentSource(selected).toLocaleUpperCase('tr-TR')}</span><b>{selected.odev_basligi||selected.konu||'Ödev'}</b><small>{studentName(data,selected.ogrenci_id)}</small></div><div><span className={`assignment-status assignment-status-${selected.durum.toLocaleLowerCase('tr-TR').replaceAll(' ','-')}`}>{overdue(selected)?'Gecikti':selected.durum}</span><span className={`assignment-deadline assignment-deadline-${deadline.tone}`}>{deadline.label}</span></div></section>
      <div className="mini-grid two assignment-meta-grid"><div><span>Öğretmen</span><b>{teacherName(data,selected.ogretmen_id)}</b></div><div><span>WhatsApp Alıcısı</span><b>{recipient}</b></div><div><span>Veriliş</span><b>{fullDate(selected.verilis_tarihi)}</b></div><div><span>Son Teslim</span><b>{selected.son_teslim_tarihi?fullDate(selected.son_teslim_tarihi):'Belirtilmedi'}</b></div></div>
      <section className="assignment-text-card"><span><FileText size={16}/>Gönderilecek Ödev</span><b>{selected.odev_basligi||selected.konu||'Ödev'}</b><p>{selected.odev_aciklamasi||'Ek açıklama girilmemiş.'}</p></section>
      {(hasImage||hasFile)&&<section className="assignment-attachments"><div className="assignment-section-heading"><b>Ekler</b><span>{attachmentCount} ek</span></div><div>{hasImage&&<button type="button" onClick={()=>void openAttachment(selected,'image')}><Image size={17}/><span><b>Görseli Aç</b><small>{imageName}</small></span></button>}{hasFile&&<button type="button" onClick={()=>void openAttachment(selected,'file')}><Paperclip size={17}/><span><b>Dosyayı Aç</b><small>{fileName}</small></span></button>}</div></section>}
      {selected.ogretmen_notu&&<div className="note-box">Öğretmen notu: {selected.ogretmen_notu}</div>}
      <section className="assignment-share-card"><div className="assignment-share-head"><MessageCircle size={19}/><span><b>WhatsApp Gönderimi</b><small>{recipient}</small></span></div><p>{attachmentCount?`Ödev metni ve ${attachmentCount} ek, güvenli bağlantılarıyla birlikte hazırlanır.`:'Ödev metni WhatsApp mesajı olarak hazırlanır.'}</p><button className="assignment-whatsapp-btn" disabled={sharing===selected.odev_id||!student?.veli_telefon&&!student?.ogrenci_telefon} onClick={()=>void sendWhatsApp(selected)}><MessageCircle size={18}/>{sharing===selected.odev_id?'Hazırlanıyor…':'WhatsApp’tan Gönder'}</button></section>
      <div className="assignment-secondary-actions"><button className="secondary-btn" onClick={()=>setStatus(selected)}><CheckCircle2 size={17}/>Durumu Güncelle</button><button className="secondary-btn" onClick={()=>setEdit(selected)}><Edit3 size={17}/>Kaydı Düzenle</button></div>
      {!student?.veli_telefon&&!student?.ogrenci_telefon&&<div className="form-hint">WhatsApp gönderimi için öğrenci veya veli telefon bilgisi eklenmelidir.</div>}
    </div>})()}</Sheet>
    <Sheet open={add} title="Yeni Ödev" subtitle="Metni yazın, gerekiyorsa görsel veya dosya ekleyin." onClose={()=>setAdd(false)}><AssignmentEditorForm driveArchiveEnabled={driveArchiveEnabled} onDone={()=>setAdd(false)} onCancel={()=>setAdd(false)}/></Sheet>
    <Sheet open={!!edit} title="Ödevi Düzenle" subtitle={edit?studentName(data,edit.ogrenci_id):''} onClose={()=>setEdit(null)}>{edit&&<AssignmentEditorForm assignment={edit} driveArchiveEnabled={driveArchiveEnabled} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={!!status} title="Ödev Durumu" subtitle={status?studentName(data,status.ogrenci_id):''} onClose={()=>setStatus(null)}>{status&&<AssignmentStatusSafeForm assignment={status} onDone={()=>setStatus(null)} onCancel={()=>setStatus(null)}/>}</Sheet>
  </div>
}
