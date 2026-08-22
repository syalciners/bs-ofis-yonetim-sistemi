import { supabase } from '../lib/supabase'
import type {
  MdDersDurumu,
  MdHaftaUretimSonucu,
  MdHaftaVerisi,
  MdKatilimDurumu,
  MdKurumSecenegi,
  MdKullaniciRolu,
  MdProgramTuru,
  MdUrunProfili,
  MusicDanceData,
} from './types'

const ACTIVE_KURUM_KEY = 'bs-md-aktif-kurum'

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
  const [subeler, mekanlar, branslar, kursiyerler, egitmenler, egitmenBranslari, gruplar, grupUyeleri, programlar] = await Promise.all([
    supabase.from('md_subeler').select('*').eq('kurum_id', kurumId).order('sube_adi'),
    supabase.from('md_mekanlar').select('*').eq('kurum_id', kurumId).order('mekan_adi'),
    supabase.from('md_branslar').select('*').eq('kurum_id', kurumId).order('brans_adi'),
    supabase.from('md_kursiyerler').select('*').eq('kurum_id', kurumId).order('ad_soyad'),
    supabase.from('md_egitmenler').select('*').eq('kurum_id', kurumId).order('ad_soyad'),
    supabase.from('md_egitmen_branslari').select('*').eq('kurum_id', kurumId),
    supabase.from('md_kurs_gruplari').select('*').eq('kurum_id', kurumId).order('grup_adi'),
    supabase.from('md_kurs_grup_uyeleri').select('*').eq('kurum_id', kurumId),
    supabase.from('md_sabit_programlar').select('*').eq('kurum_id', kurumId).order('haftanin_gunu').order('baslangic_saati'),
  ])

  const results = [subeler, mekanlar, branslar, kursiyerler, egitmenler, egitmenBranslari, gruplar, grupUyeleri, programlar]
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
    programlar: (programlar.data || []) as MusicDanceData['programlar'],
  }
}

export async function mdKurumOlustur(kurumAdi: string, urunProfili: MdUrunProfili, userId: string) {
  // İlk kurum oluşturulurken INSERT ... RETURNING kullanmıyoruz. RLS SELECT politikası
  // kurum üyeliğini şart koşuyor; üyelik ise md_kurumlar AFTER INSERT trigger'ında oluşuyor.
  // UUID'yi önceden üretmek, ilk kayıt sırasında gereksiz geri-okuma/RLS yarışını kaldırır.
  const kurumId = crypto.randomUUID()
  const kurum = await supabase.from('md_kurumlar').insert({
    kurum_id: kurumId,
    kurum_adi: kurumAdi.trim(),
    urun_profili: urunProfili,
    olusturan: userId,
  })
  fail('Kurum oluşturulamadı', kurum.error)

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

export async function mdProgramEkle(kurumId: string, input: {
  program_turu: MdProgramTuru
  kursiyer_id?: string | null
  grup_id?: string | null
  egitmen_id: string
  brans_id: string
  mekan_id?: string | null
  haftanin_gunu: number
  baslangic_saati: string
  sure_dk: number
  baslangic_tarihi: string
  bitis_tarihi?: string | null
  aciklama?: string | null
}) {
  const result = await supabase.from('md_sabit_programlar').insert({ kurum_id: kurumId, ...input })
  fail('Sabit program eklenemedi', result.error)
}

export async function mdProgramDurumuGuncelle(programId: string, durum: 'Aktif' | 'Pasif') {
  const result = await supabase.from('md_sabit_programlar').update({ durum, guncelleme_zamani: new Date().toISOString() }).eq('program_id', programId)
  fail('Program durumu güncellenemedi', result.error)
}

export async function mdHaftaDersleriniGetir(kurumId: string, haftaBaslangici: string, haftaBitisi: string): Promise<MdHaftaVerisi> {
  const dersler = await supabase
    .from('md_dersler')
    .select('*')
    .eq('kurum_id', kurumId)
    .gte('tarih', haftaBaslangici)
    .lte('tarih', haftaBitisi)
    .order('tarih')
    .order('baslangic_saati')
  fail('Haftalık dersler alınamadı', dersler.error)

  const ids = (dersler.data || []).map((x: any) => String(x.ders_id))
  if (!ids.length) return { dersler: [], katilimlar: [] }

  const katilimlar = await supabase
    .from('md_ders_katilimlari')
    .select('*')
    .eq('kurum_id', kurumId)
    .in('ders_id', ids)
  fail('Ders katılımları alınamadı', katilimlar.error)

  return {
    dersler: (dersler.data || []) as MdHaftaVerisi['dersler'],
    katilimlar: (katilimlar.data || []) as MdHaftaVerisi['katilimlar'],
  }
}

export async function mdHaftayiOlustur(haftaBaslangici: string): Promise<MdHaftaUretimSonucu> {
  const kurumId = window.localStorage.getItem(ACTIVE_KURUM_KEY)
  if (!kurumId) throw new Error('Aktif kurum seçimi bulunamadı. Sayfayı yenileyip tekrar deneyin.')
  const result = await supabase.rpc('md_haftalik_dersleri_olustur_v1', { p_kurum_id: kurumId, p_hafta_baslangici: haftaBaslangici })
  fail('Haftalık dersler oluşturulamadı', result.error)
  const raw = result.data as Partial<MdHaftaUretimSonucu> | null
  return {
    hafta_baslangici: String(raw?.hafta_baslangici || haftaBaslangici),
    olusturulan: Number(raw?.olusturulan || 0),
    mevcut: Number(raw?.mevcut || 0),
    hata: Number(raw?.hata || 0),
    hatalar: Array.isArray(raw?.hatalar) ? raw!.hatalar! : [],
  }
}

export async function mdDersDurumuGuncelle(dersId: string, dersDurumu: MdDersDurumu) {
  const result = await supabase.from('md_dersler').update({ ders_durumu: dersDurumu, guncelleme_zamani: new Date().toISOString() }).eq('ders_id', dersId)
  fail('Ders durumu güncellenemedi', result.error)
}

export async function mdKatilimDurumuGuncelle(katilimId: string, katilimDurumu: MdKatilimDurumu) {
  const result = await supabase.from('md_ders_katilimlari').update({ katilim_durumu: katilimDurumu, guncelleme_zamani: new Date().toISOString() }).eq('katilim_id', katilimId)
  fail('Yoklama güncellenemedi', result.error)
}
