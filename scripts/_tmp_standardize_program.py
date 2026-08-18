from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: beklenen 1 eşleşme, bulunan {count}")
    return text.replace(old, new, 1)

page_path = Path('src/pages/DailyCalendarPage.tsx')
text = page_path.read_text(encoding='utf-8')

text = replace_once(
    text,
    "import { CalendarCheck2, Check, ChevronLeft, ChevronRight, List, Plus, X } from 'lucide-react'",
    "import { CalendarCheck2, Check, List, Plus, X } from 'lucide-react'",
    'Chevron importları',
)

text = replace_once(
    text,
    """const days=[
  {short:'Pzt',long:'Pazartesi'},
  {short:'Sal',long:'Salı'},
  {short:'Çar',long:'Çarşamba'},
  {short:'Per',long:'Perşembe'},
  {short:'Cum',long:'Cuma'},
  {short:'Cmt',long:'Cumartesi'},
  {short:'Paz',long:'Pazar'},
]
""",
    """const days=[
  {short:'Pzt',long:'Pazartesi'},
  {short:'Sal',long:'Salı'},
  {short:'Çar',long:'Çarşamba'},
  {short:'Per',long:'Perşembe'},
  {short:'Cum',long:'Cuma'},
  {short:'Cmt',long:'Cumartesi'},
  {short:'Paz',long:'Pazar'},
]
const weekChoices=[
  {offset:-1,label:'Önceki Hafta'},
  {offset:0,label:'Bu Hafta'},
  {offset:1,label:'Gelecek Hafta'},
]
""",
    'Hafta seçimleri',
)

text = replace_once(
    text,
    """const weekTitle=(monday:string)=>{
  const sunday=addDays(monday,6)
  const left=new Date(`${monday}T12:00:00`)
  const right=new Date(`${sunday}T12:00:00`)
  const leftDay=left.toLocaleDateString('tr-TR',{day:'numeric'})
  const rightFull=right.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})
  if(left.getMonth()===right.getMonth()&&left.getFullYear()===right.getFullYear())return `${leftDay} – ${rightFull}`
  const leftFull=left.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:left.getFullYear()===right.getFullYear()?undefined:'numeric'})
  return `${leftFull} – ${rightFull}`
}
""",
    '',
    'Eski büyük hafta başlığı',
)

text = replace_once(
    text,
    """  const isPastWeek=monday<baseMonday;const isCurrentWeek=monday===baseMonday
""",
    """  const isPastWeek=monday<baseMonday;const isCurrentWeek=monday===baseMonday
  const weekOffset=Math.round((new Date(`${monday}T12:00:00`).getTime()-new Date(`${baseMonday}T12:00:00`).getTime())/(7*86400000))
  const selectWeek=(offset:number)=>{setMonday(addDays(baseMonday,offset*7));setWeekReview(null)}
""",
    'Günlük hafta ofseti',
)

text = replace_once(
    text,
    """  const changeWeek=(delta:number)=>{setMonday(addDays(monday,delta*7));setWeekReview(null)}
""",
    '',
    'Eski oklarla hafta değiştirme',
)

old_header = """  return <div className=\"page-stack calendar-v2 daily-calendar-page\">
    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line\"><h1>Takvim</h1><div className=\"calendar-title-actions\"><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></div></section>

    <section className=\"daily-mode-switch-row\" aria-label=\"Program görünümü\">
      <button className=\"calendar-mode-btn\" type=\"button\" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>
    </section>

    <section className=\"daily-week-nav\" aria-label=\"Hafta değiştir\">
      <button type=\"button\" aria-label=\"Önceki hafta\" onClick={()=>changeWeek(-1)}><ChevronLeft size={20}/></button>
      <div><span>HAFTA</span><b>{weekTitle(monday)}</b></div>
      <button type=\"button\" aria-label=\"Sonraki hafta\" onClick={()=>changeWeek(1)}><ChevronRight size={20}/></button>
    </section>
"""

new_header = """  return <div className=\"page-stack calendar-v2 daily-calendar-page\">
    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line\"><h1>Program</h1></div></div></section>

    <section className=\"week-context-row\" aria-label=\"Program hafta komutları\" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',alignItems:'center',gap:10}}>
      <button className=\"calendar-mode-btn\" type=\"button\" style={{justifySelf:'start'}} onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>
      <div className=\"week-range\" style={{justifySelf:'center'}}><b>{shortDate(monday)} – {shortDate(addDays(monday,6))}</b></div>
      <button className=\"primary-btn calendar-title-week-action\" style={{justifySelf:'end',maxWidth:'none'}} disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button>
    </section>
    <section className=\"week-switcher\" aria-label=\"Hafta seçimi\">
      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>selectWeek(x.offset)}>{x.label}</button>)}
    </section>
"""
text = replace_once(text, old_header, new_header, 'Günlük Program üst yapısı')
page_path.write_text(text, encoding='utf-8')

check_path = Path('scripts/check-calendar-ux.mjs')
check = check_path.read_text(encoding='utf-8')
old_checks = """  ['Program Liste görünümünde tek Takvim karşı-görünüm düğmesi vardır',calendar.includes(\"onClick={()=>nav('/takvim/gunluk')}\")&&calendar.includes('<CalendarDays size={16}/>Takvim')],
  ['Günlük Takvimde tek Liste karşı-görünüm düğmesi başlığın altında soldadır',dailyCalendar.includes('daily-mode-switch-row')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('daily-mode-switch-row')>dailyCalendar.indexOf('<h1>Takvim</h1>')&&dailyCalendar.indexOf('daily-mode-switch-row')<dailyCalendar.indexOf('daily-week-nav')&&dailyCalendarCss.includes('.daily-mode-switch-row{display:flex;align-items:center;justify-content:flex-start')],
  ['Günlük Takvim açıklaması ve başlık sağındaki eski Liste düğmesi kaldırılmıştır',!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],
"""
new_checks = """  ['Program Liste görünümünde tek Takvim karşı-görünüm düğmesi vardır',calendar.includes(\"onClick={()=>nav('/takvim/gunluk')}\")&&calendar.includes('<CalendarDays size={16}/>Takvim')],
  ['Program ve günlük Takvim aynı Program başlığını kullanır',calendar.includes('<h1>Program</h1>')&&dailyCalendar.includes('<h1>Program</h1>')&&!dailyCalendar.includes('<h1>Takvim</h1>')],
  ['Günlük Takvimde Liste karşı-görünüm düğmesi ortak hafta komut satırındadır',dailyCalendar.includes('className=\"week-context-row\"')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('<List size={16}/>Liste')<dailyCalendar.indexOf('className=\"week-switcher\"')],
  ['Program ve günlük Takvim aynı üçlü hafta seçim modelini kullanır',['Önceki Hafta','Bu Hafta','Gelecek Hafta'].every(label=>calendar.includes(`label:'${label}'`)&&dailyCalendar.includes(`label:'${label}'`))&&dailyCalendar.includes('className=\"week-switcher\"')&&dailyCalendar.includes('{shortDate(monday)} – {shortDate(addDays(monday,6))}')],
  ['Günlük Takvimde eski büyük oklu hafta kartı ve açıklama kaldırılmıştır',!dailyCalendar.includes('daily-week-nav')&&!dailyCalendar.includes('weekTitle(')&&!dailyCalendar.includes('ChevronLeft')&&!dailyCalendar.includes('ChevronRight')&&!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],
"""
check = replace_once(check, old_checks, new_checks, 'Takvim UX standart testleri')
check_path.write_text(check, encoding='utf-8')

print('Program üst yapısı standartlaştırıldı.')
