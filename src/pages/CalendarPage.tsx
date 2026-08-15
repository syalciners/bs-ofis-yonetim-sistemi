import { CalendarCheck2, CalendarDays, Plus, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { createWeek, getWeekCreationStatus, type WeekCreationStatus } from '../services/officeService'
import { reviewWeekPlanning, type WeekPlanningReview } from '../services/programSuggestionService'
import type { ProgramShareTarget } from '../services/programShareService'
import { useToast } from '../components/Toast'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const weekChoices=[
  {offset:-1,label:'Önceki Hafta'},
  {offset:0,label:'Bu Hafta'},
  {offset:1,label:'Gelecek Hafta'},
]

type TwoWeekCreationStatus={monday:string;selected:WeekCreationStatus;next:WeekCreationStatus}
type CalendarFilter={type:'all'}|{type:'teacher';id:string}|{type:'student';id:string}
const allWeeksAreReady=(status:TwoWeekCreationStatus)=>status.selected.calisti&&status.next.calisti
const serializeFilter=(filter:CalendarFilter)=>filter.type==='all'?'all':`${filter.type}:${filter.id}`
const parseFilter=(value:string|null):CalendarFilter|null=>{
  if(!value)return null
  if(value==='all')return{type:'all'}
  if(value.startsWith('teacher:')&&value.slice(8))return{type:'teacher',id:value.slice(8)}
  if(value.startsWith('student:')&&value.slice(8))return{type:'student',id:value.slice(8)}
  return null
}

export function CalendarPage(){
  const {data,refresh}=useAppData();const{toast}=useToast();const[params]=useSearchParams()
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
  const[weekOffset,setWeekOffset]=useState(0);const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null);const[newLesson,setNewLesson]=useState(false);const[shareOpen,setShareOpen]=useState(false);const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<TwoWeekCreationStatus|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)
  const baseMonday=mondayOf(todayISO());const monday=addDays(baseMonday,weekOffset*7);const end=addDays(monday,7);const sunday=addDays(monday,6)
  const readWeekStatus=useCallback(async():Promise<TwoWeekCreationStatus>=>{const[selectedStatus,nextStatus]=await Promise.all([getWeekCreationStatus(monday),getWeekCreationStatus(addDays(monday,7))]);return{monday,selected:selectedStatus,next:nextStatus}},[monday])
  const lessons=useMemo(()=>{if(!data)return[];return data.dersler.filter(x=>(filter.type==='all'||(filter.type==='teacher'&&x.ogretmen_id===filter.id)||(filter.type==='student'&&x.ogrenci_id===filter.id))&&(x.tarih||'')>=monday&&(x.tarih||'')<end).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,filter,monday,end])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-kisi',serializeFilter(filter));sessionStorage.setItem('bs-takvim-ogretmen',filter.type==='teacher'?filter.id:'tum')},[filter])
  useEffect(()=>{let active=true;setWeekStatusBusy(true);void readWeekStatus().then(status=>{if(active)setWeekStatus(status)}).catch(()=>{if(active)setWeekStatus(null)}).finally(()=>{if(active)setWeekStatusBusy(false)});return()=>{active=false}},[readWeekStatus])
  if(!data)return null
  const activeTeachers=data.ogretmenler.filter(x=>x.durum!=='Pasif').sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))
  const activeStudents=data.ogrenciler.filter(x=>x.durum!=='Pasif').sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))
  const managerTeachers=activeTeachers.filter(x=>isManagerTeacher(x.ad_soyad)).sort((a,b)=>teacherTone(a.ad_soyad)==='teacher-pink'?-1:teacherTone(b.ad_soyad)==='teacher-pink'?1:0)
  const selectedTeacher=filter.type==='teacher'&&activeTeachers.some(x=>x.ogretmen_id===filter.id)?filter.id:''
  const selectedStudent=filter.type==='student'&&activeStudents.some(x=>x.ogrenci_id===filter.id)?filter.id:''
  const weekProgramCount=lessons.filter(x=>x.program_id).length
  const visibleDays=Array.from({length:7},(_,i)=>{const date=addDays(monday,i);return{date,dayName:dayNames[i],items:lessons.filter(x=>x.tarih===date)}}).filter(x=>x.items.length>0)
  const activeWeekStatus=weekStatus?.monday===monday?weekStatus:null
  const allWeeksReady=activeWeekStatus?allWeeksAreReady(activeWeekStatus):false
  const weekActionText=weekBusy||weekStatusBusy?'Kontrol ediliyor…':allWeeksReady?'Haftalar Hazır':activeWeekStatus?.selected.calisti&&!activeWeekStatus.next.calisti?'Sonraki Haftayı Hazırla':activeWeekStatus&&!activeWeekStatus.selected.calisti&&activeWeekStatus.next.calisti?'Bu Haftayı Hazırla':activeWeekStatus?'İki Haftayı Hazırla':'Haftayı Oluştur'
  const filterLabel=filter.type==='all'?'Tüm Program':filter.type==='teacher'?(activeTeachers.find(x=>x.ogretmen_id===filter.id)?.ad_soyad||'Öğretmen'):(activeStudents.find(x=>x.ogrenci_id===filter.id)?.ad_soyad||'Öğrenci')
  const shareTarget:ProgramShareTarget|null=filter.type==='all'?null:{type:filter.type,id:filter.id}
  const chooseFilter=(next:CalendarFilter)=>{setFilter(next);setShareOpen(false)}
  const emptyHint='Başka bir hafta, öğretmen veya öğrenci seçebilirsin.'

  const confirmWeekCreation=(status:TwoWeekCreationStatus)=>{const ranges=[!status.selected.calisti?`${shortDate(monday)} – ${shortDate(addDays(monday,6))}`:null,!status.next.calisti?`${shortDate(addDays(monday,7))} – ${shortDate(addDays(monday,13))}`:null].filter((x):x is string=>Boolean(x));if(!ranges.length)return false;const scope=ranges.length===1?`${ranges[0]} haftasının`:`${ranges.join(' ve ')} haftalarının`;return window.confirm(`${scope} eksik dersleri oluşturulsun mu?\n\nTakvim kişi filtresinden bağımsız olarak tüm aktif sabit programlar işlenir. Hazır haftalar yeniden işlenmez; mevcut dersler korunur.`)}

  const createWeekNow=async()=>{setWeekBusy(true);try{const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){setWeekReview(null);toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);toast(r?.olusturulan!==undefined?`${r.olusturulan} ders oluşturuldu. Haftalar hazır.`:'Haftalar hazırlandı.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
  const prepareWeek=async()=>{setWeekBusy(true);try{const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}const review=await reviewWeekPlanning(monday);if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());toast(r?.olusturulan!==undefined?`${r.olusturulan} ders oluşturuldu. Haftalar hazır.`:'Haftalar hazırlandı.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}

  return <div className="page-stack calendar-v2">
    <section className="page-title-row calendar-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Takvim</h1><button className="primary-btn calendar-week-action calendar-title-week-action" disabled={weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div><p>Haftayı seç, öğretmen veya öğrenciyi filtrele, programı yönet.</p></div></section>

    <section className="week-switcher" aria-label="Hafta seçimi">
      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>{setWeekOffset(x.offset);setWeekReview(null);setShareOpen(false)}}>{x.label}</button>)}
    </section>

    <section className="calendar-person-filter" aria-label="Takvim kişi filtresi">
      <div className="calendar-manager-quick" aria-label="Hızlı öğretmen seçimi">
        {managerTeachers.map(x=>{const active=filter.type==='teacher'&&filter.id===x.ogretmen_id;return <button key={x.ogretmen_id} className={`calendar-quick-teacher ${teacherTone(x.ad_soyad)} ${active?'active':''}`} onClick={()=>chooseFilter(active?{type:'all'}:{type:'teacher',id:x.ogretmen_id})}>{x.ad_soyad}</button>})}
      </div>
      <div className="calendar-person-selectors">
        <label className={`calendar-person-picker teacher-person-picker ${selectedTeacher?'active':''}`}>
          <span>Öğretmen</span>
          <select aria-label="Öğretmen seç" value={selectedTeacher} onChange={e=>chooseFilter(e.target.value?{type:'teacher',id:e.target.value}:{type:'all'})}>
            <option value="">Öğretmen seç</option>
            {activeTeachers.map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}
          </select>
        </label>
        <label className={`calendar-person-picker student-person-picker ${selectedStudent?'active':''}`}>
          <span>Öğrenci</span>
          <select aria-label="Öğrenci seç" value={selectedStudent} onChange={e=>chooseFilter(e.target.value?{type:'student',id:e.target.value}:{type:'all'})}>
            <option value="">Öğrenci seç</option>
            {activeStudents.map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="calendar-command-bar">
      <div className="calendar-command-summary"><div className="calendar-command-title"><b>{filterLabel}</b><span className="calendar-command-date"><CalendarDays size={14}/>{shortDate(monday)} – {shortDate(sunday)}</span></div><span>{lessons.length} ders · {weekProgramCount} sabit program dersi</span></div>
      <div><button className="secondary-btn" onClick={()=>setNewLesson(true)}><Plus size={17}/>Ders Ekle</button><button className="secondary-btn calendar-share-btn" disabled={!shareTarget||!lessons.length} onClick={()=>setShareOpen(true)}><Send size={17}/>Program Gönder</button></div>
    </section>

    <section className="week-agenda">
      {visibleDays.length?visibleDays.map(({date,dayName,items})=>{const isToday=date===todayISO();return <div className={`agenda-day ${isToday?'today':''}`} key={date}>
        <header><div><b>{dayName}</b>{isToday&&<span className="today-pill">Bugün</span>}</div><span>{shortDate(date)} · {items.length} ders</span></header>
        <div className="agenda-lessons">{items.map(x=><LessonCard key={x.ders_id} lesson={x} onClick={()=>setSelected(x)}/>)}</div>
      </div>}):<div className="calm-empty calendar-empty-week"><CalendarDays/><b>Bu haftada ders yok.</b><span>{emptyHint}</span></div>}
    </section>

    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Sonuç ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Çakışma otomatik kontrol edilir." onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
    <Sheet open={newLesson} title="Tek Seferlik Ders" subtitle="Sabit programı değiştirmez." onClose={()=>setNewLesson(false)}><LessonForm onDone={()=>setNewLesson(false)} onCancel={()=>setNewLesson(false)}/></Sheet>
    <Sheet open={shareOpen&&!!shareTarget} title="Program Gönder" subtitle={`${filterLabel} · ${shortDate(monday)} – ${shortDate(sunday)}`} onClose={()=>setShareOpen(false)}>{shareOpen&&shareTarget&&<ProgramSharePreview target={shareTarget} lessons={lessons} monday={monday} sunday={sunday} onClose={()=>setShareOpen(false)}/>}</Sheet>
    <Sheet open={!!weekReview} title="Haftalık Program Kontrolü" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,13))} · iki hafta birlikte kontrol edilir`} onClose={()=>setWeekReview(null)}>{weekReview&&<WeekPlanningReviewPanel review={weekReview} onChange={setWeekReview} onClose={()=>setWeekReview(null)} onCreate={()=>void createWeekNow()}/>}</Sheet>
  </div>
}
