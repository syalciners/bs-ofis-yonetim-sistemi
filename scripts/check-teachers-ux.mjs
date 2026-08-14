import { readFileSync } from 'node:fs'

const page = readFileSync('src/pages/TeachersPage.tsx','utf8')
const css = readFileSync('src/ux-overrides.css','utf8')
const stability = readFileSync('src/navigation-stability.css','utf8')

const checks = [
  ['Yöneticiler ayrı üst gruptadır', page.includes('manager-teacher-grid') && page.includes('Yöneticiler')],
  ['Diğer öğretmenler ayrı gruptadır', page.includes('standard-teacher-grid') && page.includes('EĞİTİM KADROSU')],
  ['Yöneticiler isim yardımcı fonksiyonuyla belirlenir', page.includes('isManagerTeacher')],
  ['Branşlar öğretmen-branş ilişkisinden okunur', page.includes('data.ogretmenBranslari') && page.includes('data.branslar.find')],
  ['Kartlarda Verdiği Dersler gösterilir', page.includes('Verdiği Dersler')],
  ['Matematik veya Math branşı Matematik Öğretmeni unvanı üretir', page.includes("includes('MATEMATİK')") && page.includes("includes('MATH')") && page.includes("return 'Matematik Öğretmeni'")],
  ['Yönetici unvanı öğretmen unvanıyla birleşir', page.includes('Yönetici - ${baseTitle}')],
  ['Yönetici kartları iki sütundur', css.includes('.manager-teacher-grid{display:grid;grid-template-columns:repeat(2')],
  ['Diğer öğretmen kartları daha kompakt gruptadır', css.includes('.standard-teacher-grid{display:grid') && css.includes('.teacher-profile-card.standard-card')],
  ['Öğretmen kartları beyaz zeminde kalır', stability.includes('.teachers-v2 .teacher-profile-card') && stability.includes('background:#fff !important')],
  ['Başak pembe çerçeve kullanır', stability.includes('.teachers-v2 .teacher-profile-card.teacher-pink') && stability.includes('border-color:#ec4899')],
  ['Süleyman mavi çerçeve kullanır', stability.includes('.teachers-v2 .teacher-profile-card.teacher-blue') && stability.includes('border-color:#3b82f6')],
  ['Diğer öğretmenler sarı çerçeve kullanır', stability.includes('.teachers-v2 .teacher-profile-card.teacher-yellow') && stability.includes('border-color:#eab308')],
  ['Öğretmen detay başlığı da beyaz zemin standardındadır', stability.includes('.profile-detail-hero.teacher-pink') && stability.includes('.profile-detail-hero.teacher-blue') && stability.includes('background:#fff !important')],
  ['Öğretmen ödeme kartları da beyaz zemin standardındadır', stability.includes('.teacher-payment-card.teacher-pink') && stability.includes('.teacher-payment-card.teacher-blue') && stability.includes('.teacher-payment-card.teacher-yellow')],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Öğretmenler UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Öğretmenler UX kuralı doğrulandı.`)
