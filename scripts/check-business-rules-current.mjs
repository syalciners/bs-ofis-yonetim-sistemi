import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const sourcePath='scripts/check-business-rules.mjs'
const tempPath='scripts/.check-business-rules-current.generated.mjs'
let source=readFileSync(sourcePath,'utf8')
const deployWorkflow=readFileSync('.github/workflows/deploy-pages.yml','utf8')

if(!deployWorkflow.includes('GitHub Pages kaynağını Actions olarak sabitle')||!deployWorkflow.includes(`-d '{"build_type":"workflow"}'`)){
  console.error('✗ GitHub Pages kaynağı workflow olarak sabitlenmiyor.')
  process.exit(1)
}
console.log('✓ GitHub Pages kaynağı workflow olarak sabitlenir')

const replaceExact=(from,to)=>{
  if(!source.includes(from))throw new Error(`Güncellenecek eski kontrol bulunamadı: ${from}`)
  source=source.replace(from,to)
}

replaceExact(
  "const weekPlanningService = read('src/services/weekPlanningService.ts')",
  "const weekPlanningService = read('src/services/weekPlanningService.ts')\nconst manualProgramService = read('src/services/manualProgramService.ts')\nconst manualWeekMigration = read('supabase/migrations/20260817162500_manuel_hafta_hazirlama_v6.sql')"
)
replaceExact(
  "expectText('Takvim Haftayı Oluştur işlemini korur', calendar, \"'Haftayı Oluştur'\")",
  "expectText('Takvim manuel Haftayı Hazırla işlemini korur', calendar, \"'Haftayı Hazırla'\")"
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

try{
  writeFileSync(tempPath,source,'utf8')
  const result=spawnSync(process.execPath,[tempPath],{stdio:'inherit'})
  process.exitCode=result.status??1
}finally{
  rmSync(tempPath,{force:true})
}
