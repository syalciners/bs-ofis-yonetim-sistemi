import { supabase } from '../lib/supabase'

export async function updateOwnProfile(input: { ad_soyad: string; telefon?: string | null }) {
  const adSoyad = input.ad_soyad.trim()
  if (!adSoyad) throw new Error('Ad soyad boş bırakılamaz.')
  const { error } = await supabase.rpc('kullanici_kendi_profilini_guncelle_guvenli_v1', {
    p_ad_soyad: adSoyad,
    p_telefon: input.telefon?.trim() || null,
  })
  if (error) throw error
}
