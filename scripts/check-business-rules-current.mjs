import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const sourcePath='scripts/check-business-rules.mjs'
const tempPath='scripts/.check-business-rules-current.generated.mjs'
let source=readFileSync(sourcePath,'utf8')
const deployWorkflow=readFileSync('.github/workflows/deploy-pages.yml','utf8')
const ciWorkflow=readFileSync('.github/workflows/ci.yml','utf8')
const viteConfig=readFileSync('vite.config.ts','utf8')
const appIndex=readFileSync('app/index.html','utf8')
const syncScript=readFileSync('scripts/sync-pages-root.mjs','utf8')
const publishedCheck=readFileSync('scripts/check-published-pages.mjs','utf8')

const pageRules=[
  ['Vite kaynak indexi yayın indexinden ayrıdır',viteConfig.includes("root: 'app'")&&appIndex.includes('../src/main.tsx')],
  ['Canlı doğrulama custom deploy-pages ile legacy yayına rakip olmaz',!deployWorkflow.includes('actions/deploy-pages@')&&!deployWorkflow.includes('actions/upload-pages-artifact@')],
  ['Canlı doğrulama repo kökündeki production paketini kontrol eder',deployWorkflow.includes('node scripts/check-published-pages.mjs')],
  ['Branch CI production paketini repo köküne senkronlar',ciWorkflow.includes('node scripts/sync-pages-root.mjs')&&ciWorkflow.includes('git push origin "HEAD:${GITHUB_REF_NAME}"')],
  ['Pages senkron scripti dist paketini köke kopyalar',syncScript.includes("const distRoot=resolve('dist')")&&syncScript.includes('copyFileSync(source,target)')],
  ['Pages yayın kontrolü dosyaları hash ile doğrular',publishedCheck.includes("createHash('sha256')")&&publishedCheck.includes("index.includes('src/main.tsx')")],
]
for(const[name,ok]of pageRules){
  console.log(`${ok?'✓':'✗'} ${name}`)
  if(!ok)process.exitCode=1
}
if(process.exitCode)process.exit(process.exitCode)

const replaceExact=(from,to)=>{
  if(!source.includes(from))throw new Error(`Güncellenecek eski kontrol bulunamadı: ${from}`)
  source=source.replace(from,to)
}

replaceExact(
  "const weekPlanningService = read('src/services/weekPlanningService.ts')",
  "const weekPlanningService = read('src/services/weekPlanningService.ts')\nconst manualProgramService = read('src/services/manualProgramService.ts')\nconst manualWeekMigration = read('supabase/migrations/20260817162500_manuel_hafta_hazirlama_v6.sql')\nconst brandPalette = read('src/brand-palette.css')"
)
replaceExact(
  "expectText('Takvim Haftayı Oluştur işlemini korur', calendar, \"'Haftayı Oluştur'\")",
  "expectText('Takvim manuel Haftayı Hazırla işlemini korur', calendar, \"'Haftayı Hazırla'\")"
)
replaceExact(
  "expectText('Alt menü Takvim girişini korur', bottomNav, \"label: 'Takvim'\")",
  "expectText('Alt menü Program girişini korur', bottomNav, \"label: 'Program'\")"
)
replaceExact(
  "expectText('Canlı dağıtım Takvim UX kontrolünü çalıştırır', deployWorkflow, 'node scripts/check-calendar-ux.mjs')",
  "expectText('Canlı dağıtım Takvim UX kontrolünü çalıştırır', deployWorkflow, 'node scripts/check-calendar-ux.mjs')"
)
replaceExact(
  "expectText('Haftalık ders üretimi güncel V5 RPC kullanır', weekPlanningService, \"supabase.rpc('haftalik_dersleri_olustur_guvenli_v5'\")",
  "expectText('Haftalık ders hazırlama güncel V6 RPC kullanır', weekPlanningService, \"supabase.rpc('haftalik_dersleri_hazirla_guvenli_v6'\")"
)
replaceExact(
  "expectText('Hafta hazırlık durumu güncel V2 RPC kullanır', weekPlanningService, \"supabase.rpc('haftalik_ders_uretim_durumu_v2'\")",
  "expectText('Hafta hazırlık durumu güncel V3 RPC kullanır', weekPlanningService, \"supabase.rpc('haftalik_ders_uretim_durumu_v3'\")\nexpectText('Sabit program manuel V4 kayıt RPC kullanır', manualProgramService, \"supabase.rpc('sabit_program_kaydet_guvenli_v4'\")\nexpectText('Manuel hafta hazırlama oluşturulan ders sayısını döndürür', manualWeekMigration, \"'olusturulan',v_olusturulan\")\nexpectText('Manuel hafta hazırlama güncellenen ders sayısını döndürür', manualWeekMigration, \"'guncellenen',v_guncellenen\")\nrejectRegex('Manuel V6 hafta hazırlama sonraki haftayı otomatik dolaşmaz', manualWeekMigration, /for\\s+i\\s+in\\s+0\\.\\.1\\s+loop/i, 'Manuel V6 içinde iki haftayı otomatik işleyen döngü bulundu.')"
)
replaceExact(
  "expectText('Üst başlık açık zeminli eğitim ikonunu kullanır', appHeader, '<img src=\"./bs-egitim-icon-192-v2.png\" alt=\"BS Eğitim\" />')",
  "expectText('Üst başlık şeffaf BS monogramını kullanır', appHeader, '<img src=\"./bs-logo.png\" alt=\"BS Eğitim\" />')"
)
replaceExact(
  "expectText('PWA maskelenebilir eğitim ikonunu kullanır', viteConfig, \"{ src: 'bs-egitim-icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }\")",
  "expectText('PWA maskelenebilir eğitim ikonunu kullanır', viteConfig, \"{ src: 'bs-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }\")"
)
replaceExact(
  "expectText('PWA favicon varlıkları yeni eğitim ikon ailesini kullanır', viteConfig, \"includeAssets: ['bs-egitim-favicon-16-v2.png','bs-egitim-favicon-32-v2.png','bs-egitim-favicon-48-v2.png','bs-egitim-apple-touch-v2.png']\")",
  "expectText('PWA marka varlıklarını kullanır', viteConfig, \"includeAssets: ['bs-logo.png','bs-egitim-favicon-16-v2.png','bs-egitim-favicon-32-v2.png','bs-egitim-favicon-48-v2.png','bs-egitim-apple-touch-v2.png','bs-icon-maskable-512.png']\")"
)
replaceExact(
  "expectText('Giriş ekranı BS Eğitim Yönetimi adını kullanır', login, '<h1>BS Eğitim Yönetimi</h1>')",
  "expectText('Giriş ekranı BS Eğitim Yönetimi adını kullanır', login, '<h1>BS Eğitim Yönetimi</h1>')\nexpectText('Giriş ekranı şeffaf BS monogramını kullanır', login, '<img className=\"login-logo\" src=\"./bs-logo.png\" alt=\"BS Eğitim\" />')\nexpectText('Açılış ekranı şeffaf BS monogramını kullanır', app, '<img src=\"./bs-logo.png\" alt=\"BS Eğitim\"/>')\nexpectText('Marka paleti Deep Navy kullanır', brandPalette, '--brand-navy:#0B1F3A')\nexpectText('Marka paleti Growth Blue kullanır', brandPalette, '--brand-blue:#168BFF')\nexpectText('Marka paleti Satin Silver kullanır', brandPalette, '--brand-silver:#B8C1CC')"
)

try{
  writeFileSync(tempPath,source,'utf8')
  const result=spawnSync(process.execPath,[tempPath],{stdio:'inherit'})
  process.exitCode=result.status??1
}finally{
  rmSync(tempPath,{force:true})
}
