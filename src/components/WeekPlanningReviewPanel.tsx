import { AlertTriangle, CalendarCheck2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fullDate } from '../lib/format'
import { moveProgramDate } from '../services/officeService'
import { reviewWeekPlanning, type ProgramSuggestion, type WeekPlanningIssue, type WeekPlanningReview } from '../services/programSuggestionService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function WeekPlanningReviewPanel({review,onChange,onClose,onCreate}:{review:WeekPlanningReview;onChange:(r:WeekPlanningReview)=>void;onClose:()=>void;onCreate:()=>void}){
  const{refresh}=useAppData();const{toast}=useToast();const nav=useNavigate();const[applying,setApplying]=useState('')

  const apply=async(issue:WeekPlanningIssue,s:ProgramSuggestion)=>{
    const key=`${issue.program_id}-${issue.tarih}-${s.saat}-${s.derslik_id}`;setApplying(key)
    try{
      await moveProgramDate({program_id:issue.program_id,orijinal_tarih:issue.tarih,yeni_tarih:issue.tarih,yeni_baslangic_saati:s.saat,yeni_derslik_id:s.derslik_id,aciklama:'Haftalık program çakışma önerisi uygulandı'})
      await refresh()
      const next=await reviewWeekPlanning(review.haftalar[0])
      onChange(next)
      toast(next.uygun?'Çakışmalar giderildi. Haftayı artık hazırlayabilirsiniz.':'Öneri uygulandı; kalan çakışmaları kontrol edin.')
    }catch(e:any){toast(e.message||String(e),'error')}finally{setApplying('')}
  }

  if(review.uygun)return <div className="week-review-ready"><CalendarCheck2/><div><b>Program artık uygun.</b><span>Seçilen hafta çakışmasız görünüyor.</span></div><button className="primary-btn" type="button" onClick={onCreate}>Haftayı Hazırla</button><button className="secondary-btn" type="button" onClick={onClose}>Kapat</button></div>

  return <div className="week-review-list">
    <div className="week-review-summary"><AlertTriangle/><span><b>{review.sorun_sayisi} ders düzenleme istiyor.</b><small>Henüz hiçbir ders oluşturulmadı veya güncellenmedi. Bir öneri seçerek yalnız ilgili haftayı düzeltebilirsiniz.</small></span></div>
    {review.sorunlar.map((issue,index)=>{
      const reasons=[issue.ogrenci_cakisma?'Öğrenci başka derste':'',issue.ogretmen_cakisma?'Öğretmen başka derste':'',issue.derslik_dolu?'Derslik dolu':''].filter(Boolean)
      return <section className="week-review-card" key={`${issue.program_id}-${issue.tarih}-${index}`}>
        <header><div><b>{issue.ogrenci}</b><span>{issue.ogretmen}</span></div><strong>{fullDate(issue.tarih)} · {issue.saat}</strong></header>
        <div className="week-review-current">Mevcut yer: <b>{issue.derslik}</b></div>
        <div className="smart-reasons">{reasons.map(x=><span key={x}>{x}</span>)}</div>
        {!!issue.onerilen_derslikler?.length&&<div className="smart-options"><b>Aynı saat · uygun derslik</b><div>{issue.onerilen_derslikler.map((s,i)=>{const key=`${issue.program_id}-${issue.tarih}-${s.saat}-${s.derslik_id}`;return <button type="button" className="suggestion-btn" disabled={!!applying} key={`${key}-${i}`} onClick={()=>void apply(issue,s)}>{applying===key?'Uygulanıyor…':`${s.saat} · ${s.derslik}`}</button>})}</div></div>}
        {!!issue.onerilen_saatler?.length&&<div className="smart-options"><b>Yakın uygun saatler</b><div>{issue.onerilen_saatler.map((s,i)=>{const key=`${issue.program_id}-${issue.tarih}-${s.saat}-${s.derslik_id}`;return <button type="button" className="suggestion-btn" disabled={!!applying} key={`${key}-${i}`} onClick={()=>void apply(issue,s)}>{applying===key?'Uygulanıyor…':`${s.saat} · ${s.derslik}`}</button>})}</div></div>}
        {!issue.onerilen_derslikler?.length&&!issue.onerilen_saatler?.length&&<div className="form-hint">Yakın bir uygun seçenek bulunamadı. Sabit programdan gün, saat veya öğretmeni değiştirin.</div>}
      </section>
    })}
    <button className="secondary-btn full" type="button" onClick={()=>nav('/sabit-program')}><ExternalLink size={16}/>Sabit Ders Programını Aç</button>
  </div>
}
