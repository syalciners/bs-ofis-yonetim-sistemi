import { readFileSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const calendar=read('src/pages/CalendarPage.tsx')
const dailyCalendar=read('src/pages/DailyCalendarPage.tsx')
const dailyCalendarCss=read('src/daily-calendar.css')
const lessonDetail=read('src/components/LessonDetail.tsx')
const weekService=read('src/services/weekPlanningService.ts')
const pdfService=read('src/services/weeklyProgramPdfService.ts')
const packageJson=read('package.json')
const manualWeekMigration=read('supabase/migrations/20260817162500_manuel_hafta_hazirlama_v6.sql')
const conflictMigration=read('supabase/migrations/20260816001719_haftalik_program_tek_seferlik_cakisma_duzeltme.sql')
const fixed=read('src/pages/FixedProgramPage.tsx')
const fixedCss=read('src/fixed-program-calendar.css')
const smartProgram=read('src/components/SmartProgramForm.tsx')
const manualProgramService=read('src/services/manualProgramService.ts')
const more=read('src/pages/MorePage.tsx')
const app=read('src/App.tsx')
const tone=read('src/lib/teacherTone.ts')
const css=read('src/ux-overrides.css')
const stability=read('src/navigation-stability.css')
const programCss=read('src/program-share.css')
const main=read('src/main.tsx')
const appHeader=read('src/components/AppHeader.tsx')
const format=read('src/lib/format.ts')
const overview=read('src/pages/OverviewPage.tsx')

const checks=[
  ['Sayfa etiketi beyaz header kartında kullanıcı ile aynı meta satırındadır',appHeader.includes('className="app-header-main"')&&appHeader.includes('className="app-header-meta"')&&appHeader.includes('className="app-header-section"')&&appHeader.includes('className="app-header-profile"')&&appHeader.indexOf('app-header-main')<appHeader.indexOf('app-header-meta')],
  ['Ana sayfa etiketleri sayfa başlık satırında gizlenir',read('src/styles.css').includes('.page-title-row .eyebrow{display:none}')],
  ['Bu Hafta dengeli responsive genişlik kullanır',programCss.includes('--current-week-width:clamp(90px,12vw,132px)')&&programCss.includes('--current-week-width:90px')],
  ['Program Liste görünümünde tek Takvim karşı-görünüm düğmesi vardır',calendar.includes("onClick={()=>nav('/takvim/gunluk')}")&&calendar.includes('<CalendarDays size={16}/>Takvim')],
  ['Program ve günlük Takvim aynı Program başlığını kullanır',calendar.includes('<h1>Program</h1>')&&dailyCalendar.includes('<h1>Program</h1>')&&!dailyCalendar.includes('<h1>Takvim</h1>')],
  ['Günlük Takvimde Liste karşı-görünüm düğmesi kompakt hafta satırındadır',dailyCalendar.includes('calendar-toolbar-mode-btn')&&dailyCalendar.includes("onClick={()=>nav('/takvim')}")&&dailyCalendar.includes('<List size={16}/>Liste')&&dailyCalendar.indexOf('calendar-week-toolbar-balanced')<dailyCalendar.indexOf('calendar-toolbar-mode-btn')],
  ['Program ve günlük Takvim uzun tarih aralığını dengeli hafta satırında gösterir',[calendar,dailyCalendar].every(src=>src.includes('calendar-title-line calendar-title-line-balanced')&&src.includes('calendar-week-toolbar calendar-week-toolbar-balanced')&&src.includes('className="calendar-week-range-long"')&&src.includes('weekRangeLong(monday,addDays(monday,6))'))&&format.includes('export const weekRangeLong')],
  ['Program ve günlük Takvim alt satırda görünüm tarih ve kompakt hafta gezintisini kullanır',[calendar,dailyCalendar].every(src=>src.includes('calendar-week-toolbar-balanced')&&src.includes('calendar-toolbar-mode-btn')&&src.includes('calendar-week-range-long')&&src.includes('className="calendar-week-nav-compact"')&&!src.includes('className="week-switcher"'))],
  ['Kompakt hafta çubuğu önceki Bu Hafta gelecek kontrollerini iki görünümde de içerir',[calendar,dailyCalendar].every(src=>src.includes('aria-label="Önceki hafta"')&&src.includes('>Bu Hafta</button>')&&src.includes('aria-label="Gelecek hafta"'))],
  ['Günlük Takvimde eski büyük oklu hafta kartı ve açıklama kaldırılmıştır',!dailyCalendar.includes('daily-week-nav')&&!dailyCalendar.includes('weekTitle(')&&!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],
  ['Günlük Takvim Haftayı Hazırla yalnız seçilen haftanın durumunu kontrol eder',dailyCalendar.includes('getWeekCreationStatus(monday)')&&!dailyCalendar.includes('getWeekCreationStatus(addDays(monday,7))')&&!dailyCalendar.includes('TwoWeekCreationStatus')&&!dailyCalendar.includes('allWeeksAreReady')],
  ['Günlük Takvim hafta aksiyonu Program ile aynı seçili hafta etiketlerini kullanır',dailyCalendar.includes("weekReady?'Hafta Hazır':'Haftayı Hazırla'")&&!dailyCalendar.includes('Haftalar Hazır')&&!dailyCalendar.includes('Sonraki Haftayı Hazırla')&&!dailyCalendar.includes('İki Haftayı Hazırla')],
  ['Günlük Takvim seçili hafta hazırlama onayı güvenli V6 davranışını açıklar',dailyCalendar.includes('Tüm aktif sabit programlar işlenir.')&&dailyCalendar.includes('Daha önce oluşturulmamış dersler eklenir')&&dailyCalendar.includes('Yapıldı, İptal ve tek seferlik değişiklikler korunur.')&&dailyCalendar.includes('Bugünden önceki veya saati geçmiş dersler değiştirilmez.')],
  ['Günlük Takvim haftalık kontrol paneli yalnız seçilen hafta aralığını gösterir',dailyCalendar.includes("addDays(monday,6))} · seçilen hafta kontrol edilir")&&!dailyCalendar.includes('iki hafta birlikte kontrol edilir')],
  ['Takvim önceki hafta oku göreli olarak bir hafta geri gider',calendar.includes('onClick={()=>moveWeek(-1)}>‹</button>')&&dailyCalendar.includes('onClick={()=>moveWeek(-1)}>‹</button>')],
  ['Bu Hafta iki görünümde güncel haftaya döner',calendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')&&dailyCalendar.includes('onClick={goCurrentWeek}>Bu Hafta</button>')],
  ['Takvim gelecek hafta oku göreli olarak bir hafta ileri gider',calendar.includes('onClick={()=>moveWeek(1)}>›</button>')&&dailyCalendar.includes('onClick={()=>moveWeek(1)}>›</button>')],
  ['Manuel Haftayı Hazırla aksiyonu Program başlığının sağındadır',calendar.includes('calendar-title-line')&&calendar.includes('calendar-title-week-action')&&calendar.includes("'Haftayı Hazırla'")&&calendar.indexOf('calendar-title-week-action')<calendar.indexOf('calendar-week-toolbar')&&dailyCalendar.indexOf('calendar-title-week-action')<dailyCalendar.indexOf('calendar-week-toolbar')],
  ['Program Liste özeti kayıt adedi yerine ders saati toplamını gösterir',calendar.includes('visibleLessonHours=visibleLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&calendar.includes('sabit program ders saati')&&calendar.includes('ders saati</span></header>')],
  ['Günlük Takvim seçili gün toplamını ders saati olarak gösterir',dailyCalendar.includes('dayLessonHours=dayLessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&dailyCalendar.includes('<span>ders saati</span>')],
  ['Ana sayfa günlük program özetleri ders saati kullanır',overview.includes('todayLessonHours=metrics.today.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)')&&overview.includes('plannedLessonHours=')&&overview.includes('Bugünkü Ders Saati')&&overview.includes('ders saati</span>')],
  ['Program Gönder Ders Ekle ile aynı komut satırındadır',calendar.includes('calendar-command-bar')&&calendar.includes('calendar-share-btn')&&calendar.includes('Program Gönder')],
  ['Program Gönder yalnız tek kişi ve görünür ders varken aktiftir',calendar.includes('disabled={!shareTarget||!visibleLessons.length}')],
  ['Program paylaşımı mevcut önizleme bileşenini kullanır',calendar.includes("import { ProgramSharePreview }")&&calendar.includes('<ProgramSharePreview target={shareTarget}')],
  ['PDF Al Takvim komut satırındadır',calendar.includes('calendar-pdf-btn')&&calendar.includes('PDF Al')&&calendar.includes('openWeeklyProgramPdf')],
  ['Haftalık PDF seçili Takvim programındaki tüm dersleri kullanır',!calendar.includes('const allWeekLessons=useMemo')&&calendar.includes('openWeeklyProgramPdf(data,lessons,monday,addDays(monday,6),filterLabel)')&&calendar.includes('disabled={!lessons.length}')],
  ['Haftalık PDF seçili program adını belge başlığında taşır',pdfService.includes('programLabel')&&pdfService.includes('{text:programLabel,fontSize:16,bold:true,color:NAVY}')],
  ['Haftalık PDF gerçek PDF motoru kullanır',packageJson.includes('"pdfmake"')&&pdfService.includes("import('pdfmake/build/pdfmake')")&&pdfService.includes('addVirtualFileSystem')],
  ['Haftalık PDF A4 dikey ve tam program sütunlarını içerir',pdfService.includes("pageSize:'A4'")&&pdfService.includes("pageOrientation:'portrait'")&&['SAAT','ÖĞRENCİ','BRANŞ','ÖĞRETMEN','DERSLİK','DURUM'].every(x=>pdfService.includes(`text:'${x}'`))],
  ['Haftalık PDF doğrudan dosya indirir ve tarayıcı yazdırmasını kullanmaz',pdfService.includes('.download(filename)')&&!pdfService.includes('window.print()')&&!pdfService.includes("window.open('','_blank')")],
  ['Haftalık PDF mevcut BS Eğitim ikon ailesini ve kontrollü footerı kullanır',pdfService.includes('bs-egitim-icon-512-v2.png')&&pdfService.includes("text:'BS Eğitim'")&&pdfService.includes("text:'Yönetimi'")&&pdfService.includes('footer:(currentPage:number,pageCount:number)')&&!pdfService.includes('https://syalciners.github.io')],
  ['PDF butonu mobilde iki ana aksiyonun altında tam genişliktedir',programCss.includes('.calendar-command-bar .calendar-pdf-btn{grid-column:1/-1}')],
  ['Yönetici öğretmenler üstte ayrı gruptadır',calendar.includes('teacher-manager-grid')&&calendar.includes('teacher-manager-chip')],
  ['Yönetici öğretmenler Yönetici etiketi taşır',calendar.includes('<small>Yönetici</small>')],
  ['Alt filtre satırı Tümü Öğretmen seç Öğrenci seç düzenindedir',calendar.includes('teacher-secondary-compact')&&calendar.includes('aria-label="Öğretmen seç"')&&calendar.includes('aria-label="Öğrenci seç"')&&!calendar.includes('Diğer Öğretmenler')],
  ['Tümü tek dokunuşta erişilebilir kalır',calendar.includes('teacher-all')&&calendar.includes("chooseFilter({type:'all'})")],
  ['Takvim filtresi tek aktif kişi union modeli kullanır',calendar.includes("type CalendarFilter={type:'all'}|{type:'teacher';id:string}|{type:'student';id:string}")],
  ['Öğretmen seçimi yalnız öğretmenin derslerini gösterir',calendar.includes("filter.type==='teacher'&&x.ogretmen_id===filter.id")],
  ['Öğrenci seçimi yalnız öğrencinin derslerini gösterir',calendar.includes("filter.type==='student'&&x.ogrenci_id===filter.id")],
  ['Öğrenci seçicisi yalnız aktif öğrencileri listeler',calendar.includes("data.ogrenciler.filter(x=>x.durum!=='Pasif')")&&calendar.includes('{activeStudents.map')],
  ['Boş öğretmen veya öğrenci seçimi tüm programa döner',(calendar.match(/e\.target\.value\?\{type:'(?:teacher|student)',id:e\.target\.value\}:\{type:'all'\}/g)||[]).length===2],
  ['Kişi filtresi oturumda korunur',calendar.includes("sessionStorage.setItem('bs-takvim-kisi',serializeFilter(filter))")],
  ['Eski öğretmen oturum anahtarı geriye uyumlu korunur',calendar.includes("sessionStorage.setItem('bs-takvim-ogretmen',filter.type==='teacher'?filter.id:'tum')")],
  ['URL ogrenci parametresi öğrenci filtresini açabilir',calendar.includes("params.get('ogrenci')")&&calendar.includes("return{type:'student',id:studentParam}")],
  ['Üçlü kompakt filtre mobilde aynı satırda kalır',programCss.includes('.teacher-secondary-compact:has(.student-picker){grid-template-columns:auto repeat(2,minmax(0,1fr))}')],
  ['Öğrenci seçicisi turkuaz kimlik taşır',programCss.includes('.student-picker{border-color:#99ddd6}')&&programCss.includes('.student-picker.active{border-color:#2f9c95')],
  ['Takvim günlere göre haftalık ajanda kullanır',calendar.includes('week-agenda')&&calendar.includes('agenda-day')],
  ['Takvim yalnız ders bulunan günleri gösterir',calendar.includes('const visibleDays=')&&calendar.includes('.filter(x=>x.items.length>0)')],
  ['Takvim boş gün kartı üretmez',!calendar.includes('agenda-empty')],
  ['Derssiz hafta öğretmen veya öğrenci seçimini önerir',calendar.includes('Bu haftada ders yok.')&&calendar.includes('Başka bir hafta, öğretmen veya öğrenci seçebilirsin.')&&calendar.includes('calendar-empty-week')],
  ['Ders durumu değişikliği açık kullanıcı onayı ister',lessonDetail.includes('if(!window.confirm(statusChangeMessage(current,status)))return')],
  ['Yapıldı onayı öğrenci ücreti ve öğretmen hakedişini açıklar',lessonDetail.includes('öğrenci ücretini ve öğretmen hakedişini finansal sonuçlara dahil eder')],
  ['Yapıldı durumundan dönüşün finansal etkisi açıklanır',lessonDetail.includes('artık finansal sonuçlara dahil edilmez')],
  ['Durum onayından sonra güvenli RPC çağrısı korunur',lessonDetail.includes('await setLessonStatus(lesson.ders_id,status)')],
  ['Ders durumu alanı onay davranışını kullanıcıya bildirir',lessonDetail.includes('Finansal etkisi onaylandıktan sonra kaydedilir.')],
  ['Haftalık hazırlama kullanıcı onayı ister',(calendar.match(/if\(!confirmWeekCreation\(\)\)return/g)||[]).length===2],
  ['Haftalık hazırlama tüm aktif sabit programları işler',calendar.includes('Tüm aktif sabit programlar işlenir.')],
  ['Haftalık hazırlama eksik ve değişmiş dersleri açıklar',calendar.includes('Daha önce oluşturulmamış dersler eklenir')&&calendar.includes('günü, saati, dersliği veya temel bilgileri değişmiş')],
  ['Yapıldı İptal ve tek seferlik derslerin korunacağı açıklanır',calendar.includes('Yapıldı, İptal ve tek seferlik değişiklikler korunur.')],
  ['Mevcut haftada geçmiş derslerin değişmeyeceği açıkça belirtilir',calendar.includes('Bugünden önceki veya saati geçmiş dersler değiştirilmez.')],
  ['Haftalık hazırlama güvenli V6 RPC kullanır',weekService.includes("supabase.rpc('haftalik_dersleri_hazirla_guvenli_v6'")&&calendar.includes('await createWeek(monday)')],
  ['Hafta hazırlık durumu V3 RPC üzerinden okunur',weekService.includes("supabase.rpc('haftalik_ders_uretim_durumu_v3'")],
  ['Haftalık çakışma kontrolü V2 RPC kullanır',weekService.includes("supabase.rpc('haftalik_program_kontrol_oneri_v2'")],
  ['Haftayı Hazırla yalnız seçilen haftanın durumunu kontrol eder',calendar.includes('getWeekCreationStatus(monday)')&&!calendar.includes('getWeekCreationStatus(addDays(monday,7))')],
  ['Geçmiş haftada hazırlama aksiyonu pasiftir',calendar.includes("isPastWeek?'Geçmiş Hafta'")&&calendar.includes('disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady}')],
  ['Hazır hafta Hafta Hazır olarak gösterilir',calendar.includes("weekReady?'Hafta Hazır':'Haftayı Hazırla'")],
  ['Hazırlama sonucu oluşturulan ve güncellenen sayısını bildirir',calendar.includes('${created} ders oluşturuldu, ${updated} ders güncellendi. Hafta hazır.')],
  ['V6 yalnız seçilen haftayı işler',!manualWeekMigration.match(/for\s+i\s+in\s+0\.\.1\s+loop/i)&&manualWeekMigration.includes('haftalik_dersleri_hazirla_guvenli_v6')],
  ['V6 eksik dersi oluşturur ve değişmiş Planlandı dersi günceller',manualWeekMigration.includes('v_olusturulan := v_olusturulan+1')&&manualWeekMigration.includes('v_guncellenen := v_guncellenen+1')&&manualWeekMigration.includes('update public.dersler set')],
  ['V6 geçmiş haftayı backend tarafında reddeder',manualWeekMigration.includes("raise exception 'Geçmiş haftalar hazırlanamaz.'")],
  ['V6 güncel haftanın geçmiş saatlerini atlar',manualWeekMigration.includes('v_gecmis := v_gecmis+1')&&manualWeekMigration.includes('r.baslangic_saati<=v_simdi::time')],
  ['V3 eksik ve değişmiş kayıtları ayrı izler',manualWeekMigration.includes("'eksik',v_eksik")&&manualWeekMigration.includes("'degismis',v_degismis")],
  ['Tek seferlik dersler sabit program çakışma kontrolünden NULL nedeniyle düşmez',conflictMigration.includes('d.program_id is distinct from p_program_id')],
  ['Takvim Sabit Program formunu doğrudan içermez',!calendar.includes('ProgramForm')&&!calendar.includes("mode==='program'")],
  ['Sabit Program ayrı sayfadır',fixed.includes('Sabit Ders Programı')&&fixed.includes('fixed-program-groups')],
  ['Sabit Program Liste görünümü eski gün gruplarını korur',fixed.includes("viewMode==='calendar'")&&fixed.includes('fixed-program-groups')&&fixed.includes('dayNames.map(day=>')],
  ['Sabit Program özet satırında tek karşı-görünüm düğmesi vardır',fixed.includes('fixed-program-summary-toolbar')&&fixed.includes('fixed-program-view-toggle')&&fixed.includes("viewMode==='calendar'?'list':'calendar'")&&fixed.includes('<List size={16}/>Liste')&&fixed.includes('<CalendarDays size={16}/>Takvim')&&!fixed.includes('fixed-program-view-switch')],
  ['Sabit Program özet kartı mobilde kompakt yatay düzende kalır',fixedCss.includes('.fixed-program-summary-toolbar{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important')&&fixedCss.includes('min-height:78px!important')&&fixedCss.includes('.fixed-program-summary-toolbar>div{justify-items:start!important;text-align:left!important}')&&fixedCss.includes('.fixed-program-summary-toolbar .fixed-program-view-toggle')&&fixedCss.includes('margin-left:auto!important')&&!fixedCss.includes('.fixed-program-view-switch')],
  ['Sabit Program Takvimi beş gerçek derslik sütununu içerir',['LOC-002','LOC-001','LOC-003','LOC-005','LOC-004'].every(id=>fixed.includes(`id:'${id}'`))],
  ['Sabit Program Takviminde boş hücre gün saat dersliği forma taşır',fixed.includes('openNewProgram({day:selectedDay,time:minutesToTime(minute),roomId:column.id})')&&fixed.includes('defaultDay={programDefaults?.day}')&&fixed.includes('defaultStartTime={programDefaults?.time}')&&fixed.includes('defaultRoomId={programDefaults?.roomId}')],
  ['Sabit Program kartında Aktif Pasif durum göstergesi vardır',fixed.includes('fixed-program-status')&&fixed.includes("passive?'Pasif':'Aktif'")],
  ['Sabit Program kayıtları manuel V4 servisini kullanır',fixed.includes('saveProgramManual')&&smartProgram.includes('saveProgramManual')&&manualProgramService.includes("supabase.rpc('sabit_program_kaydet_guvenli_v4'")],
  ['Sabit Program düzenleme mevcut dersleri otomatik taşımadığını açıklar',smartProgram.includes('Mevcut dersler otomatik değiştirilmez')&&smartProgram.includes('Haftayı Hazırla')],
  ['Sabit Program Menü içindedir',more.includes("to:'/sabit-program'")],
  ['Sabit Program rotası tanımlıdır',app.includes('path="/sabit-program"')],
  ['Başak Atilla pembe öğretmen rengidir',tone.includes("'BAŞAK ATİLLA'")&&tone.includes("return 'teacher-pink'")],
  ['Süleyman Yalçıner mavi öğretmen rengidir',tone.includes("'SÜLEYMAN YALÇINER'")&&tone.includes("return 'teacher-blue'")],
  ['Diğer öğretmenler sarı renktir',tone.includes("return 'teacher-yellow'")],
  ['Bu Hafta güncel haftadayken belirgin mavi zemindir',programCss.includes('.calendar-week-nav-compact button.active{background:#2563eb;color:#fff')],
  ['Başak Takvim butonu beyaz zemin ve pembe çerçeve kullanır',stability.includes('.calendar-v2 .teacher-chip.teacher-pink')&&stability.includes('border-color:#ec4899')],
  ['Süleyman Takvim butonu beyaz zemin ve mavi çerçeve kullanır',stability.includes('.calendar-v2 .teacher-chip.teacher-blue')&&stability.includes('border-color:#3b82f6')],
  ['Öğretmen seçicisi beyaz zeminlidir',stability.includes('.teacher-other-picker')&&stability.includes('background:#fff')],
  ['Seçili öğretmen sarı çerçeveyle ayrılır',stability.includes('.teacher-other-picker.active')&&stability.includes('border-color:#eab308')],
  ['Takvim ders kartlarında öğretmen rengi yalnız çerçeve vurgusudur',stability.includes('.calendar-v2 .lesson-card.teacher-pink')&&stability.includes('border-left:4px solid #ec4899')&&stability.includes('background:#fff !important')],
  ['Yönetici öğretmen butonları iki sütundur',css.includes('.teacher-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['Uygulama yatay sayfa taşmasını engeller',stability.includes('overflow-x:hidden')&&stability.includes('overscroll-behavior-x:none')],
  ['Üst bar gerçek sabit konumdadır',stability.includes('.app-header-wrap')&&stability.includes('position:fixed !important')],
  ['Alt bar gerçek sabit konumdadır',stability.includes('.bottom-nav')&&stability.includes('bottom:0 !important')],
  ['Alt bar sekme isimlerini sürekli görünür tutar',stability.includes('.bottom-nav a span')&&stability.includes('visibility:visible !important')&&stability.includes('opacity:1 !important')],
  ['Sabit Program Takvim CSS katmanı yüklenir',main.includes("import './fixed-program-calendar.css'")],
  ['Navigasyon stabilite CSS katmanı korunur',main.includes("import './navigation-stability.css'")],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){
  console.error(`\n${failed.length} Takvim UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Takvim UX kuralı doğrulandı.`)
