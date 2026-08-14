import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const metrics = read('src/services/metrics.ts')
const service = read('src/services/officeService.ts')
const lessonDetail = read('src/components/LessonDetail.tsx')
const forms = read('src/components/forms.tsx')

const checks = []
const expectText = (name, source, text) => checks.push({ name, ok: source.includes(text), detail: `Beklenen ifade bulunamadı: ${text}` })

expectText('Öğrenci borcu yalnız Yapıldı derslerinden oluşur', metrics, "x.ogrenci_id === id && x.ders_durumu === 'Yapıldı'")
expectText('Öğretmen hakedişi yalnız Yapıldı derslerinden oluşur', metrics, "x.ogretmen_id === id && x.ders_durumu === 'Yapıldı'")
expectText('Aylık gerçekleşen ciro yalnız Yapıldı derslerinden oluşur', metrics, "x.ders_durumu === 'Yapıldı' && x.tarih?.startsWith(prefix)")
expectText('Tahsilat güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('tahsilat_kaydet_guvenli_v1'")
expectText('Gider güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('gider_kaydet_guvenli_v1'")
expectText('Öğretmen ödemesi güvenli RPC üzerinden kaydedilir', service, "supabase.rpc('ogretmen_odeme_kaydet_guvenli_v2'")
expectText('Haftalık ders üretimi idempotent V4 RPC kullanır', service, "supabase.rpc('haftalik_dersleri_olustur_guvenli_v4'")
expectText('Ders durumunda Yapıldı korunur', lessonDetail, "value:'Yapıldı'")
expectText('Ders durumunda İptal korunur', lessonDetail, "value:'İptal'")
expectText('Ders durumunda Öğrenci Gelmedi korunur', lessonDetail, "value:'Öğrenci Gelmedi'")
expectText('Ders durumunda Ertelendi korunur', lessonDetail, "value:'Ertelendi'")
expectText('Ders durumunda Öğretmen İptali korunur', lessonDetail, "value:'Öğretmen İptali'")
expectText('Ders durumunda Planlandı korunur', lessonDetail, "value:'Planlandı'")

const collectionStart = forms.indexOf('export function CollectionForm')
const collectionEnd = forms.indexOf('export function ExpenseForm')
const collectionBlock = collectionStart >= 0 && collectionEnd > collectionStart ? forms.slice(collectionStart, collectionEnd) : ''
checks.push({
  name: 'Tahsilat tutarı borçla sınırlandırılmaz; avans ödeme mümkündür',
  ok: collectionBlock.length > 0 && !/\bmax\s*=/.test(collectionBlock),
  detail: 'CollectionForm içinde max sınırı bulundu veya form bloğu okunamadı.',
})

const failed = checks.filter((x) => !x.ok)
for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}`)
if (failed.length) {
  console.error(`\n${failed.length} kritik iş kuralı kontrolü başarısız:`)
  failed.forEach((x) => console.error(`- ${x.name}: ${x.detail}`))
  process.exit(1)
}
console.log(`\n${checks.length} kritik iş kuralı doğrulandı.`)
