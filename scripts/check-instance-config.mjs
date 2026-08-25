import { readFileSync } from 'node:fs'
import { loadEnv } from 'vite'

const mode = process.env.VITE_BUILD_MODE?.trim() || 'production'
const loaded = loadEnv(mode, process.cwd(), '')
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_PORTAL_URL']
const moduleCatalog = JSON.parse(readFileSync('saas/modul-katalogu.v1.json', 'utf8'))
const allowedModules = new Set((moduleCatalog?.opsiyonel_moduller || []).map((item) => String(item.id)))

function resolved(name) {
  if (Object.prototype.hasOwnProperty.call(process.env, name)) return String(process.env[name] ?? '').trim()
  return String(loaded[name] ?? '').trim()
}

for (const name of required) {
  if (!resolved(name)) {
    console.error(`Uygulama yapılandırması eksik: ${name}`)
    process.exit(1)
  }
}

for (const name of ['VITE_SUPABASE_URL', 'VITE_PORTAL_URL']) {
  try {
    const url = new URL(resolved(name))
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol')
  } catch {
    console.error(`Uygulama yapılandırması geçersiz: ${name}`)
    process.exit(1)
  }
}

const enabledModules = resolved('VITE_ENABLED_MODULES')
  .split(',')
  .map((value) => value.trim().toLocaleLowerCase('tr-TR'))
  .filter(Boolean)

if (new Set(enabledModules).size !== enabledModules.length) {
  console.error('Uygulama yapılandırması geçersiz: VITE_ENABLED_MODULES tekrar eden modül içeriyor.')
  process.exit(1)
}

const invalidModules = enabledModules.filter((moduleId) => !allowedModules.has(moduleId))
if (invalidModules.length) {
  console.error(`Uygulama yapılandırması geçersiz: tanınmayan modül(ler): ${invalidModules.join(', ')}`)
  process.exit(1)
}

console.log(`Instance environment yapılandırması doğrulandı. Opsiyonel modüller: ${enabledModules.length ? enabledModules.join(', ') : 'yalnız Core'}.`)
