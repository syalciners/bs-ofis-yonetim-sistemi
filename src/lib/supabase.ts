import { createClient } from '@supabase/supabase-js'

export type AppMode = 'production' | 'demo' | 'test'

function requiredEnv(name: string, value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`Uygulama yapılandırması eksik: ${name}`)
  return normalized
}

function validateSupabaseUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol')
    return value.replace(/\/$/, '')
  } catch {
    throw new Error('Uygulama yapılandırması geçersiz: VITE_SUPABASE_URL')
  }
}

export const APP_MODE = (import.meta.env.VITE_APP_MODE?.trim() || 'production') as AppMode
export const SUPABASE_URL = validateSupabaseUrl(requiredEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL))
export const SUPABASE_KEY = requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
