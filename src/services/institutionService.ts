import { supabase } from '../lib/supabase'

export interface KurumAyarlari {
  kurum_id: 'ANA'
  kurum_adi: string
  marka_adi: string
  telefon?: string | null
  email?: string | null
  adres?: string | null
  logo_url?: string | null
  varsayilan_ders_birimi: number
  takvim_baslangic_saati: string
  takvim_bitis_saati: string
  guncellenme_zamani?: string | null
}

type KurumBilgileriInput=Pick<KurumAyarlari,'kurum_adi'|'marka_adi'|'telefon'|'email'|'adres'|'logo_url'>
export type ProgramAyarlariInput=Pick<KurumAyarlari,'varsayilan_ders_birimi'|'takvim_baslangic_saati'|'takvim_bitis_saati'>

export const SYSTEM_DERS_BIRIMI_DAKIKA=60

export const DEFAULT_KURUM_AYARLARI: KurumAyarlari = {
  kurum_id: 'ANA',
  kurum_adi: 'BS Eğitim Yönetimi',
  marka_adi: 'BS Eğitim',
  telefon: null,
  email: null,
  adres: null,
  logo_url: './bs-egitim-icon-512-v2.png',
  varsayilan_ders_birimi: 1,
  takvim_baslangic_saati: '08:00',
  takvim_bitis_saati: '21:00',
}

export async function loadInstitutionBrand(): Promise<KurumAyarlari> {
  const { data, error } = await supabase.rpc('kurum_public_bilgisi_v1')
  if (error) throw error
  const brand = (data || {}) as { kurum_adi?: string | null; marka_adi?: string | null; logo_url?: string | null }
  return {
    ...DEFAULT_KURUM_AYARLARI,
    kurum_adi: brand.kurum_adi || DEFAULT_KURUM_AYARLARI.kurum_adi,
    marka_adi: brand.marka_adi || DEFAULT_KURUM_AYARLARI.marka_adi,
    logo_url: brand.logo_url || DEFAULT_KURUM_AYARLARI.logo_url,
  }
}

export async function loadInstitutionSettings(): Promise<KurumAyarlari> {
  const { data, error } = await supabase
    .from('kurum_ayarlari')
    .select('kurum_id,kurum_adi,marka_adi,telefon,email,adres,logo_url,varsayilan_ders_birimi,takvim_baslangic_saati,takvim_bitis_saati,guncellenme_zamani')
    .eq('kurum_id', 'ANA')
    .maybeSingle()
  if (error) throw error
  const row=data as Partial<KurumAyarlari>|null
  if(!row)return DEFAULT_KURUM_AYARLARI
  return{
    ...DEFAULT_KURUM_AYARLARI,
    ...row,
    kurum_id:'ANA',
    varsayilan_ders_birimi:Number(row.varsayilan_ders_birimi||1),
    takvim_baslangic_saati:String(row.takvim_baslangic_saati||'08:00').slice(0,5),
    takvim_bitis_saati:String(row.takvim_bitis_saati||'21:00').slice(0,5),
  }
}

export async function saveInstitutionSettings(input: KurumBilgileriInput) {
  const { data, error } = await supabase.rpc('kurum_ayarlari_guncelle_guvenli_v1', {
    p_kurum_adi: input.kurum_adi,
    p_marka_adi: input.marka_adi,
    p_telefon: input.telefon || null,
    p_email: input.email || null,
    p_adres: input.adres || null,
    p_logo_url: input.logo_url || null,
  })
  if (error) throw error
  return data
}

export async function saveProgramSettings(input:ProgramAyarlariInput){
  const{data,error}=await supabase.rpc('program_ayarlari_guncelle_guvenli_v1',{
    p_varsayilan_ders_birimi:Number(input.varsayilan_ders_birimi),
    p_takvim_baslangic_saati:input.takvim_baslangic_saati,
    p_takvim_bitis_saati:input.takvim_bitis_saati,
  })
  if(error)throw error
  return data
}

const LOGO_BUCKET = 'kurum-markasi'
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_LOGO_BYTES = 2 * 1024 * 1024

export async function uploadInstitutionLogo(file: File) {
  if (!LOGO_TYPES.includes(file.type)) throw new Error('Logo PNG, JPEG veya WebP olmalıdır.')
  if (file.size > MAX_LOGO_BYTES) throw new Error('Logo dosyası en fazla 2 MB olabilir.')
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return { path, url: `${data.publicUrl}?v=${Date.now()}` }
}

export async function removeInstitutionLogo(path: string) {
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([path])
  if (error) throw error
}

export function institutionLogoPath(url?: string | null) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`
  const index = url.indexOf(marker)
  if (index < 0) return null
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]) || null
}
