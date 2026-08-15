import { supabase } from '../lib/supabase'

async function run(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export const cancelCollection = (tahsilatId: string, note?: string | null) =>
  run('tahsilat_iptal_guvenli_v1', { p_tahsilat_id: tahsilatId, p_aciklama: note || null })

export const deleteCanceledCollection = (tahsilatId: string) =>
  run('tahsilat_sil_guvenli_v1', { p_tahsilat_id: tahsilatId })

export const cancelExpense = (giderId: string, note?: string | null) =>
  run('gider_iptal_guvenli_v1', { p_gider_id: giderId, p_aciklama: note || null })

export const cancelTeacherPayment = (odemeId: string, note?: string | null) =>
  run('ogretmen_odeme_iptal_guvenli_v1', { p_odeme_id: odemeId, p_aciklama: note || null })
