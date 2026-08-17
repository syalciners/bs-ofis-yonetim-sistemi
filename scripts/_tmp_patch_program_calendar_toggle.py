from pathlib import Path

# 1) Günlük Takvim: açıklamayı ve başlığın sağındaki Liste düğmesini kaldır,
#    tek karşı-görünüm düğmesini başlığın hemen altına ve sola taşı.
page = Path('src/pages/DailyCalendarPage.tsx')
text = page.read_text(encoding='utf-8')
old = '''  return <div className="page-stack calendar-v2 daily-calendar-page">\n    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Takvim</h1><div className="calendar-title-actions"><button className="calendar-mode-btn" type="button" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div><p>Günü seç, boş derslik ve saate dokunarak ders ekle.</p></div></section>\n\n    <section className="daily-week-nav" aria-label="Hafta değiştir">'''
new = '''  return <div className="page-stack calendar-v2 daily-calendar-page">\n    <section className="page-title-row"><div className="calendar-title-copy"><span className="eyebrow">DERS PROGRAMI</span><div className="calendar-title-line"><h1>Takvim</h1><div className="calendar-title-actions"><button className="primary-btn calendar-title-week-action" disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady} onClick={()=>void prepareWeek()}><CalendarCheck2 size={17}/>{weekActionText}</button></div></div></div></section>\n\n    <section className="daily-mode-switch-row" aria-label="Program görünümü">\n      <button className="calendar-mode-btn" type="button" onClick={()=>nav('/takvim')}><List size={16}/>Liste</button>\n    </section>\n\n    <section className="daily-week-nav" aria-label="Hafta değiştir">'''
assert old in text, 'DailyCalendarPage hedef başlık bloğu bulunamadı'
text = text.replace(old, new, 1)
page.write_text(text, encoding='utf-8')

# 2) Tek butonun Takvim görünümünde de Program ekranındaki gibi solda kalmasını sabitle.
css = Path('src/daily-calendar.css')
css_text = css.read_text(encoding='utf-8')
anchor = '.daily-calendar-page{gap:14px}\n'
addition = '.daily-mode-switch-row{display:flex;align-items:center;justify-content:flex-start;min-height:34px}\n'
assert anchor in css_text, 'daily-calendar.css hedef anchor bulunamadı'
if addition not in css_text:
    css_text = css_text.replace(anchor, anchor + addition, 1)
mobile_anchor = '  .daily-calendar-page{gap:11px}\n'
mobile_addition = '  .daily-mode-switch-row{min-height:32px}\n'
assert mobile_anchor in css_text, 'daily-calendar.css mobil anchor bulunamadı'
if mobile_addition not in css_text:
    css_text = css_text.replace(mobile_anchor, mobile_anchor + mobile_addition, 1)
css.write_text(css_text, encoding='utf-8')

# 3) Regresyon: iki görünümün tek karşı-görünüm butonuyla birbirine geçtiğini kilitle.
test = Path('scripts/check-calendar-ux.mjs')
test_text = test.read_text(encoding='utf-8')
read_anchor = "const calendar=read('src/pages/CalendarPage.tsx')\n"
read_add = "const dailyCalendar=read('src/pages/DailyCalendarPage.tsx')\nconst dailyCalendarCss=read('src/daily-calendar.css')\n"
assert read_anchor in test_text, 'check-calendar-ux read anchor bulunamadı'
if "const dailyCalendar=read('src/pages/DailyCalendarPage.tsx')" not in test_text:
    test_text = test_text.replace(read_anchor, read_anchor + read_add, 1)
check_anchor = "  ['Takvim Önceki Hafta butonunu içerir',calendar.includes(\"label:'Önceki Hafta'\")],\n"
checks = "  ['Program Liste görünümünde tek Takvim karşı-görünüm düğmesi vardır',calendar.includes(\"onClick={()=>nav('/takvim/gunluk')}\")&&calendar.includes('<CalendarDays size={16}/>Takvim')],\n  ['Günlük Takvimde tek Liste karşı-görünüm düğmesi başlığın altında soldadır',dailyCalendar.includes('daily-mode-switch-row')&&dailyCalendar.includes(\"onClick={()=>nav('/takvim')}\")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('daily-mode-switch-row')>dailyCalendar.indexOf('<h1>Takvim</h1>')&&dailyCalendar.indexOf('daily-mode-switch-row')<dailyCalendar.indexOf('daily-week-nav')&&dailyCalendarCss.includes('.daily-mode-switch-row{display:flex;align-items:center;justify-content:flex-start')],\n  ['Günlük Takvim açıklaması ve başlık sağındaki eski Liste düğmesi kaldırılmıştır',!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],\n"
assert check_anchor in test_text, 'check-calendar-ux check anchor bulunamadı'
if 'Program Liste görünümünde tek Takvim karşı-görünüm düğmesi vardır' not in test_text:
    test_text = test_text.replace(check_anchor, checks + check_anchor, 1)
test.write_text(test_text, encoding='utf-8')

print('Program ↔ Takvim tek görünüm düğmesi patch uygulandı.')
