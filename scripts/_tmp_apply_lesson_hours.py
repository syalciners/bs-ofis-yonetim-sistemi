from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Beklenen blok bulunamadı: {path}\n{old[:180]}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Öğretmen detayı: kayıt adedi değil ders_sayisi toplamı.
replace_once('src/pages/TeachersPage.tsx',
"monthPrefix=firstOfMonth().slice(0,7),monthLessons=data.dersler.filter(x=>x.ogretmen_id===selected.ogretmen_id&&x.ders_durumu==='Yapıldı'&&x.tarih?.startsWith(monthPrefix)).length,recent=",
"monthPrefix=firstOfMonth().slice(0,7),monthLessonHours=data.dersler.filter(x=>x.ogretmen_id===selected.ogretmen_id&&x.ders_durumu==='Yapıldı'&&x.tarih?.startsWith(monthPrefix)).reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0),recent=")
replace_once('src/pages/TeachersPage.tsx',
'<div className="profile-focus-card"><span>Bu Ay</span><strong>{monthLessons}</strong><small>yapılan ders</small></div>',
'<div className="profile-focus-card"><span>Bu Ay</span><strong>{monthLessonHours}</strong><small>yapılan ders saati</small></div>')

# Program Liste: haftalık ve günlük özetleri ders saatine çevir.
replace_once('src/pages/CalendarPage.tsx',
"  const weekProgramCount=visibleLessons.filter(x=>x.program_id).length\n  const visibleDays=",
"  const visibleLessonHours=visibleLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)\n  const weekProgramHours=visibleLessons.filter(x=>x.program_id).reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)\n  const visibleDays=")
replace_once('src/pages/CalendarPage.tsx',
'<div className="calendar-command-summary"><div className="calendar-command-heading"><b>{filterLabel}</b><button className="secondary-btn calendar-pdf-btn" disabled={!lessons.length} onClick={()=>void openWeekPdf()} title="Seçili programı PDF olarak al"><FileDown size={16}/>PDF Al</button></div><span>{visibleLessons.length} ders · {weekProgramCount} sabit program dersi</span></div>',
'<div className="calendar-command-summary"><div className="calendar-command-heading"><b>{filterLabel}</b><button className="secondary-btn calendar-pdf-btn" disabled={!lessons.length} onClick={()=>void openWeekPdf()} title="Seçili programı PDF olarak al"><FileDown size={16}/>PDF Al</button></div><span>{visibleLessonHours} ders saati · {weekProgramHours} sabit program ders saati</span></div>')
replace_once('src/pages/CalendarPage.tsx',
'<header><div><b>{dayName}</b>{isToday&&<span className="today-pill">Bugün</span>}</div><span>{shortDate(date)} · {items.length} ders</span></header>',
'<header><div><b>{dayName}</b>{isToday&&<span className="today-pill">Bugün</span>}</div><span>{shortDate(date)} · {items.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)} ders saati</span></header>')

# Günlük Takvim: seçili gün toplamı saat.
replace_once('src/pages/DailyCalendarPage.tsx',
"  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))\n  const allPlaced=",
"  const dayLessons=data.dersler.filter(x=>x.tarih===selectedDate&&!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))\n  const dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)\n  const allPlaced=")
replace_once('src/pages/DailyCalendarPage.tsx',
'<div className="daily-lesson-count"><strong>{dayLessons.length}</strong><span>ders</span></div>',
'<div className="daily-lesson-count"><strong>{dayLessonHours}</strong><span>ders saati</span></div>')

# Ana sayfa: günlük yük ve planlanan yük saat olarak.
replace_once('src/pages/OverviewPage.tsx',
"  if(!data||!metrics)return null\n  const attention=[",
"  if(!data||!metrics)return null\n  const todayLessonHours=metrics.today.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)\n  const plannedLessonHours=metrics.today.filter(x=>x.ders_durumu==='Planlandı').reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)\n  const attention=[")
replace_once('src/pages/OverviewPage.tsx',
"{show:metrics.today.filter(x=>x.ders_durumu==='Planlandı').length>0,icon:CalendarCheck2,title:`${metrics.today.filter(x=>x.ders_durumu==='Planlandı').length} planlı ders`,text:'Bugün sonuç bekleyen dersler'",
"{show:plannedLessonHours>0,icon:CalendarCheck2,title:`${plannedLessonHours} planlı ders saati`,text:'Bugün sonuç bekleyen dersler'")
replace_once('src/pages/OverviewPage.tsx',
'<span>Bugünkü Dersler</span><strong>{metrics.today.length}</strong><small>{metrics.today.filter(x=>x.ders_durumu===\'Planlandı\').length} planlandı</small>',
'<span>Bugünkü Ders Saati</span><strong>{todayLessonHours}</strong><small>{plannedLessonHours} planlandı</small>')
replace_once('src/pages/OverviewPage.tsx',
'<h2>Bugünün Programı</h2><span>{metrics.today.length} ders</span>',
'<h2>Bugünün Programı</h2><span>{todayLessonHours} ders saati</span>')

# Öğretmen ödemeleri/hakediş: dönem iş yükü saat.
replace_once('src/pages/TeacherPaymentsPage.tsx',
"return {teacher:t,earned,paid,remaining:Math.max(earned-paid,0),lessonCount:lessons.length,branches:branchNames(t.ogretmen_id)}",
"return {teacher:t,earned,paid,remaining:Math.max(earned-paid,0),lessonHours:lessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0),branches:branchNames(t.ogretmen_id)}")
replace_once('src/pages/TeacherPaymentsPage.tsx',
'{rows.reduce((s,x)=>s+x.lessonCount,0)} yapılan ders',
'{rows.reduce((s,x)=>s+x.lessonHours,0)} yapılan ders saati')
replace_once('src/pages/TeacherPaymentsPage.tsx',
'{x.lessonCount} yapılan ders',
'{x.lessonHours} yapılan ders saati')

# Rapor ekranları: zaten ders_sayisi toplamı kullanılan metrikleri doğru adlandır.
p=Path('src/pages/ReportsPage.tsx')
text=p.read_text(encoding='utf-8')
text=text.replace('<span>Yapılan Ders</span>','<span>Yapılan Ders Saati</span>')
text=text.replace('<span className="num">Ders</span>','<span className="num">Ders Saati</span>',1)
p.write_text(text,encoding='utf-8')

# Öğretmen ve kurum PDF etiketlerini saat standardına getir.
replace_once('src/services/teacherEarningPdfService.ts',"{text:'DERS',style:'th',alignment:'right'}","{text:'DERS SAATİ',style:'th',alignment:'right'}")
replace_once('src/services/teacherEarningPdfService.ts',"metric('Yapılan Ders',String(input.lessonUnits),'Dönem toplamı',BLUE)","metric('Yapılan Ders Saati',String(input.lessonUnits),'Dönem toplamı',BLUE)")
replace_once('src/services/institutionManagementPdfService.ts',"metric('Yapılan Ders',String(input.completedLessons),'Seçili dönem toplamı',SILVER)","metric('Yapılan Ders Saati',String(input.completedLessons),'Seçili dönem toplamı',SILVER)")

# Regresyon testleri.
p=Path('scripts/check-teachers-ux.mjs')
text=p.read_text(encoding='utf-8')
text=text.replace("const stability = readFileSync('src/navigation-stability.css','utf8')\n", "const stability = readFileSync('src/navigation-stability.css','utf8')\nconst payments = readFileSync('src/pages/TeacherPaymentsPage.tsx','utf8')\n")
text=text.replace("  ['Kartlarda Verdiği Dersler gösterilir', page.includes('Verdiği Dersler')],\n", "  ['Kartlarda Verdiği Dersler gösterilir', page.includes('Verdiği Dersler')],\n  ['Öğretmen detayında Bu Ay kayıt adedi değil ders saati toplamıdır', page.includes('monthLessonHours=') && page.includes('reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)') && page.includes('yapılan ders saati')],\n  ['Öğretmen ödemelerinde dönem iş yükü ders saati toplamıdır', payments.includes('lessonHours:lessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)') && payments.includes('yapılan ders saati') && !payments.includes('lessonCount:lessons.length')],\n")
p.write_text(text,encoding='utf-8')

p=Path('scripts/check-calendar-ux.mjs')
text=p.read_text(encoding='utf-8')
text=text.replace("const format=read('src/lib/format.ts')\n", "const format=read('src/lib/format.ts')\nconst overview=read('src/pages/OverviewPage.tsx')\n")
text=text.replace("  ['Program Gönder Ders Ekle ile aynı komut satırındadır'", "  ['Program Liste özeti kayıt adedi yerine ders saati toplamını gösterir',calendar.includes('visibleLessonHours=visibleLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&calendar.includes('sabit program ders saati')&&calendar.includes('ders saati</span></header>')],\n  ['Günlük Takvim seçili gün toplamını ders saati olarak gösterir',dailyCalendar.includes('dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&dailyCalendar.includes('<span>ders saati</span>')],\n  ['Ana sayfa günlük program özetleri ders saati kullanır',overview.includes('todayLessonHours=metrics.today.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&overview.includes('plannedLessonHours=')&&overview.includes('Bugünkü Ders Saati')&&overview.includes('ders saati</span>')],\n  ['Program Gönder Ders Ekle ile aynı komut satırındadır'")
p.write_text(text,encoding='utf-8')

p=Path('scripts/check-reports-ux.mjs')
text=p.read_text(encoding='utf-8')
text=text.replace("  ['Öğretmen PDF ders tablosu altı hakediş sütununu korur', teacherPdf.includes(\"{text:'BİRİM HAKEDİŞ',style:'th',alignment:'right'}\")", "  ['Öğretmen raporu ve PDF ders_sayisi toplamını Ders Saati olarak adlandırır', reports.includes('Yapılan Ders Saati') && reports.includes('Ders Saati</span>') && teacherPdf.includes(\"{text:'DERS SAATİ',style:'th',alignment:'right'}\") && teacherPdf.includes(\"metric('Yapılan Ders Saati'\")],\n  ['Öğretmen PDF ders tablosu altı hakediş sütununu korur', teacherPdf.includes(\"{text:'BİRİM HAKEDİŞ',style:'th',alignment:'right'}\")")
text=text.replace("  ['Kurum yapılan ders KPI gerçek ders_sayisi toplamıdır'", "  ['Kurum yapılan ders saati etiketi ders_sayisi toplamıyla uyumludur', reports.includes('Yapılan Ders Saati') && institutionPdf.includes(\"metric('Yapılan Ders Saati'\")],\n  ['Kurum yapılan ders KPI gerçek ders_sayisi toplamıdır'")
p.write_text(text,encoding='utf-8')

print('Ders saati standardı patch tamamlandı.')
