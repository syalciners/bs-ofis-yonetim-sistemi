import { Clock3, Eye, MoveRight, PauseCircle, Plus, Repeat2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { ProgramMoveForm } from '../components/forms'
import { SmartProgramForm } from '../components/SmartProgramForm'
import type { SabitProgram } from '../lib/types'
import { fullDate, money, time, todayISO } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import { branchName, roomName, studentName, teacherName } from '../services/metrics'
import { previewProgram, saveProgram, skipProgramDate } from '../services/officeService'
import { useToast } from '../components/Toast'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']

export function FixedProgramPage(){
  const {data,refresh}=useAppData();const{toast}=useToast();const[showPassive,setShowPassive]=useState(false);const[programForm,setProgramForm]=useState<SabitProgram|null|undefined>(undefined);const[selectedProgram,setSelectedProgram]=useState<SabitProgram|null>(null);const[moveProgram,setMoveProgram]=useState<SabitProgram|null>(null);const[preview,setPreview]=useState<any[]|null>(null)
  const programs=useMemo(()=>{if(!data)return[];return data.sabitProgramlar.filter(x=>showPassive||!(x.program_durumu==='Pasif'||x.aktif===false)).sort((a,b)=>dayNames.indexOf(a.haftanin_gunu||'')-dayNames.indexOf(b.haftanin_gunu||'')||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,showPassive])
  if(!data)return null
  const toggleProgram=async(p:SabitProgram)=>{const activating=p.program_durumu==='Pasif';if(!activating&&!window.confirm('Program pasif yapılsın mı?\\n\\nMevcut planlı dersler korunur; yalnız yeni ders üretimi durdurulur.'))return;try{const result=await saveProgram({...p,program_durumu:activating?'Aktif':'Pasif'});await refresh();if(activating){const updated=Number(result?.guncellenen_gelecek_ders||0);toast(updated>0?`Program aktif yapıldı. ${updated} gelecek planlı ders güncellendi.`:'Program aktif yapıldı.')}else toast('Program pasif yapıldı. Mevcut planlı dersler korundu; yeni ders üretimi durduruldu.');setSelectedProgram(null)}catch(e:any){toast(e.message||String(e),'error')}}
  const skipNext=async(p:SabitProgram)=>{try{const r:any=await previewProgram(p.program_id,todayISO(),1);const dates=r?.tarihler||[];if(!dates.length)throw new Error('Atlanabilecek gelecek ders bulunamadı.');await skipProgramDate(p.program_id,dates[0].tarih,'Kullanıcı tarafından atlandı');await refresh();toast(`${fullDate(dates[0].tarih)} tarihli ders atlandı.`);setSelectedProgram(null)}catch(e:any){toast(e.message||String(e),'error')}}
  const showPreview=async(p:SabitProgram)=>{try{const r:any=await previewProgram(p.program_id,todayISO(),10);setPreview(r?.tarihler||[])}catch(e:any){toast(e.message||String(e),'error')}}

  return <div className="page-stack fixed-program-page">
    <section className="page-title-row"><div><span className="eyebrow">PROGRAM ŞABLONLARI</span><h1>Sabit Ders Programı</h1><p>Tekrar eden dersleri günlere göre yönetin.</p></div><button className="primary-btn" onClick={()=>setProgramForm(null)}><Plus size={17}/>Sabit Ders Ekle</button></section>
    <section className="fixed-program-toolbar"><div><b>{programs.length} program</b><span>{showPassive?'Aktif ve pasif kayıtlar':'Yalnız aktif kayıtlar'}</span></div><button className="secondary-btn" onClick={()=>setShowPassive(x=>!x)}>{showPassive?'Pasifleri Gizle':'Pasifleri Göster'}</button></section>

    <section className="fixed-program-groups">
      {dayNames.map(day=>{const items=programs.filter(x=>x.haftanin_gunu===day);if(!items.length)return null;return <div className="fixed-day-group" key={day}><header><b>{day}</b><span>{items.length} ders</span></header><div>{items.map(p=>{const teacher=teacherName(data,p.ogretmen_id);return <button className={`program-card ${teacherTone(teacher)} ${p.program_durumu==='Pasif'||p.aktif===false?'muted-card':''}`} key={p.program_id} onClick={()=>setSelectedProgram(p)}><div className="program-time"><b>{time(p.baslangic_saati)}</b><span>{Number(p.ders_sayisi||1)} ders</span></div><div className="program-main"><strong>{studentName(data,p.ogrenci_id)}</strong><small>{teacher} · {branchName(data,p.brans_id)} · {roomName(data,p.derslik_id)}</small><span>{p.tekrar_sikligi} · {p.program_durumu||'Aktif'}</span></div><div className="program-price"><b>{money(p.ogrenci_birim_ucreti)}</b><small>öğrenci / ders</small></div></button>})}</div></div>})}
      {!programs.length&&<div className="calm-empty"><Repeat2/><b>Sabit program bulunamadı.</b><span>Yeni sabit ders ekleyebilir veya pasif kayıtları gösterebilirsiniz.</span></div>}
    </section>

    <Sheet open={programForm!==undefined} title={programForm?'Sabit Programı Düzenle':'Yeni Sabit Ders'} subtitle="Uygunluk kontrolü ve akıllı alternatifler" onClose={()=>setProgramForm(undefined)}>{programForm!==undefined&&<SmartProgramForm program={programForm||undefined} onDone={()=>setProgramForm(undefined)} onCancel={()=>setProgramForm(undefined)}/>}</Sheet>
    <Sheet open={!!selectedProgram&&!preview} title={selectedProgram?studentName(data,selectedProgram.ogrenci_id):'Program'} subtitle={selectedProgram?`${selectedProgram.haftanin_gunu} · ${time(selectedProgram.baslangic_saati)} · ${selectedProgram.tekrar_sikligi}`:''} onClose={()=>setSelectedProgram(null)}>{selectedProgram&&<div className="action-list"><button onClick={()=>{setProgramForm(selectedProgram);setSelectedProgram(null)}}><span className="action-round blue"><Clock3/></span><span><b>Kaydı Düzenle</b><small>Gün, saat, öğretmen, derslik ve ücret</small></span></button><button onClick={()=>{setMoveProgram(selectedProgram);setSelectedProgram(null)}}><span className="action-round blue"><MoveRight/></span><span><b>Bu Haftaya Özel Değiştir</b><small>Sabit programı bozmadan tek tarihi taşı</small></span></button><button onClick={()=>void showPreview(selectedProgram)}><span className="action-round teal"><Eye/></span><span><b>Gelecek Tarihler</b><small>Önümüzdeki dersleri önizle</small></span></button><button onClick={()=>void skipNext(selectedProgram)}><span className="action-round orange"><PauseCircle/></span><span><b>Sonraki Dersi Atla</b><small>Sabit program kalır, tek tarih atlanır</small></span></button><button onClick={()=>void toggleProgram(selectedProgram)}><span className="action-round red"><Repeat2/></span><span><b>{selectedProgram.program_durumu==='Pasif'?'Aktif Yap':'Pasif Yap'}</b><small>{selectedProgram.program_durumu==='Pasif'?'Programı tekrar kullan':'Yeni üretimi durdur; planlı dersleri koru'}</small></span></button></div>}</Sheet>
    <Sheet open={!!moveProgram} title="Bu Haftaya Özel Değiştir" subtitle={moveProgram?`${studentName(data,moveProgram.ogrenci_id)} · sabit program değişmez`:''} onClose={()=>setMoveProgram(null)}>{moveProgram&&<ProgramMoveForm program={moveProgram} onDone={()=>setMoveProgram(null)} onCancel={()=>setMoveProgram(null)}/>}</Sheet>
    <Sheet open={!!preview} title="Gelecek Tarihler" subtitle={selectedProgram?`${studentName(data,selectedProgram.ogrenci_id)} · ${selectedProgram.tekrar_sikligi}`:''} onClose={()=>setPreview(null)}>{preview&&<div className="preview-list">{preview.map((x:any,i:number)=><div className="detail-row" key={i}><span>{fullDate(x.tarih)}</span><b>{String(x.saat||selectedProgram?.baslangic_saati||'').slice(0,5)}</b></div>)}</div>}</Sheet>
  </div>
}
