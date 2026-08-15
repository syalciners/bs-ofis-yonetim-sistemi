import { CalendarClock, CheckCircle2, Clock3, Edit3, ExternalLink, MapPin, WalletCards, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { Ders } from '../lib/types'
import { fullDate, money, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { setLessonStatus } from '../services/officeService'
import { useToast } from './Toast'

const statuses = [
  { value:'Planlandı', tone:'blue', icon:CalendarClock, text:'Planlandı', help:'Ders henüz gerçekleşmedi.' },
  { value:'Yapıldı', tone:'green', icon:CheckCircle2, text:'Yapıldı', help:'Ücret ve hakediş oluşur.' },
  { value:'İptal', tone:'red', icon:XCircle, text:'İptal', help:'Finansal sonuç oluşmaz.' },
] as const

const statusChangeMessage = (current: string, next: string) => {
  if(next==='Yapıldı')return 'Ders “Yapıldı” olarak kaydedilsin mi?\n\nBu işlem öğrenci ücretini ve öğretmen hakedişini finansal sonuçlara dahil eder.'
  if(current==='Yapıldı')return `Ders “${next}” durumuna alınsın mı?\n\nBu dersin öğrenci ücreti ve öğretmen hakedişi artık finansal sonuçlara dahil edilmez.`
  if(next==='İptal')return 'Ders iptal edilsin mi?\n\nBu ders için öğrenci ücreti ve öğretmen hakedişi oluşmaz.'
  return 'Ders yeniden “Planlandı” durumuna alınsın mı?\n\nDers yapılana kadar finansal sonuç oluşmaz.'
}

export function LessonDetail({ lesson, onEdit, onDone }: {lesson:Ders;onEdit:()=>void;onDone:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  if(!data)return null
  const setStatus=async(status:string)=>{const current=lesson.ders_durumu||'Planlandı';if(status===current)return;if(!window.confirm(statusChangeMessage(current,status)))return;setBusy(true);try{await setLessonStatus(lesson.ders_id,status);await refresh();toast(`Ders durumu “${status}” olarak kaydedildi.`);onDone()}catch(e:any){toast(e.message||String(e),'error')}finally{setBusy(false)}}
  const statusTone=lesson.ders_durumu==='Yapıldı'?'done':lesson.ders_durumu==='Planlandı'?'planned':lesson.ders_durumu==='İptal'?'cancelled':'other'
  return <div className="detail-stack lesson-detail-v2">
    <section className="lesson-detail-hero"><div><span>Ders</span><strong>{studentName(data,lesson.ogrenci_id)}</strong><small>{branchName(data,lesson.brans_id)} · {teacherName(data,lesson.ogretmen_id)}</small></div><span className={`lesson-status-badge ${statusTone}`}>{lesson.ders_durumu||'Planlandı'}</span></section>

    <section className="lesson-where-grid"><div><CalendarClock/><span><small>Tarih</small><b>{fullDate(lesson.tarih)}</b></span></div><div><Clock3/><span><small>Saat</small><b>{time(lesson.baslangic_saati)}–{time(lesson.bitis_saati)}</b></span></div><div><MapPin/><span><small>Derslik</small><b>{roomName(data,lesson.derslik_id)}</b></span></div></section>

    <section className="lesson-money-grid"><div><WalletCards/><span><small>Öğrenci Ücreti</small><strong>{money(lesson.ogrenci_toplam_tutar)}</strong></span></div><div><WalletCards/><span><small>Öğretmen Hakedişi</small><strong>{money(lesson.ogretmen_toplam_hakedis)}</strong></span></div></section>

    {lesson.aciklama&&<div className="note-box lesson-note"><span>Açıklama</span>{lesson.aciklama}</div>}
    {lesson.zoom_katilim_baglantisi&&<a className="primary-btn full" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Zoom Dersine Katıl</a>}

    <section className="lesson-result-section lesson-result-simple">
      <div className="section-heading compact"><div><h3>Ders Durumu</h3><span>Finansal etkisi onaylandıktan sonra kaydedilir.</span></div></div>
      <div className="lesson-status-three">{statuses.map(x=>{const Icon=x.icon;const current=x.value===(lesson.ders_durumu||'Planlandı');return <button key={x.value} aria-pressed={current} className={`lesson-status-button ${x.tone} ${current?'current':''}`} disabled={busy||current} onClick={()=>void setStatus(x.value)}><span className="lesson-status-button-icon"><Icon/></span><span><b>{x.text}</b><small>{current?'Mevcut durum':x.help}</small></span></button>})}</div>
    </section>

    <button className="secondary-btn full lesson-edit-btn" onClick={onEdit}><Edit3 size={17}/>Ders Bilgilerini Düzenle</button>
  </div>
}
