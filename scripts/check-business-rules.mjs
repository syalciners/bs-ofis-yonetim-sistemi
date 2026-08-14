import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const collectSource = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const relative = join(dir, entry.name)
  if (entry.isDirectory()) return collectSource(relative)
  return /\.(ts|tsx)$/.test(entry.name) ? [read(relative)] : []
}).join('\n')

const metrics = read('src/services/metrics.ts')
const service = read('src/services/officeService.ts')
const cancelService = read('src/services/financeCancelService.ts')
const lessonDetail = read('src/components/LessonDetail.tsx')
const forms = read('src/components/forms.tsx')
const studentCollectionQuick = read('src/components/StudentCollectionForm.tsx')
const teacherPaymentQuick = read('src/components/TeacherPaymentQuickForm.tsx')
const calendar = read('src/pages/CalendarPage.tsx')
const students = read('src/pages/StudentsPage.tsx')
const teachers = read('src/pages/TeachersPage.tsx')
const bottomNav = read('src/components/BottomNav.tsx')
const format = read('src/lib/format.ts')
const allSource = collectSource('src')

const checks = []
const expectText = (name, source, text) => checks.push({ name, ok: source.includes(text), detail: `Beklenen ifade bulunamadı: ${text}` })
const rejectRegex = (name, source, regex, detail) => checks.push({ name, ok: !regex.test(source), detail })

expectText('Öğrenci borcu yalnız Yapıldı derslerinden oluşur', metrics, "x.ogrenci_id === id && x.ders_durumu === 'Yapıldı'")
expectText('İptal tahsilat öğrenci bakiyesini etkilemez', metrics, "x.ogrenci_id === id && !x.iptal_mi")
expectText('İptal tahsilat aylık tahsilat KPI değerini etkilemez', metrics, "!x.iptal_mi && x.tarih?.startsWith(prefix)")
expectText('Öğretmen hakedişi yalnız Yapıldı derslerinden oluşur', metrics, "x.ogretmen_id === id && x.ders_durumu === 'Yapıldı'")
expectText('Aylık gerçekleşen ciro yalnız Yapıldı derslerinden oluşur', metrics, "x.ders_durumu === 'Yapıldı' && x.tarih?.startsWith(prefix)")
expectText('Para gösterimi Türk Lirası kullanır', format, "currency: 'TRY'")
expectText('Para gösterimi Türkiye yerel ayarını kullanır', format, "Intl.NumberFormat('tr-TR'")
expectText('Öğretmen ödeme formu bugünün hakediş dönemini otomatik bulur', teacherPaymentQuick, "today >= x.baslangic_tarihi && today <= x.bitis_tarihi")
expectText('Öğretmen ödeme formu iptal ödemeleri kalan hakedişten düşmez', teacherPaymentQuick, "x.hakedis_donemi_id === period && !x.iptal_mi")
expectText('Öğretmen profili hızlı ödeme formunu kullanır', teachers, '<TeacherPaymentQuickForm teacherId={payment}')
expectText('Öğrenci hızlı tahsilat formu öğrenciyi tekrar seçtirmez', studentCollectionQuick, 'ogrenci_id:studentId')
expectText('Öğrenci hızlı tahsilat formu güncel bakiyeyi gösterir', studentCollectionQuick, 'studentDebt(data,studentId)')
expectText('Öğrenci ekranı hızlı tahsilat formunu kullanır', students, '<StudentCollectionForm studentId={collectionId}')
expectText('Tahsilat güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('tahsilat_kaydet_guvenli_v1'")
expectText('Gider güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('gider_kaydet_guvenli_v1'")
expectText('Öğretmen ödemesi güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('ogretmen_odeme_kaydet_guvenli_v2'")
expectText('Tahsilat yalnız güvenli iptal RPC ile iptal edilir', cancelService, "run('tahsilat_iptal_guvenli_v1'")
expectText('Gider yalnız güvenli iptal RPC ile iptal edilir', cancelService, "run('gider_iptal_guvenli_v1'")
expectText('Öğretmen ödemesi yalnız güvenli iptal RPC ile iptal edilir', cancelService, "run('ogretmen_odeme_iptal_guvenli_v1'")
expectText('Haftalık ders üretimi idempotent V4 RPC kullanır', service, "supabase.rpc('haftalik_dersleri_olustur_guvenli_v4'")
expectText('Ders durumunda Yapıldı korunur', lessonDetail, "value:'Yapıldı'")
expectText('Ders durumunda İptal korunur', lessonDetail, "value:'İptal'")
expectText('Ders durumunda Öğrenci Gelmedi korunur', lessonDetail, "value:'Öğrenci Gelmedi'")
expectText('Ders durumunda Ertelendi korunur', lessonDetail, "value:'Ertelendi'")
expectText('Ders durumunda Öğretmen İptali korunur', lessonDetail, "value:'Öğretmen İptali'")
expectText('Ders durumunda Planlandı korunur', lessonDetail, "value:'Planlandı'")
expectText('Planlanan derste sonuç seçenekleri doğrudan açılır', lessonDetail, 'const[showStatuses,setShowStatuses]=useState(isPlanned)')
expectText('Takvim veri yüklenirken Hook sırasını değiştirmez', calendar, "const lessons=useMemo(()=>{if(!data)return[];")
expectText('Alt menü Özet girişini korur', bottomNav, "label: 'Özet'")
expectText('Alt menü Takvim girişini korur', bottomNav, "label: 'Takvim'")
expectText('Alt menü Öğrenciler girişini korur', bottomNav, "label: 'Öğrenciler'")
expectText('Alt menü Finans girişini korur', bottomNav, "label: 'Finans'")
expectText('Alt menü Menü girişini korur', bottomNav, "label: 'Menü'")

rejectRegex('Frontend service_role anahtarı içermez', allSource, /service[_-]?role/i, 'Frontend kaynaklarında service_role ifadesi bulundu.')
rejectRegex('Frontend doğrudan insert yapmaz', allSource, /\.insert\s*\(/, 'Frontend kaynaklarında doğrudan .insert() kullanımı bulundu.')
rejectRegex('Frontend doğrudan update yapmaz', allSource, /\.update\s*\(/, 'Frontend kaynaklarında doğrudan .update() kullanımı bulundu.')
rejectRegex('Frontend doğrudan delete yapmaz', allSource, /\.delete\s*\(/, 'Frontend kaynaklarında doğrudan .delete() kullanımı bulundu.')
rejectRegex('Frontend dolar para birimi kullanmaz', allSource, /currency\s*:\s*['"]USD['"]/i, 'Frontend kaynaklarında USD para birimi bulundu.')
rejectRegex('Frontend dolar simgeli ikon kullanmaz', allSource, /\b(?:CircleDollarSign|BadgeDollarSign|DollarSign)\b/, 'Frontend kaynaklarında dolar işaretli ikon bulundu.')

const collectionStart = forms.indexOf('export function CollectionForm')
const collectionEnd = forms.indexOf('export function ExpenseForm')
const collectionBlock = collectionStart >= 0 && collectionEnd > collectionStart ? forms.slice(collectionStart, collectionEnd) : ''
checks.push({
  name: 'Genel tahsilat tutarı borçla sınırlandırılmaz; avans ödeme mümkündür',
  ok: collectionBlock.length > 0 && !/\bmax\s*=/.test(collectionBlock),
  detail: 'CollectionForm içinde max sınırı bulundu veya form bloğu okunamadı.',
})
checks.push({
  name: 'Öğrenci hızlı tahsilat tutarı borçla sınırlandırılmaz; avans ödeme mümkündür',
  ok: !/\bmax\s*=/.test(studentCollectionQuick),
  detail: 'StudentCollectionForm içinde max sınırı bulundu.',
})

const failed = checks.filter((x) => !x.ok)
for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}`)
if (failed.length) {
  console.error(`\n${failed.length} kritik iş kuralı / mimari kontrol başarısız:`)
  failed.forEach((x) => console.error(`- ${x.name}: ${x.detail}`))
  process.exit(1)
}
console.log(`\n${checks.length} kritik iş kuralı ve mimari sınır doğrulandı.`)
