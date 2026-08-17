import { supabase } from '../lib/supabase'
import type { SabitProgram } from '../lib/types'
import { uid } from '../lib/format'

export type ManualProgramSaveResult={
  basarili:boolean
  program_id:string
  yeni_program:boolean
  manuel_hafta_hazirlama?:boolean
  gecmis_dersler_korundu?:boolean
}

export async function saveProgramManual(input:SabitProgram):Promise<ManualProgramSaveResult>{
  const{data,error}=await supabase.rpc('sabit_program_kaydet_guvenli_v4',{
    p_program_id:input.program_id||uid('SP'),
    p_ogrenci_id:input.ogrenci_id,
    p_ogretmen_id:input.ogretmen_id,
    p_brans_id:input.brans_id,
    p_derslik_id:input.derslik_id,
    p_haftanin_gunu:input.haftanin_gunu,
    p_baslangic_saati:input.baslangic_saati,
    p_ders_sayisi:Number(input.ders_sayisi||1),
    p_ogrenci_birim_ucreti:Number(input.ogrenci_birim_ucreti||0),
    p_ogretmen_birim_hakedisi:Number(input.ogretmen_birim_hakedisi||0),
    p_tekrar_sikligi:input.tekrar_sikligi||'Her Hafta',
    p_baslangic_tarihi:input.baslangic_tarihi||null,
    p_bitis_tarihi:input.bitis_tarihi||null,
    p_aciklama:input.aciklama||null,
    p_program_durumu:input.program_durumu||'Aktif',
  })
  if(error)throw error
  return data as ManualProgramSaveResult
}
