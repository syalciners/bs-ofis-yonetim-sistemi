import { existsSync, readFileSync } from 'node:fs'

const paths={
  seed:'supabase/saas-v1-core/03_core_seed.sql',
  security:'supabase/saas-v1-core/04_core_security.sql',
  storage:'supabase/saas-v1-core/05_core_storage.sql',
  bootstrap:'supabase/saas-v1-core/06_first_admin_bootstrap.sql',
  manifest:'saas/kurulum-manifesti.v1.json',
  contract:'saas/core-rpc-contract.v1.json',
}
const errors=[]
const ok=(label,condition)=>{ console.log(`${condition?'✓':'✗'} ${label}`); if(!condition)errors.push(label) }
for(const [label,path] of Object.entries(paths)) ok(`${label} dosyası mevcut`,existsSync(path))
if(errors.length){ console.error(`\n${errors.length} provisioning dosya kontrolü başarısız.`); process.exit(1) }

const seed=readFileSync(paths.seed,'utf8')
const security=readFileSync(paths.security,'utf8')
const storage=readFileSync(paths.storage,'utf8')
const bootstrap=readFileSync(paths.bootstrap,'utf8')
const manifest=JSON.parse(readFileSync(paths.manifest,'utf8'))
const contract=JSON.parse(readFileSync(paths.contract,'utf8'))
const lower=x=>x.toLowerCase()

const coreTables=manifest?.veritabani?.core_public_tablolar||[]
const activeRpcNames=(contract?.aktif_public_api_imzalari||[]).map(x=>String(x).split('(')[0].trim())
const directReadTables=[
  'ogrenciler','ogretmenler','branslar','ogretmen_branslari','derslikler','sabit_ders_programi','dersler',
  'tahsilatlar','giderler','gider_kategorileri','ogretmen_odemeleri','hakedis_donemleri','kasa_hesaplari',
  'kasa_hareketleri','odevler','kullanici_profilleri','kurum_ayarlari',
]

ok('Provisioning Core tablo sözleşmesi 26 tablodur',coreTables.length===26)
ok('Provisioning RPC sözleşmesi 53 fonksiyondur',activeRpcNames.length===53)

ok('Seed yalnız kurum ayarları tablosuna veri yazar',/insert\s+into\s+public\.kurum_ayarlari/i.test(seed))
const forbiddenSeedTables=['ogrenciler','ogretmenler','dersler','sabit_ders_programi','tahsilatlar','giderler','kasa_hareketleri','odevler']
ok('Seed operasyonel müşteri verisi oluşturmaz',forbiddenSeedTables.every(t=>!new RegExp(`insert\\s+into\\s+public\\.${t}\\b`,'i').test(seed)))
ok('Seed tek kurum kimliği ANA değerini kullanır',/'ANA'/i.test(seed))
ok('Seed tekrar uygulanabilir on conflict davranışı taşır',/on\s+conflict\s*\(kurum_id\)\s+do\s+nothing/i.test(seed))

ok('Security public şemada CREATE yetkisini PUBLIC rolünden kaldırır',/revoke\s+create\s+on\s+schema\s+public\s+from\s+public/i.test(security))
ok('Security private şema kullanımını yalnız authenticated ve service_role için açar',/grant\s+usage\s+on\s+schema\s+private\s+to\s+authenticated\s*,\s*service_role/i.test(security))
ok('Security 26 Core tablonun tamamını sözleşme kapsamına alır',coreTables.every(t=>security.includes(`'${t}'`)))
ok('Security yönetici RLS politikasını authenticated rolüne sınırlar',security.includes("create policy yonetici_tam_erisim")&&security.includes('for all to authenticated')&&security.includes('private.bs_ofis_yonetici_mi()'))
ok('Security Core tablolarında anon/authenticated yetkilerini önce sıfırlar',/revoke all on table public\.%I from anon, authenticated/i.test(security))
ok('Security istemciye doğrudan INSERT yetkisi vermez',!/grant\s+insert\s+on\s+table/i.test(security))
ok('Security istemciye doğrudan UPDATE yetkisi vermez',!/grant\s+update\s+on\s+table/i.test(security))
ok('Security istemciye doğrudan DELETE yetkisi vermez',!/grant\s+delete\s+on\s+table/i.test(security))
ok('Security yönetim frontendinin 17 doğrudan okuma tablosunu kapsar',directReadTables.every(t=>new RegExp(`public\\.${t}\\b`,'i').test(security)))
ok('Security direct-read tablo seti 17 tablodur',directReadTables.length===17)
ok('Security 53 Core RPC adının tamamını execute matrisine alır',activeRpcNames.every(name=>security.includes(`'${name}'`)))
ok('Security RPC sayısını 53 olarak runtime doğrular',/v_count\s*<>\s*53/i.test(security))
ok('Security anon RPC istisnasını yalnız kurum_public_bilgisi_v1 olarak kodlar',security.includes("if r.proname='kurum_public_bilgisi_v1'"))
ok('Security public RPC execute yetkisini PUBLIC ve anon rollerinden önce kaldırır',/revoke all on function %s from public, anon, authenticated/i.test(security))
ok('Security doğrulanmış yönetici helperını authenticated rolüne açar',/grant execute on function private\.bs_ofis_yonetici_mi\(\) to authenticated/i.test(security))
ok('Security Koçluk veya Finance Asistanı nesnesi içermez',!lower(security).includes('kocluk_')&&!lower(security).includes('finans_v18_')&&!lower(security).includes('pg_net'))

const bucketRows=[...storage.matchAll(/\('([^']+)'\s*,\s*'[^']+'\s*,\s*(true|false)\s*,\s*(\d+)/gi)].map(m=>({id:m[1],public:m[2].toLowerCase()==='true',limit:Number(m[3])}))
const bucketById=new Map(bucketRows.map(x=>[x.id,x]))
ok('Storage yalnız üç Core bucket tanımlar',bucketRows.length===3&&bucketById.size===3)
ok('Kurum markası public ve 2 MB limitlidir',bucketById.get('kurum-markasi')?.public===true&&bucketById.get('kurum-markasi')?.limit===2097152)
ok('Ödev ekleri private ve 15 MB limitlidir',bucketById.get('odev-ekleri')?.public===false&&bucketById.get('odev-ekleri')?.limit===15728640)
ok('Profil fotoğrafları private ve 5 MB limitlidir',bucketById.get('profil-fotograflari')?.public===false&&bucketById.get('profil-fotograflari')?.limit===5242880)
ok('Storage politikaları authenticated rolüne ve yönetici helperına bağlıdır',/to authenticated/i.test(storage)&&storage.includes('private.bs_ofis_yonetici_mi()'))
ok('Profil fotoğrafı yükleme yalnız öğrenci/öğretmen klasörlerini kabul eder',storage.includes("array['ogrenciler'::text,'ogretmenler'::text]"))
ok('Profil fotoğrafı upsert için UPDATE politikası yoktur; servis remove+upload kullanır',!storage.includes('profil_fotograflari_yonetici_update'))
ok('Ödev ekleri upsert için SELECT INSERT UPDATE politikalarının üçü de vardır',['odev_ekleri_yonetici_select','odev_ekleri_yonetici_insert','odev_ekleri_yonetici_update'].every(x=>storage.includes(x)))

ok('İlk yönetici bootstrap public şemada değildir',/function\s+private\.ilk_yonetici_bootstrap_v1/i.test(bootstrap)&&!/function\s+public\.ilk_yonetici_bootstrap_v1/i.test(bootstrap))
ok('Bootstrap SECURITY DEFINER ve boş search_path kullanır',/security\s+definer/i.test(bootstrap)&&/set\s+search_path\s+to\s+''/i.test(bootstrap))
ok('Bootstrap mevcut aktif yöneticiyi kontrol eder',bootstrap.includes("where rol='Yönetici' and aktif=true"))
ok('Bootstrap doğrulanmış auth kullanıcısı şartı koyar',/email_confirmed_at\s+is\s+not\s+null/i.test(bootstrap))
ok('Bootstrap ikinci kez çalışmayı reddeder',bootstrap.includes('Bootstrap tekrar çalıştırılamaz'))
ok('Bootstrap PUBLIC anon authenticated rollerine kapalıdır',/revoke all on function private\.ilk_yonetici_bootstrap_v1\(text,text\) from public, anon, authenticated/i.test(bootstrap))
ok('Bootstrap yalnız service_role execute yetkisi alır',/grant execute on function private\.ilk_yonetici_bootstrap_v1\(text,text\) to service_role/i.test(bootstrap))
ok('Bootstrap client rolüne grant vermez',!/grant execute on function private\.ilk_yonetici_bootstrap_v1\(text,text\) to (anon|authenticated)/i.test(bootstrap))

if(errors.length){
  console.error(`\n${errors.length} SaaS provisioning güvenlik kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 provisioning, güvenlik, Storage ve ilk yönetici kontrolleri geçti.')
