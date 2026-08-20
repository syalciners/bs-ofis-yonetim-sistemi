import { supabase } from '../lib/supabase'

export type BildirimOnceligi = 'Düşük' | 'Normal' | 'Yüksek' | 'Kritik'

export type Bildirim = {
  bildirim_id: string
  kategori: string
  baslik: string
  icerik: string
  oncelik: BildirimOnceligi
  kaynak: string
  alici_turu: string
  alici_id: string | null
  ilgili_kayit_turu: string | null
  ilgili_kayit_id: string | null
  eylem_yolu: string | null
  meta: Record<string, unknown> | null
  olusturulma_zamani: string
  okundu: boolean
  okunma_zamani: string | null
}

export async function loadNotifications(limit = 100): Promise<Bildirim[]> {
  const { data, error } = await supabase.rpc('bildirimlerim_v1', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as Bildirim[]
}

export async function setNotificationRead(notificationId: string, read = true) {
  const { data, error } = await supabase.rpc('bildirim_okundu_v1', {
    p_bildirim_id: notificationId,
    p_okundu: read,
  })
  if (error) throw error
  return data
}

export async function loadUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('bildirim_okunmamis_sayisi_v1')
  if (error) throw error
  return Number(data ?? 0)
}
