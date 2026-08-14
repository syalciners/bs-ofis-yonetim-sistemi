import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const calendar = read('src/pages/CalendarPage.tsx')
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
  ['Takvim öğretmen buton filtresini kullanır', calendar.includes('teacher-chip')],
  ['Yönetici öğretmenler üstte ayrı gruptadır', calendar.includes('teacher-manager-grid') && calendar.includes('teacher-manager-chip')],
  ['Diğer öğretmenler altta küçük butonlardır', calendar.includes('teacher-secondary-row') && calendar.includes('teacher-small-chip')],
  ['Takvim günlere göre haftalık ajanda kullanır', calendar.includes('week-agenda') && calendar.includes('agenda-day')],
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
  ['Diğer öğretmenler beyaz zemin ve sarı çerçeve kullanır', stability.includes('.calendar-v2 .teacher-chip.teacher-yellow') && stability.includes('border-color:#eab308')],
  ['Takvim ders kartlarında öğretmen rengi yalnız çerçeve vurgusudur', stability.includes('.calendar-v2 .lesson-card.teacher-pink') && stability.includes('border-left:4px solid #ec4899') && stability.includes('background:#fff !important')],
  ['Yönetici öğretmen butonları iki sütundur', css.includes('.teacher-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['Küçük öğretmenler yatay kaydırma yerine satıra kırılır', stability.includes('.teacher-secondary-row') && stability.includes('flex-wrap:wrap') && stability.includes('overflow:visible !important')],
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
