import { CalendarCheck2, CalendarDays, FileDown, MessageCircle, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { LessonCard } from '../components/LessonCard'
import { LessonDetail } from '../components/LessonDetail'
import { ProgramSharePreview } from '../components/ProgramSharePreview'
import { Sheet } from '../components/Sheet'
import { LessonForm } from '../components/forms'
import { WeekPlanningReviewPanel } from '../components/WeekPlanningReviewPanel'
import type { Ders } from '../lib/types'
import { addDays, mondayOf, shortDate, todayISO } from '../lib/format'
import { isManagerTeacher, teacherTone } from '../lib/teacherTone'
import type { ProgramShareTarget } from '../services/programShareService'
import type { WeekPlanningReview } from '../services/programSuggestionService'
import { createWeek, getWeekCreationStatus, reviewWeekPlanning, type WeekCreationStatus } from '../services/weekPlanningService'
import { openWeeklyProgramPdf } from '../services/weeklyProgramPdfService'
import { useToast } from '../components/Toast'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])
const weekChoices=[
  {offset:-1,label:'Önceki Hafta'},
  {offset:0,label:'Bu Hafta'},
  {offset:1,label:'Gelecek Hafta'},
]

type CalendarFilter={type:'all'}|{type:'teacher';id:string}|{type:'student';id:string}
type WeekStatusState={monday:string;status:WeekCreationStatus}
const serializeFilter=(filter:CalendarFilter)=>filter.type==='all'?'all':`${filter.type}:${filter.id}`
const parseFilter=(value:string|null):CalendarFilter|null=>{
  if(!value)return null
  if(value==='all')return{type:'all'}
  if(value.startsWith('teacher:')&&value.slice(8))return{type:'teacher',id:value.slice(8)}
  if(value.startsWith('student:')&&value.slice(8))return{type:'student',id:value.slice(8)}
  return null
}
const storedWeekOffset=()=>{
  const stored=sessionStorage.getItem('bs-takvim-hafta')
  if(!stored||!/^\d{4}-\d{2}-\d{2}$/.test(stored))return 0
  const base=new Date(`${mondayOf(todayISO())}T12:00:00`).getTime()
  const target=new Date(`${stored}T12:00:00`).getTime()
  return Math.round((target-base)/(7*86400000))
}

export function CalendarPage(){
  const{data,refresh}=useAppData();const{toast}=useToast();const[params]=useSearchParams();const nav=useNavigate()
  const[filter,setFilter]=useState<CalendarFilter>(()=>{
    const studentParam=params.get('ogrenci')
    if(studentParam)return{type:'student',id:studentParam}
    const teacherParam=params.get('ogretmen')
    if(teacherParam&&teacherParam!=='tum')return{type:'teacher',id:teacherParam}
    if(teacherParam==='tum')return{type:'all'}
    const stored=parseFilter(sessionStorage.getItem('bs-takvim-kisi'))
    if(stored)return stored
    const oldTeacher=sessionStorage.getItem('bs-takvim-ogretmen')
    return oldTeacher&&oldTeacher!=='tum'?{type:'teacher',id:oldTeacher}:{type:'all'}
  })
  const[weekOffset,setWeekOffset]=useState(storedWeekOffset);const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null);const[newLesson,setNewLesson]=useState(false);const[shareOpen,setShareOpen]=useState(false);const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<WeekStatusState|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)
  const baseMonday=mondayOf(todayISO());const monday=addDays(baseMonday,weekOffset*7);const end=addDays(monday,7)
  const isPastWeek=weekOffset<0;const isCurrentWeek=weekOffset===0
  const readWeekStatus=useCallback(async():Promise<WeekStatusState>=>({monday,status:await getWeekCreationStatus(monday)}),[monday])
  const lessons=useMemo(()=>{if(!data)return[];return data.dersler.filter(x=>(filter.type==='all'||(filter.type==='teacher'&&x.ogretmen_id===filter.id)||(filter.type==='student'&&x.ogrenci_id===filter.id))&&(x.tarih||'')>=monday&&(x.tarih||'')<end).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,filter,monday,end])
  const visibleLessons=useMemo(()=>lessons.filter(x=>!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))),[lessons])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-kisi',serializeFilter(filter));sessionStorage.setItem('bs-takvim-ogretmen',filter.type==='teacher'?filter.id:'tum')},[filter])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-hafta',monday)},[monday])
  useEffect(()=>{let active=true;setWeekStatusBusy(true);void readWeekStatus().then(status=>{if(active)setWeekStatus(status)}).catch(()=>{if(active)setWeekStatus(null)}).finally(()=>{if(active)setWeekStatusBusy(false)});return()=>{active=false}},[readWeekStatus])
  if(!data)return null
  const activeTeachers=data.ogretmenler.filter(x=>x.durum!=='Pasif')
  const activeStudents=data.ogrenciler.filter(x=>x.durum!=='Pasif').sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))
  const managerTeachers=activeTeachers.filter(x=>isManagerTeacher(x.ad_soyad)).sort((a,b)=>teacherTone(a.ad_soyad)==='teacher-pink'?-1:teacherTone(b.ad_soyad)==='teacher-pink'?1:0)
  const otherTeachers=activeTeachers.filter(x=>!isManagerTeacher(x.ad_soyad)).sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))
  const selectedOtherTeacher=filter.type==='teacher'&&otherTeachers.some(x=>x.ogretmen_id===filter.id)?filter.id:''
  const selectedStudent=filter.type==='student'&&activeStudents.some(x=>x.ogrenci_id===filter.id)?filter.id:''
  const shareTarget:ProgramShareTarget|null=filter.type==='teacher'?{type:'teacher',id:filter.id}:filter.type==='student'?{type:'student',id:filter.id}:null
  const weekProgramCount=visibleLessons.filter(x=>x.program_id).length
  const visibleDays=Array.from({length:7},(_,i)=>{const date=addDays(monday,i);return{date,dayName:dayNames[i],items:visibleLessons.filter(x=>x.tarih===date)}}).filter(x=>x.items.length>0)
  const activeWeekStatus=weekStatus?.monday===monday?weekStatus.status:null
  const weekReady=Boolean(activeWeekStatus?.calisti)
  const weekActionText=isPastWeek?'Geçmiş Hafta':weekBusy||weekStatusBusy?'Kontrol ediliyor…':weekReady?'Hafta Hazır':'Haftayı Hazırla'
  const filterLabel=filter.type==='all'?'Tüm Öğretmenler':filter.type==='teacher'?activeTeachers.find(x=>x.ogretmen_id===filter.id)?.ad_soyad||'Öğretmen':activeStudents.find(x=>x.ogrenci_id===filter.id)?.ad_soyad||'Öğrenci'
  const chooseFilter=(next:CalendarFilter)=>{setFilter(next);setShareOpen(false)}

  const confirmWeekCreation=()=>{
    const currentSafety=isCurrentWeek?'\n\nBugünden önceki veya saati geçmiş dersler değiştirilmez.':''
    return window.confirm(`${shortDate(monday)} – ${shortDate(addDays(monday,6))} haftası hazırlansın mı?\n\nTüm aktif sabit programlar işlenir. Daha önce oluşturulmamış dersler eklenir; sabit programda günü, saati, dersliği veya temel bilgileri değişmiş henüz sonuçlanmamış dersler güncellenir. Yapıldı, İptal ve tek seferlik değişiklikler korunur.${currentSafety}`)
  }
  const resultToast=(r:{olusturulan?:number;guncellenen?:number})=>{
    const created=Number(r.olusturulan||0),updated=Number(r.guncellenen||0)
    if(created===0&&updated===0){toast('Hafta zaten güncel. Yeni ders oluşturulmadı veya güncellenmedi.');return}
    toast(`${created} ders oluşturuldu, ${updated} ders güncellendi. Hafta hazır.`)
  }
  const createWeekNow=async()=>{
    setWeekBusy(true)
    try{
      if(isPastWeek){toast('Geçmiş haftalar hazırlanamaz.');return}
      const status=await readWeekStatus();setWeekStatus(status)
      if(status.status.calisti){setWeekReview(null);toast('Seçilen hafta zaten hazır.');return}
      if(!confirmWeekCreation())return
      const r=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);resultToast(r)
    }catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}
  }
  const prepareWeek=async()=>{
    setWeekBusy(true)
    try{
      if(isPastWeek){toast('Geçmiş haftalar hazırlanamaz.');return}
      const status=await readWeekStatus();setWeekStatus(status)
      if(status.status.calisti){toast('Seçilen hafta zaten hazır.');return}
      const review=await reviewWeekPlanning(monday)
      if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}
      if(!confirmWeekCreation())return
      const r=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());resultToast(r)
    }catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}
  }
  const openWeekPdf=async()=>{if(!lessons.length){toast('Seçili programda PDF oluşturulacak ders yok.','error');return}try{await openWeeklyProgramPdf(data,lessons,monday,addDays(monday,6),filterLabel)}catch(e:any){toast(e?.message||'PDF oluşturulamadı.','error')}}

  return <div className="page-stack calendar-v2">
    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Program</h1></div></div></section>

    <section className="week-context-row" aria-label="Program hafta komutları" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',alignItems:'center',gap:10}}>
      <button className="calendar-mode-btn" type="button" style={{justifySelf:'start'}} onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button>
      <div className="week-range" style={{justifySelf:'center'}}><b>{shortDate(monday)} – {shortDate(addDays(monday,6))}</b></div>
      <button className="primary-btn calendar-title-week-action" style={{justifySelf:'end',maxWidth:'none'}} disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button>
    </section>
    <section className="week-switcher" aria-label="Hafta seçimi">
      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>{setWeekOffset(x.offset);setWeekReview(null);setShareOpen(false)}}>{x.label}</button>)}
    </section>

    <section className="teacher-filter-wrap">
      <div className="teacher-manager-grid" aria-label="Yönetici öğretmenler">
        {managerTeachers.map(x=><button key={x.ogretmen_id} className={`teacher-chip teacher-manager-chip ${teacherTone(x.ad_soyad)} ${filter.type==='teacher'&&filter.id===x.ogretmen_id?'active':''}`} onClick={()=>chooseFilter({type:'teacher',id:x.ogretmen_id})}><span>{x.ad_soyad}</span><small>Yönetici</small></button>)}
      </div>
      <div className="teacher-secondary-compact" aria-label="Takvim kişi filtreleri">
        <button className={`teacher-chip teacher-small-chip teacher-all ${filter.type==='all'?'active':''}`} onClick={()=>chooseFilter({type:'all'})}>Tümü</button>
        <label className={`teacher-other-picker simple-picker ${selectedOtherTeacher?'active':''}`}>
          <select aria-label="Öğretmen seç" value={selectedOtherTeacher} onChange={e=>chooseFilter(e.target.value?{type:'teacher',id:e.target.value}:{type:'all'})}>
            <option value="">Öğretmen seç</option>
            {otherTeachers.map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}
          </select>
        </label>
        <label className={`teacher-other-picker simple-picker student-picker ${selectedStudent?'active':''}`}>
          <select aria-label="Öğrenci seç" value={selectedStudent} onChange={e=>chooseFilter(e.target.value?{type:'student',id:e.target.value}:{type:'all'})}>
            <option value="">Öğrenci seç</option>
            {activeStudents.map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="calendar-command-bar">
      <div className="calendar-command-summary"><div className="calendar-command-heading"><b>{filterLabel}</b><button className="secondary-btn calendar-pdf-btn" disabled={!lessons.length} onClick={()=>void openWeekPdf()} title="Seçili programı PDF olarak al"><FileDown size={16}/>PDF Al</button></div><span>{visibleLessons.length} ders · {weekProgramCount} sabit program dersi</span></div>
      <div><button className="secondary-btn" onClick={()=>setNewLesson(true)}><Plus size={17}/>Ders Ekle</button><button className="secondary-btn calendar-share-btn" disabled={!shareTarget||!visibleLessons.length} onClick={()=>setShareOpen(true)}><MessageCircle size={17}/>Program Gönder</button></div>
    </section>

    <section className="week-agenda">
      {visibleDays.length?visibleDays.map(({date,dayName,items})=>{const isToday=date===todayISO();return <div className={`agenda-day ${isToday?'today':''}`} key={date}>
        <header><div><b>{dayName}</b>{isToday&&<span className="today-pill">Bugün</span>}</div><span>{shortDate(date)} · {items.length} ders</span></header>
        <div className="agenda-lessons">{items.map(x=><LessonCard key={x.ders_id} lesson={x} onClick={()=>setSelected(x)}/>)}</div>
      </div>}):<div className="calm-empty calendar-empty-week"><CalendarDays/><b>Bu haftada ders yok.</b><span>Başka bir hafta, öğretmen veya öğrenci seçebilirsin.</span></div>}
    </section>

    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Sonuç ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Çakışma otomatik kontrol edilir." onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
    <Sheet open={newLesson} title="Ders Ekle" subtitle="Öğrenci, öğretmen ve derslik uygunluğu otomatik kontrol edilir." onClose={()=>setNewLesson(false)}><LessonForm onDone={()=>setNewLesson(false)} onCancel={()=>setNewLesson(false)}/></Sheet>
    <Sheet open={shareOpen&&!!shareTarget} title="Program Gönder" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,6))}`} onClose={()=>setShareOpen(false)}>{shareTarget&&<ProgramSharePreview target={shareTarget} lessons={visibleLessons} monday={monday} sunday={addDays(monday,6)} onClose={()=>setShareOpen(false)}/>}</Sheet>
    <Sheet open={!!weekReview} title="Haftalık Program Kontrolü" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,6))} · yalnız seçilen hafta`} onClose={()=>setWeekReview(null)}>{weekReview&&<WeekPlanningReviewPanel review={weekReview} onChange={setWeekReview} onClose={()=>setWeekReview(null)} onCreate={()=>void createWeekNow()}/>}</Sheet>
  </div>
}