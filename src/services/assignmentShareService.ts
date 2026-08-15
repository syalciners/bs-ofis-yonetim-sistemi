import type { Odev, Ogrenci, Ogretmen } from '../lib/types'
import { fullDate } from '../lib/format'
import { buildWhatsappUrl, normalizeTrWhatsappPhone } from '../lib/whatsapp'
import { assignmentAttachmentName, assignmentLinkExpirySeconds, signedAssignmentAttachmentUrl } from './assignmentAttachmentService'

export async function buildAssignmentWhatsAppUrl(assignment:Odev,student:Ogrenci,teacher?:Ogretmen){
  const rawPhone=student.veli_telefon||student.ogrenci_telefon
  const phone=normalizeTrWhatsappPhone(rawPhone)
  if(!phone)throw new Error('Öğrenci veya veli için WhatsApp telefon numarası bulunamadı.')
  const expires=assignmentLinkExpirySeconds(assignment.son_teslim_tarihi)
  const [fileUrl,imageUrl]=await Promise.all([
    signedAssignmentAttachmentUrl(assignment,'file',expires),
    signedAssignmentAttachmentUrl(assignment,'image',expires),
  ])
  const title=assignment.odev_basligi||assignment.konu||'Ödev'
  const fileName=assignmentAttachmentName(assignment.odev_dosyasi)||'Dosya'
  const imageName=assignmentAttachmentName(assignment.odev_fotografi)||'Görsel'
  const lines=[
    'Merhaba 👋',
    '',
    '✨ *ÖDEV BİLGİLENDİRMESİ*',
    `👤 *Öğrenci:* ${student.ad_soyad}`,
    `📘 *Konu:* ${title}`,
  ]
  if(assignment.odev_aciklamasi)lines.push('','📝 *Yapılacaklar*',assignment.odev_aciklamasi)
  lines.push('',`📅 *Veriliş:* ${fullDate(assignment.verilis_tarihi)}`)
  if(assignment.son_teslim_tarihi)lines.push(`⏳ *Son Teslim:* ${fullDate(assignment.son_teslim_tarihi)}`)
  if(teacher?.ad_soyad)lines.push(`👨‍🏫 *Öğretmen:* ${teacher.ad_soyad}`)
  if(imageUrl||fileUrl){
    lines.push('','📎 *Ekler*')
    if(imageUrl)lines.push(`🖼️ *${imageName}:* ${imageUrl}`)
    if(fileUrl)lines.push(`📄 *${fileName}:* ${fileUrl}`)
  }
  lines.push('','🌟 Başarılar dileriz.','*BS Ofis Yönetim Sistemi*')
  return buildWhatsappUrl(rawPhone||phone,lines.join('\n'))
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
