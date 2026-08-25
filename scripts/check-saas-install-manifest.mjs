import { existsSync, readFileSync } from 'node:fs'

const manifestPath='saas/kurulum-manifesti.v1.json'
const rpcContractPath='saas/core-rpc-contract.v1.json'
const edgePath='supabase/functions/odev-drive-yukle/index.ts'
const portalSupabasePath='apps/bs-egitim-portali/src/supabase.ts'
const portalVitePath='apps/bs-egitim-portali/vite.config.ts'
const portalPackagePath='apps/bs-egitim-portali/package.json'
const baselinePath='supabase/saas-v1-core/00_core_schema.sql'

const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const rpcContract=JSON.parse(readFileSync(rpcContractPath,'utf8'))
const edge=readFileSync(edgePath,'utf8')
const portalSupabase=readFileSync(portalSupabasePath,'utf8')
const portalVite=readFileSync(portalVitePath,'utf8')
const portalPackage=JSON.parse(readFileSync(portalPackagePath,'utf8'))
const errors=[]
const ok=(label,condition,message=label)=>{
  console.log(`${condition?'✓':'✗'} ${label}`)
  if(!condition)errors.push(message)
}
const unique=(items)=>new Set(items).size===items.length
const sameSet=(actual,expected)=>actual.length===expected.length&&expected.every((item)=>actual.includes(item))
const functionName=(signature)=>String(signature).split('(')[0].trim()

const core=manifest?.veritabani?.core_public_tablolar||[]
const coaching=manifest?.haric_urunler?.bs_kocluk_tablolari||[]
const md=manifest?.haric_urunler?.md_tablolari||[]
const requiredEnv=manifest?.zorunlu_instance_env||[]
const buckets=manifest?.storage?.core_bucketlar||[]
const coreSet=new Set(core)

ok('Manifest dedicated-instance dağıtım modelidir',manifest.dagitim_modeli==='dedicated-instance')
ok('Core tablo sayısı 26 olarak sabittir',core.length===26&&manifest?.veritabani?.core_tablo_sayisi===26)
ok('Core tablo listesinde tekrar yoktur',unique(core))
ok('Koçluk tablo listesinde tekrar yoktur',unique(coaching))
ok('md tablo listesinde tekrar yoktur',unique(md))
ok('Core listesine md_* tablo sızmaz',!core.some((name)=>String(name).startsWith('md_')))
ok('Core listesine kocluk_* tablo sızmaz',!core.some((name)=>String(name).startsWith('kocluk_')))
ok('Core ile Koçluk tabloları kesişmez',!coaching.some((name)=>coreSet.has(name)))
ok('Core ile md tabloları kesişmez',!md.some((name)=>coreSet.has(name)))
ok('Koçluk kitap tabloları Core dışında kalır',!coreSet.has('kitap_katalogu')&&!coreSet.has('ogrenci_kitaplari'))

const expectedEnv=['VITE_APP_MODE','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_PORTAL_URL']
ok('Dört zorunlu instance env değeri vardır',requiredEnv.length===expectedEnv.length&&expectedEnv.every((name)=>requiredEnv.includes(name)))
ok('Zorunlu instance env listesinde tekrar yoktur',unique(requiredEnv))

const bucketMap=new Map(buckets.map((item)=>[item.id,item.public]))
ok('Kurum markası bucketı public tanımlıdır',bucketMap.get('kurum-markasi')===true)
ok('Ödev ekleri bucketı private tanımlıdır',bucketMap.get('odev-ekleri')===false)
ok('Profil fotoğrafları bucketı private tanımlıdır',bucketMap.get('profil-fotograflari')===false)
ok('Core Storage listesi yalnız üç bucket içerir',buckets.length===3)

const requiredExtensions=manifest?.veritabani?.zorunlu_eklentiler||[]
ok('Core pgcrypto eklentisini zorunlu tutar',requiredExtensions.includes('pgcrypto'))
ok('pg_net Core zorunlu eklentisi değildir',!requiredExtensions.includes('pg_net'))
ok('pg_cron Core zorunlu eklentisi değildir',!requiredExtensions.includes('pg_cron'))

ok('Ödev Drive fonksiyonu sabit publishable key içermez',!/sb_publishable_[A-Za-z0-9_-]+/.test(edge))
ok('Ödev Drive fonksiyonu hosted publishable key sözlüğünü kullanır',edge.includes("Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')"))
ok('Ödev Drive fonksiyonu legacy anon fallbackını korur',edge.includes("Deno.env.get('SUPABASE_ANON_KEY')"))
ok('Ödev Drive fonksiyonu service-role veya secret key kullanmaz',!edge.includes('SUPABASE_SERVICE_ROLE_KEY')&&!edge.includes('SUPABASE_SECRET_KEYS')&&!edge.includes('SUPABASE_SECRET_KEY'))

ok('Portal sabit Supabase URL içermez',!/[a-z0-9]{20}\.supabase\.co/i.test(portalSupabase))
ok('Portal sabit publishable key içermez',!/sb_publishable_[A-Za-z0-9_-]+/.test(portalSupabase))
ok('Portal Supabase URL değerini instance envden alır',portalSupabase.includes('import.meta.env.VITE_SUPABASE_URL'))
ok('Portal publishable key değerini instance envden alır',portalSupabase.includes('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'))
ok('Portal Vite kök instance env dizinini kullanır',portalVite.includes("envDir: '../..'"))
ok('Portal build instance config kontrolüyle başlar',String(portalPackage?.scripts?.build||'').startsWith('npm run check:instance-config &&'))

const rpcSignatures=rpcContract?.aktif_public_api_imzalari||[]
const rpcNames=rpcSignatures.map(functionName)
const legacyRpc=rpcContract?.baseline_disinda_legacy_public_rpc||[]
const privateHelpers=rpcContract?.private_runtime_helpers||[]
const triggerRoots=rpcContract?.private_trigger_kokleri||[]
const privateExcluded=rpcContract?.baseline_disinda_private||[]
const security=rpcContract?.guvenlik_hedefi||{}
const finance=rpcContract?.baseline_sanitizasyonlari?.finans_asistani||{}
const teacherBranch=rpcContract?.baseline_sanitizasyonlari?.ogretmen_brans_trigger||{}

ok('Core RPC sözleşmesi dedicated-instance modelidir',rpcContract?.dagitim_modeli==='dedicated-instance')
ok('Core RPC sözleşmesi 53 aktif public API içerir',rpcSignatures.length===53&&rpcContract?.aktif_public_api_sayisi===53)
ok('Aktif public API adlarında tekrar yoktur',unique(rpcNames))
ok('Aktif public API imzalarında tekrar yoktur',unique(rpcSignatures))
ok('Aktif API ile legacy RPC listesi kesişmez',!legacyRpc.some((name)=>rpcNames.includes(name)))
ok('Legacy RPC listesinde tekrar yoktur',unique(legacyRpc))
ok('Sabit program V4 aktif sözleşmededir',rpcNames.includes('sabit_program_kaydet_guvenli_v4'))
ok('Sabit program V1-V3 legacy kalır',['sabit_program_kaydet_guvenli_v1','sabit_program_kaydet_guvenli_v2','sabit_program_kaydet_guvenli_v3'].every((name)=>legacyRpc.includes(name)&&!rpcNames.includes(name)))
ok('Hafta üretimi yalnız V3/V6/V2 güncel setini kullanır',rpcNames.includes('haftalik_ders_uretim_durumu_v3')&&rpcNames.includes('haftalik_dersleri_hazirla_guvenli_v6')&&rpcNames.includes('haftalik_program_kontrol_oneri_v2'))
ok('Portal V2 sözleşmesi aktif API setindedir',['portal_oturum_bilgisi_v2','portal_program_v2','portal_odevler_v2','portal_bugun_v2','portal_ogrenci_bugun_v1','portal_ogrenci_odev_tamamla_v1'].every((name)=>rpcNames.includes(name)))

const expectedHelpers=['bs_ofis_yonetici_mi','bs_program_tarih_kontrol_v1','ogretmen_brans_uygun_mu','portal_kimligi_epostadan_v2','sabit_program_tarih_uygun_mu','sabit_program_tarihe_duser_mi']
const expectedTriggers=['bs_ofis_ogretmen_brans_dogrula_v1','portal_yonetim_kimligi_cakisma_engelle_v1','yonetim_portal_kimligi_cakisma_engelle_v1']
ok('Private runtime helper seti yalnız doğrulanan 6 fonksiyondur',sameSet(privateHelpers,expectedHelpers))
ok('Private trigger kökü seti yalnız doğrulanan 3 fonksiyondur',sameSet(triggerRoots,expectedTriggers))
ok('Legacy metin branş helperı Core dışında kalır',privateExcluded.includes('bs_ofis_ogretmen_brans_uygun_mu')&&!privateHelpers.includes('bs_ofis_ogretmen_brans_uygun_mu'))
ok('Normalize branş helperı Core içinde kalır',privateHelpers.includes('ogretmen_brans_uygun_mu')&&teacherBranch?.core_helper==='private.ogretmen_brans_uygun_mu')
ok('Öğretmen-branş legacy helperı açıkça işaretlidir',teacherBranch?.canli_legacy_helper==='private.bs_ofis_ogretmen_brans_uygun_mu')

ok('Public API varsayılanı authenticated rolüdür',sameSet(security?.public_api_default?.execute||[],['authenticated']))
ok('Public API varsayılanında anon execute kapalıdır',security?.public_api_default?.execute_anon===false)
ok('Public API varsayılanında PUBLIC execute kapalıdır',security?.public_api_default?.execute_public===false)
ok('Tek anon RPC kurum_public_bilgisi_v1 olur',sameSet(security?.anon_istisnalari||[],['kurum_public_bilgisi_v1']))
ok('Private helperlara doğrudan API execute verilmez',(security?.private_helper_execute||[]).length===0)
ok('Private triggerlara doğrudan API execute verilmez',(security?.private_trigger_execute||[]).length===0)

ok('Finans sync köprüsü Core zorunluluğu değildir',finance?.core_zorunlu===false&&privateExcluded.includes('finans_v18_sync_tetikle'))
ok('Finans sync için pg_net Core zorunluluğu değildir',finance?.pg_net_core_zorunlu===false&&!requiredExtensions.includes('pg_net'))
ok('Tahsilat düzenleme/silme sanitizasyon kapsamındadır',sameSet(finance?.etkilenen_core_rpc||[],['tahsilat_guncelle_guvenli_v1','tahsilat_sil_guvenli_v1']))
ok('Sanitize edilecek tahsilat RPCleri aktif contractta kalır',(finance?.etkilenen_core_rpc||[]).every((name)=>rpcNames.includes(name)))

if(manifest.installable===true){
  ok('Installable manifest için Core SQL baseline mevcuttur',existsSync(baselinePath))
}else{
  ok('Baseline tamamlanana kadar manifest installable=false kalır',manifest.installable===false)
}

if(errors.length){
  console.error(`\n${errors.length} SaaS kurulum manifesti / RPC sözleşmesi kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 kurulum manifesti ve Core RPC sözleşmesi kalite kontrolleri geçti.')
