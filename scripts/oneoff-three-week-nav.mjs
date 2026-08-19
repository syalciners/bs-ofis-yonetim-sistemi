import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const replaceOnce=(source,from,to,label)=>{
  const count=source.split(from).length-1
  if(count!==1)throw new Error(`${label}: beklenen 1 eşleşme yerine ${count} bulundu.`)
  return source.replace(from,to)
}

{
  const path='src/pages/DailyCalendarPage.tsx'
  let src=readFileSync(path,'utf8')

  src=replaceOnce(src,
`  const[monday,setMonday]=useState(()=>{const stored=sessionStorage.getItem('bs-takvim-hafta');return stored&&/^\\d{4}-\\d{2}-\\d{2}$/.test(stored)?stored:baseMonday})`,
`  const[monday,setMonday]=useState(()=>{
    const stored=sessionStorage.getItem('bs-takvim-hafta')
    if(!stored||!/^\\d{4}-\\d{2}-\\d{2}$/.test(stored))return baseMonday
    const storedOffset=Math.round((new Date(\`${'${stored}'}T12:00:00\`).getTime()-new Date(\`${'${baseMonday}'}T12:00:00\`).getTime())/(7*86400000))
    return addDays(baseMonday,Math.max(-1,Math.min(1,storedOffset))*7)
  })`,
  'Takvim oturum haftasını üç hafta ile sınırla')

  src=replaceOnce(src,
`  const moveWeek=(delta:number)=>{setMonday(current=>addDays(current,delta*7));setWeekReview(null)}
  const goCurrentWeek=()=>{setMonday(baseMonday);setWeekReview(null)}`,
`  const moveWeek=(delta:number)=>{
    const nextOffset=Math.max(-1,Math.min(1,weekOffset+delta))
    setMonday(addDays(baseMonday,nextOffset*7))
    setWeekReview(null)
  }
  const goCurrentWeek=()=>{setMonday(baseMonday);setWeekReview(null)}
  const weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'`,
  'Üç haftalık gezinti ve dinamik etiket')

  src=replaceOnce(src,
`        <button type="button" aria-label="Önceki hafta" onClick={()=>moveWeek(-1)}>‹</button>
        <button type="button" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>Bu Hafta</button>
        <button type="button" aria-label="Gelecek hafta" onClick={()=>moveWeek(1)}>›</button>`,
`        <button type="button" aria-label="Önceki hafta" disabled={weekOffset<=-1} onClick={()=>moveWeek(-1)}>‹</button>
        <button type="button" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>{weekNavLabel}</button>
        <button type="button" aria-label="Gelecek hafta" disabled={weekOffset>=1} onClick={()=>moveWeek(1)}>›</button>`,
  'Hafta gezinti butonları')

  writeFileSync(path,src)
}

{
  const path='scripts/check-calendar-ux.mjs'
  let src=readFileSync(path,'utf8')

  src=replaceOnce(src,
`  ['Kompakt hafta çubuğu önceki Bu Hafta gelecek kontrollerini iki görünümde de içerir',[calendar,dailyCalendar].every(src=>src.includes('aria-label="Önceki hafta"')&&src.includes('>Bu Hafta</button>')&&src.includes('aria-label="Gelecek hafta"'))],`,
`  ['Kompakt hafta çubuğu önceki hafta merkez etiketi gelecek hafta kontrollerini içerir',calendar.includes('aria-label="Önceki hafta"')&&calendar.includes('>Bu Hafta</button>')&&calendar.includes('aria-label="Gelecek hafta"')&&dailyCalendar.includes('aria-label="Önceki hafta"')&&dailyCalendar.includes('{weekNavLabel}</button>')&&dailyCalendar.includes('aria-label="Gelecek hafta"')],`,
  'Kompakt hafta gezintisi regresyonu')

  src=replaceOnce(src,
`  ['Bu Hafta iki görünümde güncel haftaya döner',calendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')&&dailyCalendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')],`,
`  ['Bu Hafta iki görünümde güncel haftaya döner',calendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')&&dailyCalendar.includes('onClick={goCurrentWeek}>{weekNavLabel}</button>')],
  ['Günlük Takvim yalnız geçen bu ve gelecek haftayı gösterir',dailyCalendar.includes("weekNavLabel=weekOffset<0?'Geçen Hafta':weekOffset>0?'Gelecek Hafta':'Bu Hafta'")&&dailyCalendar.includes('disabled={weekOffset<=-1}')&&dailyCalendar.includes('disabled={weekOffset>=1}')&&dailyCalendar.includes('Math.max(-1,Math.min(1,weekOffset+delta))')&&dailyCalendar.includes('Math.max(-1,Math.min(1,storedOffset))')],`,
  'Üç haftalık gezinti regresyonu')

  writeFileSync(path,src)
}

{
  const path='package.json'
  let src=readFileSync(path,'utf8')
  src=replaceOnce(src,
`    "check:rules": "node scripts/oneoff-three-week-nav.mjs && node scripts/check-business-rules-current.mjs",`,
`    "check:rules": "node scripts/check-business-rules-current.mjs",`,
  'Geçici package komutu')
  writeFileSync(path,src)
}

unlinkSync('scripts/oneoff-three-week-nav.mjs')
console.log('Üç haftalık Takvim gezintisi uygulandı; geçici migrasyon temizlendi.')
