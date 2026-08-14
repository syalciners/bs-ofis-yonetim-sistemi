import { BookOpenCheck, CalendarPlus, MessageCircle, Pencil, Phone, WalletCards } from 'lucide-react'
import type { Ogrenci } from '../lib/types'
import { fullDate, money, normalizePhone, shortDate, time } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { branchName, nextLessonForStudent, studentDebt, teacherName } from '../services/metrics'

export function StudentDetail({ student, onCollection, onLesson, onAssignment, onEdit }: {student:Ogrenci;onCollection:()=>void;onLesson:()=>void;onAssignment:()=>void;onEdit:()=>void}) {
  const {data}=useAppData();if(!data)return null
  const debt=studentDebt(data,student.ogrenci_id), next=nextLessonForStudent(data,student.ogrenci_id), programs=data.sabitProgramlar.filter(x=>x.ogrenci_id===student.ogrenci_id&&x.program_durumu!=='Pasif'&&x.aktif!==false), lessons=data.dersler.filter(x=>x.ogrenci_id===student.ogrenci_id).slice(0,6), payments=data.tahsilatlar.filter(x=>x.ogrenci_id===student.ogrenci_id).slice(0,6),phone=student.veli_telefon||student.ogrenci_telefon||''
  return <div className="detail-stack">
    <div className="detail-hero"><div><span>Öğrenci</span><strong>{student.ad_soyad}</strong><small>{student.veli_adi?`Veli: ${student.veli_adi}`:'Veli bilgisi yok'}</small></div><span className="status-pill">{student.durum||'Aktif'}</span></div>
    <div className="mini-grid three"><div><span>Güncel Bakiye</span><b className={debt>0?'danger-text':debt<0?'success-text':''}>{debt>0?`${money(debt)} Borç`:debt<0?`${money(Math.abs(debt))} Avans`:money(0)}</b></div><div><span>Sabit Program</span><b>{programs.length}</b></div><div><span>Sıradaki Ders</span><b>{next?`${shortDate(next.tarih)} ${time(next.baslangic_saati)}`:'—'}</b></div></div>
    <div className="quick-detail-actions"><button className="primary-btn" onClick={onCollection}><WalletCards size={17}/>Tahsilat Al</button><button className="secondary-btn" onClick={onLesson}><CalendarPlus size={17}/>Ders Ekle</button>{phone&&<a className="secondary-btn" href={`tel:+${normalizePhone(phone)}`}><Phone size={17}/>Ara</a>}{phone&&<a className="secondary-btn" href={`https://wa.me/${normalizePhone(phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/>WhatsApp</a>}<button className="secondary-btn" onClick={onAssignment}><BookOpenCheck size={17}/>Ödev Ekle</button><button className="secondary-btn" onClick={onEdit}><Pencil size={17}/>Düzenle</button></div>
    <section className="detail-section"><h3>Sabit Program</h3>{programs.length?programs.map(x=><div className="detail-row" key={x.program_id}><span>{x.haftanin_gunu} · {time(x.baslangic_saati)}</span><b>{branchName(data,x.brans_id)} · {teacherName(data,x.ogretmen_id)}</b></div>):<p className="muted">Aktif sabit program yok.</p>}</section>
    <section className="detail-section"><h3>Son Dersler</h3>{lessons.length?lessons.map(x=><div className="detail-row" key={x.ders_id}><span>{fullDate(x.tarih)} · {time(x.baslangic_saati)}</span><b>{branchName(data,x.brans_id)} · {x.ders_durumu}</b></div>):<p className="muted">Ders kaydı yok.</p>}</section>
    <section className="detail-section"><h3>Son Tahsilatlar</h3>{payments.length?payments.map(x=><div className="detail-row" key={x.tahsilat_id}><span>{fullDate(x.tarih)} · {x.odeme_yontemi}</span><b className="success-text">{money(x.tutar)}</b></div>):<p className="muted">Tahsilat kaydı yok.</p>}</section>
  </div>
}
