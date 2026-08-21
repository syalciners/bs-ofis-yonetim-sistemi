import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const read = path => readFileSync(path, 'utf8')
const profile = read('src/lib/productProfile.ts')
const main = read('src/main.tsx')
const mdApp = read('src/music-dance/MusicDanceApp.tsx')
const mdProvider = read('src/music-dance/MusicDanceDataProvider.tsx')
const mdService = read('src/music-dance/service.ts')
const mdCss = read('src/music-dance/music-dance-shell.css')
const vercel = read('apps/bs-kocluk/vercel.json')

function filesUnder(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

const mdFiles = filesUnder('src/music-dance').filter(x => /\.(ts|tsx)$/.test(x))
const mdCode = mdFiles.map(read).join('\n')
const fromTables = [...mdCode.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map(m => m[1])
const nonMdTables = fromTables.filter(name => !name.startsWith('md_'))

const checks = [
  ['Müzik-dans profilinde grup modülü açıktır', profile.includes("key: 'muzik-dans'") && profile.includes('features: { assignments: false, parentFields: true, groups: true }')],
  ['Eğitim profili mevcut uygulama kabuğunu korur', main.includes("productProfile.key === 'egitim' ? App : MusicDanceApp")],
  ['Müzik-dans bağımsız veri sağlayıcısını kullanır', mdApp.includes('MusicDanceDataProvider') && mdProvider.includes("from '../lib/supabase'")],
  ['Müzik-dans eski AppDataProvider kullanmaz', !mdCode.includes('AppDataProvider') && !mdCode.includes('useAppData')],
  ['Müzik-dans eski officeService kullanmaz', !mdCode.includes('officeService') && !mdCode.includes('loadAppData')],
  ['Müzik-dans tablo erişimlerinin tamamı md_ alanındadır', fromTables.length > 0 && nonMdTables.length === 0],
  ['Kurum verisi md_kurumlar alanından okunur', mdService.includes("from('md_kurumlar')") && mdService.includes("from('md_kurum_kullanicilari')")],
  ['Kursiyer ve eğitmen yalnız md_ tablolarına yazılır', mdService.includes("from('md_kursiyerler').insert") && mdService.includes("from('md_egitmenler').insert")],
  ['Grup ve üyelik yalnız md_ tablolarına yazılır', mdService.includes("from('md_kurs_gruplari').insert") && mdService.includes("from('md_kurs_grup_uyeleri').insert")],
  ['Program ve finans henüz eski motorlara bağlanmaz', !mdCode.includes('ders_kaydet_guvenli') && !mdCode.includes('tahsilat_kaydet_guvenli') && !mdCode.includes('ogretmen_odeme_kaydet_guvenli')],
  ['BS ürün ailesi markası korunur', mdApp.includes('BS EĞİTİM YÖNETİMİ · ÜRÜN AİLESİ') && !mdCode.toLocaleLowerCase('tr-TR').includes('armoni')],
  ['Sanatsal kabuk BS ana renklerini korur', mdCss.includes('--md-navy:#0B1F3A') && mdCss.includes('--md-blue:#168BFF')],
  ['Müzik-dans branchi BS Koçluk Vercel deployunu tetiklemez', vercel.includes('"muzik-dans-demo-v1": false')],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed += 1
}

if (nonMdTables.length) console.error(`Müzik/dans kodunda izin verilmeyen tablo erişimleri: ${[...new Set(nonMdTables)].join(', ')}`)

if (failed) {
  console.error(`\n${failed} müzik/dans ürün güvenlik kontrolü başarısız.`)
  process.exit(1)
}

console.log(`\n${checks.length} müzik/dans ürün güvenlik kontrolü başarılı.`)
