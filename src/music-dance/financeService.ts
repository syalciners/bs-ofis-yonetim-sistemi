import { supabase } from '../lib/supabase'
import type { MdFinansVerisi, MdOdemeYontemi } from './types'

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}

const sum = (rows: any[] | null | undefined) => (rows || []).reduce((total, row) => total + Number(row.tutar || 0), 0)
const operationKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`

export async function mdFinansVerisiniGetir(kurumId: string): Promise<MdFinansVerisi> {
  const [kursiyerBakiyeleri, egitmenBakiyeleri, tahsilatlar, egitmenOdemeleri, dersUcretleri, hakedisler] = await Promise.all([
    supabase.from('md_kursiyer_bakiyeleri').select('*').eq('kurum_id', kurumId).order('bakiye', { ascending: false }),
    supabase.from('md_egitmen_bakiyeleri').select('*').eq('kurum_id', kurumId).order('bakiye', { ascending: false }),
    supabase.from('md_tahsilatlar').select('*').eq('kurum_id', kurumId).eq('durum', 'Aktif').order('tarih', { ascending: false }).limit(30),
    supabase.from('md_egitmen_odemeleri').select('*').eq('kurum_id', kurumId).eq('durum', 'Aktif').order('tarih', { ascending: false }).limit(30),
    supabase.from('md_ders_ucretleri').select('tutar').eq('kurum_id', kurumId).eq('durum', 'Aktif'),
    supabase.from('md_egitmen_hakedisleri').select('tutar').eq('kurum_id', kurumId).eq('durum', 'Aktif'),
  ])
  const all = [kursiyerBakiyeleri, egitmenBakiyeleri, tahsilatlar, egitmenOdemeleri, dersUcretleri, hakedisler]
  fail('Finans verisi alınamadı', all.find(x => x.error)?.error || null)
  return {
    kursiyerBakiyeleri: (kursiyerBakiyeleri.data || []).map((x: any) => ({ ...x, toplam_borc: Number(x.toplam_borc || 0), toplam_tahsilat: Number(x.toplam_tahsilat || 0), bakiye: Number(x.bakiye || 0) })),
    egitmenBakiyeleri: (egitmenBakiyeleri.data || []).map((x: any) => ({ ...x, toplam_hakedis: Number(x.toplam_hakedis || 0), toplam_odeme: Number(x.toplam_odeme || 0), bakiye: Number(x.bakiye || 0) })),
    tahsilatlar: (tahsilatlar.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })),
    egitmenOdemeleri: (egitmenOdemeleri.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })),
    toplamDersUcreti: sum(dersUcretleri.data),
    toplamHakedis: sum(hakedisler.data),
  }
}

export async function mdTahsilatKaydet(input: { kursiyerId: string; kasaHesapId?: string | null; tarih: string; tutar: number; odemeYontemi: MdOdemeYontemi; aciklama?: string | null }) {
  const rpc = input.kasaHesapId ? 'md_tahsilat_kaydet_v2' : 'md_tahsilat_kaydet_v1'
  const params: Record<string, unknown> = {
    p_islem_anahtari: operationKey(),
    p_kursiyer_id: input.kursiyerId,
    p_tarih: input.tarih,
    p_tutar: input.tutar,
    p_odeme_yontemi: input.odemeYontemi,
    p_aciklama: input.aciklama || null,
  }
  if (input.kasaHesapId) params.p_kasa_hesap_id = input.kasaHesapId
  const result = await supabase.rpc(rpc, params)
  fail('Tahsilat kaydedilemedi', result.error)
  return String(result.data || '')
}

export async function mdEgitmenOdemeKaydet(input: { egitmenId: string; kasaHesapId?: string | null; tarih: string; tutar: number; odemeYontemi: Exclude<MdOdemeYontemi, 'Kredi Kartı'>; aciklama?: string | null }) {
  const rpc = input.kasaHesapId ? 'md_egitmen_odeme_kaydet_v2' : 'md_egitmen_odeme_kaydet_v1'
  const params: Record<string, unknown> = {
    p_islem_anahtari: operationKey(),
    p_egitmen_id: input.egitmenId,
    p_tarih: input.tarih,
    p_tutar: input.tutar,
    p_odeme_yontemi: input.odemeYontemi,
    p_aciklama: input.aciklama || null,
  }
  if (input.kasaHesapId) params.p_kasa_hesap_id = input.kasaHesapId
  const result = await supabase.rpc(rpc, params)
  fail('Eğitmen ödemesi kaydedilemedi', result.error)
  return String(result.data || '')
}

export async function mdProgramFinansAyariGuncelle(programId: string, kursiyerBirimUcreti: number, egitmenBirimHakedisi: number) {
  if (kursiyerBirimUcreti < 0 || egitmenBirimHakedisi < 0) throw new Error('Ücret ve hakediş sıfırdan küçük olamaz.')
  const result = await supabase.from('md_sabit_programlar').update({
    kursiyer_birim_ucreti: kursiyerBirimUcreti,
    egitmen_birim_hakedisi: egitmenBirimHakedisi,
    guncelleme_zamani: new Date().toISOString(),
  }).eq('program_id', programId)
  fail('Program finans ayarı güncellenemedi', result.error)
}
