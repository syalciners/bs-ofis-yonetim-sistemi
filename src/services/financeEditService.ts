import { supabase } from '../lib/supabase'

async function run(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export const updateCollection = (input: {
  tahsilat_id: string
  tarih: string
  ogrenci_id: string
  tutar: number
  odeme_yontemi: string
  aciklama?: string | null
}) => run('tahsilat_guncelle_guvenli_v1', {
  p_tahsilat_id: input.tahsilat_id,
  p_tarih: input.tarih,
  p_ogrenci_id: input.ogrenci_id,
  p_tutar: input.tutar,
  p_odeme_yontemi: input.odeme_yontemi,
  p_aciklama: input.aciklama || null,
})

export const updateExpense = (input: {
  gider_id: string
  tarih: string
  kategori_id: string
  tutar: number
  odeme_yontemi: string
  aciklama?: string | null
  hesap_id?: string | null
}) => run('gider_guncelle_guvenli_v1', {
  p_gider_id: input.gider_id,
  p_tarih: input.tarih,
  p_kategori_id: input.kategori_id,
  p_tutar: input.tutar,
  p_odeme_yontemi: input.odeme_yontemi,
  p_aciklama: input.aciklama || null,
  p_hesap_id: input.hesap_id || null,
})

export const updateTeacherPayment = (input: {
  ogretmen_odeme_id: string
  tarih: string
  hakedis_donemi_id: string
  ogretmen_id: string
  tutar: number
  odeme_yontemi: string
  aciklama?: string | null
  hesap_id?: string | null
}) => run('ogretmen_odeme_guncelle_guvenli_v1', {
  p_odeme_id: input.ogretmen_odeme_id,
  p_tarih: input.tarih,
  p_hakedis_donemi_id: input.hakedis_donemi_id,
  p_ogretmen_id: input.ogretmen_id,
  p_tutar: input.tutar,
  p_odeme_yontemi: input.odeme_yontemi,
  p_aciklama: input.aciklama || null,
  p_hesap_id: input.hesap_id || null,
})
