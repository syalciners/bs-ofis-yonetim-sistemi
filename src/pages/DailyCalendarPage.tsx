import { CalendarCheck2, Check, List, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { LessonDetail } from '../components/LessonDetail'
import { Sheet } from '../components/Sheet'
import { LessonForm } from '../components/forms'
import { WeekPlanningReviewPanel } from '../components/WeekPlanningReviewPanel'
import { useToast } from '../components/Toast'
import type { Ders } from '../lib/types'
import { addDays, mondayOf, shortDate, todayISO, weekRangeLong } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import { lessonConflict, moveProgramDate, updateLesson } from '../services/officeService'
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
const ROOM_COLUMNS=[
  {id:'LOC-002',label:'Yalçıner'},
  {id:'LOC-001',label:'Başak'},
  {id:'LOC-003',label:'Salon'},
  {id:'LOC-005',label:'OSM'},
  {id:'LOC-004',label:'Online'},
] as const

const SLOT_MINUTES=30
const SLOT_HEIGHT=42
const DEFAULT_START=8*60
const DEFAULT_END=21*60
const DEFAULT_LESSON_MINUTES=60
const LONG_PRESS_MS=550
const DRAG_MOVE_THRESHOLD=6
const TOUCH_CANCEL_THRESHOLD=10
const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])

type WeekStatusState={monday:string;status:WeekCreationStatus}
type QuickSlot={date:string;time:string;roomId:string}
type PlacedLesson={lesson:Ders;start:number;end:number;lane:number;laneCount:number}
type DragTarget={roomId:string;minute:number}
type DragView={lessonId:string;active:boolean;target:DragTarget|null;clientX:number;clientY:number}
type DragRuntime={lesson:Ders;pointerId:number;pointerType:string;startX:number;startY:number;moved:boolean;active:boolean;target:DragTarget|null;element:HTMLButtonElement;timer:number|null}

const timeToMinutes=(value?:string|null)=>{
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/)
  if(!match)return null
  const hour=Number(match[1]);const minute=Number(match[2])
  if(!Number.isFinite(hour)||!Number.isFinite(minute))return null
  return hour*60+minute
}
const minutesToTime=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
const lessonEndMinutes=(lesson:Ders,start:number)=>timeToMinutes(lesson.bitis_saati)??start+Math.max(Number(lesson.ders_sayisi||1),1)*60
const overlaps=(aStart:number,aEnd:number,bStart:number,bEnd:number)=>aStart<bEnd&&bStart<aEnd
const abbreviateName=(value:string)=>{
  const parts=value.trim().split(/\s+/).filter(Boolean)
  if(parts.length<2)return value
  return `${parts[0][0]?.toLocaleUpperCase('tr-TR')||''}. ${parts[parts.length-1]}`
}
const conflictMessage=(result:any)=>{
  const messages:string[]=[]
  if(result?.ogrenci_cakisma)messages.push('Öğrenci bu saat aralığında başka bir derste.')
  if(result?.ogretmen_cakisma)messages.push('Öğretmen bu saat aralığında başka bir derste.')
  if(result?.derslik_dolu)messages.push('Seçilen derslik bu saat aralığında dolu.')
  const first=result?.ilk_cakisma
  const detail=first?` Çakışan ders: ${first.ogrenci||'—'} · ${first.ogretmen||'—'} · ${String(first.baslangic||'').slice(0,5)}–${String(first.bitis||'').slice(0,5)}.`:''
  return `${messages.join(' ')}${detail}`.trim()||result?.mesaj||'Bu tarih ve saatte çakışma var.'
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

function StatusIndicator({status}:{status?:string|null}){
  if(status==='Yapıldı')return <span className="daily-status-line done" title="Yapıldı"><span className="daily-status-indicator done" aria-hidden="true"><Check size={9} strokeWidth={3}/></span><span>Yapıldı</span></span>
  if(CALENDAR_HIDDEN_STATUSES.has(String(status||'')))return <span className="daily-status-line cancelled" title="İptal"><span className="daily-status-indicator cancelled" aria-hidden="true"><X size={9} strokeWidth={3}/></span><span>İptal</span></span>
  return <span className="daily-status-line planned" title="Planlandı"><span className="daily-status-indicator planned" aria-hidden="true"/><span>Planlandı</span></span>
}

export function DailyCalendarPage(){
  const{data,refresh}=useAppData();const{toast}=useToast();const nav=useNavigate()
  const baseMonday=mondayOf(todayISO())
  const[monday,setMonday]=useState(()=>{const stored=sessionStorage.getItem('bs-takvim-hafta');return stored&&/^\d{4}-\d{2}-\d{2}$/.test(stored)?stored:baseMonday})
  const[selectedDate,setSelectedDate]=useState(()=>todayISO())
  const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null);const[quickSlot,setQuickSlot]=useState<QuickSlot|null>(null)
  const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<WeekStatusState|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)
  const[dragView,setDragView]=useState<DragView|null>(null);const[moveBusy,setMoveBusy]=useState(false)
  const dragRef=useRef<DragRuntime|null>(null);const suppressClickRef=useRef(false)
  const isPastWeek=monday<baseMonday;const isCurrentWeek=monday===baseMonday
  const weekOffset=Math.round((new Date(`${monday}T12:00:00`).getTime()-new Date(`${baseMonday}T12:00:00`).getTime())/(7*86400000))
  const moveWeek=(delta:number)=>{setMonday(current=>addDays(current,delta*7));setWeekReview(null)}
  const goCurrentWeek=()=>{setMonday(baseMonday);setWeekReview(null)}
  const readWeekStatus=useCallback(async():Promise<WeekStatusState>=>({monday,status:await getWeekCreationStatus(monday)}),[monday])
  useEffect(()=>{sessionStorage.setItem('bs-takvim-hafta',monday);const today=todayISO();setSelectedDate(today>=monday&&today<=addDays(monday,6)?today:monday)},[monday])
  useEffect(()=>{let active=true;setWeekStatusBusy(true);void readWeekStatus().then(status=>{if(active)setWeekStatus(status)}).catch(()=>{if(active)setWeekStatus(null)}).finally(()=>{if(active)setWeekStatusBusy(false)});return()=>{active=false}},[readWeekStatus])
  useEffect(()=>()=>{const runtime=dragRef.current;if(runtime?.timer!=null)window.clearTimeout(runtime.timer)},[])
  const activeWeekStatus=weekStatus?.monday===monday?weekStatus.status:null
  const weekReady=Boolean(activeWeekStatus?.calisti)
  const weekActionText=isPastWeek?'Geçmiş Hafta':weekBusy||weekStatusBusy?'Kontrol ediliyor…':weekReady?'Hafta Hazır':'Haftayı Hazırla'
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
  if(!data)return null

  const selectedDayIndex=Math.max(0,Math.min(6,Math.round((new Date(`${selectedDate}T12:00:00`).getTime()-new Date(`${monday}T12:00:00`).getTime())/86400000)))
  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))
  const dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)
  const allPlaced=placeLessons(dayLessons)
  const rangeStart=allPlaced.length?Math.floor(Math.min(...allPlaced.map(x=>x.start))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_START
  const rangeEnd=allPlaced.length?Math.ceil(Math.max(...allPlaced.map(x=>x.end))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_END
  const slotCount=Math.max(1,Math.ceil((rangeEnd-rangeStart)/SLOT_MINUTES))
  const slots=Array.from({length:slotCount},(_,i)=>rangeStart+i*SLOT_MINUTES)
  const studentName=(id?:string|null)=>data.ogrenciler.find(x=>x.ogrenci_id===id)?.ad_soyad||'Öğrenci'
  const teacherName=(id?:string|null)=>data.ogretmenler.find(x=>x.ogretmen_id===id)?.ad_soyad||'Öğretmen'
  const branchName=(id?:string|null)=>data.branslar.find(x=>x.brans_id===id)?.brans_adi||'Branş'
  const roomColumns=ROOM_COLUMNS.map(column=>({...column,room:data.derslikler.find(x=>x.derslik_id===column.id)}))
  const quickRoom=quickSlot?roomColumns.find(x=>x.id===quickSlot.roomId):null
  const canDragLesson=(lesson:Ders)=>String(lesson.ders_durumu||'Planlandı')==='Planlandı'
  const dragTargetAt=(clientX:number,clientY:number):DragTarget|null=>{
    const element=document.elementFromPoint(clientX,clientY) as HTMLElement|null
    const column=element?.closest('.daily-room-column[data-room-id]') as HTMLElement|null
    if(!column)return null
    const roomId=column.dataset.roomId
    if(!roomId)return null
    const rect=column.getBoundingClientRect();const offset=clientY-rect.top
    if(offset<0||offset>=rect.height)return null
    const slotIndex=Math.max(0,Math.min(slotCount-1,Math.floor(offset/SLOT_HEIGHT)))
    return{roomId,minute:rangeStart+slotIndex*SLOT_MINUTES}
  }
  const releaseDrag=(runtime?:DragRuntime|null)=>{
    const current=runtime||dragRef.current
    if(current?.timer!=null)window.clearTimeout(current.timer)
    if(current){try{if(current.element.hasPointerCapture(current.pointerId))current.element.releasePointerCapture(current.pointerId)}catch{/* no-op */}}
    dragRef.current=null;setDragView(null)
  }
  const activateDrag=(runtime:DragRuntime,clientX:number,clientY:number)=>{
    if(dragRef.current!==runtime)return
    runtime.active=true
    try{runtime.element.setPointerCapture(runtime.pointerId)}catch{/* no-op */}
    const target=dragTargetAt(clientX,clientY);runtime.target=target
    setDragView({lessonId:runtime.lesson.ders_id,active:true,target,clientX,clientY})
  }
  const beginLessonPointer=(e:React.PointerEvent<HTMLButtonElement>,lesson:Ders)=>{
    if(moveBusy||!canDragLesson(lesson)||e.button!==0)return
    suppressClickRef.current=false
    const runtime:DragRuntime={lesson,pointerId:e.pointerId,pointerType:e.pointerType,startX:e.clientX,startY:e.clientY,moved:false,active:false,target:null,element:e.currentTarget,timer:null}
    dragRef.current=runtime;setDragView({lessonId:lesson.ders_id,active:false,target:null,clientX:e.clientX,clientY:e.clientY})
    if(e.pointerType==='touch'||e.pointerType==='pen')runtime.timer=window.setTimeout(()=>activateDrag(runtime,runtime.startX,runtime.startY),LONG_PRESS_MS)
  }
  const moveLessonPointer=(e:React.PointerEvent<HTMLButtonElement>)=>{
    const runtime=dragRef.current
    if(!runtime||runtime.pointerId!==e.pointerId)return
    const distance=Math.hypot(e.clientX-runtime.startX,e.clientY-runtime.startY)
    if(!runtime.active){
      if(runtime.pointerType==='mouse'&&distance>=DRAG_MOVE_THRESHOLD){runtime.moved=true;activateDrag(runtime,e.clientX,e.clientY)}
      else if(runtime.pointerType!=='mouse'&&distance>=TOUCH_CANCEL_THRESHOLD){runtime.moved=true;if(runtime.timer!=null){window.clearTimeout(runtime.timer);runtime.timer=null}}
      return
    }
    e.preventDefault();runtime.moved=true
    const target=dragTargetAt(e.clientX,e.clientY);runtime.target=target
    setDragView({lessonId:runtime.lesson.ders_id,active:true,target,clientX:e.clientX,clientY:e.clientY})
  }
  const moveLessonToTarget=async(lesson:Ders,target:DragTarget)=>{
    const targetTime=minutesToTime(target.minute);const currentTime=String(lesson.baslangic_saati||'').slice(0,5)
    if(lesson.derslik_id===target.roomId&&currentTime===targetTime)return
    if(!lesson.ogrenci_id||!lesson.ogretmen_id||!lesson.brans_id||!lesson.tarih){toast('Ders bilgileri eksik olduğu için taşınamadı.','error');return}
    const units=Math.max(Number(lesson.ders_sayisi||1),1)
    const input={ders_id:lesson.ders_id,tarih:selectedDate,ogrenci_id:lesson.ogrenci_id,ogretmen_id:lesson.ogretmen_id,brans_id:lesson.brans_id,derslik_id:target.roomId,baslangic_saati:targetTime,ders_sayisi:units,ogrenci_birim_ucreti:Number(lesson.ogrenci_birim_ucreti||0),ogretmen_birim_hakedisi:Number(lesson.ogretmen_birim_hakedisi||0),aciklama:lesson.aciklama||null}
    setMoveBusy(true)
    try{
      const check:any=await lessonConflict({...input,haric_ders_id:lesson.ders_id})
      if(!check?.uygun)throw new Error(conflictMessage(check))
      if(lesson.program_id)await moveProgramDate({program_id:lesson.program_id,orijinal_tarih:lesson.tarih,yeni_tarih:selectedDate,yeni_baslangic_saati:targetTime,yeni_derslik_id:target.roomId,aciklama:'Takvim sürükle-bırak ile taşındı'})
      else await updateLesson(input)
      await refresh()
      const roomLabel=roomColumns.find(x=>x.id===target.roomId)?.label||'Derslik'
      toast(`Ders ${targetTime} · ${roomLabel} konumuna taşındı.`)
    }catch(err:any){toast(err?.message||String(err),'error')}finally{setMoveBusy(false)}
  }
  const endLessonPointer=(e:React.PointerEvent<HTMLButtonElement>)=>{
    const runtime=dragRef.current
    if(!runtime||runtime.pointerId!==e.pointerId)return
    const target=runtime.target;const shouldMove=runtime.active&&target
    if(runtime.active||runtime.moved){suppressClickRef.current=true;window.setTimeout(()=>{suppressClickRef.current=false},80)}
    releaseDrag(runtime)
    if(shouldMove)void moveLessonToTarget(runtime.lesson,target)
  }
  const cancelLessonPointer=(e:React.PointerEvent<HTMLButtonElement>)=>{
    const runtime=dragRef.current
    if(!runtime||runtime.pointerId!==e.pointerId)return
    if(runtime.active||runtime.moved){suppressClickRef.current=true;window.setTimeout(()=>{suppressClickRef.current=false},80)}
    releaseDrag(runtime)
  }
  const dragLesson=dragView?dayLessons.find(x=>x.ders_id===dragView.lessonId):null
  const dragRoom=dragView?.target?roomColumns.find(x=>x.id===dragView.target?.roomId):null

  return <div className="page-stack calendar-v2 daily-calendar-page">
    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line calendar-title-line-balanced"><h1>Program</h1><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className="calendar-week-toolbar calendar-week-toolbar-balanced" aria-label="Program hafta gezintisi">
      <button className="calendar-mode-btn calendar-toolbar-mode-btn" type="button" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>
      <div className="calendar-week-range-long"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className="calendar-week-nav-compact" role="group" aria-label="Hafta değiştir">
        <button type="button" aria-label="Önceki hafta" onClick={()=>moveWeek(-1)}>‹</button>
        <button type="button" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>Bu Hafta</button>
        <button type="button" aria-label="Gelecek hafta" onClick={()=>moveWeek(1)}>›</button>
      </div>
    </section>

    <section className="daily-day-tabs" aria-label="Gün seçimi">
      {days.map((day,index)=>{const date=addDays(monday,index);const active=date===selectedDate;const today=date===todayISO();return <button type="button" key={date} className={`${active?'active':''} ${today?'today':''}`} onClick={()=>setSelectedDate(date)}><span>{day.short}</span><b>{Number(date.slice(8,10))}</b>{today&&<i>Bugün</i>}</button>})}
    </section>

    <section className="daily-calendar-card">
      <header className="daily-calendar-card-head"><div><span>SEÇİLİ GÜN</span><b>{dayTitle(selectedDate,selectedDayIndex)}</b><small className="daily-drag-help">Planlandı ders: 0,55 sn basılı tutup sürükle</small></div><div className="daily-lesson-count"><strong>{dayLessonHours}</strong><span>ders saati</span></div></header>
      <div className="daily-room-grid-scroll" aria-label="Dersliklere göre günlük takvim">
        <div className="daily-room-grid" style={{'--slot-height':`${SLOT_HEIGHT}px`} as React.CSSProperties}>
          <div className="daily-room-header-row">
            <div className="daily-time-head">Saat</div>
            {roomColumns.map(column=><div className={`daily-room-head room-${column.id.toLowerCase()}`} key={column.id} title={column.room?.mekan_adi||column.label}><strong>{column.label}</strong></div>)}
          </div>
          <div className="daily-room-body-row">
            <div className="daily-time-axis" style={{height:slotCount*SLOT_HEIGHT}} aria-hidden="true">
              {slots.map((minute,i)=><span key={minute} className={minute%60===0?'whole':''} style={{top:i*SLOT_HEIGHT}}>{minutesToTime(minute)}</span>)}
              <span className="whole end-label" style={{top:slotCount*SLOT_HEIGHT}}>{minutesToTime(rangeEnd)}</span>
            </div>
            {roomColumns.map(column=>{
              const roomLessons=dayLessons.filter(x=>x.derslik_id===column.id)
              const placed=placeLessons(roomLessons)
              return <div className="daily-room-column" data-room-id={column.id} key={column.id} style={{height:slotCount*SLOT_HEIGHT}}>
                {slots.map((minute,i)=>{
                  const occupied=placed.some(x=>overlaps(minute,minute+DEFAULT_LESSON_MINUTES,x.start,x.end))
                  const target=Boolean(dragView?.active&&dragView.target?.roomId===column.id&&dragView.target.minute===minute)
                  return occupied
                    ?<div key={minute} className={`daily-room-slot occupied ${minute%60===0?'whole':''} ${target?'drag-target':''}`} style={{top:i*SLOT_HEIGHT,height:SLOT_HEIGHT}}/>
                    :<button key={minute} type="button" className={`daily-room-slot addable ${minute%60===0?'whole':''} ${target?'drag-target':''}`} style={{top:i*SLOT_HEIGHT,height:SLOT_HEIGHT}} onClick={()=>setQuickSlot({date:selectedDate,time:minutesToTime(minute),roomId:column.id})} aria-label={`${column.label}, ${minutesToTime(minute)} saatine ders ekle`} title="Ders ekle"><Plus size={12}/></button>
                })}
                {placed.map(({lesson,start,end,lane,laneCount})=>{
                  const fullStudent=studentName(lesson.ogrenci_id);const fullTeacher=teacherName(lesson.ogretmen_id);const draggable=canDragLesson(lesson)
                  const top=((start-rangeStart)/SLOT_MINUTES)*SLOT_HEIGHT+3
                  const height=Math.max(((end-start)/SLOT_MINUTES)*SLOT_HEIGHT-6,38)
                  const left=`calc(${(lane/laneCount)*100}% + 3px)`
                  const width=`calc(${100/laneCount}% - 6px)`
                  const dragging=dragView?.active&&dragView.lessonId===lesson.ders_id;const arming=Boolean(dragView&&!dragView.active&&dragView.lessonId===lesson.ders_id)
                  return <button key={lesson.ders_id} type="button" className={`daily-lesson-block ${teacherTone(fullTeacher)} ${laneCount>=2?'compact':''} ${draggable?'drag-enabled':''} ${dragging?'dragging':''} ${arming?'drag-arming':''}`} style={{top,height,left,width}} onPointerDown={e=>beginLessonPointer(e,lesson)} onPointerMove={moveLessonPointer} onPointerUp={endLessonPointer} onPointerCancel={cancelLessonPointer} onClick={()=>{if(suppressClickRef.current)return;setSelected(lesson)}} title={`${fullStudent} · ${branchName(lesson.brans_id)} · ${fullTeacher} · ${lesson.ders_durumu||'Planlandı'}${draggable?' · Sürükleyerek taşı':''}`} aria-label={`${fullStudent}, ${branchName(lesson.brans_id)}, ${fullTeacher}, ${lesson.ders_durumu||'Planlandı'}, ${minutesToTime(start)} ders detayını aç${draggable?', basılı tutup sürükleyerek taşı':''}`}><strong>{abbreviateName(fullStudent)}</strong><span className="daily-lesson-branch">{branchName(lesson.brans_id)}</span><small>{abbreviateName(fullTeacher)}</small><StatusIndicator status={lesson.ders_durumu}/></button>
                })}
              </div>
            })}
          </div>
        </div>
      </div>
    </section>

    {dragView?.active&&dragLesson&&<div className="daily-drag-ghost" style={{left:dragView.clientX+14,top:dragView.clientY+14}} aria-hidden="true"><strong>{abbreviateName(studentName(dragLesson.ogrenci_id))}</strong><span>{dragView.target?`${dragRoom?.label||'Derslik'} · ${minutesToTime(dragView.target.minute)}`:'Takvim içine bırak'}</span></div>}

    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Sonuç ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Çakışma otomatik kontrol edilir." onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
    <Sheet open={!!quickSlot} title="Ders Ekle" subtitle={quickSlot?`${quickRoom?.label||'Derslik'} · ${shortDate(quickSlot.date)} · ${quickSlot.time}`:'Takvimden ders ekleme'} onClose={()=>setQuickSlot(null)}>{quickSlot&&<LessonForm key={`${quickSlot.date}-${quickSlot.time}-${quickSlot.roomId}`} defaultDate={quickSlot.date} defaultStartTime={quickSlot.time} defaultRoomId={quickSlot.roomId} lockDateTime onDone={()=>setQuickSlot(null)} onCancel={()=>setQuickSlot(null)}/>}</Sheet>
    <Sheet open={!!weekReview} title="Haftalık Program Kontrolü" subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,6))} · seçilen hafta kontrol edilir`} onClose={()=>setWeekReview(null)}>{weekReview&&<WeekPlanningReviewPanel review={weekReview} onChange={setWeekReview} onClose={()=>setWeekReview(null)} onCreate={()=>void createWeekNow()}/>}</Sheet>
  </div>
}
