import { supabase } from './supabase'

export type BookAiIntent = {
  arama_metni: string
  alternatif_aramalar: string[]
  sinif: string
  ders: string
  yayinevi: string
  seri: string
  kitap_turu: string
  baski_ipucu: string
  renk_ipucu: string
  isbn: string
  guven: number
}

export type BookAiResult = {
  aktif: boolean
  durum?: string
  model?: string
  yorum?: BookAiIntent
}

export async function interpretBookQuery(query: string): Promise<BookAiResult> {
  const q = query.trim()
  if (q.length < 2) return { aktif: false, durum: 'kisa_sorgu' }

  const { data, error } = await supabase.functions.invoke('kitap-ai-eslestir-v1', {
    body: { query: q },
  })
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return {
    aktif: Boolean(data?.aktif),
    durum: typeof data?.durum === 'string' ? data.durum : undefined,
    model: typeof data?.model === 'string' ? data.model : undefined,
    yorum: data?.yorum && typeof data.yorum === 'object' ? data.yorum as BookAiIntent : undefined,
  }
}
