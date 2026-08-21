import { supabase } from '../lib/supabase'

export interface KursGrubu {
  grup_id: string
  grup_adi: string
  brans_id?: string | null
  varsayilan_ogretmen_id?: string | null
  varsayilan_derslik_id?: string | null
  kapasite?: number | null
  seviye?: string | null
  yas_grubu?: string | null
  durum?: string | null
  aciklama?: string | null
}

export interface KursGrupUyesi {
  grup_uye_id: string
  grup_id: string
  ogrenci_id: string
  baslangic_tarihi?: string | null
  bitis_tarihi?: string | null
  birim_ucret?: number | null
  durum?: string | null
}

export type GrupVeriDurumu = {
  hazir: boolean
  gruplar: KursGrubu[]
  uyeler: KursGrupUyesi[]
  neden?: 'TABLO_YOK' | 'API_YETKISI_YOK'
}

const kod = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code?: unknown }).code || '')
}

const beklenenHazirlikHatasi = (error: unknown) => {
  const code = kod(error)
  if (code === '42P01' || code === 'PGRST205') return 'TABLO_YOK' as const
  if (code === '42501') return 'API_YETKISI_YOK' as const
  return null
}

export async function grupVerisiniGetir(): Promise<GrupVeriDurumu> {
  const grupSonuc = await supabase.from('kurs_gruplari').select('*').order('grup_adi')
  if (grupSonuc.error) {
    const neden = beklenenHazirlikHatasi(grupSonuc.error)
    if (neden) return { hazir: false, gruplar: [], uyeler: [], neden }
    throw new Error(`Gruplar alınamadı: ${grupSonuc.error.message}`)
  }

  const uyeSonuc = await supabase.from('kurs_grup_uyeleri').select('*')
  if (uyeSonuc.error) {
    const neden = beklenenHazirlikHatasi(uyeSonuc.error)
    if (neden) return { hazir: false, gruplar: [], uyeler: [], neden }
    throw new Error(`Grup üyeleri alınamadı: ${uyeSonuc.error.message}`)
  }

  return {
    hazir: true,
    gruplar: (grupSonuc.data || []) as KursGrubu[],
    uyeler: (uyeSonuc.data || []) as KursGrupUyesi[],
  }
}
