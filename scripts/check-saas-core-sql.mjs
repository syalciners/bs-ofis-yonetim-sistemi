import { existsSync, readFileSync } from 'node:fs'

const contract=JSON.parse(readFileSync('saas/core-rpc-contract.v1.json','utf8'))
const files=[
  'supabase/saas-v1-core/00a_core_tables.sql',
  'supabase/saas-v1-core/00b_core_constraints.sql',
  'supabase/saas-v1-core/00c_core_foreign_keys.sql',
  'supabase/saas-v1-core/00d_core_indexes.sql',
  'supabase/saas-v1-core/01_private_helpers.sql',
  'supabase/saas-v1-core/02a_portal_rpc.sql',
  'supabase/saas-v1-core/02b_management_rpc.sql',
  'supabase/saas-v1-core/02c_notifications_assignments_rpc.sql',
  'supabase/saas-v1-core/02d_finance_rpc.sql',
  'supabase/saas-v1-core/02e_lessons_weekly_rpc.sql',
  'supabase/saas-v1-core/02f_fixed_schedule_health_rpc.sql',
]
const errors=[]
const ok=(label,condition)=>{ console.log(`${condition?'✓':'✗'} ${label}`); if(!condition)errors.push(label) }
const sameSet=(a,b)=>a.length===b.length&&b.every(x=>a.includes(x))
const unique=a=>new Set(a).size===a.length

for(const file of files) ok(`Core SQL dosyası mevcut: ${file}`,existsSync(file))
if(errors.length){ console.error(`\n${errors.length} Core SQL dosya kontrolü başarısız.`); process.exit(1) }

const contents=Object.fromEntries(files.map(file=>[file,readFileSync(file,'utf8')]))
const allSql=files.map(file=>contents[file]).join('\n')
const rpcFiles=files.filter(file=>/\/02[a-f]_/.test(file))
const rpcSql=rpcFiles.map(file=>contents[file]).join('\n')
const expected=(contract.aktif_public_api_imzalari||[]).map(x=>String(x).split('(')[0].trim())
const actual=[...rpcSql.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)\s*\(/gi)].map(m=>m[1])

ok('RPC SQL katmanları tam 53 public fonksiyon oluşturur',actual.length===53)
ok('RPC SQL fonksiyon adlarında tekrar yoktur',unique(actual))
ok('RPC SQL fonksiyon seti contract ile birebir aynıdır',sameSet(actual,expected))

const forbidden=[
  'public.ogrenci_kitaplari','public.kitap_katalogu','public.kocluk_','public.md_',
  'private.finans_v18_','pg_net','net.http_','private.bs_ofis_ogretmen_brans_uygun_mu',
]
for(const token of forbidden) ok(`Core SQL yasaklı bağımlılık içermez: ${token}`,!allSql.toLowerCase().includes(token.toLowerCase()))

const tables=contents['supabase/saas-v1-core/00a_core_tables.sql']
const constraints=contents['supabase/saas-v1-core/00b_core_constraints.sql']
const foreignKeys=contents['supabase/saas-v1-core/00c_core_foreign_keys.sql']
const indexes=contents['supabase/saas-v1-core/00d_core_indexes.sql']
const tableCreates=[...tables.matchAll(/create table public\.([a-z0-9_]+)/gi)].map(m=>m[1])
const expectedTables=[
  'aylik_snapshotlar','bildirim_okumalari','bildirimler','branslar','dersler','derslikler','gider_kategorileri','giderler',
  'haftalik_ders_uretimleri','hakedis_donemleri','kasa_hareketleri','kasa_hesaplari','krediler','kullanici_profilleri','kurum_ayarlari',
  'odevler','ogrenciler','ogretmen_branslari','ogretmen_odemeleri','ogretmenler','portal_kullanicilari','rapor_talepleri',
  'sabit_ders_programi','sabit_program_istisnalari','tahsilatlar','tarifeler',
]
ok('Core tablo katmanı tam 26 public tablo oluşturur',tableCreates.length===26&&sameSet(tableCreates,expectedTables))
ok('Core tablo katmanında tekrar yoktur',unique(tableCreates))
ok('Core tablo katmanı pgcrypto eklentisini extensions şemasında kurar',/create extension if not exists pgcrypto with schema extensions;/i.test(tables))
ok('Core tablo katmanı extension sürümü pinlemez',!/create extension[^;]*\bversion\b/i.test(tables))
const coachingColumns=['ogrenci_kitap_id','calisma_turu','baslangic_no','bitis_no','calisma_detayi','kaynak_gorusme_id','haftalik_plan_id','plan_kaynagi','ai_plan_madde_anahtari']
ok('Core ödev tablosunda Koçluk kolonları yoktur',coachingColumns.every(x=>!tables.includes(x)))
ok('Core rol checki Koç rolünü içermez',constraints.includes("array['Yönetici'::text, 'Personel'::text, 'Öğretmen'::text]")&&!constraints.includes("'Koç'::text"))
ok('Core kısıt katmanında Koçluk ödev checkleri yoktur',!constraints.includes('odevler_calisma_araligi_chk')&&!constraints.includes('odevler_calisma_turu_chk'))
ok('Core foreign key katmanı yalnız Core/Auth bağı taşır',!foreignKeys.includes('ogrenci_kitaplari')&&!foreignKeys.includes('kitap_katalogu')&&!foreignKeys.includes('kocluk_'))
ok('Core indeks katmanında Koçluk ödev indeksleri yoktur',!indexes.includes('odevler_ai_plan_madde_anahtari_uidx')&&!indexes.includes('odevler_kaynak_gorusme_tekil_idx'))

const helpers=contents['supabase/saas-v1-core/01_private_helpers.sql']
ok('Normalize öğretmen-branş helperı kurulur',/function\s+private\.ogretmen_brans_uygun_mu\s*\(/i.test(helpers))
ok('Legacy öğretmen-branş helperı kurulmaz',!/function\s+private\.bs_ofis_ogretmen_brans_uygun_mu\s*\(/i.test(helpers))
ok('Ders triggerı normalize helper kökünü kullanır',helpers.includes('trg_dersler_ogretmen_brans')&&helpers.includes('private.bs_ofis_ogretmen_brans_dogrula_v1'))
ok('Sabit program triggerı normalize helper kökünü kullanır',helpers.includes('trg_sabit_program_ogretmen_brans')&&helpers.includes('private.bs_ofis_ogretmen_brans_dogrula_v1'))

const portal=contents['supabase/saas-v1-core/02a_portal_rpc.sql']
ok('Öğrenci Bugün RPC response uyumluluğu için kitap alanını null korur',/'kitap_adi'\s*,\s*null\b/i.test(portal))
ok('Öğrenci Bugün RPC Koçluk kitap tablolarına join yapmaz',!portal.includes('ogrenci_kitaplari')&&!portal.includes('kitap_katalogu'))

const finance=contents['supabase/saas-v1-core/02d_finance_rpc.sql']
ok('Tahsilat düzenleme Finance Asistanı olmadan çalışır',finance.includes("'finans_sync_tetiklendi',false")&&!finance.includes('finans_v18_sync_tetikle'))
ok('Tahsilat silme Finance Asistanı olmadan çalışır',(finance.match(/'finans_sync_tetiklendi',false/g)||[]).length>=2)

const office=readFileSync('src/services/officeService.ts','utf8')
ok('Yönetim frontend sabit program kaydında V4 RPC kullanır',office.includes("supabase.rpc('sabit_program_kaydet_guvenli_v4'"))
ok('Yönetim frontend legacy sabit program V3 çağırmaz',!office.includes("supabase.rpc('sabit_program_kaydet_guvenli_v3'"))

const legacy=contract.baseline_disinda_legacy_public_rpc||[]
const coreClientFiles=[
  'src/services/officeService.ts','src/services/institutionService.ts','src/services/notificationService.ts',
  'src/services/financeCancelService.ts','src/services/financeEditService.ts','src/services/educationDefinitionsService.ts',
  'src/services/financeDefinitionsService.ts','src/services/profilePhotoService.ts','src/services/assignmentAttachmentService.ts',
  'apps/bs-egitim-portali/src/App.tsx','apps/bs-egitim-portali/src/supabase.ts',
].filter(existsSync)
const clientText=coreClientFiles.map(file=>readFileSync(file,'utf8')).join('\n')
const used=[...clientText.matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/gi)].map(m=>m[1])
const usedLegacy=[...new Set(used.filter(name=>legacy.includes(name)))]
ok('Core istemci dosyaları legacy RPC çağırmaz',usedLegacy.length===0)
const outsideContract=[...new Set(used.filter(name=>!expected.includes(name)))]
ok('Core istemci RPC çağrıları aktif contract içinde kalır',outsideContract.length===0)
if(usedLegacy.length) console.error('Legacy istemci RPC:',usedLegacy.join(', '))
if(outsideContract.length) console.error('Contract dışı istemci RPC:',outsideContract.join(', '))

if(errors.length){
  console.error(`\n${errors.length} SaaS Core SQL sözleşme kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 Core SQL sözleşme kontrolleri geçti.')
