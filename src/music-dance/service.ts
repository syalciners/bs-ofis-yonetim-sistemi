import { supabase } from '../lib/supabase'
import type { MdKurumSecenegi, MdKullaniciRolu, MdUrunProfili, MusicDanceData } from './types'

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}

export async function mdKurumlariGetir(): Promise<MdKurumSecenegi[]> {
  const uyelik = await supabase
    .from('md_kurum_kullanicilari')
    .select('kurum_id,rol,aktif')
    .eq('aktif', true)
  fail('Kurum üyelikleri alınamadı', uyelik.error)
  const memberships = (uyelik.data || []) as { kurum_id: string; rol: MdKullaniciRolu; aktif: boolean }[]
  if (!memberships.length) return []

  const kurum = await supabase
    .from('md_kurumlar')
    .select('kurum_id,kurum_adi,urun_profili,durum')
    .in('kurum_id', memberships.map(x => x.kurum_id))
    .eq('durum', 'Aktif')
    .order('kurum_adi')
  fail('Kurumlar alınamadı', kurum.error)

  return (kurum.data || []).map((row: any) => ({
    kurum_id: String(row.kurum_id),
    kurum_adi: String(row.kurum_adi),
    urun_profili: row.urun_profili as MdUrunProfili,
    rol: memberships.find(x => x.kurum_id === row.kurum_id)?.rol || 'Ofis',
  }))
}

export async function mdVerisiniGetir(kurumId: string): Promise<MusicDanceData> {
  const [subeler, mekanlar, branslar, kursiyerler, egitmenler, egitmenBranslari, gruplar, grupUyeleri] = await Promise.all([
    supabase.from('md_subeler').select('*').eq('kurum_id', kurumId).order('sube_adi'),
    supabase.from('md_mekanlar').select('*').eq('kurum_id', kurumId).order('mekan_adi'),
    supabase.from('md_branslar').select('*').eq('kurum_id', kurumId).order('brans_adi'),
    supabase.from('md_kursiyerler').select('*').eq('kurum_id', kurumId).order('ad_soyad'),
    supabase.from('md_egitmenler').select('*').eq('kurum_id', kurumId).order('ad_soyad'),
    supabase.from('md_egitmen_branslari').select('*').eq('kurum_id', kurumId),
    supabase.from('md_kurs_gruplari').select('*').eq('kurum_id', kurumId).order('grup_adi'),
    supabase.from('md_kurs_grup_uyeleri').select('*').eq('kurum_id', kurumId),
  ])

  const results = [subeler, mekanlar, branslar, kursiyerler, egitmenler, egitmenBranslari, gruplar, grupUyeleri]
  const error = results.find(x => x.error)?.error
  fail('Müzik & Dans verisi alınamadı', error || null)

  return {
    subeler: (subeler.data || []) as MusicDanceData['subeler'],
    mekanlar: (mekanlar.data || []) as MusicDanceData['mekanlar'],
    branslar: (branslar.data || []) as MusicDanceData['branslar'],
    kursiyerler: (kursiyerler.data || []) as MusicDanceData['kursiyerler'],
    egitmenler: (egitmenler.data || []) as MusicDanceData['egitmenler'],
    egitmenBranslari: (egitmenBranslari.data || []) as MusicDanceData['egitmenBranslari'],
    gruplar: (gruplar.data || []) as MusicDanceData['gruplar'],
    grupUyeleri: (grupUyeleri.data || []) as MusicDanceData['grupUyeleri'],
  }
}

export async function mdKurumOlustur(kurumAdi: string, urunProfili: MdUrunProfili, userId: string) {
  const kurum = await supabase.from('md_kurumlar').insert({
    kurum_adi: kurumAdi.trim(),
    urun_profili: urunProfili,
    olusturan: userId,
  }).select('kurum_id').single()
  fail('Kurum oluşturulamadı', kurum.error)
  const kurumId = String(kurum.data?.kurum_id || '')
  if (!kurumId) throw new Error('Kurum kimliği oluşturulamadı.')

  const sube = await supabase.from('md_subeler').insert({ kurum_id: kurumId, sube_adi: 'Merkez' })
  fail('Merkez şube oluşturulamadı', sube.error)
  return kurumId
}

export async function mdBransEkle(kurumId: string, input: { brans_adi: string; kategori: 'Müzik' | 'Dans' | 'Diğer'; varsayilan_sure_dk: number; bireysel_uygun: boolean; grup_uygun: boolean }) {
  const result = await supabase.from('md_branslar').insert({ kurum_id: kurumId, ...input })
  fail('Branş eklenemedi', result.error)
}

export async function mdMekanEkle(kurumId: string, input: { mekan_adi: string; mekan_turu: 'Stüdyo' | 'Salon' | 'Online' | 'Diğer'; kapasite: number; sube_id?: string | null }) {
  const result = await supabase.from('md_mekanlar').insert({ kurum_id: kurumId, ...input })
  fail('Stüdyo / salon eklenemedi', result.error)
}

export async function mdKursiyerEkle(kurumId: string, input: { ad_soyad: string; telefon?: string | null; email?: string | null; seviye?: string | null; dogum_tarihi?: string | null }) {
  const result = await supabase.from('md_kursiyerler').insert({ kurum_id: kurumId, ...input })
  fail('Kursiyer eklenemedi', result.error)
}

export async function mdEgitmenEkle(kurumId: string, input: { ad_soyad: string; telefon?: string | null; email?: string | null }, bransIds: string[] = []) {
  const result = await supabase.from('md_egitmenler').insert({ kurum_id: kurumId, ...input }).select('egitmen_id').single()
  fail('Eğitmen eklenemedi', result.error)
  const egitmenId = String(result.data?.egitmen_id || '')
  if (egitmenId && bransIds.length) {
    const links = await supabase.from('md_egitmen_branslari').insert(bransIds.map(brans_id => ({ kurum_id: kurumId, egitmen_id: egitmenId, brans_id })))
    fail('Eğitmen branşları bağlanamadı', links.error)
  }
}

export async function mdGrupEkle(kurumId: string, input: { grup_adi: string; brans_id?: string | null; varsayilan_egitmen_id?: string | null; varsayilan_mekan_id?: string | null; kapasite?: number | null; seviye?: string | null; yas_grubu?: string | null }) {
  const result = await supabase.from('md_kurs_gruplari').insert({ kurum_id: kurumId, ...input })
  fail('Grup eklenemedi', result.error)
}

export async function mdGrubaKursiyerEkle(kurumId: string, grupId: string, kursiyerId: string, birimUcret?: number | null) {
  const result = await supabase.from('md_kurs_grup_uyeleri').insert({
    kurum_id: kurumId,
    grup_id: grupId,
    kursiyer_id: kursiyerId,
    birim_ucret: birimUcret ?? null,
  })
  fail('Kursiyer gruba eklenemedi', result.error)
}
