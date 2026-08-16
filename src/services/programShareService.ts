import { fullDate, time } from '../lib/format'
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

const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const dayMeta=[
  {name:'Pazar',emoji:'⚪'},
  {name:'Pazartesi',emoji:'🔵'},
  {name:'Salı',emoji:'🟢'},
  {name:'Çarşamba',emoji:'🟣'},
  {name:'Perşembe',emoji:'🟠'},
  {name:'Cuma',emoji:'🔴'},
  {name:'Cumartesi',emoji:'🟡'},
]
const acronyms=new Set(['SAT','TYT','AYT','LGS','YKS','IB','AP','IELTS','TOEFL'])

const parseIsoDate=(date:string)=>{
  const[y,m,d]=date.split('-').map(Number)
  return{y,m,d}
}
const titleCaseTr=(value:string)=>value.split(/(\s+|-)/).map(part=>{
  if(/^\s+$|^-$/.test(part)||!part)return part
  const upper=part.toLocaleUpperCase('tr-TR')
  if(acronyms.has(upper))return upper
  const lower=part.toLocaleLowerCase('tr-TR')
  return lower.charAt(0).toLocaleUpperCase('tr-TR')+lower.slice(1)
}).join('')
const compactWeekLabel=(monday:string,sunday:string)=>{
  const a=parseIsoDate(monday),b=parseIsoDate(sunday)
  if(a.y===b.y&&a.m===b.m)return`${a.d}–${b.d} ${months[a.m-1]} ${a.y}`
  if(a.y===b.y)return`${a.d} ${months[a.m-1]} – ${b.d} ${months[b.m-1]} ${a.y}`
  return`${a.d} ${months[a.m-1]} ${a.y} – ${b.d} ${months[b.m-1]} ${b.y}`
}
const dayHeading=(date:string)=>{
  const{y,m,d}=parseIsoDate(date)
  const day=dayMeta[new Date(Date.UTC(y,m-1,d)).getUTCDay()]
  return`${day.emoji} *${day.name} · ${fullDate(date).replace(/\s+\d{4}$/,'')}*`
}

const lessonPlace=(data:AppData,lesson:Ders)=>{
  const online=Boolean(lesson.zoom_katilim_baglantisi)||String(lesson.ders_yeri||'').toLocaleLowerCase('tr-TR').includes('online')||String(lesson.ders_turu||'').toLocaleLowerCase('tr-TR').includes('online')
  return online?'Online':roomName(data,lesson.derslik_id)
}

const lessonLine=(data:AppData,lesson:Ders,target:ProgramShareTarget)=>{
  const start=time(lesson.baslangic_saati),end=time(lesson.bitis_saati),branch=titleCaseTr(branchName(data,lesson.brans_id)),place=lessonPlace(data,lesson)
  const placeText=place==='Online'?'🌐 Online':`📍 ${titleCaseTr(place)}`
  const cancelPrefix=lesson.ders_durumu==='İptal'?'❌ ':'🕐 '
  const cancelSuffix=lesson.ders_durumu==='İptal'?' · *İptal*':''
  if(target.type==='student')return[
    `${cancelPrefix}${start}–${end}${cancelSuffix}`,
    branch,
    titleCaseTr(teacherName(data,lesson.ogretmen_id)),
    placeText,
  ].join('\n')
  return[
    `${cancelPrefix}${start}–${end}${cancelSuffix}`,
    titleCaseTr(studentName(data,lesson.ogrenci_id)),
    branch,
    placeText,
  ].join('\n')
}

export function buildProgramSharePreview(data:AppData,target:ProgramShareTarget,lessons:Ders[],monday:string,sunday:string):ProgramSharePreviewData{
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))
  const student=target.type==='student'?data.ogrenciler.find(x=>x.ogrenci_id===target.id):undefined
  const teacher=target.type==='teacher'?data.ogretmenler.find(x=>x.ogretmen_id===target.id):undefined
  const rawPersonName=student?.ad_soyad||teacher?.ad_soyad||'Seçili kişi'
  const personName=titleCaseTr(rawPersonName)
  const guardianPhone=student?.veli_telefon||''
  const recipientPhone=target.type==='student'?(guardianPhone||student?.ogrenci_telefon||''):(teacher?.telefon||'')
  const recipientName=target.type==='student'&&guardianPhone?(student?.veli_adi?`${titleCaseTr(student.veli_adi)} (Veli)`:'Veli'):personName
  const weekLabel=compactWeekLabel(monday,sunday)
  const lines=['Merhaba 👋','','📅 *HAFTALIK DERS PROGRAMI*']
  lines.push(target.type==='student'?`👤 *Öğrenci:* ${personName}`:`👨‍🏫 *Öğretmen:* ${personName}`)
  lines.push(`🗓️ *Hafta:* ${weekLabel}`)
  lines.push(`📚 *Toplam:* ${sorted.length} ders`)

  const dates=[...new Set(sorted.map(x=>x.tarih).filter((x):x is string=>Boolean(x)))]
  for(const date of dates){
    lines.push('',dayHeading(date))
    for(const lesson of sorted.filter(x=>x.tarih===date))lines.push('',lessonLine(data,lesson,target))
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
