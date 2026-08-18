import { createClient } from '@supabase/supabase-js'

export const APP_MODE = (import.meta.env.VITE_APP_MODE || 'live').trim().toLowerCase()
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
export const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

const CANLI_BS_OFIS_PROJECT_REF = 'igmtuouhdozkgwmdxlme'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase bağlantı ayarları eksik. VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlanmalıdır.')
}

if (APP_MODE === 'demo' && SUPABASE_URL.includes(CANLI_BS_OFIS_PROJECT_REF)) {
  throw new Error('GÜVENLİK ENGELİ: Demo uygulaması canlı BS Ofis Supabase projesine bağlanamaz.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
