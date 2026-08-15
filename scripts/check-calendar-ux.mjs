import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const calendar = read('src/pages/CalendarPage.tsx')
const lessonDetail = read('src/components/LessonDetail.tsx')
const programShare = read('src/services/programShareService.ts')
const programPreview = read('src/components/ProgramSharePreview.tsx')
const whatsapp = read('src/lib/whatsapp.ts')
const assignmentShare = read('src/services/assignmentShareService.ts')
const programCss = read('src/program-share.css')
const office = read('src/services/officeService.ts')
const fixed = read('src/pages/FixedProgramPage.tsx')
const more = read('src/pages/MorePage.tsx')
const app = read('src/App.tsx')
const tone = read('src/lib/teacherTone.ts')
const css = read('src/ux-overrides.css')
const stability = read('src/navigation-stability.css')
const main = read('src/main.tsx')

const checks = [
  ['Takvim Önceki Hafta butonunu içerir', calendar.includes("label:'Önceki Hafta'")],
  ['Takvim Bu Hafta butonunu içerir', calendar.includes("label:'Bu Hafta'")],
  ['Takvim Gelecek Hafta butonunu içerir', calendar.includes("label:'Gelecek Hafta'")],
  ['Yönetici öğretmenler üstte ayrı gruptadır', calendar.includes('teacher-manager-grid') && calendar.includes('teacher-manager-chip')],
  ['Diğer öğretmenler tek kompakt seçicidedir', calendar.includes('teacher-secondary-compact') && calendar.includes('teacher-other-picker') && calendar.includes('aria-label="Diğer öğretmen seç"')],
  ['Öğrenciler öğretmen seçicisinin yanında tek kompakt seçicidedir', calendar.includes('student-picker') && calendar.includes('aria-label="Öğrenci seç"') && calendar.includes('<span>Öğrenciler</span>')],
  ['Takvim filtresi tek aktif kişi union modeli kullanır', calendar.includes("type CalendarFilter={type:'all'}|{type:'teacher';id:string}|{type:'student';id:string}")],
  ['Öğrenci seçimi yalnız öğrencinin derslerini gösterir', calendar.includes("filter.type==='student'&&x.ogrenci_id===filter.id")],
  ['Öğretmen seçimi yalnız öğretmenin derslerini gösterir', calendar.includes("filter.type==='teacher'&&x.ogretmen_id===filter.id")],
  ['Tümü tek dokunuşta erişilebilir kalır', calendar.includes('teacher-all') && calendar.includes("chooseFilter({type:'all'})")],
  ['Takvim kişi filtresi oturumda korunur', calendar.includes("sessionStorage.setItem('bs-takvim-kisi',serializeFilter(filter))")],
  ['Takvim günlere göre haftalık ajanda kullanır', calendar.includes('week-agenda') && calendar.includes('agenda-day')],
  ['Takvim yalnız ders bulunan günleri gösterir', calendar.includes('const visibleDays=') && calendar.includes('.filter(x=>x.items.length>0)')],
  ['Takvim boş gün kartı üretmez', !calendar.includes('agenda-empty')],
  ['Derssiz hafta sakin boş durum mesajı gösterir', calendar.includes('Bu haftada ders yok.') && calendar.includes('calendar-empty-week')],
  ['Program Gönder Ders Ekle yanında yer alır', calendar.includes('Ders Ekle</button><button className="secondary-btn calendar-share-btn"') && calendar.includes('Program Gönder')],
  ['Program Gönder yalnız tek kişi ve ders varken aktiftir', calendar.includes('disabled={!shareTarget||!lessons.length}') && calendar.includes("filter.type==='all'?null")],
  ['Program gönderiminden önce önizleme Sheet açılır', calendar.includes('title="Program Gönder"') && calendar.includes('<ProgramSharePreview')],
  ['Öğrenci WhatsApp alıcısında veli telefonu varsa önce o kullanılır', programShare.includes("const guardianPhone=student?.veli_telefon||''") && programShare.includes("guardianPhone||student?.ogrenci_telefon||''")],
  ['Öğretmen programı öğretmenin telefonuna hazırlanır', programShare.includes("teacher?.telefon||''")],
  ['Öğrenci programında öğretmen adı gösterilir', programShare.includes("teacherName(data,lesson.ogretmen_id)")],
  ['Öğretmen programında öğrenci adı gösterilir', programShare.includes("studentName(data,lesson.ogrenci_id)")],
  ['İptal ders program mesajında açıkça İptal olarak gösterilir', programShare.includes("lesson.ders_durumu==='İptal'") && programShare.includes("· İptal")],
  ['Program mesajına finansal tutar eklenmez', !programShare.includes('ogrenci_toplam_tutar') && !programShare.includes('ogretmen_toplam_hakedis') && !programShare.includes('money(')],
  ['Program mesajına Zoom bağlantısı eklenmez', !programShare.includes('Zoom Dersine Katıl') && !programShare.includes('zoom_katilim_baglantisi}`')],
  ['Program paylaşımı gerçek WhatsApp önizleme butonu kullanır', programPreview.includes("WhatsApp'ta Aç") && programPreview.includes('window.open(preview.whatsappUrl')],
  ['Telefon yoksa paylaşım butonu pasif kalır ve açıklama gösterilir', programPreview.includes('disabled={!preview.whatsappUrl}') && programPreview.includes('telefon bilgisi eklenmelidir')],
  ['Ödev ve program paylaşımı aynı WhatsApp telefon standardını kullanır', assignmentShare.includes("from '../lib/whatsapp'") && programShare.includes("from '../lib/whatsapp'") && whatsapp.includes('normalizeTrWhatsappPhone')],
  ['Mobil komut çubuğunda hafta butonu ayrı tam satıra iner', programCss.includes('.calendar-command-bar .calendar-week-action{grid-column:1/-1}')],
  ['Mobil kişi filtreleri yatay taşmadan yeniden düzenlenir', programCss.includes('@media(max-width:520px)') && programCss.includes('.teacher-secondary-compact{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}')],
  ['Ders durumu değişikliği açık kullanıcı onayı ister', lessonDetail.includes('if(!window.confirm(statusChangeMessage(current,status)))return')],
  ['Yapıldı onayı öğrenci ücreti ve öğretmen hakedişini açıklar', lessonDetail.includes('öğrenci ücretini ve öğretmen hakedişini finansal sonuçlara dahil eder')],
  ['Yapıldı durumundan dönüşün finansal etkisi açıklanır', lessonDetail.includes('artık finansal sonuçlara dahil edilmez')],
  ['Durum onayından sonra güvenli RPC çağrısı korunur', lessonDetail.includes('await setLessonStatus(lesson.ders_id,status)')],
  ['Ders durumu alanı onay davranışını kullanıcıya bildirir', lessonDetail.includes('Finansal etkisi onaylandıktan sonra kaydedilir.')],
  ['Haftalık ders üretimi kullanıcı onayı ister', (calendar.match(/if\(!confirmWeekCreation\(status\)\)return/g)||[]).length===2],
  ['Haftalık üretim onayı kişi filtresinden bağımsız kapsamı açıklar', calendar.includes('Takvim kişi filtresinden bağımsız olarak tüm aktif sabit programlar işlenir.')],
  ['Haftalık üretim onayı hazır haftaların yeniden işlenmeyeceğini açıklar', calendar.includes('Hazır haftalar yeniden işlenmez; mevcut dersler korunur.')],
  ['Haftalık üretim güvenli V4 RPC çağrısını korur', calendar.includes('await createWeek(monday)')],
  ['Hafta hazırlık durumu güvenli RPC üzerinden okunur', office.includes("haftalik_ders_uretim_durumu_v1")],
  ['Seçilen ve sonraki haftanın hazırlık durumu birlikte kontrol edilir', calendar.includes('getWeekCreationStatus(monday)') && calendar.includes('getWeekCreationStatus(addDays(monday,7))')],
  ['Hazır haftalarda oluşturma düğmesi pasifleşir', calendar.includes('disabled={weekBusy||weekStatusBusy||allWeeksReady}') && calendar.includes("allWeeksReady?'Haftalar Hazır'" )],
  ['Yalnız eksik haftanın adı kullanıcıya gösterilir', calendar.includes("'Sonraki Haftayı Hazırla'") && calendar.includes("'Bu Haftayı Hazırla'" )],
  ['Takvim Sabit Program formunu doğrudan içermez', !calendar.includes('ProgramForm') && !calendar.includes("mode==='program'")],
  ['Sabit Program ayrı sayfadır', fixed.includes('Sabit Ders Programı') && fixed.includes('fixed-program-groups')],
  ['Sabit Program günlere göre gruplanır', fixed.includes('dayNames.map(day=>')],
  ['Sabit Program Menü içindedir', more.includes("to:'/sabit-program'")],
  ['Sabit Program rotası tanımlıdır', app.includes('path="/sabit-program"')],
  ['Başak Atilla pembe öğretmen rengidir', tone.includes("'BAŞAK ATİLLA'") && tone.includes("return 'teacher-pink'")],
  ['Süleyman Yalçıner mavi öğretmen rengidir', tone.includes("'SÜLEYMAN YALÇINER'") && tone.includes("return 'teacher-blue'")],
  ['Diğer öğretmenler sarı renktir', tone.includes("return 'teacher-yellow'")],
  ['Yönetici öğretmenler Yönetici etiketi taşır', calendar.includes('<small>Yönetici</small>')],
  ['Seçili hafta belirgin mavi zemindir', css.includes('.week-switcher button.active{background:#2563eb;color:#fff')],
  ['Başak Takvim butonu beyaz zemin ve pembe çerçeve kullanır', stability.includes('.calendar-v2 .teacher-chip.teacher-pink') && stability.includes('border-color:#ec4899')],
  ['Süleyman Takvim butonu beyaz zemin ve mavi çerçeve kullanır', stability.includes('.calendar-v2 .teacher-chip.teacher-blue') && stability.includes('border-color:#3b82f6')],
  ['Diğer öğretmen seçicisi beyaz zeminlidir', stability.includes('.teacher-other-picker') && stability.includes('background:#fff')],
  ['Seçili diğer öğretmen sarı çerçeveyle ayrılır', stability.includes('.teacher-other-picker.active') && stability.includes('border-color:#eab308')],
  ['Seçili öğrenci turkuaz çerçeveyle ayrılır', programCss.includes('.student-picker.active') && programCss.includes('border-color:#2f9c95')],
  ['Takvim ders kartlarında öğretmen rengi yalnız çerçeve vurgusudur', stability.includes('.calendar-v2 .lesson-card.teacher-pink') && stability.includes('border-left:4px solid #ec4899') && stability.includes('background:#fff !important')],
  ['Yönetici öğretmen butonları iki sütundur', css.includes('.teacher-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['Uygulama yatay sayfa taşmasını engeller', stability.includes('overflow-x:hidden') && stability.includes('overscroll-behavior-x:none')],
  ['Üst bar gerçek sabit konumdadır', stability.includes('.app-header-wrap') && stability.includes('position:fixed !important')],
  ['Alt bar gerçek sabit konumdadır', stability.includes('.bottom-nav') && stability.includes('bottom:0 !important')],
  ['Alt bar sekme isimlerini sürekli görünür tutar', stability.includes('.bottom-nav a span') && stability.includes('visibility:visible !important') && stability.includes('opacity:1 !important')],
  ['Program paylaşım CSS katmanı uygulamaya yüklenir', main.includes("import './program-share.css'")],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Takvim UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Takvim UX kuralı doğrulandı.`)
