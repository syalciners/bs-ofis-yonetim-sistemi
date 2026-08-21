import { supabase } from '../lib/supabase'
import { uid } from '../lib/format'
import type { Brans, Derslik } from '../lib/types'

export async function saveBranch(input: Pick<Brans, 'brans_adi'|'aktif'> & { brans_id?: string }) {
  const id = input.brans_id || uid('BR')
  const { data, error } = await supabase.rpc('brans_kaydet_guvenli_v1', {
    p_brans_id: id,
    p_brans_adi: input.brans_adi,
    p_aktif: input.aktif !== false,
  })
  if (error) throw error
  return { id, data }
}

export async function saveRoom(input: Pick<Derslik, 'mekan_adi'|'mekan_turu'|'kapasite'|'aktif'|'aciklama'> & { derslik_id?: string }) {
  const id = input.derslik_id || uid('LOC')
  const { data, error } = await supabase.rpc('derslik_kaydet_guvenli_v1', {
    p_derslik_id: id,
    p_mekan_adi: input.mekan_adi,
    p_mekan_turu: input.mekan_turu || null,
    p_kapasite: Number(input.kapasite || 1),
    p_aktif: input.aktif !== false,
    p_aciklama: input.aciklama || null,
  })
  if (error) throw error
  return { id, data }
}
