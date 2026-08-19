import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const write=(path,content)=>writeFileSync(path,content)
const replaceRequired=(source,find,replacement,label)=>{
  if(!source.includes(find))throw new Error(`Haftalık Takvim PDF geçişi bulunamadı: ${label}`)
  return source.replace(find,replacement)
}

const pagePath='src/pages/DailyCalendarPage.tsx'
let page=read(pagePath)
page=replaceRequired(page,
  "  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))\n  const dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)",
  "  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))\n  const weekLessons=data.dersler.filter(x=>x.tarih>=monday&&x.tarih<=addDays(monday,6)&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||'')))\n  const dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)",
  'haftalık ders kümesi')
page=replaceRequired(page,
  "  const openDayPdf=async()=>{\n    if(!dayLessons.length){toast('Seçili günde PDF oluşturulacak ders yok.','error');return}\n    setPdfBusy(true)\n    try{await openDailyCalendarPdf(data,dayLessons,selectedDate,rangeStart,rangeEnd)}",
  "  const openDayPdf=async()=>{\n    if(!weekLessons.length){toast('Seçilen haftada PDF oluşturulacak ders yok.','error');return}\n    setPdfBusy(true)\n    try{await openDailyCalendarPdf(data,weekLessons,monday,rangeStart,rangeEnd)}",
  'haftalık PDF aksiyonu')
page=replaceRequired(page,
  "disabled={!dayLessons.length||pdfBusy} onClick={()=>void openDayPdf()}",
  "disabled={!weekLessons.length||pdfBusy} onClick={()=>void openDayPdf()}",
  'haftalık PDF buton durumu')
write(pagePath,page)

const checkPath='scripts/check-calendar-ux.mjs'
let check=read(checkPath)
check=replaceRequired(check,
  "  ['Günlük Takvim PDF Al butonu ders saati sayacının solundadır',dailyCalendar.includes('daily-calendar-head-actions')&&dailyCalendar.includes('daily-calendar-pdf-btn')&&dailyCalendar.indexOf('daily-calendar-pdf-btn')<dailyCalendar.indexOf('daily-lesson-count')&&dailyCalendar.includes('openDailyCalendarPdf(data,dayLessons,selectedDate,rangeStart,rangeEnd)')],\n  ['Günlük Takvim PDF seçili günün dinamik derslik ve saat aralığını kullanır',dailyPdfService.includes('calendarRoomColumns(data.derslikler')&&dailyPdfService.includes(\"pageOrientation:'landscape'\")&&dailyPdfService.includes('SLOT_MINUTES=30')&&dailyPdfService.includes('rangeStart:number,rangeEnd:number')&&dailyPdfService.includes('BS-Egitim-Gunluk-Takvim-')],",
  "  ['Takvim PDF Al butonu ders saati sayacının solunda kalır ve haftalık veriyle çalışır',dailyCalendar.includes('daily-calendar-head-actions')&&dailyCalendar.includes('daily-calendar-pdf-btn')&&dailyCalendar.indexOf('daily-calendar-pdf-btn')<dailyCalendar.indexOf('daily-lesson-count')&&dailyCalendar.includes('const weekLessons=data.dersler.filter')&&dailyCalendar.includes('openDailyCalendarPdf(data,weekLessons,monday,rangeStart,rangeEnd)')&&dailyCalendar.includes('disabled={!weekLessons.length||pdfBusy}')],\n  ['Takvim PDF tek haftalık tabloda gün saat ve dinamik derslikleri gösterir',dailyPdfService.includes('const monday=mondayOf(date)')&&dailyPdfService.includes('const sunday=addDays(monday,6)')&&dailyPdfService.includes(\"text:'GÜN'\")&&dailyPdfService.includes(\"text:'SAAT'\")&&dailyPdfService.includes('calendarRoomColumns(data.derslikler')&&dailyPdfService.includes('occupiedSlots')&&dailyPdfService.includes(\"pageOrientation:'landscape'\")&&dailyPdfService.includes('BS-Egitim-Haftalik-Takvim-')],",
  'haftalık PDF regresyonları')
write(checkPath,check)

const workflowPath='.github/workflows/ci.yml'
let workflow=read(workflowPath)
workflow=workflow.replace("      - name: Haftalık Takvim PDF geçişi\n        run: node scripts/migrate-weekly-calendar-pdf.mjs\n",'')
write(workflowPath,workflow)

unlinkSync('scripts/migrate-weekly-calendar-pdf.mjs')
console.log('Haftalık Takvim PDF geçişi uygulandı ve geçici migrasyon temizlendi.')
