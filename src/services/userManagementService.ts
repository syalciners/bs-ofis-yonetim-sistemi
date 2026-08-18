import { supabase } from '../lib/supabase'
import type { KullaniciProfili } from '../lib/types'

export async function loadManagedUsers(): Promise<KullaniciProfili[]> {
  const { data, error } = await supabase
    .from('kullanici_profilleri')
    .select('auth_user_id,email,ad_soyad,rol,ogretmen_id,aktif,telefon')
    .order('ad_soyad')
  if (error) throw error
  return (data || []) as KullaniciProfili[]
}

export async function updateManagedUser(input: {
  auth_user_id: string
  ad_soyad: string
  telefon?: string | null
  aktif: boolean
}) {
  const { data, error } = await supabase.rpc('kullanici_profili_guncelle_guvenli_v2', {
    p_auth_user_id: input.auth_user_id,
    p_ad_soyad: input.ad_soyad,
    p_telefon: input.telefon || null,
    p_aktif: input.aktif,
  })
  if (error) throw error
  return data
}
