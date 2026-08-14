import { CalendarClock, CheckCircle2, Clock3, Edit3, ExternalLink, MapPin, WalletCards, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Ders } from '../lib/types'
import { fullDate, money, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { setLessonStatus } from '../services/officeService'
import { useToast } from './Toast'

const statuses = [
  { value:'Yapıldı', tone:'green', icon:CheckCircle2, text:'Yapıldı', help:'Ücret ve hakediş oluşur.' },
  { value:'İptal', tone:'red', icon:XCircle, text:'İptal', help:'Finansal sonuç oluşmaz.' },
  { value:'Öğrenci Gelmedi', tone:'orange', icon:XCircle, text:'Öğrenci Gelmedi', help:'Finansal sonuç oluşmaz.' },
  { value:'Ertelendi', tone:'blue', icon:CalendarClock, text:'Ertelendi', help:'Yeni tarih/saat düzenlenebilir.' },
  { value:'Öğretmen İptali', tone:'red', icon:XCircle, text:'Öğretmen İptali', help:'Finansal sonuç oluşmaz.' },
  { value:'Planlandı', tone:'blue', icon:CalendarClock, text:'Planlandı', help:'Dersi planlanan duruma alır.' },
] as const

export function LessonDetail({ lesson, onEdit, onDone }: {lesson:Ders;onEdit:()=>void;onDone:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const isPlanned=(lesson.ders_durumu||'Planlandı')==='Planlandı'
  const[showStatuses,setShowStatuses]=useState(isPlanned)
  useEffect(()=>setShowStatuses(isPlanned),[lesson.ders_id,lesson.ders_durumu])
  if(!data)return null
  const setStatus=async(status:string)=>{setBusy(true);try{await setLessonStatus(lesson.ders_id,status);await refresh();toast(`Ders durumu “${status}” olarak kaydedildi.`);onDone()}catch(e:any){toast(e.message||String(e),'error')}finally{setBusy(false)}}
  const statusTone=lesson.ders_durumu==='Yapıldı'?'done':lesson.ders_durumu==='Planlandı'?'planned':'other'
  return <div className="detail-stack lesson-detail-v2">
    <section className="lesson-detail-hero"><div><span>Ders</span><strong>{studentName(data,lesson.ogrenci_id)}</strong><small>{branchName(data,lesson.brans_id)} · {teacherName(data,lesson.ogretmen_id)}</small></div><span className={`lesson-status-badge ${statusTone}`}>{lesson.ders_durumu||'Planlandı'}</span></section>

    <section className="lesson-where-grid"><div><CalendarClock/><span><small>Tarih</small><b>{fullDate(lesson.tarih)}</b></span></div><div><Clock3/><span><small>Saat</small><b>{time(lesson.baslangic_saati)}–{time(lesson.bitis_saati)}</b></span></div><div><MapPin/><span><small>Derslik</small><b>{roomName(data,lesson.derslik_id)}</b></span></div></section>

    <section className="lesson-money-grid"><div><WalletCards/><span><small>Öğrenci Ücreti</small><strong>{money(lesson.ogrenci_toplam_tutar)}</strong></span></div><div><WalletCards/><span><small>Öğretmen Hakedişi</small><strong>{money(lesson.ogretmen_toplam_hakedis)}</strong></span></div></section>

    {lesson.aciklama&&<div className="note-box lesson-note"><span>Açıklama</span>{lesson.aciklama}</div>}
    {lesson.zoom_katilim_baglantisi&&<a className="primary-btn full" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Zoom Dersine Katıl</a>}

    <section className="lesson-result-section">
      <div className="section-heading compact"><div><h3>Ders Sonucu</h3><span>{isPlanned?'Dersi tamamladıktan sonra sonucu seçin.':'Mevcut durum değiştirilebilir.'}</span></div></div>
      {!showStatuses&&<button className="primary-btn full" disabled={busy} onClick={()=>setShowStatuses(true)}><CheckCircle2 size={17}/>Durumu Değiştir</button>}
      {showStatuses&&<div className="lesson-status-grid">{statuses.filter(x=>x.value!==lesson.ders_durumu).map(x=>{const Icon=x.icon;return <button key={x.value} className={`lesson-status-option ${x.tone}`} disabled={busy} onClick={()=>void setStatus(x.value)}><span><Icon/></span><div><b>{x.text}</b><small>{x.help}</small></div></button>})}</div>}
      {showStatuses&&!isPlanned&&<button className="text-btn lesson-close-status" disabled={busy} onClick={()=>setShowStatuses(false)}>Durum seçeneklerini kapat</button>}
    </section>

    <button className="secondary-btn full lesson-edit-btn" onClick={onEdit}><Edit3 size={17}/>Ders Bilgilerini Düzenle</button>
  </div>
}
