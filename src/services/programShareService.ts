import { fullDate, shortDate, time } from '../lib/format'
import type { AppData, Ders } from '../lib/types'
import { buildWhatsappUrl, maskedPhone, normalizeTrWhatsappPhone } from '../lib/whatsapp'
import { branchName, roomName, studentName, teacherName } from './metrics'

export type ProgramShareTarget={type:'student'|'teacher';id:string}

export interface ProgramSharePreviewData{
  target:ProgramShareTarget
  personName:string
  recipientName:string
  recipientPhone:string
  recipientMasked:string
  weekLabel:string
  message:string
  whatsappUrl:string|null
  lessons:Ders[]
}

const lessonPlace=(data:AppData,lesson:Ders)=>{
  const online=Boolean(lesson.zoom_katilim_baglantisi)||String(lesson.ders_yeri||'').toLocaleLowerCase('tr-TR').includes('online')||String(lesson.ders_turu||'').toLocaleLowerCase('tr-TR').includes('online')
  return online?'Online':roomName(data,lesson.derslik_id)
}

const lessonLine=(data:AppData,lesson:Ders,target:ProgramShareTarget)=>{
  const start=time(lesson.baslangic_saati),end=time(lesson.bitis_saati),branch=branchName(data,lesson.brans_id),place=lessonPlace(data,lesson)
  const prefix=lesson.ders_durumu==='İptal'?'❌ ':'• '
  if(target.type==='student')return `${prefix}${start}–${end} · ${branch} · ${teacherName(data,lesson.ogretmen_id)} · ${place}${lesson.ders_durumu==='İptal'?' · İptal':''}`
  return `${prefix}${start}–${end} · ${studentName(data,lesson.ogrenci_id)} · ${branch} · ${place}${lesson.ders_durumu==='İptal'?' · İptal':''}`
}

export function buildProgramSharePreview(data:AppData,target:ProgramShareTarget,lessons:Ders[],monday:string,sunday:string):ProgramSharePreviewData{
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))
  const student=target.type==='student'?data.ogrenciler.find(x=>x.ogrenci_id===target.id):undefined
  const teacher=target.type==='teacher'?data.ogretmenler.find(x=>x.ogretmen_id===target.id):undefined
  const personName=student?.ad_soyad||teacher?.ad_soyad||'Seçili kişi'
  const recipientName=student?.veli_adi?`${student.veli_adi} (Veli)`:personName
  const recipientPhone=target.type==='student'?(student?.veli_telefon||student?.ogrenci_telefon||''):(teacher?.telefon||'')
  const weekLabel=`${shortDate(monday)} – ${shortDate(sunday)}`
  const lines=['Merhaba 👋','','📅 *HAFTALIK DERS PROGRAMI*']
  lines.push(target.type==='student'?`👤 *Öğrenci:* ${personName}`:`👨‍🏫 *Öğretmen:* ${personName}`)
  lines.push(`🗓 *Hafta:* ${weekLabel}`)

  const dates=[...new Set(sorted.map(x=>x.tarih).filter((x):x is string=>Boolean(x)))]
  for(const date of dates){
    lines.push('',`*${fullDate(date)}*`)
    for(const lesson of sorted.filter(x=>x.tarih===date))lines.push(lessonLine(data,lesson,target))
  }
  lines.push('','İyi çalışmalar dileriz.','*BS Ofis Eğitim Yönetimi*')
  const message=lines.join('\n')
  const normalized=normalizeTrWhatsappPhone(recipientPhone)
  return{
    target,
    personName,
    recipientName,
    recipientPhone,
    recipientMasked:maskedPhone(recipientPhone),
    weekLabel,
    message,
    whatsappUrl:normalized?buildWhatsappUrl(recipientPhone,message):null,
    lessons:sorted,
  }
}
