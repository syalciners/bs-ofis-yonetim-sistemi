from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Beklenen blok bulunamadı: {path}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

Path('src/components/AppHeader.tsx').write_text("""import { Cloud, RefreshCw, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from './AppDataProvider'

const pageSection=(pathname:string)=>{
  if(pathname==='/')return 'YÖNETİM ÖZETİ'
  if(pathname.startsWith('/takvim'))return 'DERS PROGRAMI'
  const labels:Record<string,string>={
    '/ogrenciler':'ÖĞRENCİ YÖNETİMİ',
    '/finans':'FİNANS',
    '/menu':'DİĞER İŞLEMLER',
    '/ogretmenler':'PERSONEL',
    '/ogretmen-odemeleri':'ÖĞRETMEN YÖNETİMİ',
    '/odevler':'ÖDEV TAKİBİ',
    '/raporlar':'RAPORLAR',
    '/sabit-program':'PROGRAM ŞABLONLARI',
    '/ayarlar':'AYARLAR',
    '/sistem':'SİSTEM',
  }
  return labels[pathname]||'BS EĞİTİM'
}

export function AppHeader() {
  const { refreshing, refresh, profile } = useAppData()
  const nav = useNavigate()
  const location = useLocation()
  const sectionLabel=pageSection(location.pathname)
  return <header className="app-header-wrap">
    <div className="app-header">
      <button className="brand" type="button" onClick={() => nav('/')}>
        <img src="./bs-egitim-icon-192-v2.png" alt="BS Eğitim" />
        <span><strong>BS Eğitim</strong><small>Yönetimi</small></span>
      </button>
      <div className="header-actions">
        <span className="cloud-chip"><Cloud size={13}/> Bulut</span>
        <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Yenile"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button>
        <button className="icon-btn" type="button" onClick={() => nav('/ayarlar')} aria-label="Ayarlar"><Settings size={17}/></button>
      </div>
    </div>
    <div className="app-header-meta">
      <span className="app-header-section">{sectionLabel}</span>
      {profile&&<div className="app-header-profile" aria-label={`${profile.ad_soyad}, ${profile.rol}`}>
        <strong>{profile.ad_soyad.toLocaleUpperCase('tr-TR')}</strong>
        <small>{profile.rol}</small>
      </div>}
    </div>
  </header>
}
""",encoding='utf-8')

fmt=Path('src/lib/format.ts')
text=fmt.read_text(encoding='utf-8')
needle="export const fullDate = (iso?: string | null) => iso ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00+03:00`)) : '—'\n"
addition="""export const weekRangeLong = (start: string, end: string) => {
  const parse = (iso: string) => new Date(`${iso}T12:00:00+03:00`)
  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', timeZone: 'Europe/Istanbul' })
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'Europe/Istanbul' })
  const year = new Intl.DateTimeFormat('tr-TR', { year: 'numeric', timeZone: 'Europe/Istanbul' })
  const startDate=parse(start),endDate=parse(end)
  const startMonth=month.format(startDate),endMonth=month.format(endDate)
  const startYear=year.format(startDate),endYear=year.format(endDate)
  if(startYear!==endYear)return `${day.format(startDate)} ${startMonth} ${startYear}-${day.format(endDate)} ${endMonth} ${endYear}`
  if(startMonth!==endMonth)return `${day.format(startDate)} ${startMonth}-${day.format(endDate)} ${endMonth} ${endYear}`
  return `${day.format(startDate)}-${day.format(endDate)} ${startMonth} ${endYear}`
}
"""+needle
if 'export const weekRangeLong' not in text:
    if needle not in text: raise SystemExit('format.ts fullDate noktası bulunamadı')
    fmt.write_text(text.replace(needle,addition,1),encoding='utf-8')

replace_once('src/pages/CalendarPage.tsx',
"import { addDays, compactWeekRange, mondayOf, shortDate, todayISO } from '../lib/format'",
"import { addDays, mondayOf, shortDate, todayISO, weekRangeLong } from '../lib/format'")
replace_once('src/pages/CalendarPage.tsx',
"""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-range\"><h1>Program</h1><div className=\"calendar-title-week-range\"><b>{compactWeekRange(monday,addDays(monday,6))}</b></div><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <button className=\"calendar-mode-btn\" type=\"button\" onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
""",
"""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-mode\"><h1>Program</h1><button className=\"calendar-mode-btn calendar-title-mode-btn\" type=\"button\" onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
""")

replace_once('src/pages/DailyCalendarPage.tsx',
"import { addDays, compactWeekRange, mondayOf, shortDate, todayISO } from '../lib/format'",
"import { addDays, mondayOf, shortDate, todayISO, weekRangeLong } from '../lib/format'")
replace_once('src/pages/DailyCalendarPage.tsx',
"""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-range\"><h1>Program</h1><div className=\"calendar-title-week-range\"><b>{compactWeekRange(monday,addDays(monday,6))}</b></div><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <button className=\"calendar-mode-btn\" type=\"button\" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
""",
"""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-mode\"><h1>Program</h1><button className=\"calendar-mode-btn calendar-title-mode-btn\" type=\"button\" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
""")

styles=Path('src/styles.css')
css=styles.read_text(encoding='utf-8')
old=".icon-btn:hover{background:#f8fafc}.desktop-user{display:none}\n"
new=""".icon-btn:hover{background:#f8fafc}.desktop-user{display:none}
.app-header-meta{width:min(1040px,calc(100% - 28px));margin:4px auto 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-height:24px;padding:0 4px;line-height:1.05}
.app-header-section{min-width:0;padding-top:1px;color:#2a8a85;font-size:10px;font-weight:900;letter-spacing:.16em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-header-profile{min-width:0;display:grid;justify-items:end;gap:1px;text-align:right}
.app-header-profile strong{max-width:190px;font-size:9.5px;font-weight:900;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-header-profile small{font-size:8.5px;font-weight:750;color:#7b8798}
"""
if old not in css: raise SystemExit('styles.css header noktası bulunamadı')
css=css.replace(old,new,1)
old2=".page-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:4px 2px}.eyebrow{display:block;font-size:9px;font-weight:900;letter-spacing:.16em;color:#2a8a85;margin-bottom:5px}.page-title-row h1{font-size:27px;line-height:1;margin:0;letter-spacing:-.04em}.page-title-row p{margin:6px 0 0;color:var(--muted);font-size:11px}.desktop-only{display:flex}\n"
new2=".page-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:2px 2px 4px}.eyebrow{display:block;font-size:9px;font-weight:900;letter-spacing:.16em;color:#2a8a85;margin-bottom:5px}.page-title-row .eyebrow{display:none}.page-title-row h1{font-size:27px;line-height:1;margin:0;letter-spacing:-.04em}.page-title-row p{margin:6px 0 0;color:var(--muted);font-size:11px}.desktop-only{display:flex}\n"
if old2 not in css: raise SystemExit('styles.css page-title noktası bulunamadı')
styles.write_text(css.replace(old2,new2,1),encoding='utf-8')

p=Path('src/program-share.css')
css=p.read_text(encoding='utf-8')
old=""".calendar-title-copy{width:100%;min-width:0}
.calendar-title-line{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.calendar-title-line h1{min-width:0}
.calendar-title-line-with-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center}
.calendar-title-line-with-range h1{justify-self:start}
.calendar-title-week-range{justify-self:center;min-width:0;color:#475569;font-size:12px;font-weight:900;white-space:nowrap}
.calendar-title-week-action{
  flex:0 0 auto;justify-self:end;min-height:38px;max-width:58%;padding:6px 11px;
  font-size:9.5px;line-height:1.15;text-align:center;box-shadow:0 5px 12px rgba(37,99,235,.14);
}
.calendar-title-week-action svg{flex:0 0 auto}

.calendar-week-toolbar{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px;min-width:0}
.calendar-week-toolbar .calendar-mode-btn{min-height:38px;padding:6px 10px;font-size:10.5px;white-space:nowrap;justify-self:start}
.calendar-week-nav-compact{display:grid;grid-template-columns:30px 82px 30px;align-items:center;gap:3px;padding:3px;background:#eef2f7;border:1px solid #e2e8f0;border-radius:12px;justify-self:end}
"""
new=""".calendar-title-copy{width:100%;min-width:0}
.calendar-title-line{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.calendar-title-line h1{min-width:0}
.calendar-title-line-with-mode{display:grid;grid-template-columns:minmax(0,1fr) minmax(112px,150px) minmax(0,1fr);align-items:center;gap:8px}
.calendar-title-line-with-mode h1{justify-self:start}
.calendar-title-mode-btn{width:100%;min-width:0;min-height:38px;padding:6px 12px;font-size:10.5px;white-space:nowrap;justify-self:center}
.calendar-title-week-action{width:100%;max-width:150px;justify-self:end;min-height:38px;padding:6px 9px;font-size:9.5px;line-height:1.15;text-align:center;box-shadow:0 5px 12px rgba(37,99,235,.14)}
.calendar-title-week-action svg{flex:0 0 auto}

.calendar-week-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0}
.calendar-week-range-long{width:100%;min-width:0;min-height:38px;display:flex;align-items:center;padding:0 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#475569;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden}
.calendar-week-range-long b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calendar-week-nav-compact{--current-week-width:clamp(150px,calc((100vw - 35px)/2),230px);display:grid;grid-template-columns:30px var(--current-week-width) 30px;align-items:center;gap:3px;padding:3px;background:#eef2f7;border:1px solid #e2e8f0;border-radius:12px;justify-self:end}
"""
if old not in css: raise SystemExit('program-share.css ana toolbar bloğu bulunamadı')
css=css.replace(old,new,1)
oldm="""  .calendar-title-line{gap:8px}
  .calendar-title-line-with-range{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:6px}
  .calendar-title-week-range{font-size:10.5px}
  .calendar-title-week-action{min-height:36px;max-width:100%;padding:5px 9px;font-size:9px;gap:5px}
  .calendar-title-week-action svg{width:15px;height:15px}
  .calendar-week-toolbar{gap:6px}
  .calendar-week-toolbar .calendar-mode-btn{min-height:36px;padding:5px 8px;font-size:9.5px;gap:5px}
  .calendar-week-toolbar .calendar-mode-btn svg{width:15px;height:15px}
  .calendar-week-nav-compact{grid-template-columns:28px 76px 28px;gap:2px;padding:3px}
  .calendar-week-nav-compact button{height:30px;min-width:28px;padding:0 5px;font-size:9.5px}
"""
newm="""  .calendar-title-line{gap:6px}
  .calendar-title-line-with-mode{grid-template-columns:minmax(0,1fr) minmax(104px,132px) minmax(0,1fr);gap:6px}
  .calendar-title-mode-btn{min-height:36px;padding:5px 8px;font-size:9.5px;gap:5px}
  .calendar-title-mode-btn svg{width:15px;height:15px}
  .calendar-title-week-action{min-height:36px;max-width:132px;padding:5px 7px;font-size:8.8px;gap:4px}
  .calendar-title-week-action svg{width:14px;height:14px}
  .calendar-week-toolbar{gap:6px}
  .calendar-week-range-long{min-height:36px;padding:0 7px;font-size:9.5px;letter-spacing:-.02em}
  .calendar-week-nav-compact{--current-week-width:calc((100vw - 35px)/2);grid-template-columns:28px var(--current-week-width) 28px;gap:2px;padding:3px}
  .calendar-week-nav-compact button{height:30px;min-width:28px;padding:0 5px;font-size:9.5px}
"""
if oldm not in css: raise SystemExit('program-share.css mobil toolbar bloğu bulunamadı')
css=css.replace(oldm,newm,1)
css += """
@media(max-width:360px){
  .calendar-title-line-with-mode{grid-template-columns:minmax(0,1fr) 100px minmax(0,1fr)}
  .calendar-title-mode-btn{font-size:9px;padding:4px 6px}
  .calendar-title-week-action{font-size:8.2px;padding:4px 5px}
  .calendar-week-range-long{font-size:8.8px;padding:0 5px}
  .calendar-week-nav-compact{--current-week-width:128px}
}
"""
p.write_text(css,encoding='utf-8')

# Takvim UX regresyonunu yeni standarda güncelle.
t=Path('scripts/check-calendar-ux.mjs')
s=t.read_text(encoding='utf-8')
s=s.replace("const main=read('src/main.tsx')\n","const main=read('src/main.tsx')\nconst appHeader=read('src/components/AppHeader.tsx')\nconst format=read('src/lib/format.ts')\n")
s=s.replace("['Günlük Takvimde Liste karşı-görünüm düğmesi kompakt hafta çubuğundadır',dailyCalendar.includes('className=\"calendar-week-toolbar\"')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')],","['Günlük Takvimde Liste karşı-görünüm düğmesi Program başlık satırındadır',dailyCalendar.includes('calendar-title-mode-btn')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('calendar-title-mode-btn')<dailyCalendar.indexOf('calendar-week-toolbar')],")
s=s.replace("['Program ve günlük Takvim tarih aralığını başlık satırının ortasında gösterir',[calendar,dailyCalendar].every(src=>src.includes('calendar-title-line calendar-title-line-with-range')&&src.includes('className=\"calendar-title-week-range\"')&&src.includes('compactWeekRange(monday,addDays(monday,6))')&&src.indexOf('calendar-title-week-range')<src.indexOf('calendar-week-toolbar'))],","['Program ve günlük Takvim uzun tarih aralığını alt hafta satırının solunda gösterir',[calendar,dailyCalendar].every(src=>src.includes('calendar-title-line calendar-title-line-with-mode')&&src.includes('className=\"calendar-week-range-long\"')&&src.includes('weekRangeLong(monday,addDays(monday,6))'))&&format.includes('export const weekRangeLong')],")
s=s.replace("['Program ve günlük Takvim alt satırda yalnız görünüm ve kompakt hafta gezintisini kullanır',[calendar,dailyCalendar].every(src=>src.includes('className=\"calendar-week-toolbar\"')&&src.includes('className=\"calendar-week-nav-compact\"')&&!src.includes('className=\"week-switcher\"')&&!src.includes('calendar-week-range-compact'))],","['Program ve günlük Takvim alt satırda tarih aralığı ve kompakt hafta gezintisini kullanır',[calendar,dailyCalendar].every(src=>src.includes('className=\"calendar-week-toolbar\"')&&src.includes('calendar-week-range-long')&&src.includes('className=\"calendar-week-nav-compact\"')&&!src.includes('className=\"week-switcher\"'))],")
anchor="const checks=[\n"
extra="""const checks=[
  ['Sayfa etiketi headerda kullanıcı ile aynı meta satırındadır',appHeader.includes('className=\"app-header-meta\"')&&appHeader.includes('className=\"app-header-section\"')&&appHeader.includes('className=\"app-header-profile\"')&&appHeader.includes("pathname.startsWith('/takvim')")],
  ['Ana sayfa etiketleri sayfa başlık satırında gizlenir',read('src/styles.css').includes('.page-title-row .eyebrow{display:none}')],
  ['Bu Hafta mobilde yönetici öğretmen kartı genişliği referansını kullanır',programCss.includes('--current-week-width:calc((100vw - 35px)/2)')],
"""
if anchor not in s: raise SystemExit('check-calendar-ux checks başlangıcı bulunamadı')
s=s.replace(anchor,extra,1)
t.write_text(s,encoding='utf-8')

print('Program üst kontrolleri, header meta satırı ve tarih formatı uygulandı.')
