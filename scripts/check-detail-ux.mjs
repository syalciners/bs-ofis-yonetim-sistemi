import { readFileSync } from 'node:fs'

const student = readFileSync('src/components/StudentDetail.tsx','utf8')
const teachers = readFileSync('src/pages/TeachersPage.tsx','utf8')
const finance = readFileSync('src/pages/FinancePage.tsx','utf8')
const css = readFileSync('src/navigation-stability.css','utf8')

const checks = [
  ['Öğrenci iletişimi detayın üst bölümündedir', student.includes('profile-contact-strip') && student.includes('mailto:') && student.includes('wa.me/') && student.includes('tel:+')],
  ['Öğretmen iletişimi detayın üst bölümündedir', teachers.includes('profile-contact-strip') && teachers.includes('mailto:') && teachers.includes('wa.me/') && teachers.includes('tel:+')],
  ['Öğrenci hızlı işlemleri kart görünümündedir', student.includes('detail-action-cards') && student.includes('<b>Düzenle</b>')],
  ['Öğretmen hızlı işlemleri kart görünümündedir', teachers.includes('detail-action-cards') && teachers.includes('<b>Düzenle</b>')],
  ['Detay Sheet yatay taşmayı engeller', css.includes('.sheet-panel') && css.includes('overflow-x:hidden !important')],
  ['Form alanları mobil genişliği aşamaz', css.includes('.form-grid input,.form-grid select,.form-grid textarea') && css.includes('max-width:100% !important')],
  ['Uzun profil metinleri satıra kırılır', css.includes('overflow-wrap:anywhere') && css.includes('word-break:break-word')],
  ['Tahsilat fiziksel silinmez, güvenli iptal kullanır', finance.includes('cancelCollection') && finance.includes('Kaydı İptal Et') && finance.includes('Kayıt silinmeyecek')],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} detay UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} detay UX kuralı doğrulandı.`)
