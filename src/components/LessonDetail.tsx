import { CalendarClock, CheckCircle2, Edit3, ExternalLink, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Ders } from '../lib/types'
import { fullDate, money, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { setLessonStatus } from '../services/officeService'
import { useToast } from './Toast'

const statuses = [
  { value:'Yapıldı', tone:'green', icon:CheckCircle2, text:'Ders tamamlandı', help:'Öğrenci ücreti ve öğretmen hakedişi oluşur.' },
  { value:'İptal', tone:'red', icon:XCircle, text:'İptal', help:'Finansal sonuç oluşmaz.' },
  { value:'Öğrenci Gelmedi', tone:'orange', icon:XCircle, text:'Öğrenci Gelmedi', help:'Finansal sonuç oluşmaz.' },
  { value:'Ertelendi', tone:'blue', icon:CalendarClock, text:'Ertelendi', help:'Finansal sonuç oluşmaz; gerekirse tarih ve saati düzenleyin.' },
  { value:'Öğretmen İptali', tone:'red', icon:XCircle, text:'Öğretmen İptali', help:'Finansal sonuç oluşmaz.' },
  { value:'Planlandı', tone:'blue', icon:CalendarClock, text:'Planlandı', help:'Dersi yeniden planlanan duruma alın.' },
] as const

export function LessonDetail({ lesson, onEdit, onDone }: {lesson:Ders;onEdit:()=>void;onDone:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const isPlanned=(lesson.ders_durumu||'Planlandı')==='Planlandı'
  const[showStatuses,setShowStatuses]=useState(isPlanned)
  useEffect(()=>setShowStatuses(isPlanned),[lesson.ders_id,lesson.ders_durumu])
  if(!data)return null
  const setStatus=async(status:string)=>{setBusy(true);try{await setLessonStatus(lesson.ders_id,status);await refresh();toast(`Ders durumu “${status}” olarak kaydedildi.`);onDone()}catch(e:any){toast(e.message||String(e),'error')}finally{setBusy(false)}}
  return <div className="detail-stack">
    <div className="detail-hero"><div><span>Öğrenci</span><strong>{studentName(data,lesson.ogrenci_id)}</strong><small>{branchName(data,lesson.brans_id)} · {teacherName(data,lesson.ogretmen_id)}</small></div><span className="status-pill">{lesson.ders_durumu||'Planlandı'}</span></div>
    <div className="mini-grid three"><div><span>Tarih</span><b>{fullDate(lesson.tarih)}</b></div><div><span>Saat</span><b>{time(lesson.baslangic_saati)}–{time(lesson.bitis_saati)}</b></div><div><span>Derslik</span><b>{roomName(data,lesson.derslik_id)}</b></div></div>
    <div className="mini-grid two"><div><span>Öğrenci Ücreti</span><b>{money(lesson.ogrenci_toplam_tutar)}</b></div><div><span>Öğretmen Hakedişi</span><b>{money(lesson.ogretmen_toplam_hakedis)}</b></div></div>
    {lesson.aciklama&&<div className="note-box">{lesson.aciklama}</div>}
    {lesson.zoom_katilim_baglantisi&&<a className="primary-btn full" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Zoom Dersine Katıl</a>}

    {isPlanned&&showStatuses&&<div className="form-summary"><b>Ders sonucunu seçin.</b> “Yapıldı” seçildiğinde öğrenci ücreti ve öğretmen hakedişi oluşur.</div>}
    {!showStatuses&&<button className="primary-btn full" disabled={busy} onClick={()=>setShowStatuses(true)}><CheckCircle2 size={17}/>Durumu Değiştir</button>}
    {showStatuses&&<>
      <div className="action-list">
        {statuses.filter(x=>x.value!==lesson.ders_durumu).map(x=>{const Icon=x.icon;return <button key={x.value} disabled={busy} onClick={()=>void setStatus(x.value)}><span className={`action-round ${x.tone}`}><Icon/></span><span><b>{x.text}</b><small>{x.help}</small></span></button>})}
      </div>
      {!isPlanned&&<button className="secondary-btn full" disabled={busy} onClick={()=>setShowStatuses(false)}>Durum Seçimini Kapat</button>}
    </>}

    <button className="secondary-btn full" onClick={onEdit}><Edit3 size={17}/>Dersi Düzenle</button>
  </div>
}
