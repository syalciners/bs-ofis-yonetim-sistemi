import { BookOpenCheck, CalendarPlus, MessageCircle, MoreHorizontal, Pencil, Phone, WalletCards } from 'lucide-react'
import { useState } from 'react'
import type { Ogrenci } from '../lib/types'
import { fullDate, money, normalizePhone, shortDate, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, nextLessonForStudent, studentDebt, teacherName } from '../services/metrics'

export function StudentDetail({ student, onCollection, onLesson, onAssignment, onEdit }: {student:Ogrenci;onCollection:()=>void;onLesson:()=>void;onAssignment:()=>void;onEdit:()=>void}) {
  const {data}=useAppData();const[more,setMore]=useState(false);if(!data)return null
  const debt=studentDebt(data,student.ogrenci_id), next=nextLessonForStudent(data,student.ogrenci_id), programs=data.sabitProgramlar.filter(x=>x.ogrenci_id===student.ogrenci_id&&x.program_durumu!=='Pasif'&&x.aktif!==false), lessons=data.dersler.filter(x=>x.ogrenci_id===student.ogrenci_id).slice(0,6), payments=data.tahsilatlar.filter(x=>x.ogrenci_id===student.ogrenci_id&&!x.iptal_mi).slice(0,6),phone=student.veli_telefon||student.ogrenci_telefon||''
  const initials=student.ad_soyad.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr-TR')
  const balanceText=debt>0?`${money(debt)} Borç`:debt<0?`${money(Math.abs(debt))} Avans`:money(0)
  return <div className="detail-stack profile-detail-stack">
    <section className="profile-detail-hero student-profile-hero"><div className="profile-detail-avatar student-avatar">{initials}</div><div className="profile-detail-copy"><span>Öğrenci Profili</span><strong>{student.ad_soyad}</strong><small>{student.veli_adi?`Veli · ${student.veli_adi}`:'Veli bilgisi eklenmemiş'}</small></div><span className="profile-status">{student.durum||'Aktif'}</span></section>

    <section className={`student-balance-focus ${debt>0?'debt':debt<0?'advance':'clear'}`}><div><span>Güncel Bakiye</span><strong>{balanceText}</strong><small>{debt>0?'Tahsilat bekliyor':debt<0?'Kullanılabilir avans bakiyesi':'Hesap dengede'}</small></div><WalletCards/></section>

    <section className="profile-focus-grid student-focus-grid"><div className="profile-focus-card"><span>Sabit Program</span><strong>{programs.length}</strong><small>aktif ders şablonu</small></div><div className="profile-focus-card"><span>Sıradaki Ders</span><strong>{next?`${shortDate(next.tarih)} ${time(next.baslangic_saati)}`:'—'}</strong><small>{next?`${branchName(data,next.brans_id)} · ${teacherName(data,next.ogretmen_id)}`:'Planlı ders yok'}</small></div><div className="profile-focus-card"><span>Son Dersler</span><strong>{lessons.length}</strong><small>görüntülenen kayıt</small></div></section>

    <div className="quick-detail-actions profile-actions">
      <button className="primary-btn" onClick={onCollection}><WalletCards size={17}/>Tahsilat Al</button>
      <button className="secondary-btn" onClick={onLesson}><CalendarPlus size={17}/>Ders Ekle</button>
      <button className="secondary-btn" onClick={()=>setMore(v=>!v)}><MoreHorizontal size={17}/>{more?'İşlemleri Gizle':'Diğer İşlemler'}</button>
    </div>

    {more&&<div className="action-list">
      {phone&&<a href={`tel:+${normalizePhone(phone)}`}><span className="action-round teal"><Phone/></span><span><b>Ara</b><small>{student.veli_telefon?'Veli telefonunu ara':'Öğrenci telefonunu ara'}</small></span></a>}
      {phone&&<a href={`https://wa.me/${normalizePhone(phone)}`} target="_blank" rel="noreferrer"><span className="action-round green"><MessageCircle/></span><span><b>WhatsApp</b><small>Doğrudan konuşmayı aç</small></span></a>}
      <button onClick={onAssignment}><span className="action-round blue"><BookOpenCheck/></span><span><b>Ödev Ekle</b><small>Öğrenci için yeni ödev oluştur</small></span></button>
      <button onClick={onEdit}><span className="action-round orange"><Pencil/></span><span><b>Öğrenciyi Düzenle</b><small>İletişim ve kayıt bilgilerini güncelle</small></span></button>
    </div>}

    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Sabit Program</h3><span>{programs.length} aktif kayıt</span></div></div>{programs.length?<div className="detail-history-list">{programs.map(x=><div className="detail-history-card program-history" key={x.program_id}><div><span>{x.haftanin_gunu} · {time(x.baslangic_saati)}</span><strong>{branchName(data,x.brans_id)}</strong><small>{teacherName(data,x.ogretmen_id)}</small></div><span className="history-status planned">{x.tekrar_sikligi}</span></div>)}</div>:<p className="muted">Aktif sabit program yok.</p>}</section>
    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Son Dersler</h3><span>{lessons.length} kayıt</span></div></div>{lessons.length?<div className="detail-history-list">{lessons.map(x=><div className="detail-history-card" key={x.ders_id}><div><span>{fullDate(x.tarih)} · {time(x.baslangic_saati)}</span><strong>{branchName(data,x.brans_id)}</strong><small>{teacherName(data,x.ogretmen_id)}</small></div><span className={`history-status ${x.ders_durumu==='Yapıldı'?'done':x.ders_durumu==='Planlandı'?'planned':'other'}`}>{x.ders_durumu}</span></div>)}</div>:<p className="muted">Ders kaydı yok.</p>}</section>
    <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Son Tahsilatlar</h3><span>{payments.length} kayıt</span></div></div>{payments.length?<div className="detail-history-list">{payments.map(x=><div className="detail-history-card payment-history" key={x.tahsilat_id}><div><span>{fullDate(x.tarih)} · {x.odeme_yontemi}</span><strong>Tahsilat</strong></div><b className="success-text">{money(x.tutar)}</b></div>)}</div>:<p className="muted">Tahsilat kaydı yok.</p>}</section>
  </div>
}
