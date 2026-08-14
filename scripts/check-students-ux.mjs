import { readFileSync } from 'node:fs'

const page = readFileSync('src/pages/StudentsPage.tsx','utf8')
const detail = readFileSync('src/components/StudentDetail.tsx','utf8')
const stability = readFileSync('src/navigation-stability.css','utf8')

const checks = [
  ['Öğrenciler sayfası görsel sınıfını taşır', page.includes('page-stack students-v2')],
  ['Öğrenci kartları özel çerçeve sınıfını taşır', page.includes('student-card student-outline-card')],
  ['Öğrenci kartları beyaz zeminde kalır', stability.includes('.students-v2 .student-card') && stability.includes('background:#fff !important')],
  ['Öğrenci kartları turkuaz çerçeve kullanır', stability.includes('border:1.5px solid #2f9c95 !important')],
  ['Öğrenci avatarı sakin turkuaz kimlik taşır', page.includes('student-list-avatar') && stability.includes('.students-v2 .student-list-avatar')],
  ['Öğrenci detay başlığı mevcut profil bileşenini korur', detail.includes('student-profile-hero')],
  ['Öğrenci detay başlığı beyaz zemin ve turkuaz çerçevedir', stability.includes('.profile-detail-hero.student-profile-hero') && stability.includes('border:1.5px solid #2f9c95 !important')],
  ['Borç ve avans metin renkleri korunur', page.includes("debt>0?'danger-text':debt<0?'success-text'")],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} Öğrenciler UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} Öğrenciler UX kuralı doğrulandı.`)
