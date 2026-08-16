import { CalendarCheck2, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { LessonDetail } from '../components/LessonDetail'
import { Sheet } from '../components/Sheet'
import { LessonForm } from '../components/forms'
import { WeekPlanningReviewPanel } from '../components/WeekPlanningReviewPanel'
import { useToast } from '../components/Toast'
import type { Ders } from '../lib/types'
import { addDays, mondayOf, shortDate, todayISO } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import type { WeekPlanningReview } from '../services/programSuggestionService'
import { createWeek, getWeekCreationStatus, reviewWeekPlanning, type WeekCreationStatus } from '../services/weekPlanningService'

const days=[
  {short:'Pzt',long:'Pazartesi'},
  {short:'Sal',long:'Salı'},
  {short:'Çar',long:'Çarşamba'},
  {short:'Per',long:'Perşembe'},
  {short:'Cum',long:'Cuma'},
  {short:'Cmt',long:'Cumartesi'},
  {short:'Paz',long:'Pazar'},
]
const SLOT_MINUTES=30
const SLOT_HEIGHT=48
const DEFAULT_START=8*60
const DEFAULT_END=21*60

type TwoWeekCreationStatus={monday:string;selected:WeekCreationStatus;next:WeekCreationStatus}
type QuickSlot={date:string;time:string}
type PlacedLesson={lesson:Ders;start:number;end:number;lane:number;laneCount:number}

const allWeeksAreReady=(status:TwoWeekCreationStatus)=>status.selected.calisti&&status.next.calisti
const timeToMinutes=(value?:string|null)=>{
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/)
  if(!match)return null
  const hour=Number(match[1]);const minute=Number(match[2])
  if(!Number.isFinite(hour)||!Number.isFinite(minute))return null
  return hour*60+minute
}
const minutesToTime=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
const lessonEndMinutes=(lesson:Ders,start:number)=>timeToMinutes(lesson.bitis_saati)??start+Math.max(Number(lesson.ders_sayisi||1),1)*60
const weekTitle=(monday:string)=>{
  const sunday=addDays(monday,6)
  const left=new Date(`${monday}T12:00:00`)
  const right=new Date(`${sunday}T12:00:00`)
  const leftDay=left.toLocaleDateString('tr-TR',{day:'numeric'})
  const rightFull=right.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})
  if(left.getMonth()===right.getMonth()&&left.getFullYear()===right.getFullYear())return `${leftDay} – ${rightFull}`
  const leftFull=left.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:left.getFullYear()===right.getFullYear()?undefined:'numeric'})
  return `${leftFull} – ${rightFull}`
}
const dayTitle=(date:string,index:number)=>`${days[index].long} · ${new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}`

function placeLessons(lessons:Ders[]):PlacedLesson[]{
  const timed=lessons.map(lesson=>{
    const start=timeToMinutes(lesson.baslangic_saati)
    if(start==null)return null
    return{lesson,start,end:Math.max(lessonEndMinutes(lesson,start),start+SLOT_MINUTES)}
  }).filter((x):x is {lesson:Ders;start:number;end:number}=>Boolean(x)).sort((a,b)=>a.start-b.start||a.end-b.end)
  const placed:PlacedLesson[]=[]
  let cluster:{lesson:Ders;start:number;end:number;lane:number}[]=[]
  let clusterEnd=-1
  const flush=()=>{
    if(!cluster.length)return
    const laneCount=Math.max(...cluster.map(x=>x.lane))+1
    cluster.forEach(x=>placed.push({...x,laneCount}))
    cluster=[];clusterEnd=-1
  }
  for(const item of timed){
    if(cluster.length&&item.start>=clusterEnd)flush()
    const laneEnds:number[]=[]
    cluster.forEach(x=>{laneEnds[x.lane]=Math.max(laneEnds[x.lane]??-1,x.end)})
    let lane=0
    while((laneEnds[lane]??-1)>item.start)lane+=1
    cluster.push({...item,lane})
    clusterEnd=Math.max(clusterEnd,item.end)
  }
  flush()
  return placed
}

export function DailyCalendarPage(){
  const{data,refresh}=useAppData();const{toast}=useToast();const nav=useNavigate()
  const baseMonday=mondayOf(todayISO())
  const[monday,setMonday]=useState(()=>{const stored=sessionStorage.getItem('bs-takvim-hafta');return stored&&/^\d{4}-\d{2}-\d{2}$/.test(stored)?stored:baseMonday})
  const[selectedDate,setSelectedDate]=useState(()=>todayISO())
  const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null);const[quickSlot,setQuickSlot]=useState<QuickSlot|null>(null)
  const quickFormHost=useRef<HTMLDivElement|null>(null)
  const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<TwoWeekCreationStatus|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)
  const isPastWeek=monday<baseMonday;const isCurrentWeek=monday===baseMonday
  const readWeekStatus=useCallback(async():Promise<TwoWeekCreationStatus>=>{const[selectedStatus,nextStatus]=await Promise.all([getWeekCreationStatus(monday),getWeekCreationStatus(addDays(monday,7))]);return{monday,selected:selectedStatus,next:nextStatus}},[monday])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-hafta',monday);const today=todayISO();setSelectedDate(today>=monday&&today<=addDays(monday,6)?today:monday)},[monday])
  useEffect(()=>{let active=true;setWeekStatusBusy(true);void readWeekStatus().then(status=>{if(active)setWeekStatus(status)}).catch(()=>{if(active)setWeekStatus(null)}).finally(()=>{if(active)setWeekStatusBusy(false)});return()=>{active=false}},[readWeekStatus])
  useEffect(()=>{if(!quickSlot)return;const frame=requestAnimationFrame(()=>{const root=quickFormHost.current;const dateInput=root?.querySelector<HTMLInputElement>('input[name="tarih"]');const timeInput=root?.querySelector<HTMLInputElement>('input[name="baslangic_saati"]');if(dateInput)dateInput.value=quickSlot.date;if(timeInput)timeInput.value=quickSlot.time});return()=>cancelAnimationFrame(frame)},[quickSlot])
  const activeWeekStatus=weekStatus?.monday===monday?weekStatus:null
  const allWeeksReady=activeWeekStatus?allWeeksAreReady(activeWeekStatus):false
  const selectedWeekReady=Boolean(activeWeekStatus?.selected.calisti);const nextWeekReady=Boolean(activeWeekStatus?.next.calisti)
  const weekActionText=isPastWeek?'Geçmiş Hafta':weekBusy||weekStatusBusy?'Kontrol ediliyor…':allWeeksReady?'Haftalar Hazır':isCurrentWeek&&!selectedWeekReady?'Eksik Dersleri Tamamla':selectedWeekReady&&!nextWeekReady?'Sonraki Haftayı Hazırla':!selectedWeekReady&&nextWeekReady?'Haftayı Oluştur':activeWeekStatus?'İki Haftayı Hazırla':'Haftayı Oluştur'
  const confirmWeekCreation=(status:TwoWeekCreationStatus)=>{const ranges=[!status.selected.calisti?`${shortDate(monday)} – ${shortDate(addDays(monday,6))}`:null,!status.next.calisti?`${shortDate(addDays(monday,7))} – ${shortDate(addDays(monday,13))}`:null].filter((x):x is string=>Boolean(x));if(!ranges.length)return false;const scope=ranges.length===1?`${ranges[0]} haftasının`:`${ranges.join(' ve ')} haftalarının`;const currentSafety=isCurrentWeek?'\n\nİçinde bulunduğumuz haftada yalnız şu andan sonraki eksik dersler eklenir; geçmiş dersler değiştirilmez.':'';return window.confirm(`${scope} eksik dersleri oluşturulsun mu?\n\nMevcut dersler korunur; yalnız eksik dersler eklenir.${currentSafety}`)}
  const createWeekNow=async()=>{setWeekBusy(true);try{if(isPastWeek){toast('Geçmiş haftalar otomatik olarak hazırlanamaz.');return}const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){setWeekReview(null);toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);toast(r?.olusturulan!==undefined?`${r.olusturulan} eksik ders oluşturuldu. Haftalar güncel.`:'Haftalar güncellendi.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
  const prepareWeek=async()=>{setWeekBusy(true);try{if(isPastWeek){toast('Geçmiş haftalar otomatik olarak hazırlanamaz.');return}const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}const review=await reviewWeekPlanning(monday);if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());toast(r?.olusturulan!==undefined?`${r.olusturulan} eksik ders oluşturuldu. Haftalar güncel.`:'Haftalar güncellendi.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
  if(!data)return null
  const selectedDayIndex=Math.max(0,Math.min(6,Math.round((new Date(`${selectedDate}T12:00:00`).getTime()-new Date(`${monday}T12:00:00`).getTime())/86400000)))
  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))
  const placed=placeLessons(dayLessons)
  const rangeStart=placed.length?Math.floor(Math.min(...placed.map(x=>x.start))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_START
  const rangeEnd=placed.length?Math.ceil(Math.max(...placed.map(x=>x.end))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_END
  const slotCount=Math.max(1,Math.ceil((rangeEnd-rangeStart)/SLOT_MINUTES))
  const slots=Array.from({length:slotCount},(_,i)=>rangeStart+i*SLOT_MINUTES)
  const studentName=(id?:string|null)=>data.ogrenciler.find(x=>x.ogrenci_id===id)?.ad_soyad||'Öğrenci'
  const teacherName=(id?:string|null)=>data.ogretmenler.find(x=>x.ogretmen_id===id)?.ad_soyad||'Öğretmen'
  const branchName=(id?:string|null)=>data.branslar.find(x=>x.brans_id===id)?.brans_adi||'Branş'
  const roomName=(id?:string|null)=>data.derslikler.find(x=>x.derslik_id===id)?.mekan_adi||''
  const statusClass=(status?:string|null)=>status==='Yapıldı'?'done':['İptal','Ertelendi','Öğretmen İptali'].includes(String(status||''))?'cancelled':'planned'
  const changeWeek=(delta:number)=>{setMonday(addDays(monday,delta*7));setWeekReview(null)}
  return <div className="page-stack calendar-v2 daily-calendar-page">
    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Takvim</h1><div className="calendar-title-actions"><button className="calendar-mode-btn" type="button" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div><p>Günü seç, boş saate dokunarak ders ekle.</p></div></section>

    <section className="daily-week-nav" aria-label="Hafta değiştir">
      <button type="button" aria-label="Önceki hafta" onClick={()=>changeWeek(-1)}><ChevronLeft size={20}/></button>
      <div><span>HAFTA</span><b>{weekTitle(monday)}</b></div>
      <button type="button" aria-label="Sonraki hafta" onClick={()=>changeWeek(1)}><ChevronRight size={20}/></button>
    </section>

    <section className="daily-day-tabs" aria-label="Gün seçimi">
      {days.map((day,index)=>{const date=addDays(monday,index);const active=date===selectedDate;const today=date===todayISO();return <button type="button" key={date} className={`${active?'active':''} ${today?'today':''}`} onClick={()=>setSelectedDate(date)}><span>{day.short}</span><b>{Number(date.slice(8,10))}</b>{today&&<i>Bugün</i>}</button>})}
    </section>

    <section className="daily-calendar-card">
      <header className="daily-calendar-card-head"><div><span>SEÇİLİ GÜN</span><b>{dayTitle(selectedDate,selectedDayIndex)}</b></div><div className="daily-lesson-count"><strong>{dayLessons.length}</strong><span>ders</span></div></header>
      <div className="daily-timeline" style={{'--slot-height':`${SLOT_HEIGHT}px`} as React.CSSProperties}>
        <div className="daily-time-axis" style={{height:slotCount*SLOT_HEIGHT}} aria-hidden="true">
          {slots.map((minute,i)=><span key={minute} className={minute%60===0?'whole':''} style={{top:i*SLOT_HEIGHT}}>{minutesToTime(minute)}</span>)}
          <span className="whole end-label" style={{top:slotCount*SLOT_HEIGHT}}>{minutesToTime(rangeEnd)}</span>
        </div>
        <div className="daily-time-body" style={{height:slotCount*SLOT_HEIGHT}}>
          {slots.map((minute,i)=><button key={minute} type="button" className={`daily-empty-slot ${minute%60===0?'whole':''}`} style={{top:i*SLOT_HEIGHT,height:SLOT_HEIGHT}} onClick={()=>setQuickSlot({date:selectedDate,time:minutesToTime(minute)})} aria-label={`${minutesToTime(minute)} saatine ders ekle`}><Plus size={14}/><span>Ders ekle</span></button>)}
          {placed.map(({lesson,start,end,lane,laneCount})=>{const teacher=teacherName(lesson.ogretmen_id);const top=((start-rangeStart)/SLOT_MINUTES)*SLOT_HEIGHT+4;const height=Math.max(((end-start)/SLOT_MINUTES)*SLOT_HEIGHT-8,42);const left=`calc(${(lane/laneCount)*100}% + 5px)`;const width=`calc(${100/laneCount}% - 10px)`;return <button key={lesson.ders_id} type="button" className={`daily-lesson-block ${teacherTone(teacher)} ${statusClass(lesson.ders_durumu)} ${laneCount>=3?'compact':''}`} style={{top,height,left,width}} onClick={()=>setSelected(lesson)} aria-label={`${studentName(lesson.ogrenci_id)}, ${minutesToTime(start)} ders detayını aç`}><strong>{studentName(lesson.ogrenci_id)}</strong><span>{branchName(lesson.brans_id)}</span><small>{teacher}</small><small>{roomName(lesson.derslik_id)}</small><em>{lesson.ders_durumu||'Planlandı'}</em></button>})}
        </div>
      </div>
    </section>

    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Sonuç ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Çakışma otomatik kontrol edilir." onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
    <Sheet open={!!quickSlot} title="Ders Ekle" subtitle={quickSlot?`${shortDate(quickSlot.date)} · ${quickSlot.time}`:'Takvimden ders ekleme'} onClose={()=>setQuickSlot(null)}>{quickSlot&&<div ref={quickFormHost}><LessonForm key={`${quickSlot.date}-${quickSlot.time}`} onDone={()=>setQuickSlot(null)} onCancel={()=>setQuickSlot(null)}/></div>}</Sheet>
    <Sheet open={!!weekReview} title="Haftalık Program Kontrolü" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,13))} · iki hafta birlikte kontrol edilir`} onClose={()=>setWeekReview(null)}>{weekReview&&<WeekPlanningReviewPanel review={weekReview} onChange={setWeekReview} onClose={()=>setWeekReview(null)} onCreate={()=>void createWeekNow()}/>}</Sheet>
  </div>
}
