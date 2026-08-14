import { readFileSync } from 'node:fs'

const page = readFileSync('src/pages/TeachersPage.tsx','utf8')
const css = readFileSync('src/ux-overrides.css','utf8')

const checks = [
  ['Yöneticiler ayrı üst gruptadır', page.includes('manager-teacher-grid') && page.includes('Yöneticiler')],
  ['Diğer öğretmenler ayrı gruptadır', page.includes('standard-teacher-grid') && page.includes('EĞİTİM KADROSU')],
  ['Yöneticiler isim yardımcı fonksiyonuyla belirlenir', page.includes('isManagerTeacher')],
  ['Branşlar öğretmen-branş ilişkisinden okunur', page.includes('data.ogretmenBranslari') && page.includes('data.branslar.find')],
  ['Kartlarda Verdiği Dersler gösterilir', page.includes('Verdiği Dersler')],
  ['Yönetici unvanı branştan türetilir', page.includes('Yönetici${primary?')],
  ['Yönetici kartları iki sütundur', css.includes('.manager-teacher-grid{display:grid;grid-template-columns:repeat(2')],
  ['Diğer öğretmen kartları daha kompakt gruptadır', css.includes('.standard-teacher-grid{display:grid') && css.includes('.teacher-profile-card.standard-card')],
  ['Başak pembe kart kimliğini korur', css.includes('.teacher-profile-card.teacher-pink')],
  ['Süleyman mavi kart kimliğini korur', css.includes('.teacher-profile-card.teacher-blue')],
  ['Diğer öğretmenler sarı kart kimliğini korur', css.includes('.teacher-profile-card.teacher-yellow')],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Öğretmenler UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Öğretmenler UX kuralı doğrulandı.`)
