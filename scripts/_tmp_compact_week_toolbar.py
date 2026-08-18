from pathlib import Path
import subprocess


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: beklenen parça {count} kez bulundu')
    p.write_text(text.replace(old, new, 1))

# Ortak kompakt hafta aralığı biçimi.
format_path = Path('src/lib/format.ts')
format_text = format_path.read_text()
needle = "export const shortDate = (iso?: string | null) => iso ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(`${iso}T12:00:00+03:00`)) : '—'\n"
if format_text.count(needle) != 1:
    raise SystemExit('format.ts: shortDate satırı bulunamadı')
compact_helper = needle + "export const compactWeekRange = (start: string, end: string) => {\n  const parse = (iso: string) => new Date(`${iso}T12:00:00+03:00`)\n  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', timeZone: 'Europe/Istanbul' })\n  const month = new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'Europe/Istanbul' })\n  const startDate = parse(start), endDate = parse(end)\n  const startMonth = month.format(startDate), endMonth = month.format(endDate)\n  return startMonth === endMonth ? `${day.format(startDate)}–${day.format(endDate)} ${startMonth}` : `${day.format(startDate)} ${startMonth}–${day.format(endDate)} ${endMonth}`\n}\n"
format_path.write_text(format_text.replace(needle, compact_helper, 1))

# Program / Liste görünümü.
replace_once(
    'src/pages/CalendarPage.tsx',
    "import { addDays, mondayOf, shortDate, todayISO } from '../lib/format'",
    "import { addDays, compactWeekRange, mondayOf, shortDate, todayISO } from '../lib/format'",
)
replace_once(
    'src/pages/CalendarPage.tsx',
    "const weekChoices=[\n  {offset:-1,label:'Önceki Hafta'},\n  {offset:0,label:'Bu Hafta'},\n  {offset:1,label:'Gelecek Hafta'},\n]\n\n",
    "",
)
replace_once(
    'src/pages/CalendarPage.tsx',
    "  const chooseFilter=(next:CalendarFilter)=>{setFilter(next);setShareOpen(false)}\n",
    "  const chooseFilter=(next:CalendarFilter)=>{setFilter(next);setShareOpen(false)}\n  const moveWeek=(delta:number)=>{setWeekOffset(current=>current+delta);setWeekReview(null);setShareOpen(false)}\n  const goCurrentWeek=()=>{setWeekOffset(0);setWeekReview(null);setShareOpen(false)}\n",
)
old_calendar = '''    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Program</h1></div></div></section>\n\n    <section className="week-context-row" aria-label="Program hafta komutları" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',alignItems:'center',gap:10}}>\n      <button className="calendar-mode-btn" type="button" style={{justifySelf:'start'}} onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button>\n      <div className="week-range" style={{justifySelf:'center'}}><b>{shortDate(monday)} – {shortDate(addDays(monday,6))}</b></div>\n      <button className="primary-btn calendar-title-week-action" style={{justifySelf:'end',maxWidth:'none'}} disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button>\n    </section>\n    <section className="week-switcher" aria-label="Hafta seçimi">\n      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>{setWeekOffset(x.offset);setWeekReview(null);setShareOpen(false)}}>{x.label}</button>)}\n    </section>\n'''
new_calendar = '''    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Program</h1><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>\n\n    <section className="calendar-week-toolbar" aria-label="Program hafta gezintisi">\n      <button className="calendar-mode-btn" type="button" onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button>\n      <div className="calendar-week-range-compact"><b>{compactWeekRange(monday,addDays(monday,6))}</b></div>\n      <div className="calendar-week-nav-compact" role="group" aria-label="Hafta değiştir">\n        <button type="button" aria-label="Önceki hafta" onClick={()=>moveWeek(-1)}>‹</button>\n        <button type="button" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>Bu Hafta</button>\n        <button type="button" aria-label="Gelecek hafta" onClick={()=>moveWeek(1)}>›</button>\n      </div>\n    </section>\n'''
replace_once('src/pages/CalendarPage.tsx', old_calendar, new_calendar)

# Günlük Takvim görünümü.
replace_once(
    'src/pages/DailyCalendarPage.tsx',
    "import { addDays, mondayOf, shortDate, todayISO } from '../lib/format'",
    "import { addDays, compactWeekRange, mondayOf, shortDate, todayISO } from '../lib/format'",
)
replace_once(
    'src/pages/DailyCalendarPage.tsx',
    "const weekChoices=[\n  {offset:-1,label:'Önceki Hafta'},\n  {offset:0,label:'Bu Hafta'},\n  {offset:1,label:'Gelecek Hafta'},\n]\n\n",
    "",
)
replace_once(
    'src/pages/DailyCalendarPage.tsx',
    "  const selectWeek=(offset:number)=>{setMonday(addDays(baseMonday,offset*7));setWeekReview(null)}\n",
    "  const moveWeek=(delta:number)=>{setMonday(current=>addDays(current,delta*7));setWeekReview(null)}\n  const goCurrentWeek=()=>{setMonday(baseMonday);setWeekReview(null)}\n",
)
old_daily = '''    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Program</h1></div></div></section>\n\n    <section className="week-context-row" aria-label="Program hafta komutları" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',alignItems:'center',gap:10}}>\n      <button className="calendar-mode-btn" type="button" style={{justifySelf:'start'}} onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>\n      <div className="week-range" style={{justifySelf:'center'}}><b>{shortDate(monday)} – {shortDate(addDays(monday,6))}</b></div>\n      <button className="primary-btn calendar-title-week-action" style={{justifySelf:'end',maxWidth:'none'}} disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button>\n    </section>\n    <section className="week-switcher" aria-label="Hafta seçimi">\n      {weekChoices.map(x=><button key={x.offset} className={weekOffset===x.offset?'active':''} onClick={()=>selectWeek(x.offset)}>{x.label}</button>)}\n    </section>\n'''
new_daily = '''    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Program</h1><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>\n\n    <section className="calendar-week-toolbar" aria-label="Program hafta gezintisi">\n      <button className="calendar-mode-btn" type="button" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>\n      <div className="calendar-week-range-compact"><b>{compactWeekRange(monday,addDays(monday,6))}</b></div>\n      <div className="calendar-week-nav-compact" role="group" aria-label="Hafta değiştir">\n        <button type="button" aria-label="Önceki hafta" onClick={()=>moveWeek(-1)}>‹</button>\n        <button type="button" className={weekOffset===0?'active':''} onClick={goCurrentWeek}>Bu Hafta</button>\n        <button type="button" aria-label="Gelecek hafta" onClick={()=>moveWeek(1)}>›</button>\n      </div>\n    </section>\n'''
replace_once('src/pages/DailyCalendarPage.tsx', old_daily, new_daily)

# Kompakt tek satır toolbar stili.
css_path = Path('src/program-share.css')
css = css_path.read_text()
anchor = ".calendar-title-week-action svg{flex:0 0 auto}\n"
if css.count(anchor) != 1:
    raise SystemExit('program-share.css: toolbar CSS ankrajı bulunamadı')
compact_css = anchor + "\n.calendar-week-toolbar{display:grid;grid-template-columns:auto minmax(62px,1fr) auto;align-items:center;gap:8px;min-width:0}\n.calendar-week-toolbar .calendar-mode-btn{min-height:38px;padding:6px 10px;font-size:10.5px;white-space:nowrap}\n.calendar-week-range-compact{min-width:0;text-align:center;color:#475569;font-size:12px;font-weight:900;white-space:nowrap}\n.calendar-week-nav-compact{display:grid;grid-template-columns:30px auto 30px;align-items:center;gap:3px;padding:3px;background:#eef2f7;border:1px solid #e2e8f0;border-radius:12px}\n.calendar-week-nav-compact button{height:32px;min-width:30px;padding:0 7px;border:0;border-radius:9px;background:transparent;color:#475569;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}\n.calendar-week-nav-compact button:first-child,.calendar-week-nav-compact button:last-child{font-size:22px;line-height:1}\n.calendar-week-nav-compact button.active{background:#2563eb;color:#fff;box-shadow:0 4px 10px rgba(37,99,235,.18)}\n"
css = css.replace(anchor, compact_css, 1)
mobile_anchor = "  .calendar-title-week-action svg{width:15px;height:15px}\n"
if css.count(mobile_anchor) != 1:
    raise SystemExit('program-share.css: mobil toolbar CSS ankrajı bulunamadı')
mobile_css = mobile_anchor + "  .calendar-week-toolbar{gap:6px}\n  .calendar-week-toolbar .calendar-mode-btn{min-height:36px;padding:5px 8px;font-size:9.5px;gap:5px}\n  .calendar-week-toolbar .calendar-mode-btn svg{width:15px;height:15px}\n  .calendar-week-range-compact{font-size:10.5px}\n  .calendar-week-nav-compact{grid-template-columns:28px auto 28px;gap:2px;padding:3px}\n  .calendar-week-nav-compact button{height:30px;min-width:28px;padding:0 5px;font-size:9.5px}\n  .calendar-week-nav-compact button:first-child,.calendar-week-nav-compact button:last-child{font-size:20px}\n"
css = css.replace(mobile_anchor, mobile_css, 1)
css_path.write_text(css)

# Regresyon testini yeni UX standardına geçir.
test_path = Path('scripts/check-calendar-ux.mjs')
test = test_path.read_text()
old_checks = '''  ['Günlük Takvimde Liste karşı-görünüm düğmesi ortak hafta komut satırındadır',dailyCalendar.includes('className="week-context-row"')&&dailyCalendar.includes("onClick={()=>nav('/takvim')}")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('<List size={16}/>Liste')<dailyCalendar.indexOf('className="week-switcher"')],\n  ['Program ve günlük Takvim aynı üçlü hafta seçim modelini kullanır',['Önceki Hafta','Bu Hafta','Gelecek Hafta'].every(label=>calendar.includes(`label:'${label}'`)&&dailyCalendar.includes(`label:'${label}'`))&&dailyCalendar.includes('className="week-switcher"')&&dailyCalendar.includes('{shortDate(monday)} – {shortDate(addDays(monday,6))}')],\n  ['Günlük Takvimde eski büyük oklu hafta kartı ve açıklama kaldırılmıştır',!dailyCalendar.includes('daily-week-nav')&&!dailyCalendar.includes('weekTitle(')&&!dailyCalendar.includes('ChevronLeft')&&!dailyCalendar.includes('ChevronRight')&&!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],\n'''
new_checks = '''  ['Günlük Takvimde Liste karşı-görünüm düğmesi kompakt hafta çubuğundadır',dailyCalendar.includes('className="calendar-week-toolbar"')&&dailyCalendar.includes("onClick={()=>nav('/takvim')}")&&dailyCalendar.includes('<List size={16}/>Liste')],\n  ['Program ve günlük Takvim tek satırlık kompakt hafta çubuğunu kullanır',[calendar,dailyCalendar].every(src=>src.includes('className="calendar-week-toolbar"')&&src.includes('compactWeekRange(monday,addDays(monday,6))')&&!src.includes('className="week-switcher"'))],\n  ['Kompakt hafta çubuğu önceki Bu Hafta gelecek kontrollerini iki görünümde de içerir',[calendar,dailyCalendar].every(src=>src.includes('aria-label="Önceki hafta"')&&src.includes('>Bu Hafta</button>')&&src.includes('aria-label="Gelecek hafta"'))],\n  ['Günlük Takvimde eski büyük oklu hafta kartı ve açıklama kaldırılmıştır',!dailyCalendar.includes('daily-week-nav')&&!dailyCalendar.includes('weekTitle(')&&!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],\n'''
if test.count(old_checks) != 1:
    raise SystemExit('check-calendar-ux: üst hafta kontrolleri bloğu bulunamadı')
test = test.replace(old_checks, new_checks, 1)
old_three = '''  ['Takvim Önceki Hafta butonunu içerir',calendar.includes("label:'Önceki Hafta'")],\n  ['Takvim Bu Hafta butonunu içerir',calendar.includes("label:'Bu Hafta'")],\n  ['Takvim Gelecek Hafta butonunu içerir',calendar.includes("label:'Gelecek Hafta'")],\n  ['Manuel Haftayı Hazırla aksiyonu Takvim başlığının sağındadır',calendar.includes('calendar-title-line')&&calendar.includes('calendar-title-week-action')&&calendar.includes("'Haftayı Hazırla'")&&calendar.indexOf('calendar-title-week-action')<calendar.indexOf('week-switcher')],\n'''
new_three = '''  ['Takvim önceki hafta oku göreli olarak bir hafta geri gider',calendar.includes('onClick={()=>moveWeek(-1)}>‹</button>')&&dailyCalendar.includes('onClick={()=>moveWeek(-1)}>‹</button>')],\n  ['Bu Hafta iki görünümde güncel haftaya döner',calendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')&&dailyCalendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')],\n  ['Takvim gelecek hafta oku göreli olarak bir hafta ileri gider',calendar.includes('onClick={()=>moveWeek(1)}>›</button>')&&dailyCalendar.includes('onClick={()=>moveWeek(1)}>›</button>')],\n  ['Manuel Haftayı Hazırla aksiyonu Program başlığının sağındadır',calendar.includes('calendar-title-line')&&calendar.includes('calendar-title-week-action')&&calendar.includes("'Haftayı Hazırla'")&&calendar.indexOf('calendar-title-week-action')<calendar.indexOf('calendar-week-toolbar')&&dailyCalendar.indexOf('calendar-title-week-action')<dailyCalendar.indexOf('calendar-week-toolbar')],\n'''
if test.count(old_three) != 1:
    raise SystemExit('check-calendar-ux: eski üçlü hafta butonu kontrolleri bulunamadı')
test = test.replace(old_three, new_three, 1)
old_active = "  ['Seçili hafta belirgin mavi zemindir',css.includes('.week-switcher button.active{background:#2563eb;color:#fff')],\n"
new_active = "  ['Bu Hafta güncel haftadayken belirgin mavi zemindir',programCss.includes('.calendar-week-nav-compact button.active{background:#2563eb;color:#fff')],\n"
if test.count(old_active) != 1:
    raise SystemExit('check-calendar-ux: seçili hafta CSS kontrolü bulunamadı')
test = test.replace(old_active, new_active, 1)
test_path.write_text(test)

# Geçici CI müdahalesini ve bu scripti nihai diff'ten kaldır.
ci = subprocess.check_output(['git','show','origin/main:.github/workflows/ci.yml'], text=True)
Path('.github/workflows/ci.yml').write_text(ci)
Path(__file__).unlink()

print('Kompakt hafta kontrolü iki görünümde uygulandı; geçici dosyalar temizlendi.')
