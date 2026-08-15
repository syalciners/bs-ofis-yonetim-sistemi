import { CalendarCheck2, CalendarDays, CalendarPlus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { LessonCard } from '../components/LessonCard'
import { LessonDetail } from '../components/LessonDetail'
import { Sheet } from '../components/Sheet'
import { LessonForm } from '../components/forms'
import { WeekPlanningReviewPanel } from '../components/WeekPlanningReviewPanel'
import type { Ders } from '../lib/types'
import { addDays, mondayOf, shortDate, todayISO } from '../lib/format'
import { isManagerTeacher, teacherTone } from '../lib/teacherTone'
import { createWeek, getWeekCreationStatus, type WeekCreationStatus } from '../services/officeService'
import { reviewWeekPlanning, type WeekPlanningReview } from '../services/programSuggestionService'
import { useToast } from '../components/Toast'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const weekChoices=[
  {offset:-1,label:'Önceki Hafta'},
  {offset:0,label:'Bu Hafta'},
  {offset:1,label:'Gelecek Hafta'},
]

type TwoWeekCreationStatus={monday:string;selected:WeekCreationStatus;next:WeekCreationStatus}
const allWeeksAreReady=(status:TwoWeekCreationStatus)=>status.selected.calisti&&status.next.calisti

export function CalendarPage(){
  const {data,refresh}=useAppData();const{toast}=useToast();const[params]=useSearchParams()
  const initialTeacher=params.get('ogretmen')||sessionStorage.getItem('bs-takvim-ogretmen')||'tum'
  const[weekOffset,setWeekOffset]=useState(0);const[teacher,setTeacher]=useState(initialTeacher);const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null);const[newLesson,setNewLesson]=useState(false);const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<TwoWeekCreationStatus|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)
  const baseMonday=mondayOf(todayISO());const monday=addDays(baseMonday,weekOffset*7);const end=addDays(monday,7)
  const readWeekStatus=useCallback(async():Promise<TwoWeekCreationStatus>=>{const[selectedStatus,nextStatus]=await Promise.all([getWeekCreationStatus(monday),getWeekCreationStatus(addDays(monday,7))]);return{monday,selected:selectedStatus,next:nextStatus}},[monday])
  const lessons=useMemo(()=>{if(!data)return[];return data.dersler.filter(x=>(teacher==='tum'||x.ogretmen_id===teacher)&&(x.tarih||'')>=monday&&(x.tarih||'')<end).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,teacher,monday,end])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-ogretmen',teacher)},[teacher])
  useEffect(()=>{let active=true;setWeekStatusBusy(true);void readWeekStatus().then(status=>{if(active)setWeekStatus(status)}).catch(()=>{if(active)setWeekStatus(null)}).finally(()=>{if(active)setWeekStatusBusy(false)});return()=>{active=false}},[readWeekStatus])
  if(!data)return null
  const activeTeachers=data.ogretmenler.filter(x=>x.durum!=='Pasif')
  const managerTeachers=activeTeachers.filter(x=>isManagerTeacher(x.ad_soyad)).sort((a,b)=>teacherTone(a.ad_soyad)==='teacher-pink'?-1:teacherTone(b.ad_soyad)==='teacher-pink'?1:0)
  const otherTeachers=activeTeachers.filter(x=>!isManagerTeacher(x.ad_soyad)).sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr-TR'))
  const selectedOtherTeacher=otherTeachers.some(x=>x.ogretmen_id===teacher)?teacher:''
  const weekProgramCount=lessons.filter(x=>x.program_id).length
  const visibleDays=Array.from({length:7},(_,i)=>{const date=addDays(monday,i);return{date,dayName:dayNames[i],items:lessons.filter(x=>x.tarih===date)}}).filter(x=>x.items.length>0)
  const activeWeekStatus=weekStatus?.monday===monday?weekStatus:null
  const allWeeksReady=activeWeekStatus?allWeeksAreReady(activeWeekStatus):false
  const weekActionText=weekBusy||weekStatusBusy?'Kontrol ediliyor…':allWeeksReady?'Haftalar Hazır':activeWeekStatus?.selected.calisti&&!activeWeekStatus.next.calisti?'Sonraki Haftayı Hazırla':activeWeekStatus&&!activeWeekStatus.selected.calisti&&activeWeekStatus.next.calisti?'Bu Haftayı Hazırla':activeWeekStatus?'İki Haftayı Hazırla':'Haftayı Oluştur'

  const confirmWeekCreation=(status:TwoWeekCreationStatus)=>{const ranges=[!status.selected.calisti?`${shortDate(monday)} – ${shortDate(addDays(monday,6))}`:null,!status.next.calisti?`${shortDate(addDays(monday,7))} – ${shortDate(addDays(monday,13))}`:null].filter((x):x is string=>Boolean(x));if(!ranges.length)return false;const scope=ranges.length===1?`${ranges[0]} haftasının`:`${ranges.join(' ve ')} haftalarının`;return window.confirm(`${scope} eksik dersleri oluşturulsun mu?\n\nÖğretmen filtresinden bağımsız olarak tüm aktif sabit programlar işlenir. Hazır haftalar yeniden işlenmez; mevcut dersler korunur.`)}

  const createWeekNow=async()=>{setWeekBusy(true);try{const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){setWeekReview(null);toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);toast(r?.olusturulan!==undefined?`${r.olusturulan} ders oluşturuldu. Haftalar hazır.`:'Haftalar hazırlandı.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
  const prepareWeek=async()=>{setWeekBusy(true);try{const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}const review=await reviewWeekPlanning(monday);if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());toast(r?.olusturulan!==undefined?`${r.olusturulan} ders oluşturuldu. Haftalar hazır.`:'Haftalar hazırlandı.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}

  return <div className="page-stack calendar-v2">
    <section className="page-title-row"><div><span className="eyebrow">DERS PROGRAMI</span><h1>Takvim</h1><p>Haftayı seç, öğretmeni filtrele, dersi yönet.</p></div><button className="primary-btn desktop-only" onClick={()=>setNewLesson(true)}><CalendarPlus size={17}/>Ders Ekle</button></section>

    <section className="week-switcher" aria-label="Hafta seçimi">
      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>{setWeekOffset(x.offset);setWeekReview(null)}}>{x.label}</button>)}
    </section>
    <div className="week-range"><CalendarDays size={16}/><b>{shortDate(monday)} – {shortDate(addDays(monday,6))}</b></div>

    <section className="teacher-filter-wrap">
      <div className="teacher-manager-grid" aria-label="Yönetici öğretmenler">
        {managerTeachers.map(x=><button key={x.ogretmen_id} className={`teacher-chip teacher-manager-chip ${teacherTone(x.ad_soyad)} ${teacher===x.ogretmen_id?'active':''}`} onClick={()=>setTeacher(x.ogretmen_id)}><span>{x.ad_soyad}</span><small>Yönetici</small></button>)}
      </div>
      <div className="teacher-secondary-compact" aria-label="Diğer öğretmenler">
        <button className={`teacher-chip teacher-small-chip teacher-all ${teacher==='tum'?'active':''}`} onClick={()=>setTeacher('tum')}>Tümü</button>
        <label className={`teacher-other-picker ${selectedOtherTeacher?'active':''}`}>
          <span>Diğer Öğretmenler</span>
          <select aria-label="Diğer öğretmen seç" value={selectedOtherTeacher} onChange={e=>setTeacher(e.target.value||'tum')}>
            <option value="">Öğretmen seç</option>
            {otherTeachers.map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="calendar-command-bar">
      <div><b>{teacher==='tum'?'Tüm Öğretmenler':activeTeachers.find(x=>x.ogretmen_id===teacher)?.ad_soyad||'Öğretmen'}</b><span>{lessons.length} ders · {weekProgramCount} sabit program dersi</span></div>
      <div><button className="secondary-btn" onClick={()=>setNewLesson(true)}><Plus size={17}/>Ders Ekle</button><button className="primary-btn" disabled={weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div>
    </section>

    <section className="week-agenda">
      {visibleDays.length?visibleDays.map(({date,dayName,items})=>{const isToday=date===todayISO();return <div className={`agenda-day ${isToday?'today':''}`} key={date}>
        <header><div><b>{dayName}</b>{isToday&&<span className="today-pill">Bugün</span>}</div><span>{shortDate(date)} · {items.length} ders</span></header>
        <div className="agenda-lessons">{items.map(x=><LessonCard key={x.ders_id} lesson={x} onClick={()=>setSelected(x)}/>)}</div>
      </div>}):<div className="calm-empty calendar-empty-week"><CalendarDays/><b>Bu haftada ders yok.</b><span>Başka bir hafta veya öğretmen seçebilirsin.</span></div>}
    </section>

    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Sonuç ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Çakışma otomatik kontrol edilir." onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
    <Sheet open={newLesson} title="Tek Seferlik Ders" subtitle="Sabit programı değiştirmez." onClose={()=>setNewLesson(false)}><LessonForm onDone={()=>setNewLesson(false)} onCancel={()=>setNewLesson(false)}/></Sheet>
    <Sheet open={!!weekReview} title="Haftalık Program Kontrolü" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,13))} · iki hafta birlikte kontrol edilir`} onClose={()=>setWeekReview(null)}>{weekReview&&<WeekPlanningReviewPanel review={weekReview} onChange={setWeekReview} onClose={()=>setWeekReview(null)} onCreate={()=>void createWeekNow()}/>}</Sheet>
  </div>
}
