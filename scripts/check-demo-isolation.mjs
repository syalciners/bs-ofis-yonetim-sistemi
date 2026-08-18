const LIVE_PROJECT_REF = 'igmtuouhdozkgwmdxlme'

const mode = String(process.env.VITE_APP_MODE || '').trim().toLowerCase()
const url = String(process.env.VITE_SUPABASE_URL || '').trim()
const key = String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

if (mode !== 'demo') {
  console.error('Demo doğrulaması için VITE_APP_MODE=demo olmalıdır.')
  process.exit(1)
}

if (!url || !key) {
  console.error('Demo Supabase URL veya publishable key eksik.')
  process.exit(1)
}

if (url.includes(LIVE_PROJECT_REF)) {
  console.error('GÜVENLİK ENGELİ: Demo yapılandırması canlı BS Ofis Supabase projesine işaret ediyor.')
  process.exit(1)
}

console.log('Demo izolasyon kontrolü başarılı: canlı Supabase bağlantısı kullanılmıyor.')
