import { readFileSync } from 'node:fs'

const student = readFileSync('src/components/StudentDetail.tsx','utf8')
const studentEdit = readFileSync('src/components/StudentEditPanel.tsx','utf8')
const studentAdmin = readFileSync('src/services/studentAdminService.ts','utf8')
const teachers = readFileSync('src/pages/TeachersPage.tsx','utf8')
const lesson = readFileSync('src/components/LessonDetail.tsx','utf8')
const finance = readFileSync('src/pages/FinancePage.tsx','utf8')
const css = readFileSync('src/navigation-stability.css','utf8')
const detailFixes = readFileSync('src/detail-layout-fixes.css','utf8')
const teacherFormFix = readFileSync('src/teacher-form-fix.css','utf8')

const checks = [
  ['Öğrenci iletişimi detayın üst bölümündedir', student.includes('profile-contact-strip') && student.includes('mailto:') && student.includes('wa.me/') && student.includes('tel:+')],
  ['Öğretmen iletişimi detayın üst bölümündedir', teachers.includes('profile-contact-strip') && teachers.includes('mailto:') && teachers.includes('wa.me/') && teachers.includes('tel:+')],
  ['Öğrenci hızlı işlemleri kart görünümündedir', student.includes('detail-action-cards') && student.includes('<b>Düzenle</b>')],
  ['Öğretmen hızlı işlemleri kart görünümündedir', teachers.includes('detail-action-cards') && teachers.includes('<b>Düzenle</b>')],
  ['Detay Sheet yatay taşmayı engeller', css.includes('.sheet-panel') && css.includes('overflow-x:hidden !important')],
  ['Öğretmen detayında ek yatay stabilite katmanı vardır', detailFixes.includes('.teachers-v2 .sheet-panel') && detailFixes.includes('overflow-x:hidden !important')],
  ['Öğretmen branş seçimi mobilde tek sütuna iner', teacherFormFix.includes('@media(max-width:650px)') && teacherFormFix.includes('grid-template-columns:1fr !important')],
  ['Öğretmen branş checkboxı genel input genişlik kuralından korunur', teacherFormFix.includes('.form-grid .check-card input[type="checkbox"]') && teacherFormFix.includes('width:20px !important') && teacherFormFix.includes('max-width:20px !important')],
  ['Öğretmen branş adı checkbox yanında normal satır akışındadır', teacherFormFix.includes('grid-template-columns:22px minmax(0,1fr) !important') && teacherFormFix.includes('word-break:normal !important')],
  ['iOS Sheet visual viewport dışına taşamaz', teacherFormFix.includes('width:100dvw !important') && teacherFormFix.includes('max-width:100dvw !important')],
  ['iOS form alanları otomatik zoomu tetiklemez', teacherFormFix.includes('.sheet-panel .form-grid input:not([type="checkbox"])') && teacherFormFix.includes('font-size:16px !important')],
  ['Form alanları mobil genişliği aşamaz', css.includes('.form-grid input,.form-grid select,.form-grid textarea') && css.includes('max-width:100% !important')],
  ['Uzun profil metinleri satıra kırılır', css.includes('overflow-wrap:anywhere') && css.includes('word-break:break-word')],
  ['Öğrenci silme güvenli RPC üzerinden yapılır', studentAdmin.includes("supabase.rpc('ogrenci_sil_guvenli_v1'") && !studentAdmin.includes('.delete(')],
  ['Öğrenci düzenleme ekranında silme butonu vardır', studentEdit.includes('Öğrenciyi Sil') && studentEdit.includes('hasHistory')],
  ['Ders durumları üç doğrudan butondur', lesson.includes('lesson-status-three') && lesson.includes("value:'Planlandı'") && lesson.includes("value:'Yapıldı'") && lesson.includes("value:'İptal'")],
  ['Ders durum renkleri mavi yeşil kırmızıdır', detailFixes.includes('.lesson-status-button.blue') && detailFixes.includes('.lesson-status-button.green') && detailFixes.includes('.lesson-status-button.red')],
  ['Tahsilat fiziksel silinmez, güvenli iptal kullanır', finance.includes('cancelCollection') && finance.includes('Kaydı İptal Et') && finance.includes('Kayıt silinmeyecek')],
]

const failed = checks.filter(([,ok])=>!ok)
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if (failed.length) {
  console.error(`\n${failed.length} detay UX kontrolü başarısız.`)
  process.exit(1)
}
console.log(`\n${checks.length} detay UX kuralı doğrulandı.`)
