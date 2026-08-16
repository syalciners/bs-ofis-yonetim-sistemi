import { supabase } from '../lib/supabase'
import type { PortalAssignment, PortalLesson, PortalProfile } from '../lib/types'

function ensure<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) throw new Error(`${label}: ${error.message}`)
  if (data === null) throw new Error(`${label}: Veri alınamadı.`)
  return data
}

export async function loadPortalProfile(): Promise<PortalProfile> {
  const result = await supabase.rpc('portal_oturum_bilgisi_v1')
  return ensure(result.data as PortalProfile | null, result.error, 'Portal profili')
}

export async function loadTodayLessons(): Promise<PortalLesson[]> {
  const result = await supabase.rpc('portal_bugun_v1')
  return ensure((result.data ?? []) as PortalLesson[], result.error, 'Bugünkü dersler')
}

export async function loadProgram(days = 30): Promise<PortalLesson[]> {
  const result = await supabase.rpc('portal_program_v1', { p_gun: days })
  return ensure((result.data ?? []) as PortalLesson[], result.error, 'Program')
}

export async function loadAssignments(): Promise<PortalAssignment[]> {
  const result = await supabase.rpc('portal_odevler_v1')
  return ensure((result.data ?? []) as PortalAssignment[], result.error, 'Ödevler')
}
