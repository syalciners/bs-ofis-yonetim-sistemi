import { supabase } from '../lib/supabase'
import { uid } from '../lib/format'
import type { GiderKategori, KasaHesabi } from '../lib/types'

export async function saveCashAccount(input: Omit<KasaHesabi,'hesap_id'> & { hesap_id?: string }) {
  const id=input.hesap_id||uid('KASA')
  const {data,error}=await supabase.rpc('kasa_hesabi_kaydet_guvenli_v1',{
    p_hesap_id:id,
    p_hesap_adi:input.hesap_adi,
    p_hesap_turu:input.hesap_turu||null,
    p_banka_adi:input.banka_adi||null,
    p_iban:input.iban||null,
    p_acilis_bakiyesi:Number(input.acilis_bakiyesi||0),
    p_aktif:input.aktif!==false,
    p_aciklama:input.aciklama||null,
  })
  if(error)throw error
  return{id,data}
}

export async function saveExpenseCategory(input: Omit<GiderKategori,'kategori_id'> & { kategori_id?: string }) {
  const id=input.kategori_id||uid('GDR')
  const {data,error}=await supabase.rpc('gider_kategorisi_kaydet_guvenli_v1',{
    p_kategori_id:id,
    p_kategori_adi:input.kategori_adi,
    p_grup:input.grup||null,
    p_sira_no:input.sira_no==null?null:Number(input.sira_no),
    p_aktif:input.aktif!==false,
    p_aciklama:input.aciklama||null,
  })
  if(error)throw error
  return{id,data}
}
