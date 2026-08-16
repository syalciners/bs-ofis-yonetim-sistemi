import { createClient } from '@supabase/supabase-js'

// Bu iki değer Supabase'in tarayıcı uygulamaları için yayınlanabilir istemci değerleridir.
// service_role veya başka bir gizli anahtar burada kesinlikle kullanılmaz.
const DEFAULT_SUPABASE_URL = 'https://igmtuouhdozkgwmdxlme.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_scFk1bnw1-VCw_ZQrfc7Mw_N518OvBf'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || DEFAULT_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
