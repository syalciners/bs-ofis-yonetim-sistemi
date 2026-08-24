import { loadEnv } from 'vite'

const mode = process.env.VITE_BUILD_MODE?.trim() || 'production'
const loaded = loadEnv(mode, process.cwd(), '')
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']

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

const supabaseUrl = resolved('VITE_SUPABASE_URL')
try {
  const url = new URL(supabaseUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol')
} catch {
  console.error('Uygulama yapılandırması geçersiz: VITE_SUPABASE_URL')
  process.exit(1)
}

console.log('Instance environment yapılandırması doğrulandı.')
