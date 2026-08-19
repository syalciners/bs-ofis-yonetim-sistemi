import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://igmtuouhdozkgwmdxlme.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_scFk1bnw1-VCw_ZQrfc7Mw_N518OvBf'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
