import { existsSync, readFileSync } from 'node:fs'

const manifestPath='saas/kurulum-manifesti.v1.json'
const edgePath='supabase/functions/odev-drive-yukle/index.ts'
const baselinePath='supabase/saas-v1-core/00_core_schema.sql'

const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const edge=readFileSync(edgePath,'utf8')
const errors=[]
const ok=(label,condition,message=label)=>{
  console.log(`${condition?'✓':'✗'} ${label}`)
  if(!condition)errors.push(message)
}
const unique=(items)=>new Set(items).size===items.length

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

if(manifest.installable===true){
  ok('Installable manifest için Core SQL baseline mevcuttur',existsSync(baselinePath))
}else{
  ok('Baseline tamamlanana kadar manifest installable=false kalır',manifest.installable===false)
}

if(errors.length){
  console.error(`\n${errors.length} SaaS kurulum manifesti kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 kurulum manifesti kalite kontrolleri geçti.')
