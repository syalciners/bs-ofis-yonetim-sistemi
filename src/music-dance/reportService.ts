import { supabase } from '../lib/supabase'
import { mdFinansVerisiniGetir } from './financeService'
import { mdKasaVerisiniGetir } from './cashService'

export interface MdAylikFinansRaporu {
  kurum_id: string
  ay: string
  ders_ucreti: number
  tahsilat: number
  egitmen_hakedisi: number
  egitmen_odemesi: number
  gider: number
  ders_brut_katkisi: number
  nakit_akisi: number
}

export interface MdBransFinansRaporu {
  kurum_id: string
  brans_id: string
  brans_adi: string
  kategori: string
  yapilan_ders_sayisi: number
  ucretlenen_katilim_sayisi: number
  ders_ucreti: number
  egitmen_hakedisi: number
  brut_katki: number
}

export interface MdGrupFinansRaporu {
  kurum_id: string
  grup_id: string
  grup_adi: string
  brans_id?: string | null
  kapasite?: number | null
  aktif_uye_sayisi: number
  yapilan_ders_sayisi: number
  ucretlenen_katilim_sayisi: number
  ders_ucreti: number
  egitmen_hakedisi: number
  brut_katki: number
}

export interface MdRaporVerisi {
  aylik: MdAylikFinansRaporu[]
  branslar: MdBransFinansRaporu[]
  gruplar: MdGrupFinansRaporu[]
  kursiyerAlacagi: number
  pesinBakiye: number
  egitmenBorcu: number
  kasaBakiyesi: number
}

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}
const num = (value: unknown) => Number(value || 0)

export async function mdRaporVerisiniGetir(kurumId: string): Promise<MdRaporVerisi> {
  const [aylik, branslar, gruplar, finans, kasa] = await Promise.all([
    supabase.from('md_rapor_aylik_finans').select('*').eq('kurum_id', kurumId).order('ay', { ascending: false }).limit(12),
    supabase.from('md_rapor_brans_finans').select('*').eq('kurum_id', kurumId).order('brut_katki', { ascending: false }),
    supabase.from('md_rapor_grup_finans').select('*').eq('kurum_id', kurumId).order('brut_katki', { ascending: false }),
    mdFinansVerisiniGetir(kurumId),
    mdKasaVerisiniGetir(kurumId),
  ])
  fail('Aylık rapor alınamadı', aylik.error)
  fail('Branş raporu alınamadı', branslar.error)
  fail('Grup raporu alınamadı', gruplar.error)

  return {
    aylik: ((aylik.data || []) as any[]).map(x => ({ ...x, ders_ucreti: num(x.ders_ucreti), tahsilat: num(x.tahsilat), egitmen_hakedisi: num(x.egitmen_hakedisi), egitmen_odemesi: num(x.egitmen_odemesi), gider: num(x.gider), ders_brut_katkisi: num(x.ders_brut_katkisi), nakit_akisi: num(x.nakit_akisi) })).reverse(),
    branslar: ((branslar.data || []) as any[]).map(x => ({ ...x, yapilan_ders_sayisi: num(x.yapilan_ders_sayisi), ucretlenen_katilim_sayisi: num(x.ucretlenen_katilim_sayisi), ders_ucreti: num(x.ders_ucreti), egitmen_hakedisi: num(x.egitmen_hakedisi), brut_katki: num(x.brut_katki) })),
    gruplar: ((gruplar.data || []) as any[]).map(x => ({ ...x, kapasite: x.kapasite == null ? null : num(x.kapasite), aktif_uye_sayisi: num(x.aktif_uye_sayisi), yapilan_ders_sayisi: num(x.yapilan_ders_sayisi), ucretlenen_katilim_sayisi: num(x.ucretlenen_katilim_sayisi), ders_ucreti: num(x.ders_ucreti), egitmen_hakedisi: num(x.egitmen_hakedisi), brut_katki: num(x.brut_katki) })),
    kursiyerAlacagi: finans.kursiyerBakiyeleri.reduce((s, x) => s + Math.max(0, x.bakiye), 0),
    pesinBakiye: finans.kursiyerBakiyeleri.reduce((s, x) => s + Math.max(0, -x.bakiye), 0),
    egitmenBorcu: finans.egitmenBakiyeleri.reduce((s, x) => s + Math.max(0, x.bakiye), 0),
    kasaBakiyesi: kasa.bakiyeler.reduce((s, x) => s + x.bakiye, 0),
  }
}
