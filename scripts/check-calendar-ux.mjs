import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const calendar = read('src/pages/CalendarPage.tsx')
const lessonDetail = read('src/components/LessonDetail.tsx')
const weekService = read('src/services/weekPlanningService.ts')
const weekMigration = read('supabase/migrations/20260816001408_hafta_eksik_ders_guvenli_v5.sql')
const conflictMigration = read('supabase/migrations/20260816001719_haftalik_program_tek_seferlik_cakisma_duzeltme.sql')
const fixed = read('src/pages/FixedProgramPage.tsx')
const more = read('src/pages/MorePage.tsx')
const app = read('src/App.tsx')
const tone = read('src/lib/teacherTone.ts')
const css = read('src/ux-overrides.css')
const stability = read('src/navigation-stability.css')
const programCss = read('src/program-share.css')
const main = read('src/main.tsx')

const checks = [
  ['Takvim Önceki Hafta butonunu içerir', calendar.includes("label:'Önceki Hafta'")],
  ['Takvim Bu Hafta butonunu içerir', calendar.includes("label:'Bu Hafta'")],
  ['Takvim Gelecek Hafta butonunu içerir', calendar.includes("label:'Gelecek Hafta'")],
  ['Hafta hazırlama aksiyonu Takvim başlığının sağındadır', calendar.includes('calendar-title-line') && calendar.includes('calendar-title-week-action') && calendar.indexOf('calendar-title-week-action') < calendar.indexOf('week-switcher')],
  ['Program Gönder Ders Ekle ile aynı komut satırındadır', calendar.includes('calendar-command-bar') && calendar.includes('calendar-share-btn') && calendar.includes('Program Gönder')],
  ['Program Gönder yalnız tek kişi ve ders varken aktiftir', calendar.includes('disabled={!shareTarget||!lessons.length}')],
  ['Program paylaşımı mevcut önizleme bileşenini kullanır', calendar.includes("import { ProgramSharePreview }") && calendar.includes('<ProgramSharePreview target={shareTarget}')],
  ['Yönetici öğretmenler üstte ayrı gruptadır', calendar.includes('teacher-manager-grid') && calendar.includes('teacher-manager-chip')],
  ['Yönetici öğretmenler Yönetici etiketi taşır', calendar.includes('<small>Yönetici</small>')],
  ['Alt filtre satırı Tümü Öğretmen seç Öğrenci seç düzenindedir', calendar.includes('teacher-secondary-compact') && calendar.includes('aria-label="Öğretmen seç"') && calendar.includes('aria-label="Öğrenci seç"') && !calendar.includes('Diğer Öğretmenler')],
  ['Tümü tek dokunuşta erişilebilir kalır', calendar.includes('teacher-all') && calendar.includes("chooseFilter({type:'all'})")],
  ['Takvim filtresi tek aktif kişi union modeli kullanır', calendar.includes("type CalendarFilter={type:'all'}|{type:'teacher';id:string}|{type:'student';id:string}")],
  ['Öğretmen seçimi yalnız öğretmenin derslerini gösterir', calendar.includes("filter.type==='teacher'&&x.ogretmen_id===filter.id")],
  ['Öğrenci seçimi yalnız öğrencinin derslerini gösterir', calendar.includes("filter.type==='student'&&x.ogrenci_id===filter.id")],
  ['Öğrenci seçicisi yalnız aktif öğrencileri listeler', calendar.includes("data.ogrenciler.filter(x=>x.durum!=='Pasif')") && calendar.includes('{activeStudents.map')],
  ['Boş öğretmen veya öğrenci seçimi tüm programa döner', (calendar.match(/e\.target\.value\?\{type:'(?:teacher|student)',id:e\.target\.value\}:\{type:'all'\}/g)||[]).length===2],
  ['Kişi filtresi oturumda korunur', calendar.includes("sessionStorage.setItem('bs-takvim-kisi',serializeFilter(filter))")],
  ['Eski öğretmen oturum anahtarı geriye uyumlu korunur', calendar.includes("sessionStorage.setItem('bs-takvim-ogretmen',filter.type==='teacher'?filter.id:'tum')")],
  ['URL ogrenci parametresi öğrenci filtresini açabilir', calendar.includes("params.get('ogrenci')") && calendar.includes("return{type:'student',id:studentParam}")],
  ['Üçlü kompakt filtre mobilde aynı satırda kalır', programCss.includes('.teacher-secondary-compact:has(.student-picker){grid-template-columns:auto repeat(2,minmax(0,1fr))}')],
  ['Öğrenci seçicisi turkuaz kimlik taşır', programCss.includes('.student-picker{border-color:#99ddd6}') && programCss.includes('.student-picker.active{border-color:#2f9c95')],
  ['Takvim günlere göre haftalık ajanda kullanır', calendar.includes('week-agenda') && calendar.includes('agenda-day')],
  ['Takvim yalnız ders bulunan günleri gösterir', calendar.includes('const visibleDays=') && calendar.includes('.filter(x=>x.items.length>0)')],
  ['Takvim boş gün kartı üretmez', !calendar.includes('agenda-empty')],
  ['Derssiz hafta öğretmen veya öğrenci seçimini önerir', calendar.includes('Bu haftada ders yok.') && calendar.includes('Başka bir hafta, öğretmen veya öğrenci seçebilirsin.') && calendar.includes('calendar-empty-week')],
  ['Ders durumu değişikliği açık kullanıcı onayı ister', lessonDetail.includes('if(!window.confirm(statusChangeMessage(current,status)))return')],
  ['Yapıldı onayı öğrenci ücreti ve öğretmen hakedişini açıklar', lessonDetail.includes('öğrenci ücretini ve öğretmen hakedişini finansal sonuçlara dahil eder')],
  ['Yapıldı durumundan dönüşün finansal etkisi açıklanır', lessonDetail.includes('artık finansal sonuçlara dahil edilmez')],
  ['Durum onayından sonra güvenli RPC çağrısı korunur', lessonDetail.includes('await setLessonStatus(lesson.ders_id,status)')],
  ['Ders durumu alanı onay davranışını kullanıcıya bildirir', lessonDetail.includes('Finansal etkisi onaylandıktan sonra kaydedilir.')],
  ['Haftalık ders üretimi kullanıcı onayı ister', (calendar.match(/if\(!confirmWeekCreation\(status\)\)return/g)||[]).length===2],
  ['Haftalık üretim onayı kişi filtresinden bağımsız kapsamı açıklar', calendar.includes('Takvim kişi filtresinden bağımsız olarak tüm aktif sabit programlar işlenir.')],
  ['Haftalık üretim yalnız eksik dersleri ekleyeceğini açıklar', calendar.includes('Mevcut dersler korunur; yalnız eksik dersler eklenir.')],
  ['Mevcut haftada geçmiş derslerin değişmeyeceği açıkça belirtilir', calendar.includes('yalnız şu andan sonraki eksik dersler eklenir; geçmiş dersler değiştirilmez.')],
  ['Haftalık üretim güvenli V5 RPC kullanır', weekService.includes("supabase.rpc('haftalik_dersleri_olustur_guvenli_v5'") && calendar.includes('await createWeek(monday)')],
  ['Hafta hazırlık durumu dinamik V2 RPC üzerinden okunur', weekService.includes("supabase.rpc('haftalik_ders_uretim_durumu_v2'")],
  ['Haftalık çakışma kontrolü geçmişi koruyan V2 RPC kullanır', weekService.includes("supabase.rpc('haftalik_program_kontrol_oneri_v2'")],
  ['Seçilen ve sonraki haftanın hazırlık durumu birlikte kontrol edilir', calendar.includes('getWeekCreationStatus(monday)') && calendar.includes('getWeekCreationStatus(addDays(monday,7))')],
  ['Geçmiş haftada hazırlama aksiyonu pasiftir', calendar.includes("isPastWeek?'Geçmiş Hafta'") && calendar.includes('disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady}')],
  ['Mevcut hafta yeni sabit program için eksik ders tamamlama aksiyonu gösterir', calendar.includes("isCurrentWeek&&!selectedWeekReady?'Eksik Dersleri Tamamla'")],
  ['Hazır seçili haftada sonraki eksik hafta açıkça adlandırılır', calendar.includes("selectedWeekReady&&!nextWeekReady?'Sonraki Haftayı Hazırla'")],
  ['Geçmiş hafta üretimi backend tarafından da reddedilir', weekMigration.includes("raise exception 'Geçmiş haftalar otomatik olarak hazırlanamaz.'")],
  ['Mevcut haftanın geçmiş saatleri backend tarafından atlanır', weekMigration.includes('r.baslangic_saati<=v_simdi::time') && weekMigration.includes('v_gecmis_atlanan')],
  ['Hafta durumu eski üretim kilidine değil güncel eksik sayısına bakar', weekMigration.includes("'eksik',greatest(v_beklenen-v_mevcut,0)") && !weekMigration.includes('select * into v_kayit from public.haftalik_ders_uretimleri')],
  ['Tek seferlik dersler sabit program çakışma kontrolünden NULL nedeniyle düşmez', conflictMigration.includes('d.program_id is distinct from p_program_id')],
  ['Takvim Sabit Program formunu doğrudan içermez', !calendar.includes('ProgramForm') && !calendar.includes("mode==='program'")],
  ['Sabit Program ayrı sayfadır', fixed.includes('Sabit Ders Programı') && fixed.includes('fixed-program-groups')],
  ['Sabit Program günlere göre gruplanır', fixed.includes('dayNames.map(day=>')],
  ['Sabit Program Menü içindedir', more.includes("to:'/sabit-program'")],
  ['Sabit Program rotası tanımlıdır', app.includes('path="/sabit-program"')],
  ['Başak Atilla pembe öğretmen rengidir', tone.includes("'BAŞAK ATİLLA'") && tone.includes("return 'teacher-pink'")],
  ['Süleyman Yalçıner mavi öğretmen rengidir', tone.includes("'SÜLEYMAN YALÇINER'") && tone.includes("return 'teacher-blue'")],
  ['Diğer öğretmenler sarı renktir', tone.includes("return 'teacher-yellow'")],
  ['Seçili hafta belirgin mavi zemindir', css.includes('.week-switcher button.active{background:#2563eb;color:#fff')],
  ['Başak Takvim butonu beyaz zemin ve pembe çerçeve kullanır', stability.includes('.calendar-v2 .teacher-chip.teacher-pink') && stability.includes('border-color:#ec4899')],
  ['Süleyman Takvim butonu beyaz zemin ve mavi çerçeve kullanır', stability.includes('.calendar-v2 .teacher-chip.teacher-blue') && stability.includes('border-color:#3b82f6')],
  ['Öğretmen seçicisi beyaz zeminlidir', stability.includes('.teacher-other-picker') && stability.includes('background:#fff')],
  ['Seçili öğretmen sarı çerçeveyle ayrılır', stability.includes('.teacher-other-picker.active') && stability.includes('border-color:#eab308')],
  ['Takvim ders kartlarında öğretmen rengi yalnız çerçeve vurgusudur', stability.includes('.calendar-v2 .lesson-card.teacher-pink') && stability.includes('border-left:4px solid #ec4899') && stability.includes('background:#fff !important')],
  ['Yönetici öğretmen butonları iki sütundur', css.includes('.teacher-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['Uygulama yatay sayfa taşmasını engeller', stability.includes('overflow-x:hidden') && stability.includes('overscroll-behavior-x:none')],
  ['Üst bar gerçek sabit konumdadır', stability.includes('.app-header-wrap') && stability.includes('position:fixed !important')],
  ['Alt bar gerçek sabit konumdadır', stability.includes('.bottom-nav') && stability.includes('bottom:0 !important')],
  ['Alt bar sekme isimlerini sürekli görünür tutar', stability.includes('.bottom-nav a span') && stability.includes('visibility:visible !important') && stability.includes('opacity:1 !important')],
  ['Navigasyon stabilite CSS katmanı en son yüklenir', main.includes("import './navigation-stability.css'" )],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Takvim UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Takvim UX kuralı doğrulandı.`)
