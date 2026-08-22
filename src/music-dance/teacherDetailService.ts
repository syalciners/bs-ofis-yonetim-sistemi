import { supabase } from '../lib/supabase'
import type { MdDers, MdEgitmenBakiye, MdEgitmenOdeme } from './types'

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}

export interface MdEgitmenDetayVerisi {
  bakiye: MdEgitmenBakiye | null
  odemeler: MdEgitmenOdeme[]
  sonDersler: MdDers[]
}

export async function mdEgitmenDetayGetir(kurumId: string, egitmenId: string): Promise<MdEgitmenDetayVerisi> {
  const [bakiye, odemeler, dersler] = await Promise.all([
    supabase
      .from('md_egitmen_bakiyeleri')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('egitmen_id', egitmenId)
      .maybeSingle(),
    supabase
      .from('md_egitmen_odemeleri')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('egitmen_id', egitmenId)
      .eq('durum', 'Aktif')
      .order('tarih', { ascending: false })
      .limit(20),
    supabase
      .from('md_dersler')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('egitmen_id', egitmenId)
      .order('tarih', { ascending: false })
      .order('baslangic_saati', { ascending: false })
      .limit(30),
  ])

  fail('Eğitmen bakiyesi alınamadı', bakiye.error)
  fail('Eğitmen ödemeleri alınamadı', odemeler.error)
  fail('Eğitmen dersleri alınamadı', dersler.error)

  const balanceRow = bakiye.data as MdEgitmenBakiye | null
  return {
    bakiye: balanceRow ? {
      ...balanceRow,
      toplam_hakedis: Number(balanceRow.toplam_hakedis || 0),
      toplam_odeme: Number(balanceRow.toplam_odeme || 0),
      bakiye: Number(balanceRow.bakiye || 0),
    } : null,
    odemeler: (odemeler.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })) as MdEgitmenOdeme[],
    sonDersler: (dersler.data || []) as MdDers[],
  }
}
