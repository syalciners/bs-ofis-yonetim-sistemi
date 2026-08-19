import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const write=(path,content)=>writeFileSync(path,content)
const replaceRequired=(source,find,replacement,label)=>{
  if(!source.includes(find))throw new Error(`Günlük Takvim PDF geçişi bulunamadı: ${label}`)
  return source.replace(find,replacement)
}

const pagePath='src/pages/DailyCalendarPage.tsx'
let page=read(pagePath)
page=replaceRequired(page,
  "import { CalendarCheck2, Check, List, Plus, X } from 'lucide-react'",
  "import { CalendarCheck2, Check, FileDown, List, Plus, X } from 'lucide-react'",
  'FileDown importu')
page=replaceRequired(page,
  "import { lessonConflict, moveProgramDate, updateLesson } from '../services/officeService'",
  "import { lessonConflict, moveProgramDate, updateLesson } from '../services/officeService'\nimport { openDailyCalendarPdf } from '../services/dailyCalendarPdfService'",
  'PDF servis importu')
page=replaceRequired(page,
  "  const[dragView,setDragView]=useState<DragView|null>(null);const[moveBusy,setMoveBusy]=useState(false)",
  "  const[dragView,setDragView]=useState<DragView|null>(null);const[moveBusy,setMoveBusy]=useState(false);const[pdfBusy,setPdfBusy]=useState(false)",
  'PDF busy state')
page=replaceRequired(page,
  "  const roomColumns=calendarRoomColumns(data.derslikler,dayLessons.map(x=>x.derslik_id))\n  const quickRoom=quickSlot?roomColumns.find(x=>x.id===quickSlot.roomId):null",
  "  const roomColumns=calendarRoomColumns(data.derslikler,dayLessons.map(x=>x.derslik_id))\n  const openDayPdf=async()=>{\n    if(!dayLessons.length){toast('Seçili günde PDF oluşturulacak ders yok.','error');return}\n    setPdfBusy(true)\n    try{await openDailyCalendarPdf(data,dayLessons,selectedDate,rangeStart,rangeEnd)}\n    catch(error:any){toast(error?.message||'Takvim PDF’i oluşturulamadı.','error')}\n    finally{setPdfBusy(false)}\n  }\n  const quickRoom=quickSlot?roomColumns.find(x=>x.id===quickSlot.roomId):null",
  'PDF açma aksiyonu')
page=replaceRequired(page,
  "      <header className=\"daily-calendar-card-head\"><div><span>SEÇİLİ GÜN</span><b>{dayTitle(selectedDate,selectedDayIndex)}</b><small className=\"daily-drag-help\">Planlandı ders: 0,55 sn basılı tutup sürükle</small></div><div className=\"daily-lesson-count\"><strong>{dayLessonHours}</strong><span>ders saati</span></div></header>",
  "      <header className=\"daily-calendar-card-head\"><div><span>SEÇİLİ GÜN</span><b>{dayTitle(selectedDate,selectedDayIndex)}</b><small className=\"daily-drag-help\">Planlandı ders: 0,55 sn basılı tutup sürükle</small></div><div className=\"daily-calendar-head-actions\"><button className=\"secondary-btn daily-calendar-pdf-btn\" type=\"button\" disabled={!dayLessons.length||pdfBusy} onClick={()=>void openDayPdf()}><FileDown size={14}/>{pdfBusy?'Hazırlanıyor…':'PDF Al'}</button><div className=\"daily-lesson-count\"><strong>{dayLessonHours}</strong><span>ders saati</span></div></div></header>",
  'seçili gün PDF butonu')
write(pagePath,page)

const cssPath='src/daily-calendar.css'
let css=read(cssPath)
css=replaceRequired(css,
  ".daily-room-grid-scroll{position:relative;overflow-x:auto;overflow-y:visible;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#cad6e5 transparent}",
  ".daily-calendar-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 0 auto}\n.daily-calendar-pdf-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:7px 10px;white-space:nowrap}\n\n.daily-room-grid-scroll{position:relative;overflow-x:auto;overflow-y:visible;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#cad6e5 transparent}",
  'PDF buton stili')
css=replaceRequired(css,
  "  .daily-calendar-card-head b{font-size:11px}\n  .daily-drag-help{font-size:6.5px}",
  "  .daily-calendar-card-head b{font-size:11px}\n  .daily-calendar-head-actions{gap:5px}\n  .daily-calendar-pdf-btn{min-height:32px;padding:6px 8px;font-size:9px}\n  .daily-drag-help{font-size:6.5px}",
  'mobil PDF buton stili')
write(cssPath,css)

const checkPath='scripts/check-calendar-ux.mjs'
let check=read(checkPath)
check=replaceRequired(check,
  "const pdfService=read('src/services/weeklyProgramPdfService.ts')",
  "const pdfService=read('src/services/weeklyProgramPdfService.ts')\nconst dailyPdfService=read('src/services/dailyCalendarPdfService.ts')",
  'günlük PDF test servisi')
const dailySummaryCheck="  ['Günlük Takvim seçili gün toplamını ders saati olarak gösterir',dailyCalendar.includes('dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&dailyCalendar.includes('<span>ders saati</span>')],"
const dailyPdfChecks=[
  "  ['Günlük Takvim PDF Al butonu ders saati sayacının solundadır',dailyCalendar.includes('daily-calendar-head-actions')&&dailyCalendar.includes('daily-calendar-pdf-btn')&&dailyCalendar.indexOf('daily-calendar-pdf-btn')<dailyCalendar.indexOf('daily-lesson-count')&&dailyCalendar.includes('openDailyCalendarPdf(data,dayLessons,selectedDate,rangeStart,rangeEnd)')],",
  `  ['Günlük Takvim PDF seçili günün dinamik derslik ve saat aralığını kullanır',dailyPdfService.includes('calendarRoomColumns(data.derslikler')&&dailyPdfService.includes("pageOrientation:'landscape'")&&dailyPdfService.includes('SLOT_MINUTES=30')&&dailyPdfService.includes('rangeStart:number,rangeEnd:number')&&dailyPdfService.includes('BS-Egitim-Gunluk-Takvim-')],`,
  "  ['Günlük Takvim PDF butonu mobil başlıkta kompakt kalır',dailyCalendarCss.includes('.daily-calendar-head-actions')&&dailyCalendarCss.includes('.daily-calendar-pdf-btn')],",
].join('\n')
check=replaceRequired(check,dailySummaryCheck,`${dailySummaryCheck}\n${dailyPdfChecks}`,'günlük PDF regresyonları')
write(checkPath,check)

const workflowPath='.github/workflows/ci.yml'
let workflow=read(workflowPath)
workflow=workflow.replace("      - name: Günlük Takvim PDF geçişi\n        run: node scripts/migrate-daily-calendar-pdf.mjs\n",'')
write(workflowPath,workflow)

unlinkSync('scripts/migrate-daily-calendar-pdf.mjs')
console.log('Günlük Takvim PDF geçişi uygulandı ve geçici migrasyon temizlendi.')
