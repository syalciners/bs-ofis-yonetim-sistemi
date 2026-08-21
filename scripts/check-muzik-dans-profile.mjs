import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const profile = read('src/lib/productProfile.ts')
const app = read('src/App.tsx')
const more = read('src/pages/MorePage.tsx')
const office = read('src/services/officeService.ts')
const group = read('src/services/groupService.ts')
const supabase = read('src/lib/supabase.ts')
const vercel = read('apps/bs-kocluk/vercel.json')

const checks = [
  ['Müzik-dans profilinde grup modülü açıktır', profile.includes("key: 'muzik-dans'") && profile.includes('features: { assignments: false, parentFields: true, groups: true }')],
  ['Eğitim profilinde grup modülü varsayılan olarak kapalıdır', profile.includes("key: 'egitim'") && profile.includes('features: { assignments: true, parentFields: true, groups: false }')],
  ['Grup rotası yalnız özellik açıksa erişilir', app.includes("featureEnabled('groups')?<GroupsPage/>:<Navigate to=\"/menu\" replace/>")],
  ['Grup menüsü yalnız özellik açıksa görünür', more.includes("featureEnabled('groups')") && more.includes("to:'/gruplar'")],
  ['Birebir ders kaydı mevcut güvenli RPC üzerinden kalır', office.includes("supabase.rpc('ders_kaydet_guvenli_v1'")],
  ['Tahsilat mevcut güvenli RPC üzerinden kalır', office.includes("supabase.rpc('tahsilat_kaydet_guvenli_v1'")],
  ['Eğitmen ödemesi mevcut güvenli RPC üzerinden kalır', office.includes("supabase.rpc('ogretmen_odeme_kaydet_guvenli_v2'")],
  ['Grup hazırlık servisi yalnız okuma yapar', group.includes("from('kurs_gruplari').select") && group.includes("from('kurs_grup_uyeleri').select") && !group.includes('.insert(') && !group.includes('.update(') && !group.includes('.delete(')],
  ['Demo uygulaması canlı Supabase projesine bağlanamaz', supabase.includes("APP_MODE === 'demo'") && supabase.includes('CANLI_BS_OFIS_PROJECT_REF')],
  ['Müzik-dans branchi BS Koçluk Vercel deployunu tetiklemez', vercel.includes('"muzik-dans-demo-v1": false')],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed += 1
}

if (failed) {
  console.error(`\n${failed} müzik/dans ürün güvenlik kontrolü başarısız.`)
  process.exit(1)
}

console.log(`\n${checks.length} müzik/dans ürün güvenlik kontrolü başarılı.`)
