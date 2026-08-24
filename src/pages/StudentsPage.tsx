import { Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { Sheet } from '../components/Sheet'
import { AssignmentForm, LessonForm, StudentForm } from '../components/forms'
import { StudentCollectionForm } from '../components/StudentCollectionForm'
import { StudentDetail } from '../components/StudentDetail'
import { StudentEditPanel } from '../components/StudentEditPanel'
import type { Ogrenci } from '../lib/types'
import { money, shortDate, time } from '../lib/format'
import { APP_MODE } from '../lib/supabase'
import { demoPersonaPhoto } from '../lib/demoPersonaPhoto'
import { nextLessonForStudent, studentDebt } from '../services/metrics'

export function StudentsPage(){
  const {data}=useAppData();const[params]=useSearchParams();const[query,setQuery]=useState('');const[filter,setFilter]=useState(params.get('filtre')||'aktif');const[selected,setSelected]=useState<Ogrenci|null>(null);const[edit,setEdit]=useState<Ogrenci|null>(null);const[newStudent,setNewStudent]=useState(false);const[collectionId,setCollectionId]=useState<string|null>(null);const[lessonStudentId,setLessonStudentId]=useState<string|null>(null);const[assignmentStudentId,setAssignmentStudentId]=useState<string|null>(null)
  const rows=useMemo(()=>{if(!data)return[];return data.ogrenciler.filter(x=>{const q=query.trim().toLocaleLowerCase('tr-TR');if(q&&!`${x.ad_soyad} ${x.veli_adi||''} ${x.veli_telefon||''} ${x.ogrenci_telefon||''}`.toLocaleLowerCase('tr-TR').includes(q))return false;const debt=studentDebt(data,x.ogrenci_id);if(filter==='aktif'&&x.durum==='Pasif')return false;if(filter==='borclu'&&debt<=0)return false;if(filter==='avans'&&debt>=0)return false;if(filter==='pasif'&&x.durum!=='Pasif')return false;return true}).sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr'))},[data,query,filter])
  if(!data)return null
  const balances=data.ogrenciler.map(x=>studentDebt(data,x.ogrenci_id));const active=data.ogrenciler.filter(x=>x.durum!=='Pasif').length,debtors=balances.filter(x=>x>0).length,openReceivable=balances.reduce((sum,value)=>sum+Math.max(value,0),0),advance=balances.filter(x=>x<0).length
  return <div className="page-stack students-v2">
    <section className="page-title-row"><div><span className="eyebrow">ÖĞRENCİ YÖNETİMİ</span><h1>Öğrenciler</h1></div><button className="primary-btn" onClick={()=>setNewStudent(true)}><UserPlus size={17}/>Öğrenci Ekle</button></section>
    <section className="kpi-grid three compact-kpis"><button className="kpi-card teal" onClick={()=>setFilter('aktif')}><span>Aktif Öğrenci</span><strong>{active}</strong><small>kayıtlı aktif</small></button><button className="kpi-card orange" onClick={()=>setFilter('borclu')}><span>Açık Alacak</span><strong>{money(openReceivable)}</strong><small>{debtors} öğrencide açık bakiye</small></button><button className="kpi-card blue" onClick={()=>setFilter('avans')}><span>Avanslı</span><strong>{advance}</strong><small>kullanılabilir bakiye</small></button></section>
    <section className="search-filter-bar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Öğrenci, veli veya telefon ara…"/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="aktif">Aktif</option><option value="borclu">Borçlu</option><option value="avans">Avanslı</option><option value="pasif">Pasif</option><option value="tum">Tümü</option></select></section>
    <section className="student-grid">{rows.map(s=>{const debt=studentDebt(data,s.ogrenci_id),next=nextLessonForStudent(data,s.ogrenci_id),programs=data.sabitProgramlar.filter(x=>x.ogrenci_id===s.ogrenci_id&&x.program_durumu!=='Pasif'&&x.aktif!==false).length,photo=s.profil_fotografi||(APP_MODE==='demo'?demoPersonaPhoto(s.ogrenci_id,s.ad_soyad,'student'):null);return <button key={s.ogrenci_id} className="student-card student-outline-card" onClick={()=>setSelected(s)}><div className="student-top"><ProfileAvatar name={s.ad_soyad} photoPath={photo} className="avatar student-list-avatar"/><div className="student-name"><strong>{s.ad_soyad}</strong><span>{s.veli_adi?`Veli: ${s.veli_adi}`:'Veli bilgisi yok'}</span></div><span className="soft-pill">{s.durum||'Aktif'}</span></div><div className="student-meta"><span><b>{programs}</b> sabit ders</span><span>{next?<><b>{shortDate(next.tarih)} {time(next.baslangic_saati)}</b> sıradaki</>:<>Sıradaki ders yok</>}</span></div><div className="student-balance"><span>Güncel bakiye</span><b className={debt>0?'danger-text':debt<0?'success-text':''}>{debt>0?`${money(debt)} Borç`:debt<0?`${money(Math.abs(debt))} Avans`:money(0)}</b></div></button>})}{!rows.length&&<div className="calm-empty full-span"><Users/><b>Öğrenci bulunamadı.</b><span>Filtreyi veya arama metnini değiştir.</span></div>}</section>

    <Sheet open={!!selected&&!edit&&!collectionId&&!lessonStudentId&&!assignmentStudentId} title={selected?.ad_soyad||'Öğrenci'} subtitle="Öğrenci profili" onClose={()=>setSelected(null)}>{selected&&<StudentDetail student={selected} onCollection={()=>setCollectionId(selected.ogrenci_id)} onLesson={()=>setLessonStudentId(selected.ogrenci_id)} onAssignment={()=>setAssignmentStudentId(selected.ogrenci_id)} onEdit={()=>{setEdit(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!edit} title="Öğrenciyi Düzenle" subtitle="İletişim ve kayıt bilgileri" onClose={()=>setEdit(null)}>{edit&&<StudentEditPanel student={edit} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={newStudent} title="Yeni Öğrenci" subtitle="Yalnız gerekli bilgileri girin." onClose={()=>setNewStudent(false)}><StudentForm onDone={()=>setNewStudent(false)} onCancel={()=>setNewStudent(false)}/></Sheet>
    <Sheet open={!!collectionId} title="Tahsilat Al" subtitle={collectionId?data.ogrenciler.find(x=>x.ogrenci_id===collectionId)?.ad_soyad:''} onClose={()=>setCollectionId(null)}>{collectionId&&<StudentCollectionForm studentId={collectionId} onDone={()=>setCollectionId(null)} onCancel={()=>setCollectionId(null)}/>}</Sheet>
    <Sheet open={!!lessonStudentId} title="Ders Ekle" subtitle={lessonStudentId?data.ogrenciler.find(x=>x.ogrenci_id===lessonStudentId)?.ad_soyad:''} onClose={()=>setLessonStudentId(null)}>{lessonStudentId&&<LessonForm studentId={lessonStudentId} onDone={()=>setLessonStudentId(null)} onCancel={()=>setLessonStudentId(null)}/>}</Sheet>
    <Sheet open={!!assignmentStudentId} title="Ödev Ekle" subtitle={assignmentStudentId?data.ogrenciler.find(x=>x.ogrenci_id===assignmentStudentId)?.ad_soyad:''} onClose={()=>setAssignmentStudentId(null)}>{assignmentStudentId&&<AssignmentForm studentId={assignmentStudentId} onDone={()=>setAssignmentStudentId(null)} onCancel={()=>setAssignmentStudentId(null)}/>}</Sheet>
  </div>
}
