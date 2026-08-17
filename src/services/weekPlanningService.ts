import { supabase } from '../lib/supabase'
import type { WeekPlanningIssue, WeekPlanningReview } from './programSuggestionService'

export type WeekCreationStatus={
  calisti:boolean
  hafta_baslangici?:string
  gecis_kilidi?:boolean
  gecmis_hafta?:boolean
  guncel_hafta?:boolean
  beklenen?:number
  mevcut?:number
  hazir?:number
  eksik?:number
  degismis?:number
  korunan?:number
  fazla?:number
}

export type WeekCreationResult={
  basarili:boolean
  hafta_baslangici:string
  olusturulan:number
  guncellenen:number
  zaten_mevcut:number
  korunan:number
  istisna:number
  gecmis_atlanan:number
  durum?:WeekCreationStatus
}

export async function getWeekCreationStatus(monday:string):Promise<WeekCreationStatus>{
  const{data,error}=await supabase.rpc('haftalik_ders_uretim_durumu_v3',{p_hafta_baslangici:monday})
  if(error)throw error
  return data as WeekCreationStatus
}

export async function createWeek(monday:string):Promise<WeekCreationResult>{
  const{data,error}=await supabase.rpc('haftalik_dersleri_hazirla_guvenli_v6',{p_hafta_baslangici:monday})
  if(error)throw error
  return data as WeekCreationResult
}

async function checkSingleWeek(monday:string){
  const{data,error}=await supabase.rpc('haftalik_program_kontrol_oneri_v2',{p_hafta_baslangici:monday})
  if(error)throw error
  return data as{basarili:boolean;uygun:boolean;sorun_sayisi:number;sorunlar:WeekPlanningIssue[]}
}

export async function reviewWeekPlanning(monday:string):Promise<WeekPlanningReview>{
  const result=await checkSingleWeek(monday)
  const sorunlar=result.sorunlar||[]
  return{
    basarili:Boolean(result.basarili),
    uygun:sorunlar.length===0,
    sorun_sayisi:sorunlar.length,
    sorunlar,
    haftalar:[monday],
  }
}
