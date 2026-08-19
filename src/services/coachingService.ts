import { supabase } from '../lib/supabase'

export interface KoclukOgrenciProfili {
  ogrenci_id: string
  koc_ogretmen_id?: string | null
  sinav_turu?: string | null
  hedef_okul?: string | null
  hedef_bolum?: string | null
  hedef_puan?: number | null
  hedef_siralama?: number | null
  baslangic_tarihi: string
  durum: 'Aktif' | 'Pasif'
  notlar?: string | null
  olusturulma_zamani?: string | null
  guncellenme_zamani?: string | null
}

export async function loadCoachingProfiles(): Promise<KoclukOgrenciProfili[]> {
  const { data, error } = await supabase
    .from('kocluk_ogrenci_profilleri')
    .select('*')
    .order('guncellenme_zamani', { ascending: false })

  if (error) throw error
  return (data || []) as KoclukOgrenciProfili[]
}

export async function saveCoachingProfile(input: {
  ogrenci_id: string
  koc_ogretmen_id?: string | null
  sinav_turu?: string | null
  hedef_okul?: string | null
  hedef_bolum?: string | null
  hedef_puan?: number | null
  hedef_siralama?: number | null
  baslangic_tarihi?: string | null
  durum?: 'Aktif' | 'Pasif'
  notlar?: string | null
}) {
  const { data, error } = await supabase.rpc('kocluk_profili_kaydet_guvenli_v1', {
    p_ogrenci_id: input.ogrenci_id,
    p_koc_ogretmen_id: input.koc_ogretmen_id || null,
    p_sinav_turu: input.sinav_turu || null,
    p_hedef_okul: input.hedef_okul || null,
    p_hedef_bolum: input.hedef_bolum || null,
    p_hedef_puan: input.hedef_puan ?? null,
    p_hedef_siralama: input.hedef_siralama ?? null,
    p_baslangic_tarihi: input.baslangic_tarihi || null,
    p_durum: input.durum || 'Aktif',
    p_notlar: input.notlar || null,
  })

  if (error) throw error
  return data as { basarili: boolean; ogrenci_id: string; yeni: boolean; durum: string }
}
