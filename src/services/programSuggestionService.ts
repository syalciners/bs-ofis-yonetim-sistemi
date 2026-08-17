import { supabase } from '../lib/supabase'
import type { SabitProgram } from '../lib/types'

export interface ProgramSuggestion {
  saat: string
  derslik_id: string
  derslik: string
}

export interface ProgramConflictSuggestion {
  uygun: boolean
  basarili?: boolean
  mesaj?: string
  ogrenci_cakisma?: boolean
  ogretmen_cakisma?: boolean
  derslik_dolu?: boolean
  ilk_cakisma_tarihi?: string | null
  ilk_cakisan_kayit?: string | null
  onerilen_derslikler?: ProgramSuggestion[]
  onerilen_saatler?: ProgramSuggestion[]
}

export interface WeekPlanningIssue {
  program_id: string
  tarih: string
  ogrenci: string
  ogretmen: string
  saat: string
  derslik_id: string
  derslik: string
  ogrenci_cakisma: boolean
  ogretmen_cakisma: boolean
  derslik_dolu: boolean
  onerilen_derslikler: ProgramSuggestion[]
  onerilen_saatler: ProgramSuggestion[]
}

export interface WeekPlanningReview {
  uygun: boolean
  basarili: boolean
  sorun_sayisi: number
  sorunlar: WeekPlanningIssue[]
  haftalar: string[]
}

export async function suggestProgram(input: SabitProgram): Promise<ProgramConflictSuggestion> {
  const { data, error } = await supabase.rpc('sabit_program_oneri_v1', {
    p_ogrenci_id: input.ogrenci_id,
    p_ogretmen_id: input.ogretmen_id,
    p_derslik_id: input.derslik_id,
    p_haftanin_gunu: input.haftanin_gunu,
    p_baslangic_saati: input.baslangic_saati,
    p_ders_sayisi: Number(input.ders_sayisi || 1),
    p_tekrar_sikligi: input.tekrar_sikligi || 'Her Hafta',
    p_baslangic_tarihi: input.baslangic_tarihi || null,
    p_bitis_tarihi: input.bitis_tarihi || null,
    p_haric_program_id: input.program_id || null,
  })
  if (error) throw error
  return data as ProgramConflictSuggestion
}

async function checkSingleWeek(monday: string) {
  const { data, error } = await supabase.rpc('haftalik_program_kontrol_oneri_v2', { p_hafta_baslangici: monday })
  if (error) throw error
  return data as { basarili: boolean; uygun: boolean; sorun_sayisi: number; sorunlar: WeekPlanningIssue[] }
}

export async function reviewWeekPlanning(monday: string): Promise<WeekPlanningReview> {
  const result=await checkSingleWeek(monday)
  const sorunlar=result.sorunlar||[]
  return {
    basarili:Boolean(result.basarili),
    uygun:sorunlar.length===0,
    sorun_sayisi:sorunlar.length,
    sorunlar,
    haftalar:[monday],
  }
}
