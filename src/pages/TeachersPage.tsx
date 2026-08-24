import { CalendarDays, Edit3, GraduationCap, Mail, MessageCircle, Phone, Plus, Search, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { Sheet } from '../components/Sheet'
import { TeacherSectionNav } from '../components/TeacherSectionNav'
import { TeacherForm } from '../components/forms'
import { TeacherPaymentQuickForm } from '../components/TeacherPaymentQuickForm'
import type { Ogretmen } from '../lib/types'
import { firstOfMonth, money, normalizePhone, shortDate, time } from '../lib/format'
import { APP_MODE } from '../lib/supabase'
import { demoPersonaPhoto } from '../lib/demoPersonaPhoto'
import { isManagerTeacher, teacherTone } from '../lib/teacherTone'
import { nextLessonForTeacher, studentName, teacherBalance } from '../services/metrics'

const DEMO_MANAGER_NAMES=['Deniz Arman','Selin Aksoy'] as const

export function TeachersPage(){
  const{data}=useAppData();const nav=useNavigate();const[q,setQ]=useState('');const[selected,setSelected]=useState<Ogretmen|null>(null);const[payment,setPayment]=useState<string|null>(null);const[edit,setEdit]=useState<Ogretmen|null>(null);const[newTeacher,setNewTeacher]=useState(false)
  const displayRows=useMemo(()=>{
    if(!data)return[]
    const active=data.ogretmenler.filter(x=>x.durum!=='Pasif')
    if(APP_MODE!=='demo')return active
    const managerTeachers=[...active].sort((a,b)=>{
      const aRank=isManagerTeacher(a.ad_soyad)?0:1,bRank=isManagerTeacher(b.ad_soyad)?0:1
      return aRank-bRank||a.ogretmen_id.localeCompare(b.ogretmen_id)
    }).slice(0,2)
    const aliasById=new Map(managerTeachers.map((x,index)=>[x.ogretmen_id,DEMO_MANAGER_NAMES[index]]))
    return active.map(x=>{const alias=aliasById.get(x.ogretmen_id);return alias?{...x,ad_soyad:alias,rol:'Yönetici'}:x})
  },[data])
  const rows=useMemo(()=>displayRows.filter(x=>x.ad_soyad.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))),[displayRows,q]);if(!data)return null

  const branchNames=(teacherId:string)=>data.ogretmenBranslari
    .filter(x=>x.ogretmen_id===teacherId&&x.aktif!==false)
    .map(x=>data.branslar.find(b=>b.brans_id===x.brans_id&&b.aktif!==false)?.brans_adi)
    .filter((x):x is string=>Boolean(x))
  const teachingTitle=(branches:string[])=>{
    const normalized=branches.map(x=>x.toLocaleUpperCase('tr-TR'))
    if(normalized.some(x=>x.includes('MATEMATİK')||x.includes('MATH')))return 'Matematik Öğretmeni'
    return branches[0]?`${branches[0]} Öğretmeni`:'Öğretmen'
  }
  const isManagerRow=(x:Ogretmen)=>APP_MODE==='demo'?x.rol==='Yönetici':isManagerTeacher(x.ad_soyad)
  const managerRank=(name:string)=>{const normalized=name.trim().toLocaleUpperCase('tr-TR');return normalized==='DENİZ ARMAN'||normalized==='BAŞAK ATİLLA'?0:1}
  const toneFor=(x:Ogretmen,manager=false)=>{if(APP_MODE==='demo'&&manager){const normalized=x.ad_soyad.trim().toLocaleUpperCase('tr-TR');if(normalized==='DENİZ ARMAN')return'teacher-pink';if(normalized==='SELİN AKSOY')return'teacher-blue'}return teacherTone(x.ad_soyad)}
  const managers=rows.filter(isManagerRow).sort((a,b)=>managerRank(a.ad_soyad)-managerRank(b.ad_soyad))
  const teachers=rows.filter(x=>!isManagerRow(x)).sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))

  const teacherCard=(x:Ogretmen,manager=false)=>{const balance=teacherBalance(data,x.ogretmen_id),next=nextLessonForTeacher(data,x.ogretmen_id),branches=branchNames(x.ogretmen_id),baseTitle=teachingTitle(branches),title=manager?`Yönetici - ${baseTitle}`:baseTitle,photo=x.profil_fotografi||(APP_MODE==='demo'?demoPersonaPhoto(x.ogretmen_id,x.ad_soyad,manager?'manager':'teacher'):null);return <button className={`teacher-profile-card ${toneFor(x,manager)} ${manager?'manager-card':'standard-card'}`} key={x.ogretmen_id} onClick={()=>setSelected(x)}>
    <div className="teacher-profile-head"><ProfileAvatar name={x.ad_soyad} photoPath={photo} className="avatar purple"/><div><strong>{x.ad_soyad}</strong><span>{title}</span></div></div>
    <div className="teacher-branches"><span>Verdiği Dersler</span><b>{branches.length?branches.join(' · '):'Branş tanımlanmamış'}</b></div>
    <div className="teacher-card-footer"><span>{next?<><b>{shortDate(next.tarih)} {time(next.baslangic_saati)}</b> sıradaki ders</>:<>Sıradaki ders yok</>}</span><span>Güncel kalan <b className={balance>0?'danger-text':''}>{money(Math.max(balance,0))}</b></span></div>
  </button>}

  return <div className="page-stack teachers-v2">
    <section className="page-title-row"><div><span className="eyebrow">PERSONEL</span><h1>Öğretmenler</h1></div><button className="primary-btn" onClick={()=>setNewTeacher(true)}><Plus size={17}/>Öğretmen Ekle</button></section>
    <TeacherSectionNav active="teachers"/>
    <div className="search-filter-bar"><div className="search-box"><Search size={17}/><input placeholder="Öğretmen ara…" value={q} onChange={e=>setQ(e.target.value)}/></div></div>

    {!!managers.length&&<section className="teacher-group"><div className="teacher-group-heading"><div><span className="eyebrow">YÖNETİM</span><h2>Yöneticiler</h2></div><span>{managers.length} kişi</span></div><div className="manager-teacher-grid">{managers.map(x=>teacherCard(x,true))}</div></section>}
    {!!teachers.length&&<section className="teacher-group"><div className="teacher-group-heading"><div><span className="eyebrow">EĞİTİM KADROSU</span><h2>Öğretmenler</h2></div><span>{teachers.length} kişi</span></div><div className="standard-teacher-grid">{teachers.map(x=>teacherCard(x,false))}</div></section>}
    {!rows.length&&<div className="calm-empty"><GraduationCap/><b>Öğretmen bulunamadı.</b><span>Arama metnini değiştir veya yeni öğretmen ekle.</span></div>}

    <Sheet open={!!selected&&!payment&&!edit} title={selected?.ad_soyad||'Öğretmen'} subtitle="Öğretmen profili" onClose={()=>setSelected(null)}>{selected&&(()=>{const next=nextLessonForTeacher(data,selected.ogretmen_id),phone=selected.telefon||'',branches=branchNames(selected.ogretmen_id),manager=isManagerRow(selected),title=manager?`Yönetici - ${teachingTitle(branches)}`:teachingTitle(branches),balance=Math.max(teacherBalance(data,selected.ogretmen_id),0),monthPrefix=firstOfMonth().slice(0,7),monthLessonHours=data.dersler.filter(x=>x.ogretmen_id===selected.ogretmen_id&&x.ders_durumu==='Yapıldı'&&x.tarih?.startsWith(monthPrefix)).reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0),recent=data.dersler.filter(x=>x.ogretmen_id===selected.ogretmen_id).slice(0,8),photo=selected.profil_fotografi||(APP_MODE==='demo'?demoPersonaPhoto(selected.ogretmen_id,selected.ad_soyad,manager?'manager':'teacher'):null);return <div className="detail-stack profile-detail-stack teacher-detail-v2">
      <section className={`profile-detail-hero ${toneFor(selected,manager)}`}><ProfileAvatar name={selected.ad_soyad} photoPath={photo} className="profile-detail-avatar"/><div className="profile-detail-copy"><span>{title}</span><strong>{selected.ad_soyad}</strong><div className="profile-chip-row">{branches.length?branches.map(x=><small key={x}>{x}</small>):<small>Branş tanımlanmamış</small>}</div></div><span className="profile-status">{selected.durum||'Aktif'}</span></section>

      {(phone||selected.email)&&<section className="profile-contact-strip" aria-label="İletişim">
        {phone&&<a className="profile-contact-btn phone" href={`tel:+${normalizePhone(phone)}`}><Phone size={17}/><span>Ara</span></a>}
        {phone&&<a className="profile-contact-btn whatsapp" href={`https://wa.me/${normalizePhone(phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/><span>WhatsApp</span></a>}
        {selected.email&&<a className="profile-contact-btn email" href={`mailto:${selected.email}`}><Mail size={17}/><span>E-posta</span></a>}
      </section>}

      <section className="profile-focus-grid"><div className="profile-focus-card money-focus"><span>Güncel Kalan Hakediş</span><strong className={balance>0?'danger-text':''}>{money(balance)}</strong><small>{balance>0?'Ödeme bekliyor':'Ödeme dengede'}</small></div><div className="profile-focus-card"><span>Sıradaki Ders</span><strong>{next?`${shortDate(next.tarih)} ${time(next.baslangic_saati)}`:'—'}</strong><small>{next?studentName(data,next.ogrenci_id):'Planlı ders yok'}</small></div><div className="profile-focus-card"><span>Bu Ay</span><strong>{monthLessonHours}</strong><small>yapılan ders saati</small></div></section>

      <section className="detail-action-cards" aria-label="Hızlı işlemler">
        <button className="detail-action-card primary" onClick={()=>setPayment(selected.ogretmen_id)}><span className="detail-action-icon teal"><WalletCards/></span><span><b>Ödeme Yap</b><small>Hakediş ödemesi</small></span></button>
        <button className="detail-action-card" onClick={()=>{nav(`/takvim?ogretmen=${encodeURIComponent(selected.ogretmen_id)}`);setSelected(null)}}><span className="detail-action-icon blue"><CalendarDays/></span><span><b>Takvim</b><small>Haftalık programı aç</small></span></button>
        <button className="detail-action-card" onClick={()=>{nav(`/ogretmen-odemeleri?ogretmen=${encodeURIComponent(selected.ogretmen_id)}`);setSelected(null)}}><span className="detail-action-icon purple"><WalletCards/></span><span><b>Ödemeler</b><small>Ödeme geçmişi</small></span></button>
        <button className="detail-action-card" onClick={()=>{setEdit(selected);setSelected(null)}}><span className="detail-action-icon orange"><Edit3/></span><span><b>Kaydı Düzenle</b><small>Profil ve branşlar</small></span></button>
      </section>

      <section className="detail-section visual-history-section"><div className="section-heading compact"><div><h3>Son Dersler</h3><span>{recent.length} kayıt</span></div></div>{recent.length?<div className="detail-history-list">{recent.map(x=><div className="detail-history-card" key={x.ders_id}><div><span>{shortDate(x.tarih)} · {time(x.baslangic_saati)}</span><strong>{studentName(data,x.ogrenci_id)}</strong></div><span className={`history-status ${x.ders_durumu==='Yapıldı'?'done':x.ders_durumu==='Planlandı'?'planned':'other'}`}>{x.ders_durumu}</span></div>)}</div>:<p className="muted">Ders kaydı yok.</p>}</section>
    </div>})()}</Sheet>
    <Sheet open={!!payment} title="Öğretmen Ödemesi" subtitle={payment?displayRows.find(x=>x.ogretmen_id===payment)?.ad_soyad:''} onClose={()=>setPayment(null)}>{payment&&<TeacherPaymentQuickForm teacherId={payment} onDone={()=>setPayment(null)} onCancel={()=>setPayment(null)}/>}</Sheet>
    <Sheet open={!!edit} title="Öğretmeni Düzenle" subtitle="İletişim, branş ve durum" onClose={()=>setEdit(null)}>{edit&&<TeacherForm teacher={edit} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={newTeacher} title="Yeni Öğretmen" subtitle="Yalnız gerekli bilgileri girin." onClose={()=>setNewTeacher(false)}><TeacherForm onDone={()=>setNewTeacher(false)} onCancel={()=>setNewTeacher(false)}/></Sheet>
  </div>
}
