import { supabase } from '../lib/supabase'

export interface MdBrans {
  brans_id: string
  brans_adi: string
  kategori?: string | null
  aktif?: boolean | null
}

export interface MdEgitmen {
  egitmen_id: string
  ad_soyad: string
  durum?: string | null
}

export interface MdMekan {
  mekan_id: string
  mekan_adi: string
  mekan_turu?: string | null
  kapasite?: number | null
  aktif?: boolean | null
}

export interface KursGrubu {
  grup_id: string
  grup_adi: string
  brans_id?: string | null
  varsayilan_egitmen_id?: string | null
  varsayilan_mekan_id?: string | null
  kapasite?: number | null
  seviye?: string | null
  yas_grubu?: string | null
  durum?: string | null
  aciklama?: string | null
}

export interface KursGrupUyesi {
  grup_uye_id: string
  grup_id: string
  kursiyer_id: string
  baslangic_tarihi?: string | null
  bitis_tarihi?: string | null
  birim_ucret?: number | null
  durum?: string | null
}

export type GrupVeriDurumu = {
  hazir: boolean
  gruplar: KursGrubu[]
  uyeler: KursGrupUyesi[]
  branslar: MdBrans[]
  egitmenler: MdEgitmen[]
  mekanlar: MdMekan[]
  neden?: 'TABLO_YOK' | 'API_YETKISI_YOK'
}

const bosSonuc = (neden: GrupVeriDurumu['neden']): GrupVeriDurumu => ({
  hazir: false,
  gruplar: [],
  uyeler: [],
  branslar: [],
  egitmenler: [],
  mekanlar: [],
  neden,
})

const kod = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code?: unknown }).code || '')
}

const beklenenHazirlikHatasi = (error: unknown) => {
  const code = kod(error)
  if (code === '42P01' || code === 'PGRST205') return 'TABLO_YOK' as const
  if (code === '42501' || code === 'PGRST301') return 'API_YETKISI_YOK' as const
  return null
}

const kontrolEt = (error: unknown) => {
  if (!error) return null
  return beklenenHazirlikHatasi(error)
}

export async function grupVerisiniGetir(): Promise<GrupVeriDurumu> {
  const [grupSonuc, uyeSonuc, bransSonuc, egitmenSonuc, mekanSonuc] = await Promise.all([
    supabase.from('md_kurs_gruplari').select('*').order('grup_adi'),
    supabase.from('md_kurs_grup_uyeleri').select('*'),
    supabase.from('md_branslar').select('brans_id,brans_adi,kategori,aktif').order('brans_adi'),
    supabase.from('md_egitmenler').select('egitmen_id,ad_soyad,durum').order('ad_soyad'),
    supabase.from('md_mekanlar').select('mekan_id,mekan_adi,mekan_turu,kapasite,aktif').order('mekan_adi'),
  ])

  const sonuclar = [grupSonuc, uyeSonuc, bransSonuc, egitmenSonuc, mekanSonuc]
  for (const sonuc of sonuclar) {
    if (!sonuc.error) continue
    const neden = kontrolEt(sonuc.error)
    if (neden) return bosSonuc(neden)
    throw new Error(`Müzik & Dans grup verisi alınamadı: ${sonuc.error.message}`)
  }

  return {
    hazir: true,
    gruplar: (grupSonuc.data || []) as KursGrubu[],
    uyeler: (uyeSonuc.data || []) as KursGrupUyesi[],
    branslar: (bransSonuc.data || []) as MdBrans[],
    egitmenler: (egitmenSonuc.data || []) as MdEgitmen[],
    mekanlar: (mekanSonuc.data || []) as MdMekan[],
  }
}
