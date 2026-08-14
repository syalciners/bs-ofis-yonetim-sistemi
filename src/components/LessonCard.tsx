import { Video } from 'lucide-react'
import type { Ders } from '../lib/types'
import { time } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import { useAppData } from './AppDataProvider'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'

export function LessonCard({ lesson, onClick, compact=false }: { lesson:Ders;onClick:()=>void;compact?:boolean }) {
  const {data}=useAppData();if(!data)return null
  const teacher=teacherName(data,lesson.ogretmen_id)
  const status=(lesson.ders_durumu||'Planlandı').toLowerCase().replaceAll(' ','-').replaceAll('ı','i').replaceAll('ş','s').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ö','o').replaceAll('ç','c')
  return <button type="button" className={`lesson-card status-${status} ${teacherTone(teacher)} ${compact?'compact':''}`} onClick={onClick}>
    <div className="lesson-time"><strong>{time(lesson.baslangic_saati)}</strong><span>{Number(lesson.ders_sayisi||1)} ders</span></div>
    <div className="lesson-main"><strong>{studentName(data,lesson.ogrenci_id)}</strong><small>{teacher} · {branchName(data,lesson.brans_id)} · {roomName(data,lesson.derslik_id)}</small></div>
    <div className="lesson-status"><span>{lesson.ders_durumu||'Planlandı'}</span>{lesson.zoom_katilim_baglantisi&&<Video size={14}/>}</div>
  </button>
}
