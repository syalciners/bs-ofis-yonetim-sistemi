import { supabase } from '../lib/supabase'

export interface DisKitapAramaSonucu {
  kaynak: 'Open Library'
  kaynak_id: string
  kitap_adi: string
  yayinevi?: string | null
  isbn?: string | null
  kapak_url?: string | null
  yayin_yili?: number | null
  toplam_sayfa_onerisi?: number | null
}

export async function searchMarketBooks(query: string, limit = 10): Promise<DisKitapAramaSonucu[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const { data, error } = await supabase.functions.invoke('kitap-arama-v1', {
    body: { query: q, limit },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return Array.isArray(data?.sonuclar) ? data.sonuclar as DisKitapAramaSonucu[] : []
}
