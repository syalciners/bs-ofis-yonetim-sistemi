import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const read=path=>readFileSync(path,'utf8')
const replaceOnce=(source,from,to,label)=>{
  const count=source.split(from).length-1
  if(count!==1)throw new Error(`${label}: beklenen tek eşleşme yerine ${count} eşleşme bulundu.`)
  return source.replace(from,to)
}

const dailyPath='src/pages/DailyCalendarPage.tsx'
let daily=read(dailyPath)
daily=replaceOnce(daily,"import { addDays, mondayOf, shortDate, todayISO, weekRangeLong } from '../lib/format'","import { addDays, mondayOf, shortDate, todayISO, weekRangeLong } from '../lib/format'\nimport { calendarRoomColumns } from '../lib/calendarRooms'",'Günlük Takvim helper importu')
daily=replaceOnce(daily,"const ROOM_COLUMNS=[\n  {id:'LOC-002',label:'Yalçıner'},\n  {id:'LOC-001',label:'Başak'},\n  {id:'LOC-003',label:'Salon'},\n  {id:'LOC-005',label:'OSM'},\n  {id:'LOC-004',label:'Online'},\n] as const\n\n",'', 'Günlük Takvim sabit derslik listesi')
daily=replaceOnce(daily,"  const roomColumns=ROOM_COLUMNS.map(column=>({...column,room:data.derslikler.find(x=>x.derslik_id===column.id)}))","  const roomColumns=calendarRoomColumns(data.derslikler,dayLessons.map(x=>x.derslik_id))",'Günlük Takvim dinamik derslik kaynağı')
daily=replaceOnce(daily,"        <div className=\"daily-room-grid\" style={{'--slot-height':`${SLOT_HEIGHT}px`} as React.CSSProperties}>","        <div className=\"daily-room-grid\" style={{'--slot-height':`${SLOT_HEIGHT}px`,'--room-count':roomColumns.length,minWidth:Math.max(650,52+roomColumns.length*116)} as React.CSSProperties}>",'Günlük Takvim dinamik grid stili')
writeFileSync(dailyPath,daily)

const fixedPath='src/pages/FixedProgramPage.tsx'
let fixed=read(fixedPath)
fixed=replaceOnce(fixed,"import { fullDate, money, time, todayISO } from '../lib/format'","import { fullDate, money, time, todayISO } from '../lib/format'\nimport { calendarRoomColumns } from '../lib/calendarRooms'",'Sabit Program helper importu')
fixed=replaceOnce(fixed,"const ROOM_COLUMNS=[\n  {id:'LOC-002',label:'Yalçıner'},\n  {id:'LOC-001',label:'Başak'},\n  {id:'LOC-003',label:'Salon'},\n  {id:'LOC-005',label:'OSM'},\n  {id:'LOC-004',label:'Online'},\n] as const\n",'', 'Sabit Program sabit derslik listesi')
fixed=replaceOnce(fixed,"  const roomColumns=ROOM_COLUMNS.map(column=>({...column,room:data.derslikler.find(x=>x.derslik_id===column.id)}))","  const roomColumns=calendarRoomColumns(data.derslikler,selectedPrograms.map(x=>x.derslik_id))",'Sabit Program dinamik derslik kaynağı')
fixed=replaceOnce(fixed,"          <div className=\"daily-room-grid fixed-program-room-grid\" style={{'--slot-height':`${SLOT_HEIGHT}px`} as React.CSSProperties}>","          <div className=\"daily-room-grid fixed-program-room-grid\" style={{'--slot-height':`${SLOT_HEIGHT}px`,'--room-count':roomColumns.length,minWidth:Math.max(650,52+roomColumns.length*116)} as React.CSSProperties}>",'Sabit Program dinamik grid stili')
writeFileSync(fixedPath,fixed)

const cssPath='src/daily-calendar.css'
let css=read(cssPath)
css=replaceOnce(css,'grid-template-columns:52px repeat(5,minmax(116px,1fr))','grid-template-columns:52px repeat(var(--room-count),minmax(116px,1fr))','Masaüstü dinamik grid')
css=replaceOnce(css,'grid-template-columns:50px repeat(5,minmax(114px,1fr))','grid-template-columns:50px repeat(var(--room-count),minmax(114px,1fr))','Tablet dinamik grid')
css=replaceOnce(css,'grid-template-columns:48px repeat(5,minmax(112px,1fr))','grid-template-columns:48px repeat(var(--room-count),minmax(112px,1fr))','Mobil dinamik grid')
writeFileSync(cssPath,css)

const ciPath='.github/workflows/ci.yml'
let ci=read(ciPath)
const tempBlock="      - name: Derslik sütunlarını dinamikleştir\n        run: node scripts/migrate-dynamic-room-columns.mjs\n"
ci=replaceOnce(ci,tempBlock,'','Geçici derslik migrasyon adımı')
writeFileSync(ciPath,ci)

unlinkSync('scripts/migrate-dynamic-room-columns.mjs')
console.log('Dinamik derslik sütunları uygulandı; geçici migrasyon dosyası temizlendi.')
