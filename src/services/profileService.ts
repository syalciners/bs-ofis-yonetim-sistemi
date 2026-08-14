import { supabase } from '../lib/supabase'

export async function updateOwnProfile(input: { ad_soyad: string; telefon?: string | null }) {
  const { data, error } = await supabase.rpc('kullanici_kendi_profilini_guncelle_guvenli_v1', {
    p_ad_soyad: input.ad_soyad,
    p_telefon: input.telefon || null,
  })
  if (error) throw error
  return data
}
