import type { Odev, Ogrenci, Ogretmen } from '../lib/types'
import { fullDate } from '../lib/format'
import { assignmentLinkExpirySeconds, signedAssignmentAttachmentUrl } from './assignmentAttachmentService'

const phoneDigits=(value?:string|null)=>String(value||'').replace(/\D/g,'')
const normalizeTrPhone=(value?:string|null)=>{
  const d=phoneDigits(value)
  if(!d)return''
  if(d.startsWith('90')&&d.length>=12)return d
  if(d.startsWith('0')&&d.length===11)return `90${d.slice(1)}`
  if(d.length===10)return `90${d}`
  return d
}

export async function buildAssignmentWhatsAppUrl(assignment:Odev,student:Ogrenci,teacher?:Ogretmen){
  const phone=normalizeTrPhone(student.veli_telefon||student.ogrenci_telefon)
  if(!phone)throw new Error('Öğrenci veya veli için WhatsApp telefon numarası bulunamadı.')
  const expires=assignmentLinkExpirySeconds(assignment.son_teslim_tarihi)
  const [fileUrl,imageUrl]=await Promise.all([
    signedAssignmentAttachmentUrl(assignment,'file',expires),
    signedAssignmentAttachmentUrl(assignment,'image',expires),
  ])
  const title=assignment.odev_basligi||assignment.konu||'Ödev'
  const lines=[
    'Merhaba,',
    '',
    `*${student.ad_soyad} için ödev*`,
    `Ödev: *${title}*`,
  ]
  if(assignment.odev_aciklamasi)lines.push('',assignment.odev_aciklamasi)
  lines.push('',`Veriliş tarihi: ${fullDate(assignment.verilis_tarihi)}`)
  if(assignment.son_teslim_tarihi)lines.push(`Son teslim tarihi: ${fullDate(assignment.son_teslim_tarihi)}`)
  if(teacher?.ad_soyad)lines.push(`Öğretmen: ${teacher.ad_soyad}`)
  if(imageUrl||fileUrl){lines.push('','*Ekler*');if(imageUrl)lines.push(`Görsel: ${imageUrl}`);if(fileUrl)lines.push(`Dosya: ${fileUrl}`)}
  lines.push('','BS Ofis Yönetim Sistemi')
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}

export async function openAssignmentAttachment(assignment:Odev,kind:'file'|'image'){
  const win=window.open('about:blank','_blank')
  try{
    const url=await signedAssignmentAttachmentUrl(assignment,kind,assignmentLinkExpirySeconds(assignment.son_teslim_tarihi))
    if(!url)throw new Error('Bu ek için bağlantı bulunamadı.')
    if(win)win.location.href=url
    else window.location.href=url
  }catch(err){win?.close();throw err}
}
