import { CalendarDays, Edit3, GraduationCap, MessageCircle, MoreHorizontal, Phone, Plus, Search, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { TeacherForm } from '../components/forms'
import { TeacherPaymentQuickForm } from '../components/TeacherPaymentQuickForm'
import type { Ogretmen } from '../lib/types'
import { money, normalizePhone, shortDate, time } from '../lib/format'
import { nextLessonForTeacher, studentName, teacherBalance } from '../services/metrics'

export function TeachersPage(){
  const{data}=useAppData();const nav=useNavigate();const[q,setQ]=useState('');const[selected,setSelected]=useState<Ogretmen|null>(null);const[payment,setPayment]=useState<string|null>(null);const[edit,setEdit]=useState<Ogretmen|null>(null);const[newTeacher,setNewTeacher]=useState(false);const[more,setMore]=useState(false)
  const rows=useMemo(()=>data?data.ogretmenler.filter(x=>x.durum!=='Pasif'&&x.ad_soyad.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))):[],[data,q]);if(!data)return null
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">PERSONEL</span><h1>Öğretmenler</h1><p>Takvim, branş ve hakediş tek profilde.</p></div><button className="primary-btn" onClick={()=>setNewTeacher(true)}><Plus size={17}/>Öğretmen Ekle</button></section>
    <div className="search-filter-bar"><div className="search-box"><Search size={17}/><input placeholder="Öğretmen ara…" value={q} onChange={e=>setQ(e.target.value)}/></div></div>
    <section className="teacher-grid">{rows.map(x=>{const balance=teacherBalance(data,x.ogretmen_id),next=nextLessonForTeacher(data,x.ogretmen_id);return <button className="teacher-card" key={x.ogretmen_id} onClick={()=>{setSelected(x);setMore(false)}}><div className="student-top"><div className="avatar purple">{x.ad_soyad.split(/\s+/).slice(0,2).map(y=>y[0]).join('').toLocaleUpperCase('tr-TR')}</div><div className="student-name"><strong>{x.ad_soyad}</strong><span>{x.branslar||x.rol||'Öğretmen'}</span></div></div><div className="student-meta"><span>{next?<><b>{shortDate(next.tarih)} {time(next.baslangic_saati)}</b> sıradaki</>:<>Sıradaki ders yok</>}</span></div><div className="student-balance"><span>Güncel hakediş borcu</span><b className={balance>0?'danger-text':''}>{money(Math.max(balance,0))}</b></div></button>})}{!rows.length&&<div className="calm-empty full-span"><GraduationCap/><b>Öğretmen bulunamadı.</b><span>Arama metnini değiştir veya yeni öğretmen ekle.</span></div>}</section>

    <Sheet open={!!selected&&!payment&&!edit} title={selected?.ad_soyad||'Öğretmen'} subtitle="Öğretmen profili" onClose={()=>setSelected(null)}>{selected&&(()=>{const next=nextLessonForTeacher(data,selected.ogretmen_id),phone=selected.telefon||'';return <div className="detail-stack">
      <div className="mini-grid three"><div><span>Branşlar</span><b>{selected.branslar||'—'}</b></div><div><span>Güncel Kalan</span><b>{money(Math.max(teacherBalance(data,selected.ogretmen_id),0))}</b></div><div><span>Sıradaki Ders</span><b>{next?`${shortDate(next.tarih)} ${time(next.baslangic_saati)}`:'—'}</b></div></div>
      <div className="quick-detail-actions"><button className="primary-btn" onClick={()=>setPayment(selected.ogretmen_id)}><WalletCards size={17}/>Ödeme Yap</button><button className="secondary-btn" onClick={()=>{nav(`/takvim?ogretmen=${encodeURIComponent(selected.ogretmen_id)}`);setSelected(null)}}><CalendarDays size={17}/>Takvimi Gör</button><button className="secondary-btn" onClick={()=>setMore(v=>!v)}><MoreHorizontal size={17}/>{more?'İşlemleri Gizle':'Diğer İşlemler'}</button></div>
      {more&&<div className="action-list">{phone&&<a href={`tel:+${normalizePhone(phone)}`}><span className="action-round teal"><Phone/></span><span><b>Ara</b><small>Öğretmeni telefonla ara</small></span></a>}{phone&&<a href={`https://wa.me/${normalizePhone(phone)}`} target="_blank" rel="noreferrer"><span className="action-round green"><MessageCircle/></span><span><b>WhatsApp</b><small>Doğrudan konuşmayı aç</small></span></a>}<button onClick={()=>{setEdit(selected);setSelected(null)}}><span className="action-round orange"><Edit3/></span><span><b>Öğretmeni Düzenle</b><small>İletişim, branş ve durum bilgileri</small></span></button></div>}
      <section className="detail-section"><h3>Son Dersler</h3>{data.dersler.filter(x=>x.ogretmen_id===selected.ogretmen_id).slice(0,8).map(x=><div className="detail-row" key={x.ders_id}><span>{shortDate(x.tarih)} · {time(x.baslangic_saati)}</span><b>{studentName(data,x.ogrenci_id)} · {x.ders_durumu}</b></div>)}</section>
    </div>})()}</Sheet>
    <Sheet open={!!payment} title="Öğretmen Ödemesi" subtitle={payment?data.ogretmenler.find(x=>x.ogretmen_id===payment)?.ad_soyad:''} onClose={()=>setPayment(null)}>{payment&&<TeacherPaymentQuickForm teacherId={payment} onDone={()=>setPayment(null)} onCancel={()=>setPayment(null)}/>}</Sheet>
    <Sheet open={!!edit} title="Öğretmeni Düzenle" subtitle="İletişim, branş ve durum" onClose={()=>setEdit(null)}>{edit&&<TeacherForm teacher={edit} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={newTeacher} title="Yeni Öğretmen" subtitle="Yalnız gerekli bilgileri girin." onClose={()=>setNewTeacher(false)}><TeacherForm onDone={()=>setNewTeacher(false)} onCancel={()=>setNewTeacher(false)}/></Sheet>
  </div>
}
