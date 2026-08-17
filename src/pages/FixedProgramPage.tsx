import { CalendarDays, Clock3, Eye, List, MoveRight, PauseCircle, Plus, Repeat2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { ProgramMoveForm } from '../components/forms'
import { SmartProgramForm } from '../components/SmartProgramForm'
import type { SabitProgram } from '../lib/types'
import { fullDate, money, time, todayISO } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { previewProgram, skipProgramDate } from '../services/officeService'
import { saveProgramManual } from '../services/manualProgramService'
import { useToast } from '../components/Toast'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const dayShort=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']
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

type ViewMode='calendar'|'list'
type ProgramDefaults={day:string;time:string;roomId:string}
type PlacedProgram={program:SabitProgram;start:number;end:number;lane:number;laneCount:number}

const timeToMinutes=(value?:string|null)=>{
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/)
  if(!match)return null
  const hour=Number(match[1]),minute=Number(match[2])
  if(!Number.isFinite(hour)||!Number.isFinite(minute))return null
  return hour*60+minute
}
const minutesToTime=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
const programEndMinutes=(program:SabitProgram,start:number)=>start+Math.max(Number(program.ders_sayisi||1),1)*60
const overlaps=(aStart:number,aEnd:number,bStart:number,bEnd:number)=>aStart<bEnd&&bStart<aEnd
const abbreviateName=(value:string)=>{
  const parts=value.trim().split(/\s+/).filter(Boolean)
  if(parts.length<2)return value
  return `${parts[0][0]?.toLocaleUpperCase('tr-TR')||''}. ${parts[parts.length-1]}`
}
const todayDayName=()=>dayNames[(new Date(`${todayISO()}T12:00:00`).getDay()+6)%7]

function placePrograms(programs:SabitProgram[]):PlacedProgram[]{
  const timed=programs.map(program=>{
    const start=timeToMinutes(program.baslangic_saati)
    if(start==null)return null
    return{program,start,end:Math.max(programEndMinutes(program,start),start+SLOT_MINUTES)}
  }).filter((x):x is {program:SabitProgram;start:number;end:number}=>Boolean(x)).sort((a,b)=>a.start-b.start||a.end-b.end)
  const placed:PlacedProgram[]=[]
  let cluster:{program:SabitProgram;start:number;end:number;lane:number}[]=[]
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

export function FixedProgramPage(){
  const{data,refresh}=useAppData();const{toast}=useToast()
  const[showPassive,setShowPassive]=useState(false)
  const[viewMode,setViewMode]=useState<ViewMode>(()=>sessionStorage.getItem('bs-sabit-program-gorunum')==='list'?'list':'calendar')
  const[selectedDay,setSelectedDay]=useState(todayDayName)
  const[programDefaults,setProgramDefaults]=useState<ProgramDefaults|null>(null)
  const[programForm,setProgramForm]=useState<SabitProgram|null|undefined>(undefined)
  const[selectedProgram,setSelectedProgram]=useState<SabitProgram|null>(null)
  const[moveProgram,setMoveProgram]=useState<SabitProgram|null>(null)
  const[preview,setPreview]=useState<any[]|null>(null)

  useEffect(()=>{sessionStorage.setItem('bs-sabit-program-gorunum',viewMode)},[viewMode])
  const programs=useMemo(()=>{if(!data)return[];return data.sabitProgramlar.filter(x=>showPassive||!(x.program_durumu==='Pasif'||x.aktif===false)).sort((a,b)=>dayNames.indexOf(a.haftanin_gunu||'')-dayNames.indexOf(b.haftanin_gunu||'')||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,showPassive])
  if(!data)return null

  const toggleProgram=async(p:SabitProgram)=>{
    const activating=p.program_durumu==='Pasif'||p.aktif===false
    if(!activating&&!window.confirm('Program pasif yapılsın mı?\n\nMevcut dersler korunur; bu sabit program yeni Haftayı Hazırla işlemlerine dahil edilmez.'))return
    try{
      await saveProgramManual({...p,program_durumu:activating?'Aktif':'Pasif'})
      await refresh()
      toast(activating?'Program aktif yapıldı. Dersler ilgili haftada Haftayı Hazırla ile hazırlanacak.':'Program pasif yapıldı. Mevcut dersler korundu; yeni hafta hazırlamalarında ders üretilmeyecek.')
      setSelectedProgram(null)
    }catch(e:any){toast(e.message||String(e),'error')}
  }
  const skipNext=async(p:SabitProgram)=>{try{const r:any=await previewProgram(p.program_id,todayISO(),1);const dates=r?.tarihler||[];if(!dates.length)throw new Error('Atlanabilecek gelecek ders bulunamadı.');await skipProgramDate(p.program_id,dates[0].tarih,'Kullanıcı tarafından atlandı');await refresh();toast(`${fullDate(dates[0].tarih)} tarihli ders atlandı.`);setSelectedProgram(null)}catch(e:any){toast(e.message||String(e),'error')}}
  const showPreview=async(p:SabitProgram)=>{try{const r:any=await previewProgram(p.program_id,todayISO(),10);setPreview(r?.tarihler||[])}catch(e:any){toast(e.message||String(e),'error')}}
  const openNewProgram=(defaults?:ProgramDefaults)=>{setProgramDefaults(defaults||null);setProgramForm(null)}
  const closeProgramForm=()=>{setProgramForm(undefined);setProgramDefaults(null)}

  const selectedPrograms=programs.filter(x=>x.haftanin_gunu===selectedDay)
  const allPlaced=placePrograms(selectedPrograms)
  const rangeStart=allPlaced.length?Math.floor(Math.min(...allPlaced.map(x=>x.start))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_START
  const rangeEnd=allPlaced.length?Math.ceil(Math.max(...allPlaced.map(x=>x.end))/SLOT_MINUTES)*SLOT_MINUTES:DEFAULT_END
  const slotCount=Math.max(1,Math.ceil((rangeEnd-rangeStart)/SLOT_MINUTES))
  const slots=Array.from({length:slotCount},(_,i)=>rangeStart+i*SLOT_MINUTES)
  const roomColumns=ROOM_COLUMNS.map(column=>({...column,room:data.derslikler.find(x=>x.derslik_id===column.id)}))

  return <div className="page-stack fixed-program-page">
    <section className="page-title-row"><div><span className="eyebrow">PROGRAM ŞABLONLARI</span><h1>Sabit Ders Programı</h1><p>Tekrar eden dersleri gün, saat ve dersliklere göre yönetin.</p></div><button className="primary-btn" onClick={()=>openNewProgram()}><Plus size={17}/>Sabit Ders Ekle</button></section>

    <section className="fixed-program-view-switch" aria-label="Sabit program görünümü">
      <button type="button" className={viewMode==='calendar'?'active':''} aria-pressed={viewMode==='calendar'} onClick={()=>setViewMode('calendar')}><CalendarDays size={16}/>Takvim</button>
      <button type="button" className={viewMode==='list'?'active':''} aria-pressed={viewMode==='list'} onClick={()=>setViewMode('list')}><List size={16}/>Liste</button>
    </section>

    <section className="fixed-program-toolbar"><div><b>{programs.length} program</b><span>{showPassive?'Aktif ve pasif kayıtlar':'Yalnız aktif kayıtlar'}</span></div><button className="secondary-btn" onClick={()=>setShowPassive(x=>!x)}>{showPassive?'Pasifleri Gizle':'Pasifleri Göster'}</button></section>

    {viewMode==='calendar'?<>
      <section className="fixed-program-day-tabs" aria-label="Sabit program günü seç">
        {dayNames.map((day,index)=><button type="button" key={day} className={selectedDay===day?'active':''} onClick={()=>setSelectedDay(day)}><span>{dayShort[index]}</span><small>{programs.filter(x=>x.haftanin_gunu===day).length}</small></button>)}
      </section>
      <section className="daily-calendar-card fixed-program-calendar-card">
        <header className="daily-calendar-card-head"><div><span>SEÇİLİ GÜN</span><b>{selectedDay}</b></div><div className="daily-lesson-count"><strong>{selectedPrograms.length}</strong><span>program</span></div></header>
        <div className="daily-room-grid-scroll" aria-label="Dersliklere göre sabit program takvimi">
          <div className="daily-room-grid fixed-program-room-grid" style={{'--slot-height':`${SLOT_HEIGHT}px`} as React.CSSProperties}>
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
                const roomPrograms=selectedPrograms.filter(x=>x.derslik_id===column.id)
                const placed=placePrograms(roomPrograms)
                const capacity=Math.max(Number(column.room?.kapasite||1),1)
                return <div className="daily-room-column fixed-program-room-column" key={column.id} style={{height:slotCount*SLOT_HEIGHT}}>
                  {slots.map((minute,i)=>{
                    const concurrent=placed.filter(x=>overlaps(minute,minute+60,x.start,x.end)).length
                    const addable=concurrent<capacity
                    return addable
                      ?<button key={minute} type="button" className={`daily-room-slot addable ${minute%60===0?'whole':''}`} style={{top:i*SLOT_HEIGHT,height:SLOT_HEIGHT}} onClick={()=>openNewProgram({day:selectedDay,time:minutesToTime(minute),roomId:column.id})} aria-label={`${selectedDay}, ${column.label}, ${minutesToTime(minute)} sabit ders ekle`} title="Sabit ders ekle"><Plus size={12}/></button>
                      :<div key={minute} className={`daily-room-slot occupied ${minute%60===0?'whole':''}`} style={{top:i*SLOT_HEIGHT,height:SLOT_HEIGHT}}/>
                  })}
                  {placed.map(({program,start,end,lane,laneCount})=>{
                    const teacher=teacherName(data,program.ogretmen_id);const student=studentName(data,program.ogrenci_id)
                    const top=((start-rangeStart)/SLOT_MINUTES)*SLOT_HEIGHT+3
                    const height=Math.max(((end-start)/SLOT_MINUTES)*SLOT_HEIGHT-6,38)
                    const left=`calc(${(lane/laneCount)*100}% + 3px)`
                    const width=`calc(${100/laneCount}% - 6px)`
                    const passive=program.program_durumu==='Pasif'||program.aktif===false
                    return <button key={program.program_id} type="button" className={`daily-lesson-block fixed-calendar-program-block ${teacherTone(teacher)} ${laneCount>=2?'compact':''} ${passive?'muted-card':''}`} style={{top,height,left,width}} onClick={()=>setSelectedProgram(program)} title={`${student} · ${branchName(data,program.brans_id)} · ${teacher} · ${program.program_durumu||'Aktif'}`}><strong>{abbreviateName(student)}</strong><span className="daily-lesson-branch">{branchName(data,program.brans_id)}</span><small>{abbreviateName(teacher)}</small><span className={`fixed-program-status ${passive?'passive':'active'}`}><i/>{passive?'Pasif':'Aktif'}</span></button>
                  })}
                </div>
              })}
            </div>
          </div>
        </div>
      </section>
    </>:<section className="fixed-program-groups">
      {dayNames.map(day=>{const items=programs.filter(x=>x.haftanin_gunu===day);if(!items.length)return null;return <div className="fixed-day-group" key={day}><header><b>{day}</b><span>{items.length} ders</span></header><div>{items.map(p=>{const teacher=teacherName(data,p.ogretmen_id);return <button className={`program-card ${teacherTone(teacher)} ${p.program_durumu==='Pasif'||p.aktif===false?'muted-card':''}`} key={p.program_id} onClick={()=>setSelectedProgram(p)}><div className="program-time"><b>{time(p.baslangic_saati)}</b><span>{Number(p.ders_sayisi||1)} ders</span></div><div className="program-main"><strong>{studentName(data,p.ogrenci_id)}</strong><small>{teacher} · {branchName(data,p.brans_id)} · {roomName(data,p.derslik_id)}</small><span>{p.tekrar_sikligi} · {p.program_durumu||'Aktif'}</span></div><div className="program-price"><b>{money(p.ogrenci_birim_ucreti)}</b><small>öğrenci / ders</small></div></button>})}</div></div>})}
      {!programs.length&&<div className="calm-empty"><Repeat2/><b>Sabit program bulunamadı.</b><span>Yeni sabit ders ekleyebilir veya pasif kayıtları gösterebilirsiniz.</span></div>}
    </section>}

    <Sheet open={programForm!==undefined} title={programForm?'Sabit Programı Düzenle':'Yeni Sabit Ders'} subtitle="Uygunluk kontrolü ve akıllı alternatifler" onClose={closeProgramForm}>{programForm!==undefined&&<SmartProgramForm key={`${programForm?.program_id||'new'}-${programDefaults?.day||''}-${programDefaults?.time||''}-${programDefaults?.roomId||''}`} program={programForm||undefined} defaultDay={programDefaults?.day} defaultStartTime={programDefaults?.time} defaultRoomId={programDefaults?.roomId} onDone={closeProgramForm} onCancel={closeProgramForm}/>}</Sheet>
    <Sheet open={!!selectedProgram&&!preview} title={selectedProgram?studentName(data,selectedProgram.ogrenci_id):'Program'} subtitle={selectedProgram?`${selectedProgram.haftanin_gunu} · ${time(selectedProgram.baslangic_saati)} · ${selectedProgram.tekrar_sikligi}`:''} onClose={()=>setSelectedProgram(null)}>{selectedProgram&&<div className="action-list"><button onClick={()=>{setProgramForm(selectedProgram);setProgramDefaults(null);setSelectedProgram(null)}}><span className="action-round blue"><Clock3/></span><span><b>Kaydı Düzenle</b><small>Gün, saat, öğretmen, derslik ve ücret</small></span></button><button onClick={()=>{setMoveProgram(selectedProgram);setSelectedProgram(null)}}><span className="action-round blue"><MoveRight/></span><span><b>Bu Haftaya Özel Değiştir</b><small>Sabit programı bozmadan tek tarihi taşı</small></span></button><button onClick={()=>void showPreview(selectedProgram)}><span className="action-round teal"><Eye/></span><span><b>Gelecek Tarihler</b><small>Önümüzdeki dersleri önizle</small></span></button><button onClick={()=>void skipNext(selectedProgram)}><span className="action-round orange"><PauseCircle/></span><span><b>Sonraki Dersi Atla</b><small>Sabit program kalır, tek tarih atlanır</small></span></button><button onClick={()=>void toggleProgram(selectedProgram)}><span className="action-round red"><Repeat2/></span><span><b>{selectedProgram.program_durumu==='Pasif'?'Aktif Yap':'Pasif Yap'}</b><small>{selectedProgram.program_durumu==='Pasif'?'Programı tekrar kullan':'Yeni hafta üretimini durdur; mevcut dersleri koru'}</small></span></button></div>}</Sheet>
    <Sheet open={!!moveProgram} title="Bu Haftaya Özel Değiştir" subtitle={moveProgram?`${studentName(data,moveProgram.ogrenci_id)} · sabit program değişmez`:''} onClose={()=>setMoveProgram(null)}>{moveProgram&&<ProgramMoveForm program={moveProgram} onDone={()=>setMoveProgram(null)} onCancel={()=>setMoveProgram(null)}/>}</Sheet>
    <Sheet open={!!preview} title="Gelecek Tarihler" subtitle={selectedProgram?`${studentName(data,selectedProgram.ogrenci_id)} · ${selectedProgram.tekrar_sikligi}`:''} onClose={()=>setPreview(null)}>{preview&&<div className="preview-list">{preview.map((x:any,i:number)=><div className="detail-row" key={i}><span>{fullDate(x.tarih)}</span><b>{String(x.saat||selectedProgram?.baslangic_saati||'').slice(0,5)}</b></div>)}</div>}</Sheet>
  </div>
}
