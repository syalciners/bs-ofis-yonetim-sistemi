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

export interface KoclukGorusmesi {
  gorusme_id: string
  ogrenci_id: string
  koc_ogretmen_id: string
  gorusme_tarihi: string
  baslangic_saati?: string | null
  gorusme_turu?: string | null
  durum: 'Planlandı' | 'Yapıldı' | 'İptal' | 'Ertelendi'
  gundem?: string | null
  gorusme_notu?: string | null
  alinan_kararlar?: string | null
  sonraki_gorusme_tarihi?: string | null
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

export async function loadCoachingMeetings(): Promise<KoclukGorusmesi[]> {
  const { data, error } = await supabase
    .from('kocluk_gorusmeleri')
    .select('*')
    .order('gorusme_tarihi', { ascending: false })
    .order('baslangic_saati', { ascending: false })

  if (error) throw error
  return (data || []) as KoclukGorusmesi[]
}

export async function saveCoachingMeeting(input: {
  gorusme_id?: string | null
  ogrenci_id: string
  koc_ogretmen_id?: string | null
  gorusme_tarihi: string
  baslangic_saati?: string | null
  gorusme_turu?: string | null
  durum?: KoclukGorusmesi['durum']
  gundem?: string | null
  gorusme_notu?: string | null
  alinan_kararlar?: string | null
  sonraki_gorusme_tarihi?: string | null
}) {
  const { data, error } = await supabase.rpc('kocluk_gorusmesi_kaydet_guvenli_v1', {
    p_gorusme_id: input.gorusme_id || null,
    p_ogrenci_id: input.ogrenci_id,
    p_koc_ogretmen_id: input.koc_ogretmen_id || null,
    p_gorusme_tarihi: input.gorusme_tarihi,
    p_baslangic_saati: input.baslangic_saati || null,
    p_gorusme_turu: input.gorusme_turu || null,
    p_durum: input.durum || 'Planlandı',
    p_gundem: input.gundem || null,
    p_gorusme_notu: input.gorusme_notu || null,
    p_alinan_kararlar: input.alinan_kararlar || null,
    p_sonraki_gorusme_tarihi: input.sonraki_gorusme_tarihi || null,
  })

  if (error) throw error
  return data as { basarili: boolean; gorusme_id: string; ogrenci_id: string; yeni: boolean; durum: string }
}
