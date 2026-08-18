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
      <div className="app-header-main">
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
    </div>
  </header>
}
""",encoding='utf-8')

old_calendar="""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-mode\"><h1>Program</h1><button className=\"calendar-mode-btn calendar-title-mode-btn\" type=\"button\" onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
"""
new_calendar="""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-balanced\"><h1>Program</h1><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar calendar-week-toolbar-balanced\" aria-label=\"Program hafta gezintisi\">
      <button className=\"calendar-mode-btn calendar-toolbar-mode-btn\" type=\"button\" onClick={()=>nav('/takvim/gunluk')}><CalendarDays size={16}/>Takvim</button>
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
"""
replace_once('src/pages/CalendarPage.tsx',old_calendar,new_calendar)

old_daily="""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-with-mode\"><h1>Program</h1><button className=\"calendar-mode-btn calendar-title-mode-btn\" type=\"button\" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar\" aria-label=\"Program hafta gezintisi\">
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
"""
new_daily="""    <section className=\"page-title-row\"><div className=\"calendar-title-copy\"><span className=\"eyebrow\">DERS PROGRAMI</span><div className=\"calendar-title-line calendar-title-line-balanced\"><h1>Program</h1><button className=\"primary-btn calendar-title-week-action\" disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></section>

    <section className=\"calendar-week-toolbar calendar-week-toolbar-balanced\" aria-label=\"Program hafta gezintisi\">
      <button className=\"calendar-mode-btn calendar-toolbar-mode-btn\" type=\"button\" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>
      <div className=\"calendar-week-range-long\"><b>{weekRangeLong(monday,addDays(monday,6))}</b></div>
      <div className=\"calendar-week-nav-compact\" role=\"group\" aria-label=\"Hafta değiştir\">
"""
replace_once('src/pages/DailyCalendarPage.tsx',old_daily,new_daily)

css=Path('src/program-share.css')
text=css.read_text(encoding='utf-8')
marker='/* Header ve Program dengeli yerleşim */'
if marker not in text:
    text += """

/* Header ve Program dengeli yerleşim */
.app-header{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:7px;padding:8px 12px 7px}
.app-header-main{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.app-header-meta{width:100%;margin:0;padding:6px 2px 0;border-top:1px solid #edf1f5;min-height:0;display:flex;align-items:center;justify-content:space-between;gap:10px;line-height:1.05}
.app-header-section{padding:0;color:#2a8a85;font-size:8.8px;font-weight:900;letter-spacing:.14em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-header-profile{display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:0;text-align:right;white-space:nowrap}
.app-header-profile strong{max-width:180px;font-size:8.8px;font-weight:850;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-header-profile small{font-size:8px;font-weight:750;color:#7b8798}
.app-header-profile small:before{content:'·';margin-right:4px;color:#a3adbb}

.calendar-title-line-balanced{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px}
.calendar-title-line-balanced h1{justify-self:start}
.calendar-title-line-balanced .calendar-title-week-action{width:auto;max-width:145px;min-height:34px;padding:5px 10px;font-size:9px;box-shadow:0 4px 10px rgba(37,99,235,.10)}
.calendar-title-line-balanced .calendar-title-week-action:disabled{box-shadow:none;opacity:.68}

.calendar-week-toolbar-balanced{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0}
.calendar-toolbar-mode-btn{min-width:88px;min-height:36px;padding:5px 10px;border:1px solid #dfe6f1!important;background:#fff!important;color:#384965!important;box-shadow:none!important;font-size:9.8px;white-space:nowrap}
.calendar-toolbar-mode-btn:hover{background:#f8fafc!important}
.calendar-week-toolbar-balanced .calendar-week-range-long{min-width:0;min-height:36px;justify-content:center;padding:0 8px;text-align:center;font-size:10px;letter-spacing:-.015em}
.calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:clamp(90px,12vw,132px);grid-template-columns:26px var(--current-week-width) 26px;gap:2px;padding:3px}
.calendar-week-toolbar-balanced .calendar-week-nav-compact button{height:30px;min-width:26px;padding:0 5px;font-size:9.5px}
.calendar-week-toolbar-balanced .calendar-week-nav-compact button:first-child,.calendar-week-toolbar-balanced .calendar-week-nav-compact button:last-child{font-size:19px}

@media(max-width:520px){
  .app-header{gap:6px;padding:8px 10px 7px}
  .app-header-meta{gap:8px;padding-top:5px}
  .app-header-section{font-size:8.2px;letter-spacing:.12em}
  .app-header-profile strong{max-width:148px;font-size:8.2px}
  .app-header-profile small{font-size:7.6px}
  .calendar-title-line-balanced{gap:8px}
  .calendar-title-line-balanced .calendar-title-week-action{max-width:122px;min-height:34px;padding:5px 8px;font-size:8.5px}
  .calendar-title-line-balanced .calendar-title-week-action svg{width:14px;height:14px}
  .calendar-week-toolbar-balanced{grid-template-columns:80px minmax(0,1fr) auto;gap:5px}
  .calendar-toolbar-mode-btn{min-width:0;width:80px;min-height:34px;padding:4px 7px;font-size:9px;gap:5px}
  .calendar-toolbar-mode-btn svg{width:14px;height:14px}
  .calendar-week-toolbar-balanced .calendar-week-range-long{min-height:34px;padding:0 5px;font-size:9px}
  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:90px;grid-template-columns:24px var(--current-week-width) 24px;gap:2px;padding:3px}
  .calendar-week-toolbar-balanced .calendar-week-nav-compact button{height:28px;min-width:24px;padding:0 4px;font-size:9px}
  .calendar-week-toolbar-balanced .calendar-week-nav-compact button:first-child,.calendar-week-toolbar-balanced .calendar-week-nav-compact button:last-child{font-size:18px}
}
@media(max-width:360px){
  .app-header-section{font-size:7.7px;letter-spacing:.10em}
  .app-header-profile strong{max-width:120px;font-size:7.8px}
  .app-header-profile small{font-size:7.2px}
  .calendar-title-line-balanced .calendar-title-week-action{max-width:112px;font-size:8px;padding:4px 6px}
  .calendar-week-toolbar-balanced{grid-template-columns:72px minmax(0,1fr) auto;gap:4px}
  .calendar-toolbar-mode-btn{width:72px;font-size:8.5px;padding:4px 5px}
  .calendar-week-toolbar-balanced .calendar-week-range-long{font-size:8.2px;padding:0 4px}
  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:82px;grid-template-columns:22px var(--current-week-width) 22px}
  .calendar-week-toolbar-balanced .calendar-week-nav-compact button{min-width:22px;padding:0 3px;font-size:8.6px}
}
"""
css.write_text(text,encoding='utf-8')

replace_once('scripts/check-calendar-ux.mjs',
"  ['Sayfa etiketi headerda kullanıcı ile aynı meta satırındadır',appHeader.includes('className=\"app-header-meta\"')&&appHeader.includes('className=\"app-header-section\"')&&appHeader.includes('className=\"app-header-profile\"')&&appHeader.includes(\"pathname.startsWith('/takvim')\")],",
"  ['Sayfa etiketi beyaz header kartında kullanıcı ile aynı meta satırındadır',appHeader.includes('className=\"app-header-main\"')&&appHeader.includes('className=\"app-header-meta\"')&&appHeader.includes('className=\"app-header-section\"')&&appHeader.includes('className=\"app-header-profile\"')&&appHeader.indexOf('app-header-main')<appHeader.indexOf('app-header-meta')],")
replace_once('scripts/check-calendar-ux.mjs',
"  ['Bu Hafta mobilde yönetici öğretmen kartı genişliği referansını kullanır',programCss.includes('--current-week-width:calc((100vw - 35px)/2)')],",
"  ['Bu Hafta dengeli responsive genişlik kullanır',programCss.includes('--current-week-width:clamp(90px,12vw,132px)')&&programCss.includes('--current-week-width:90px')],")
replace_once('scripts/check-calendar-ux.mjs',
"  ['Günlük Takvimde Liste karşı-görünüm düğmesi Program başlık satırındadır',dailyCalendar.includes('calendar-title-mode-btn')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('calendar-title-mode-btn')<dailyCalendar.indexOf('calendar-week-toolbar')],",
"  ['Günlük Takvimde Liste karşı-görünüm düğmesi kompakt hafta satırındadır',dailyCalendar.includes('calendar-toolbar-mode-btn')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('calendar-week-toolbar-balanced')<dailyCalendar.indexOf('calendar-toolbar-mode-btn')],")
replace_once('scripts/check-calendar-ux.mjs',
"  ['Program ve günlük Takvim uzun tarih aralığını alt hafta satırının solunda gösterir',[calendar,dailyCalendar].every(src=>src.includes('calendar-title-line calendar-title-line-with-mode')&&src.includes('className=\"calendar-week-range-long\"')&&src.includes('weekRangeLong(monday,addDays(monday,6))'))&&format.includes('export const weekRangeLong')],",
"  ['Program ve günlük Takvim uzun tarih aralığını dengeli hafta satırında gösterir',[calendar,dailyCalendar].every(src=>src.includes('calendar-title-line calendar-title-line-balanced')&&src.includes('calendar-week-toolbar calendar-week-toolbar-balanced')&&src.includes('className=\"calendar-week-range-long\"')&&src.includes('weekRangeLong(monday,addDays(monday,6))'))&&format.includes('export const weekRangeLong')],")
replace_once('scripts/check-calendar-ux.mjs',
"  ['Program ve günlük Takvim alt satırda tarih aralığı ve kompakt hafta gezintisini kullanır',[calendar,dailyCalendar].every(src=>src.includes('className=\"calendar-week-toolbar\"')&&src.includes('calendar-week-range-long')&&src.includes('className=\"calendar-week-nav-compact\"')&&!src.includes('className=\"week-switcher\"'))],",
"  ['Program ve günlük Takvim alt satırda görünüm tarih ve kompakt hafta gezintisini kullanır',[calendar,dailyCalendar].every(src=>src.includes('calendar-week-toolbar-balanced')&&src.includes('calendar-toolbar-mode-btn')&&src.includes('calendar-week-range-long')&&src.includes('className=\"calendar-week-nav-compact\"')&&!src.includes('className=\"week-switcher\"'))],")

print('Dengeli header ve Program yerleşimi uygulandı.')
