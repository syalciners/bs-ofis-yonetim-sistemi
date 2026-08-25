import { readFileSync } from 'node:fs'

const catalog=JSON.parse(readFileSync('saas/modul-katalogu.v1.json','utf8'))
const modulesSource=readFileSync('src/lib/modules.ts','utf8')
const envExample=readFileSync('.env.example','utf8')
const manifest=JSON.parse(readFileSync('saas/kurulum-manifesti.v1.json','utf8'))
const errors=[]
const ok=(label,condition)=>{console.log(`${condition?'✓':'✗'} ${label}`);if(!condition)errors.push(label)}
const unique=(items)=>new Set(items).size===items.length
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x))

const optional=catalog?.opsiyonel_moduller||[]
const ids=optional.map(x=>x.id)
const typeMatch=modulesSource.match(/export type OptionalModuleId\s*=\s*([^\n]+)/)
const sourceIds=typeMatch?[...typeMatch[1].matchAll(/'([^']+)'/g)].map(m=>m[1]):[]

ok('Modül kataloğu dedicated-instance modelidir',catalog?.dagitim_modeli==='dedicated-instance')
ok('Opsiyonel modül kimlikleri tekrarsızdır',unique(ids))
ok('Frontend OptionalModuleId seti katalogla birebir aynıdır',sameSet(ids,sourceIds))
ok('Opsiyonel modüllerin tamamı varsayılan kapalıdır',optional.every(x=>x.varsayilan_acik===false))
ok('Core kurulumunda backend olmayan modüller açıkça işaretlidir',optional.every(x=>x.backend_core_kurulumunda_var===false))
ok('Backend kurulum paketi olmayan modüller instancea açılamaz',optional.filter(x=>x.backend_core_kurulumunda_var===false).every(x=>x.instancea_acilabilir===false))
ok('Kütüphane modülü katalogda tasarım ve kapalı durumdadır',optional.some(x=>x.id==='kutuphane'&&x.durum==='tasarim'&&x.instancea_acilabilir===false))
ok('Instance env alanı VITE_ENABLED_MODULES olarak sabittir',catalog?.instance_env?.alan==='VITE_ENABLED_MODULES')
ok('Instance env yalnız hazır modülleri açma kuralını taşır',String(catalog?.instance_env?.kural||'').includes('instancea_acilabilir=true'))
ok('.env.example opsiyonel modül alanını içerir',envExample.includes('VITE_ENABLED_MODULES='))
ok('Kurulum manifesti modül kataloğu yolunu sabitler',manifest?.modul_katalogu==='saas/modul-katalogu.v1.json')
ok('Ticari paket ve fiyatlar teknik katalogda sabitlenmez',typeof catalog?.ticari_paket_kurali==='string'&&catalog.ticari_paket_kurali.includes('SaaS kontrol düzleminde'))

if(errors.length){
  console.error(`\n${errors.length} SaaS modül kataloğu kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS V1 modül kataloğu kalite kontrolü geçti.')
