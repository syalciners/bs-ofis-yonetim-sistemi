import { CalendarClock, CheckCircle2, Edit3, ExternalLink, XCircle } from 'lucide-react'
import type { Ders } from '../lib/types'
import { fullDate, money, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { setLessonStatus } from '../services/officeService'
import { useToast } from './Toast'
import { useState } from 'react'

export function LessonDetail({ lesson, onEdit, onDone }: {lesson:Ders;onEdit:()=>void;onDone:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);if(!data)return null
  const setStatus=async(status:string)=>{setBusy(true);try{await setLessonStatus(lesson.ders_id,status);await refresh();toast(`Ders ${status.toLocaleLowerCase('tr-TR')} olarak kaydedildi.`);onDone()}catch(e:any){toast(e.message||String(e),'error')}finally{setBusy(false)}}
  return <div className="detail-stack">
    <div className="detail-hero"><div><span>Öğrenci</span><strong>{studentName(data,lesson.ogrenci_id)}</strong><small>{branchName(data,lesson.brans_id)} · {teacherName(data,lesson.ogretmen_id)}</small></div><span className="status-pill">{lesson.ders_durumu||'Planlandı'}</span></div>
    <div className="mini-grid three"><div><span>Tarih</span><b>{fullDate(lesson.tarih)}</b></div><div><span>Saat</span><b>{time(lesson.baslangic_saati)}–{time(lesson.bitis_saati)}</b></div><div><span>Derslik</span><b>{roomName(data,lesson.derslik_id)}</b></div></div>
    <div className="mini-grid two"><div><span>Öğrenci Ücreti</span><b>{money(lesson.ogrenci_toplam_tutar)}</b></div><div><span>Öğretmen Hakedişi</span><b>{money(lesson.ogretmen_toplam_hakedis)}</b></div></div>
    {lesson.aciklama&&<div className="note-box">{lesson.aciklama}</div>}
    {lesson.zoom_katilim_baglantisi&&<a className="primary-btn full" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Zoom Dersine Katıl</a>}
    <div className="action-grid">
      {lesson.ders_durumu!=='Yapıldı'&&<button className="action-card green" disabled={busy} onClick={()=>void setStatus('Yapıldı')}><CheckCircle2/><span><b>Yapıldı</b><small>Ücret ve hakediş oluşur</small></span></button>}
      {lesson.ders_durumu!=='İptal'&&<button className="action-card red" disabled={busy} onClick={()=>void setStatus('İptal')}><XCircle/><span><b>İptal</b><small>Finansal sonuç oluşmaz</small></span></button>}
      <button className="action-card" onClick={onEdit}><Edit3/><span><b>Düzenle</b><small>Tarih, saat veya derslik değiştir</small></span></button>
      <button className="action-card" onClick={onEdit}><CalendarClock/><span><b>Ertele / Taşı</b><small>Yeni tarih ve saati seç</small></span></button>
    </div>
  </div>
}
