import { BookOpenCheck, CalendarPlus, Mail, MessageCircle, Pencil, Phone, WalletCards } from 'lucide-react'
import type { Ogrenci } from '../lib/types'
import { fullDate, money, normalizePhone, shortDate, time } from '../lib/format'
import { APP_MODE } from '../lib/supabase'
import { demoPersonaPhoto } from '../lib/demoPersonaPhoto'
import { useAppData } from './AppDataProvider'
import { ProfileAvatar } from './ProfileAvatar'
import { branchName, nextLessonForStudent, studentDebt, teacherName } from '../services/metrics'

export function StudentDetail({ student, onCollection, onLesson, onAssignment, onEdit }: {student:Ogrenci;onCollection:()=>void;onLesson:()=>void;onAssignment:()=>void;onEdit:()=>void}) {
  const {data}=useAppData();if(!data)return null
  const debt=studentDebt(data,student.ogrenci_id), next=nextLessonForStudent(data,student.ogrenci_id), programs=data.sabitProgramlar.filter(x=>x.ogrenci_id===student.ogrenci_id&&x.program_durumu!=='Pasif'&&x.aktif!==false), lessons=data.dersler.filter(x=>x.ogrenci_id===student.ogrenci_id).slice(0,6), payments=data.tahsilatlar.filter(x=>x.ogrenci_id===student.ogrenci_id&&!x.iptal_mi).slice(0,6),phone=student.veli_telefon||student.ogrenci_telefon||''
  const photo=student.profil_fotografi||(APP_MODE==='demo'?demoPersonaPhoto(student.ogrenci_id,student.ad_soyad,'student'):null)
  const balanceText=debt>0?`${money(debt)} Borç`:debt<0?`${money(Math.abs(debt))} Avans`:money(0)
  return <div className="detail-stack profile-detail-stack student-detail-v2">
    <section className="profile-detail-hero student-profile-hero"><ProfileAvatar name={student.ad_soyad} photoPath={photo} className="profile-detail-avatar student-avatar"/><div className="profile-detail-copy"><span>Öğrenci Profili</span><strong>{student.ad_soyad}</strong><small>{student.veli_adi?`Veli · ${student.veli_adi}`:'Veli bilgisi eklenmemiş'}</small></div><span className="profile-status">{student.durum||'Aktif'}</span></section>

    {(phone||student.email)&&<section className="profile-contact-strip" aria-label="İletişim">
      {phone&&<a className="profile-contact-btn phone" href={`tel:+${normalizePhone(phone)}`}><Phone size={17}/><span>Ara</span></a>}
      {phone&&<a className="profile-contact-btn whatsapp" href={`https://wa.me/${normalizePhone(phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/><span>WhatsApp</span></a>}
      {student.email&&<a className="profile-contact-btn email" href={`mailto:${student.email}`}><Mail size={17}/><span>E-posta</span></a>}
    </section>}

    <section className={`student-balance-focus ${debt>0?'debt':debt<0?'advance':'clear'}`}><div><span>Güncel Bakiye</span><strong>{balanceText}</strong><small>{debt>0?'Tahsilat bekliyor':debt<0?'Kullanılabilir avans bakiyesi':'Hesap dengede'}</small></div><WalletCards/></section>

    <section className="profile-focus-grid student-focus-grid"><div className="profile-focus-card"><span>Sabit Program</span><strong>{programs.length}</strong><small>aktif ders şablonu</small></div><div className="profile-focus-card"><span>Sıradaki Ders</span><strong>{next?`${shortDate(next.tarih)} ${time(next.baslangic_saati)}`:'—'}</strong><small>{next?`${branchName(data,next.brans_id)} · ${teacherName(data,next.ogretmen_id)}`:'Planlı ders yok'}</small></div><div className="profile-focus-card"><span>Son Dersler</span><strong>{lessons.length}</strong><small>görüntülenen kayıt</small></div></section>

    <section className="detail-action-cards" aria-label="Hızlı işlemler">
      <button className="detail-action-card primary" onClick={onCollection}><span className="detail-action-icon teal"><WalletCards/></span><span><b>Tahsilat Al</b><small>Ödemeyi kaydet</small></span></button>
      <button className="detail-action-card" onClick={onLesson}><span className="detail-action-icon blue"><CalendarPlus/></span><span><b>Ders Ekle</b><small>Yeni ders kaydı</small></span></button>
      <button className="detail-action-card" onClick={onAssignment}><span className="detail-action-icon purple"><BookOpenCheck/></span><span><b>Ödev Ekle</b><small>Yeni çalışma oluştur</small></span></button>
      <button className="detail-action-card" onClick={onEdit}><span className="detail-action-icon orange"><Pencil/></span><span><b>Kaydı Düzenle</b><small>Profil bilgilerini değiştir</small></span></button>
    </section>

    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Sabit Program</h3><span>{programs.length} aktif kayıt</span></div></div>{programs.length?<div className="detail-history-list">{programs.map(x=><div className="detail-history-card program-history" key={x.program_id}><div><span>{x.haftanin_gunu} · {time(x.baslangic_saati)}</span><strong>{branchName(data,x.brans_id)}</strong><small>{teacherName(data,x.ogretmen_id)}</small></div><span className="history-status planned">{x.tekrar_sikligi}</span></div>)}</div>:<p className="muted">Aktif sabit program yok.</p>}</section>
    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Son Dersler</h3><span>{lessons.length} kayıt</span></div></div>{lessons.length?<div className="detail-history-list">{lessons.map(x=><div className="detail-history-card" key={x.ders_id}><div><span>{fullDate(x.tarih)} · {time(x.baslangic_saati)}</span><strong>{branchName(data,x.brans_id)}</strong><small>{teacherName(data,x.ogretmen_id)}</small></div><span className={`history-status ${x.ders_durumu==='Yapıldı'?'done':x.ders_durumu==='Planlandı'?'planned':'other'}`}>{x.ders_durumu}</span></div>)}</div>:<p className="muted">Ders kaydı yok.</p>}</section>
    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Son Tahsilatlar</h3><span>{payments.length} kayıt</span></div></div>{payments.length?<div className="detail-history-list">{payments.map(x=><div className="detail-history-card payment-history" key={x.tahsilat_id}><div><span>{fullDate(x.tarih)} · {x.odeme_yontemi}</span><strong>Tahsilat</strong></div><b className="success-text">{money(x.tutar)}</b></div>)}</div>:<p className="muted">Tahsilat kaydı yok.</p>}</section>
  </div>
}
