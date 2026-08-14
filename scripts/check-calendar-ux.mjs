import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const calendar = read('src/pages/CalendarPage.tsx')
const fixed = read('src/pages/FixedProgramPage.tsx')
const more = read('src/pages/MorePage.tsx')
const app = read('src/App.tsx')
const tone = read('src/lib/teacherTone.ts')
const css = read('src/ux-overrides.css')

const checks = [
  ['Takvim Önceki Hafta butonunu içerir', calendar.includes("label:'Önceki Hafta'")],
  ['Takvim Bu Hafta butonunu içerir', calendar.includes("label:'Bu Hafta'")],
  ['Takvim Gelecek Hafta butonunu içerir', calendar.includes("label:'Gelecek Hafta'")],
  ['Takvim öğretmen buton filtresini kullanır', calendar.includes('teacher-chip')],
  ['Takvim günlere göre haftalık ajanda kullanır', calendar.includes('week-agenda') && calendar.includes('agenda-day')],
  ['Takvim Sabit Program formunu doğrudan içermez', !calendar.includes('ProgramForm') && !calendar.includes("mode==='program'")],
  ['Sabit Program ayrı sayfadır', fixed.includes('Sabit Ders Programı') && fixed.includes('fixed-program-groups')],
  ['Sabit Program günlere göre gruplanır', fixed.includes('dayNames.map(day=>')],
  ['Sabit Program Menü içindedir', more.includes("to:'/sabit-program'")],
  ['Sabit Program rotası tanımlıdır', app.includes('path="/sabit-program"')],
  ['Başak Atilla pembe öğretmen rengidir', tone.includes("'BAŞAK ATİLLA'") && tone.includes("return 'teacher-pink'")],
  ['Süleyman Yalçıner mavi öğretmen rengidir', tone.includes("'SÜLEYMAN YALÇINER'") && tone.includes("return 'teacher-blue'")],
  ['Diğer öğretmenler sarı renktir', tone.includes("return 'teacher-yellow'")],
  ['Yönetici öğretmenler özel işaretlenir', calendar.includes("?'manager':''") && calendar.includes('Yönetici')],
  ['Seçili hafta belirgin mavi zemindir', css.includes('.week-switcher button.active{background:#2563eb;color:#fff')],
  ['Pembe öğretmen zemini tanımlıdır', css.includes('.teacher-chip.teacher-pink{background:#fce7f3')],
  ['Mavi öğretmen zemini tanımlıdır', css.includes('.teacher-chip.teacher-blue{background:#dbeafe')],
  ['Sarı öğretmen zemini tanımlıdır', css.includes('.teacher-chip.teacher-yellow{background:#fef3c7')],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Takvim UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Takvim UX kuralı doğrulandı.`)
