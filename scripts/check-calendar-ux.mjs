import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const calendar = read('src/pages/CalendarPage.tsx')
const lessonDetail = read('src/components/LessonDetail.tsx')
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
  ['Tümü tek dokunuşta erişilebilir kalır', calendar.includes('teacher-all') && calendar.includes("setTeacher('tum')")],
  ['Takvim günlere göre haftalık ajanda kullanır', calendar.includes('week-agenda') && calendar.includes('agenda-day')],
  ['Takvim yalnız ders bulunan günleri gösterir', calendar.includes('const visibleDays=') && calendar.includes('.filter(x=>x.items.length>0)')],
  ['Takvim boş gün kartı üretmez', !calendar.includes('agenda-empty')],
  ['Derssiz hafta sakin boş durum mesajı gösterir', calendar.includes('Bu haftada ders yok.') && calendar.includes('calendar-empty-week')],
  ['Ders durumu değişikliği açık kullanıcı onayı ister', lessonDetail.includes('if(!window.confirm(statusChangeMessage(current,status)))return')],
  ['Yapıldı onayı öğrenci ücreti ve öğretmen hakedişini açıklar', lessonDetail.includes('öğrenci ücretini ve öğretmen hakedişini finansal sonuçlara dahil eder')],
  ['Yapıldı durumundan dönüşün finansal etkisi açıklanır', lessonDetail.includes('artık finansal sonuçlara dahil edilmez')],
  ['Durum onayından sonra güvenli RPC çağrısı korunur', lessonDetail.includes('await setLessonStatus(lesson.ders_id,status)')],
  ['Ders durumu alanı onay davranışını kullanıcıya bildirir', lessonDetail.includes('Finansal etkisi onaylandıktan sonra kaydedilir.')],
  ['Haftalık ders üretimi kullanıcı onayı ister', (calendar.match(/if\(!confirmWeekCreation\(\)\)return/g)||[]).length===2],
  ['Haftalık üretim onayı öğretmen filtresinden bağımsız kapsamı açıklar', calendar.includes('Öğretmen filtresinden bağımsız olarak tüm aktif sabit programlar işlenir.')],
  ['Haftalık üretim onayı yalnız eksik derslerin ekleneceğini açıklar', calendar.includes('Mevcut dersler korunur; yalnız eksik dersler eklenir.')],
  ['Haftalık üretim güvenli V4 RPC çağrısını korur', calendar.includes('await createWeek(monday)')],
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
