import { existsSync, readFileSync } from 'node:fs'

const contractPath='saas/hosted-kabul.v1.json'
const manifestPath='saas/kurulum-manifesti.v1.json'
const smokePath='supabase/saas-v1-core/07_hosted_smoke_readonly.sql'
const errors=[]
const ok=(label,condition)=>{console.log(`${condition?'✓':'✗'} ${label}`);if(!condition)errors.push(label)}

ok('Hosted kabul sözleşmesi mevcut',existsSync(contractPath))
ok('Hosted salt-okunur smoke SQL mevcut',existsSync(smokePath))
if(errors.length){console.error(`\n${errors.length} hosted kabul dosya kontrolü başarısız.`);process.exit(1)}

const contract=JSON.parse(readFileSync(contractPath,'utf8'))
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const smoke=readFileSync(smokePath,'utf8')
const expectedInstallOrder=[
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
  'supabase/saas-v1-core/03_core_seed.sql',
  'supabase/saas-v1-core/04_core_security.sql',
  'supabase/saas-v1-core/05_core_storage.sql',
  'supabase/saas-v1-core/06_first_admin_bootstrap.sql',
]
const sameArray=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i])
const mutationStatement=/^\s*(insert|update|delete|create|alter|drop|truncate|grant|revoke)\b/im
const checkNames=[...smoke.matchAll(/'([0-9]{2}_[a-z0-9_]+)'/gi)].map(m=>m[1])

ok('Hosted kabul dedicated-instance modelidir',contract?.dagitim_modeli==='dedicated-instance')
ok('Hosted test canlı projeleri açıkça yasaklar',String(contract?.hedef_proje_kurali||'').includes('Canlı BS Ofis')&&String(contract?.hedef_proje_kurali||'').includes('üretim'))
ok('Core kurulum sırası 00a→06 eksiksiz ve sabittir',sameArray(contract?.kurulum_sirasi,expectedInstallOrder))
ok('Kurulum sırasındaki tüm SQL dosyaları repoda mevcuttur',expectedInstallOrder.every(existsSync))
ok('Otomatik smoke doğru SQL dosyasını gösterir',contract?.otomatik_smoke?.sql===smokePath)
ok('Hosted smoke salt-okunurdur',contract?.otomatik_smoke?.degisiklik_yapar===false&&!mutationStatement.test(smoke))
ok('Hosted smoke 23 benzersiz PASS/FAIL kontrolü içerir',checkNames.length===23&&new Set(checkNames).size===23)
ok('Smoke Core tablo hedefini 26 olarak doğrular',smoke.includes("'01_core_tablolar_26'")&&smoke.includes('=26'))
ok('Smoke Core RPC hedefini 53 olarak doğrular',smoke.includes("'05_core_rpc_53'")&&smoke.includes('=53'))
ok('Smoke anon ve authenticated doğrudan DML yasağını doğrular',smoke.includes("'09_anon_direct_dml_yok'")&&smoke.includes("'10_authenticated_direct_dml_yok'"))
ok('Smoke üç Storage bucket kabulünü doğrular',['kurum-markasi','odev-ekleri','profil-fotograflari'].every(x=>smoke.includes(x)))
ok('Smoke bootstrap erişim sınırlarını doğrular',['20_bootstrap_anon_kapali','21_bootstrap_authenticated_kapali','22_bootstrap_service_role_acik'].every(x=>smoke.includes(x)))
ok('Security Advisor hosted kabulde zorunludur',contract?.security_advisor?.zorunlu===true)
ok('Installable kapısı Security Advisor ve bootstrap kabulünü içerir',Array.isArray(contract?.installable_true_kapisi)&&contract.installable_true_kapisi.some(x=>x.includes('Security Advisor'))&&contract.installable_true_kapisi.some(x=>x.includes('bootstrap')))
ok('Manifest hosted kabul bitene kadar installable=false kalır',manifest?.installable===false&&String(manifest?.installable_false_nedeni||'').includes('hosted Supabase'))

if(errors.length){
  console.error(`\n${errors.length} SaaS hosted kabul kalite kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 hosted kabul sözleşmesi kalite kontrolü geçti.')
