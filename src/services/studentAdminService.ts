import { supabase } from '../lib/supabase'

export async function deleteStudentSafe(studentId: string) {
  const { data, error } = await supabase.rpc('ogrenci_sil_guvenli_v1', { p_ogrenci_id: studentId })
  if (error) throw error
  return data
}
