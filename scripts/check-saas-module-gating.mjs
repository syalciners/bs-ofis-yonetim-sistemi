import { readFileSync } from 'node:fs'

const env=readFileSync('.env.example','utf8')
const modules=readFileSync('src/lib/modules.ts','utf8')
const app=readFileSync('src/App.tsx','utf8')
const menu=readFileSync('src/pages/MorePage.tsx','utf8')
const errors=[]
const ok=(label,condition)=>{ console.log(`${condition?'✓':'✗'} ${label}`); if(!condition)errors.push(label) }

ok('Opsiyonel modül env anahtarı örnek dosyada tanımlıdır',/^VITE_ENABLED_MODULES=\s*$/m.test(env))
ok('Core varsayılanında opsiyonel modül açık değildir',!/^VITE_ENABLED_MODULES=.+$/m.test(env))
ok('Modül sözleşmesi Koçluk kimliğini tanır',modules.includes("'kocluk'"))
ok('Modül sözleşmesi Deneme Merkezi kimliğini tanır',modules.includes("'deneme-merkezi'"))
ok('Modül sözleşmesi gelecek Kütüphane kimliğini rezerve eder',modules.includes("'kutuphane'"))
ok('Modüller instance environment listesinden okunur',modules.includes('VITE_ENABLED_MODULES'))
ok('Koçluk routeu modül bayrağıyla korunur',/isModuleEnabled\('kocluk'\).*<Route path="\/kocluk"/s.test(app))
ok('Deneme Merkezi routeu modül bayrağıyla korunur',/isModuleEnabled\('deneme-merkezi'\).*<Route path="\/deneme-merkezi"/s.test(app))
ok('Koçluk menüsü aynı modül bayrağıyla korunur',/isModuleEnabled\('kocluk'\).*to:'\/kocluk'/s.test(menu))
ok('Deneme Merkezi menüsü aynı modül bayrağıyla korunur',/isModuleEnabled\('deneme-merkezi'\).*to:'\/deneme-merkezi'/s.test(menu))

if(errors.length){
  console.error(`\n${errors.length} SaaS modül kapısı kontrolü başarısız.`)
  process.exit(1)
}
console.log('\nSaaS opsiyonel modül kapısı kontrolleri geçti.')
