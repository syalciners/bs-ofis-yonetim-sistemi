import { supabase } from './supabase'

export type WeeklyIntensity = 'Hafif' | 'Normal' | 'Yoğun'

export interface AiWeeklyPlanItem {
  id: string
  candidate_id: string
  ogrenci_kitap_id: string
  kitap_adi: string
  kitap_meta: string
  ders: string
  calisma_turu: 'Sayfa' | 'Test'
  baslangic_no: number
  bitis_no: number
  max_no: number | null
  son_teslim_tarihi: string
  gerekce: string
}

export interface AiWeeklyPlanDraft {
  plan_id: string
  baslangic: string
  bitis: string
  yogunluk: WeeklyIntensity
  pazar_calisma: boolean
  baslik: string
  ozet: string
  odaklar: string[]
  uyarilar: string[]
  son_7_gun_tamamlama_yuzdesi: number | null
  geciken: number
  son_21_gun_tamamlanan: number
  max_yeni_calisma: number
  maddeler: AiWeeklyPlanItem[]
}

export interface AiWeeklyPlanResponse {
  basarili: boolean
  aktif: boolean
  model?: string | null
  durum: 'ai_hazir' | 'guvenli_yedek' | 'mevcut_plani_koru' | 'ilk_calisma_gerekli'
  plan: AiWeeklyPlanDraft
  error?: string
}

export async function requestAiWeeklyPlan(studentId: string, mode: 'hazirla' | 'denge' = 'hazirla') {
  const { data, error } = await supabase.functions.invoke('kocluk-ai-haftalik-plan-v2', {
    body: { ogrenci_id: studentId, mod: mode },
  })
  if (error) throw error
  const result = data as AiWeeklyPlanResponse
  if (!result?.basarili || !result.plan) throw new Error(result?.error || 'AI haftalık plan hazırlanamadı.')
  return result
}
