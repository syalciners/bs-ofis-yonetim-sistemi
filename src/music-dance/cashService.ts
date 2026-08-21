import { supabase } from '../lib/supabase'
import type { MdOdemeYontemi } from './types'

export type MdKasaHesapTuru = 'Nakit' | 'Banka' | 'POS' | 'Diğer'

export interface MdKasaHesabi {
  hesap_id: string
  kurum_id: string
  hesap_adi: string
  hesap_turu: MdKasaHesapTuru
  acilis_bakiyesi: number
  aciklama?: string | null
  aktif: boolean
}

export interface MdGiderKategorisi {
  kategori_id: string
  kurum_id: string
  kategori_adi: string
  aktif: boolean
}

export interface MdGider {
  gider_id: string
  islem_anahtari: string
  kurum_id: string
  kategori_id: string
  kasa_hesap_id: string
  tarih: string
  tutar: number
  odeme_yontemi: MdOdemeYontemi
  aciklama?: string | null
  durum: 'Aktif' | 'İptal'
  olusturma_zamani: string
}

export interface MdKasaBakiye {
  kurum_id: string
  hesap_id: string
  hesap_adi: string
  hesap_turu: MdKasaHesapTuru
  acilis_bakiyesi: number
  giren: number
  cikan: number
  bakiye: number
}

export interface MdKasaHareketi {
  kurum_id: string
  kasa_hesap_id: string
  tarih: string
  hareket_turu: 'Tahsilat' | 'Eğitmen Ödemesi' | 'Gider'
  kaynak_id: string
  tutar: number
  yon: 'Giriş' | 'Çıkış'
  odeme_yontemi: MdOdemeYontemi
  aciklama?: string | null
  olusturma_zamani: string
}

export interface MdKasaVerisi {
  hesaplar: MdKasaHesabi[]
  kategoriler: MdGiderKategorisi[]
  giderler: MdGider[]
  bakiyeler: MdKasaBakiye[]
  hareketler: MdKasaHareketi[]
}

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}

export async function mdKasaIlkKurulum(kurumId: string) {
  const mevcut = await supabase.from('md_kasa_hesaplari').select('hesap_id').eq('kurum_id', kurumId).limit(1)
  fail('Kasa kurulumu kontrol edilemedi', mevcut.error)
  if (!(mevcut.data || []).length) {
    const hesap = await supabase.from('md_kasa_hesaplari').insert({ kurum_id: kurumId, hesap_adi: 'Genel Kasa', hesap_turu: 'Nakit', acilis_bakiyesi: 0 })
    fail('Genel Kasa oluşturulamadı', hesap.error)
  }

  const kategoriler = await supabase.from('md_gider_kategorileri').select('kategori_adi').eq('kurum_id', kurumId)
  fail('Gider kategorileri kontrol edilemedi', kategoriler.error)
  const varOlan = new Set((kategoriler.data || []).map((x: any) => String(x.kategori_adi).toLocaleLowerCase('tr-TR')))
  const eksik = ['Kira', 'Fatura', 'Malzeme', 'Pazarlama', 'Diğer'].filter(x => !varOlan.has(x.toLocaleLowerCase('tr-TR')))
  if (eksik.length) {
    const ekle = await supabase.from('md_gider_kategorileri').insert(eksik.map(kategori_adi => ({ kurum_id: kurumId, kategori_adi })))
    fail('Varsayılan gider kategorileri oluşturulamadı', ekle.error)
  }
}

export async function mdKasaVerisiniGetir(kurumId: string): Promise<MdKasaVerisi> {
  const [hesaplar, kategoriler, giderler, bakiyeler, hareketler] = await Promise.all([
    supabase.from('md_kasa_hesaplari').select('*').eq('kurum_id', kurumId).order('hesap_adi'),
    supabase.from('md_gider_kategorileri').select('*').eq('kurum_id', kurumId).order('kategori_adi'),
    supabase.from('md_giderler').select('*').eq('kurum_id', kurumId).order('tarih', { ascending: false }).order('olusturma_zamani', { ascending: false }).limit(50),
    supabase.from('md_kasa_bakiyeleri').select('*').eq('kurum_id', kurumId).order('hesap_adi'),
    supabase.from('md_kasa_hareketleri').select('*').eq('kurum_id', kurumId).order('tarih', { ascending: false }).order('olusturma_zamani', { ascending: false }).limit(60),
  ])
  const results = [hesaplar, kategoriler, giderler, bakiyeler, hareketler]
  const error = results.find(x => x.error)?.error
  fail('Kasa verisi alınamadı', error || null)
  return {
    hesaplar: (hesaplar.data || []).map((x: any) => ({ ...x, acilis_bakiyesi: Number(x.acilis_bakiyesi || 0) })),
    kategoriler: (kategoriler.data || []) as MdGiderKategorisi[],
    giderler: (giderler.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })),
    bakiyeler: (bakiyeler.data || []).map((x: any) => ({ ...x, acilis_bakiyesi: Number(x.acilis_bakiyesi || 0), giren: Number(x.giren || 0), cikan: Number(x.cikan || 0), bakiye: Number(x.bakiye || 0) })),
    hareketler: (hareketler.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })),
  }
}

export async function mdKasaHesabiEkle(kurumId: string, input: { hesap_adi: string; hesap_turu: MdKasaHesapTuru; acilis_bakiyesi?: number; aciklama?: string | null }) {
  const result = await supabase.from('md_kasa_hesaplari').insert({ kurum_id: kurumId, hesap_adi: input.hesap_adi.trim(), hesap_turu: input.hesap_turu, acilis_bakiyesi: input.acilis_bakiyesi || 0, aciklama: input.aciklama || null })
  fail('Kasa hesabı eklenemedi', result.error)
}

export async function mdGiderKategorisiEkle(kurumId: string, kategoriAdi: string) {
  const result = await supabase.from('md_gider_kategorileri').insert({ kurum_id: kurumId, kategori_adi: kategoriAdi.trim() })
  fail('Gider kategorisi eklenemedi', result.error)
}

export async function mdGiderKaydet(input: { kategoriId: string; kasaHesapId: string; tarih: string; tutar: number; odemeYontemi: MdOdemeYontemi; aciklama?: string | null }) {
  const result = await supabase.rpc('md_gider_kaydet_v1', {
    p_islem_anahtari: crypto.randomUUID(),
    p_kategori_id: input.kategoriId,
    p_kasa_hesap_id: input.kasaHesapId,
    p_tarih: input.tarih,
    p_tutar: input.tutar,
    p_odeme_yontemi: input.odemeYontemi,
    p_aciklama: input.aciklama || null,
  })
  fail('Gider kaydedilemedi', result.error)
  return String(result.data || '')
}

export async function mdGiderIptal(giderId: string) {
  const result = await supabase.rpc('md_gider_iptal_v1', { p_gider_id: giderId })
  fail('Gider iptal edilemedi', result.error)
  return Boolean(result.data)
}
