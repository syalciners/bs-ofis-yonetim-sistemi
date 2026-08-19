import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const replaceOnce=(source,oldText,newText,label)=>{
  if(!source.includes(oldText))throw new Error(`${label}: beklenen kaynak bulunamadı`)
  return source.replace(oldText,newText)
}

const calendarPath='src/pages/CalendarPage.tsx'
let calendar=readFileSync(calendarPath,'utf8')
calendar=replaceOnce(
  calendar,
  "  return Math.round((target-base)/(7*86400000))",
  "  return Math.max(-1,Math.min(1,Math.round((target-base)/(7*86400000))))",
  'Saklanan hafta sınırı',
)
calendar=replaceOnce(
  calendar,
  "  const moveWeek=(delta:number)=>{setWeekOffset(current=>current+delta);setWeekReview(null);setShareOpen(false)}\n  const goCurrentWeek=()=>{setWeekOffset(0);setWeekReview(null);setShareOpen(false)}",
  "  const moveWeek=(delta:number)=>{setWeekOffset(current=>Math.max(-1,Math.min(1,current+delta)));setWeekReview(null);setShareOpen(false)}\n  const goCurrentWeek=()=>{setWeekOffset(0);setWeekReview(null);setShareOpen(false)}\n  const weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'",
  'Liste hafta hareketi',
)
calendar=replaceOnce(
  calendar,
  "        <button type=\"button\" aria-label=\"Önceki hafta\" onClick={()=>moveWeek(-1)}>‹</button>\n        <button type=\"button\" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>Bu Hafta</button>\n        <button type=\"button\" aria-label=\"Gelecek hafta\" onClick={()=>moveWeek(1)}>›</button>",
  "        <button type=\"button\" aria-label=\"Önceki hafta\" disabled={weekOffset<=-1} onClick={()=>moveWeek(-1)}>‹</button>\n        <button type=\"button\" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>{weekNavLabel}</button>\n        <button type=\"button\" aria-label=\"Gelecek hafta\" disabled={weekOffset>=1} onClick={()=>moveWeek(1)}>›</button>",
  'Liste hafta butonları',
)
writeFileSync(calendarPath,calendar)

const checkPath='scripts/check-calendar-ux.mjs'
let check=readFileSync(checkPath,'utf8')
check=replaceOnce(
  check,
  "  ['Kompakt hafta çubuğu önceki hafta merkez etiketi gelecek hafta kontrollerini içerir',calendar.includes('aria-label=\"Önceki hafta\"')&&calendar.includes('>Bu Hafta</button>')&&calendar.includes('aria-label=\"Gelecek hafta\"')&&dailyCalendar.includes('aria-label=\"Önceki hafta\"')&&dailyCalendar.includes('{weekNavLabel}</button>')&&dailyCalendar.includes('aria-label=\"Gelecek hafta\"')],",
  "  ['Kompakt hafta çubuğu önceki hafta merkez etiketi gelecek hafta kontrollerini içerir',[calendar,dailyCalendar].every(src=>src.includes('aria-label=\"Önceki hafta\"')&&src.includes('{weekNavLabel}</button>')&&src.includes('aria-label=\"Gelecek hafta\"'))],",
  'Merkez hafta etiketi regresyonu',
)
check=replaceOnce(
  check,
  "  ['Bu Hafta iki görünümde güncel haftaya döner',calendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')&&dailyCalendar.includes('onClick={goCurrentWeek}>{weekNavLabel}</button>')],",
  "  ['Merkez hafta düğmesi iki görünümde güncel haftaya döner',[calendar,dailyCalendar].every(src=>src.includes('onClick={goCurrentWeek}>{weekNavLabel}</button>'))],",
  'Güncel haftaya dönüş regresyonu',
)
check=replaceOnce(
  check,
  "  ['Günlük Takvim yalnız geçen bu ve gelecek haftayı gösterir',dailyCalendar.includes(\"weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'\")&&dailyCalendar.includes('disabled={weekOffset<=-1}')&&dailyCalendar.includes('disabled={weekOffset>=1}')&&dailyCalendar.includes('Math.max(-1,Math.min(1,weekOffset+delta))')&&dailyCalendar.includes('Math.max(-1,Math.min(1,storedOffset))')],",
  "  ['Program Liste ve günlük Takvim yalnız geçen bu ve gelecek haftayı gösterir',calendar.includes(\"weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'\")&&calendar.includes('disabled={weekOffset<=-1}')&&calendar.includes('disabled={weekOffset>=1}')&&calendar.includes('Math.max(-1,Math.min(1,current+delta))')&&calendar.includes('return Math.max(-1,Math.min(1,Math.round((target-base)/(7*86400000))))')&&dailyCalendar.includes(\"weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'\")&&dailyCalendar.includes('disabled={weekOffset<=-1}')&&dailyCalendar.includes('disabled={weekOffset>=1}')&&dailyCalendar.includes('Math.max(-1,Math.min(1,weekOffset+delta))')&&dailyCalendar.includes('Math.max(-1,Math.min(1,storedOffset))')],",
  'Üç haftalık sınır regresyonu',
)
writeFileSync(checkPath,check)

const packagePath='package.json'
const pkg=JSON.parse(readFileSync(packagePath,'utf8'))
pkg.scripts['check:rules']='node scripts/check-business-rules-current.mjs'
writeFileSync(packagePath,`${JSON.stringify(pkg,null,2)}\n`)
unlinkSync(new URL(import.meta.url))
console.log('Liste görünümü üç haftalık gezintiye geçirildi; geçici migrasyon temizlendi.')
