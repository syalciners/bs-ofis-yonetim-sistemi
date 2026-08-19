import { supabase } from '../lib/supabase'

export type DenemeTuru = 'LGS' | 'TYT' | 'AYT' | 'Diğer'
export type DenemeVeriKaynagi = 'Manuel' | 'Fotoğraf' | 'Optik' | 'Entegrasyon'
export type DenemeOnayDurumu = 'Taslak' | 'Onaylandı' | 'İptal'

export interface KoclukDenemeSinavi {
  deneme_id: string
  ogrenci_id: string
  sinav_turu: string
  deneme_adi: string
  deneme_tarihi: string
  yayinevi?: string | null
  veri_kaynagi: DenemeVeriKaynagi
  yanlis_boleni: number
  puan?: number | null
  siralama?: number | null
  yuzdelik?: number | null
  katilimci_sayisi?: number | null
  sure_dakika?: number | null
  notlar?: string | null
  onay_durumu: DenemeOnayDurumu
  olusturulma_zamani?: string | null
  guncellenme_zamani?: string | null
}

export interface KoclukDenemeBolumSonucu {
  sonuc_id: string
  deneme_id: string
  bolum_adi: string
  sira_no: number
  dogru: number
  yanlis: number
  bos: number
  soru_sayisi: number
  net: number
}

export interface DenemeBolumGirdisi {
  bolum_adi: string
  sira_no: number
  dogru: number
  yanlis: number
  bos: number
  soru_sayisi: number
}

export interface DenemeTamKayitGirdisi {
  deneme_id?: string | null
  ogrenci_id: string
  sinav_turu: string
  deneme_adi: string
  deneme_tarihi: string
  yayinevi?: string | null
  veri_kaynagi?: DenemeVeriKaynagi
  yanlis_boleni: number
  puan?: number | null
  siralama?: number | null
  yuzdelik?: number | null
  katilimci_sayisi?: number | null
  sure_dakika?: number | null
  notlar?: string | null
  bolumler: DenemeBolumGirdisi[]
}

export interface DenemeTamKayitSonucu {
  basarili: boolean
  deneme_id: string
  yeni: boolean
  onay_durumu: 'Onaylandı'
  bolum_sayisi: number
  toplam_dogru: number
  toplam_yanlis: number
  toplam_bos: number
  toplam_net: number
}

export async function loadCoachingExams(): Promise<KoclukDenemeSinavi[]> {
  const { data, error } = await supabase
    .from('kocluk_deneme_sinavlari')
    .select('*')
    .neq('onay_durumu', 'İptal')
    .order('deneme_tarihi', { ascending: false })
    .order('guncellenme_zamani', { ascending: false })
  if (error) throw error
  return (data || []) as KoclukDenemeSinavi[]
}

export async function loadCoachingExamSections(): Promise<KoclukDenemeBolumSonucu[]> {
  const { data, error } = await supabase
    .from('kocluk_deneme_bolum_sonuclari')
    .select('*')
    .order('sira_no', { ascending: true })
    .order('bolum_adi', { ascending: true })
  if (error) throw error
  return (data || []) as KoclukDenemeBolumSonucu[]
}

export async function loadCoachingExamData() {
  const [exams, sections] = await Promise.all([loadCoachingExams(), loadCoachingExamSections()])
  return { exams, sections }
}

export async function saveFullCoachingExam(input: DenemeTamKayitGirdisi): Promise<DenemeTamKayitSonucu> {
  const { data, error } = await supabase.rpc('kocluk_deneme_tam_kaydet_guvenli_v1', {
    p_deneme_id: input.deneme_id || null,
    p_ogrenci_id: input.ogrenci_id,
    p_sinav_turu: input.sinav_turu,
    p_deneme_adi: input.deneme_adi,
    p_deneme_tarihi: input.deneme_tarihi,
    p_yayinevi: input.yayinevi || null,
    p_veri_kaynagi: input.veri_kaynagi || 'Manuel',
    p_yanlis_boleni: input.yanlis_boleni,
    p_puan: input.puan ?? null,
    p_siralama: input.siralama ?? null,
    p_yuzdelik: input.yuzdelik ?? null,
    p_katilimci_sayisi: input.katilimci_sayisi ?? null,
    p_sure_dakika: input.sure_dakika ?? null,
    p_notlar: input.notlar || null,
    p_bolumler: input.bolumler,
  })
  if (error) throw error
  return data as DenemeTamKayitSonucu
}

export const totalExamNet = (examId: string, sections: KoclukDenemeBolumSonucu[]) =>
  sections.filter(x => x.deneme_id === examId).reduce((sum, x) => sum + Number(x.net || 0), 0)

export const examSections = (examId: string, sections: KoclukDenemeBolumSonucu[]) =>
  sections.filter(x => x.deneme_id === examId).sort((a, b) => a.sira_no - b.sira_no || a.bolum_adi.localeCompare(b.bolum_adi, 'tr-TR'))
