import { CalendarDays, MessageCircle, PhoneOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fullDate, time } from '../lib/format'
import type { Ders } from '../lib/types'
import { buildWhatsappUrl, normalizeTrWhatsappPhone } from '../lib/whatsapp'
import { buildProgramSharePreview, type ProgramShareTarget } from '../services/programShareService'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { useAppData } from './AppDataProvider'

export function ProgramSharePreview({target,lessons,monday,sunday,onClose}:{target:ProgramShareTarget;lessons:Ders[];monday:string;sunday:string;onClose:()=>void}){
  const{data}=useAppData()
  const preview=useMemo(()=>data?buildProgramSharePreview(data,target,lessons,monday,sunday):null,[data,target,lessons,monday,sunday])
  const[selectedRecipientId,setSelectedRecipientId]=useState<string>('')
  useEffect(()=>{setSelectedRecipientId(preview?.recipientOptions[0]?.id||'')},[preview])
  if(!data||!preview)return null
  const dates=[...new Set(preview.lessons.map(x=>x.tarih).filter((x):x is string=>Boolean(x)))]
  const selectedRecipient=preview.recipientOptions.find(x=>x.id===selectedRecipientId)||preview.recipientOptions[0]
  const whatsappUrl=selectedRecipient&&normalizeTrWhatsappPhone(selectedRecipient.phone)?buildWhatsappUrl(selectedRecipient.phone,preview.message):null
  const openWhatsapp=()=>{if(!whatsappUrl)return;window.open(whatsappUrl,'_blank','noopener,noreferrer')}
  return <div className="detail-stack program-share-preview">
    <section className="program-share-hero"><div><span>{target.type==='student'?'ÖĞRENCİ PROGRAMI':'ÖĞRETMEN PROGRAMI'}</span><strong>{preview.personName}</strong><small>{preview.weekLabel} · {preview.lessons.length} ders</small></div><CalendarDays/></section>
    <section className="program-share-recipient"><div><span>WhatsApp Alıcısı</span><b>{selectedRecipient?.name||preview.personName}</b><small>{selectedRecipient?.masked||'Telefon bilgisi yok'}</small></div>{whatsappUrl?<MessageCircle/>:<PhoneOff/>}</section>
    {preview.recipientOptions.length>1&&<section className="program-share-recipient-choice" aria-label="WhatsApp alıcısı seçimi">
      <span>Program kime gönderilsin?</span>
      <div>{preview.recipientOptions.map(recipient=><button key={recipient.id} type="button" className={selectedRecipient?.id===recipient.id?'active':''} onClick={()=>setSelectedRecipientId(recipient.id)}><b>{recipient.id==='guardian'?'Veli':'Öğrenci'}</b><small>{recipient.name} · {recipient.masked}</small></button>)}</div>
    </section>}
    <section className="program-share-list">{dates.map(date=><div className="program-share-day" key={date}><header><b>{fullDate(date)}</b><span>{preview.lessons.filter(x=>x.tarih===date).length} ders</span></header><div>{preview.lessons.filter(x=>x.tarih===date).map(lesson=>{const online=Boolean(lesson.zoom_katilim_baglantisi)||String(lesson.ders_yeri||'').toLocaleLowerCase('tr-TR').includes('online')||String(lesson.ders_turu||'').toLocaleLowerCase('tr-TR').includes('online');return <div className={`program-share-lesson ${lesson.ders_durumu==='İptal'?'cancelled':''}`} key={lesson.ders_id}><span>{time(lesson.baslangic_saati)}–{time(lesson.bitis_saati)}</span><div><b>{target.type==='student'?branchName(data,lesson.brans_id):studentName(data,lesson.ogrenci_id)}</b><small>{target.type==='student'?teacherName(data,lesson.ogretmen_id):branchName(data,lesson.brans_id)} · {online?'Online':roomName(data,lesson.derslik_id)}{lesson.ders_durumu==='İptal'?' · İptal':''}</small></div></div>})}</div></div>)}</section>
    {!whatsappUrl&&<div className="form-hint program-share-warning">Bu kişiye WhatsApp gönderebilmek için telefon bilgisi eklenmelidir.</div>}
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={onClose}>Vazgeç</button><button type="button" className="primary-btn" disabled={!whatsappUrl} onClick={openWhatsapp}><MessageCircle size={17}/>WhatsApp'ta Aç</button></div>
  </div>
}
