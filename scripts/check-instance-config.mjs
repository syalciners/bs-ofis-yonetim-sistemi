import { loadEnv } from 'vite'

const mode = process.env.VITE_BUILD_MODE?.trim() || 'production'
const loaded = loadEnv(mode, process.cwd(), '')
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_PORTAL_URL']

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

console.log('Instance environment yapılandırması doğrulandı.')
