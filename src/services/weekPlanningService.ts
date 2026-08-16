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
  eksik?:number
}

function addDaysISO(date:string,days:number){
  const d=new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate()+days)
  return d.toISOString().slice(0,10)
}

export async function getWeekCreationStatus(monday:string):Promise<WeekCreationStatus>{
  const{data,error}=await supabase.rpc('haftalik_ders_uretim_durumu_v2',{p_hafta_baslangici:monday})
  if(error)throw error
  return data as WeekCreationStatus
}

export async function createWeek(monday:string){
  const{data,error}=await supabase.rpc('haftalik_dersleri_olustur_guvenli_v5',{p_hafta_baslangici:monday})
  if(error)throw error
  return data
}

async function checkSingleWeek(monday:string){
  const{data,error}=await supabase.rpc('haftalik_program_kontrol_oneri_v2',{p_hafta_baslangici:monday})
  if(error)throw error
  return data as{basarili:boolean;uygun:boolean;sorun_sayisi:number;sorunlar:WeekPlanningIssue[]}
}

export async function reviewWeekPlanning(monday:string):Promise<WeekPlanningReview>{
  const nextMonday=addDaysISO(monday,7)
  const[first,second]=await Promise.all([checkSingleWeek(monday),checkSingleWeek(nextMonday)])
  const sorunlar=[...(first.sorunlar||[]),...(second.sorunlar||[])]
  return{
    basarili:Boolean(first.basarili&&second.basarili),
    uygun:sorunlar.length===0,
    sorun_sayisi:sorunlar.length,
    sorunlar,
    haftalar:[monday,nextMonday],
  }
}
