import { useState } from 'react'
import type { SabitProgram } from '../lib/types'
import { formatClockInput, fullDate, todayISO, uid } from '../lib/format'
import { t } from '../lib/productProfile'
import { saveProgramManual } from '../services/manualProgramService'
import { suggestProgram, type ProgramConflictSuggestion, type ProgramSuggestion } from '../services/programSuggestionService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']

type SmartProgramFormProps={
  program?:SabitProgram
  defaultDay?:string
  defaultStartTime?:string
  defaultRoomId?:string
  onDone:()=>void
  onCancel:()=>void
}

export function SmartProgramForm({program,defaultDay,defaultStartTime,defaultRoomId,onDone,onCancel}:SmartProgramFormProps){
  const{data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const[teacher,setTeacher]=useState(program?.ogretmen_id||'');const[branch,setBranch]=useState(program?.brans_id||'')
  const[room,setRoom]=useState(program?.derslik_id||defaultRoomId||'');const[day,setDay]=useState(program?.haftanin_gunu||defaultDay||'Pazartesi');const[startTime,setStartTime]=useState((program?.baslangic_saati||defaultStartTime||'').slice(0,5))
  const[conflict,setConflict]=useState<ProgramConflictSuggestion|null>(null)
  if(!data)return null

  const branchIds=new Set(data.ogretmenBranslari.filter(x=>x.ogretmen_id===teacher&&x.aktif!==false).map(x=>x.brans_id))
  const branches=data.branslar.filter(x=>x.aktif!==false&&(!teacher||branchIds.has(x.brans_id)))
  const clearConflict=()=>setConflict(null)
  const applySuggestion=(s:ProgramSuggestion)=>{setRoom(s.derslik_id);setStartTime(formatClockInput(s.saat));setConflict(null)}
  const reasonText=conflict?[conflict.ogrenci_cakisma?`${t.student} bu saatte başka sabit derste.`:'',conflict.ogretmen_cakisma?`${t.teacher} bu saatte başka sabit derste.`:'',conflict.derslik_dolu?`Seçilen ${t.room.toLocaleLowerCase('tr-TR')} bu saatte dolu.`:''].filter(Boolean):[]
  const calendarDefault=Boolean(!program&&(defaultDay||defaultStartTime||defaultRoomId))

  return <form className="form-grid" onSubmit={async e=>{
    e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget)
    const p:SabitProgram={program_id:program?.program_id||uid('SP'),ogrenci_id:String(f.get('ogrenci_id')),ogretmen_id:teacher,brans_id:branch,derslik_id:room,haftanin_gunu:day,baslangic_saati:startTime,ders_sayisi:Number(f.get('ders_sayisi')),ogrenci_birim_ucreti:Number(f.get('ogrenci_birim_ucreti')),ogretmen_birim_hakedisi:Number(f.get('ogretmen_birim_hakedisi')),tekrar_sikligi:String(f.get('tekrar_sikligi')),baslangic_tarihi:String(f.get('baslangic_tarihi')||'')||null,bitis_tarihi:String(f.get('bitis_tarihi')||'')||null,program_durumu:String(f.get('program_durumu')),aciklama:String(f.get('aciklama')||'')||null}
    try{
      const c=await suggestProgram(p)
      if(!c.uygun){setConflict(c);toast('Program çakışıyor. Uygun alternatifleri aşağıda gösterdim.','error');return}
      if(program&&!window.confirm('Sabit program güncellensin mi?\n\nDeğişiklik sabit program şablonuna kaydedilir. Mevcut dersler otomatik değiştirilmez; ilgili haftada “Haftayı Hazırla” çalıştırıldığında henüz sonuçlanmamış derslere uygulanır.'))return
      await saveProgramManual(p)
      await refresh()
      toast(program?'Sabit program güncellendi. Mevcut dersler korunuyor; değişiklik Haftayı Hazırla ile ilgili haftaya uygulanacak.':'Sabit program eklendi. Dersler Haftayı Hazırla çalıştırıldığında oluşturulacak.')
      onDone()
    }catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}
  }}>
    {calendarDefault&&<div className="wide form-summary">Takvimden seçilen başlangıç: <b>{day} · {startTime||'Saat'}{room?` · ${data.derslikler.find(x=>x.derslik_id===room)?.mekan_adi||t.room}`:''}</b></div>}
    <label>{t.student}<select name="ogrenci_id" defaultValue={program?.ogrenci_id||''} onChange={clearConflict} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>{t.teacher}<select name="ogretmen_id" value={teacher} onChange={e=>{setTeacher(e.target.value);setBranch('');clearConflict()}} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>{t.branch}<select name="brans_id" value={branch} onChange={e=>{setBranch(e.target.value);clearConflict()}} required><option value="">Seçin</option>{branches.map(x=><option key={x.brans_id} value={x.brans_id}>{x.brans_adi}</option>)}</select></label>
    <label>{t.room}<select name="derslik_id" value={room} onChange={e=>{setRoom(e.target.value);clearConflict()}} required><option value="">Seçin</option>{data.derslikler.filter(x=>x.aktif!==false).map(x=><option key={x.derslik_id} value={x.derslik_id}>{x.mekan_adi}</option>)}</select></label>
    <label>Gün<select name="haftanin_gunu" value={day} onChange={e=>{setDay(e.target.value);clearConflict()}}>{days.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Saat<input name="baslangic_saati" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00" title="Saati 00:00–23:59 arasında girin." value={startTime} onChange={e=>{setStartTime(formatClockInput(e.target.value));clearConflict()}} required/></label>
    <label>Ders Birimi<select name="ders_sayisi" defaultValue={String(program?.ders_sayisi||1)} onChange={clearConflict}>{[1,2,3,4].map(x=><option key={x} value={x}>{x} ders</option>)}</select></label>
    <label>Tekrar<select name="tekrar_sikligi" defaultValue={program?.tekrar_sikligi||'Her Hafta'} onChange={clearConflict}><option>Her Hafta</option><option>2 Haftada Bir</option><option>Ayda Bir</option></select></label>
    <label>Başlangıç<input name="baslangic_tarihi" type="date" defaultValue={program?.baslangic_tarihi||todayISO()} onChange={clearConflict}/></label>
    <label>Bitiş<input name="bitis_tarihi" type="date" defaultValue={program?.bitis_tarihi||''} onChange={clearConflict}/></label>
    <label>{t.student} Birim Ücreti<input name="ogrenci_birim_ucreti" type="number" min="0" step="0.01" defaultValue={program?.ogrenci_birim_ucreti||''} required/></label>
    <label>{t.teacher} Birim Hakedişi<input name="ogretmen_birim_hakedisi" type="number" min="0" step="0.01" defaultValue={program?.ogretmen_birim_hakedisi||''} required/></label>
    <label>Durum<select name="program_durumu" defaultValue={program?.program_durumu||'Aktif'}><option>Aktif</option><option>Pasif</option></select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={program?.aciklama||''}/></label>

    {conflict&&<section className="wide smart-suggestion-panel">
      <div className="smart-suggestion-title"><b>Bu program bu şekilde kaydedilemez.</b>{conflict.ilk_cakisma_tarihi&&<span>İlk çakışma: {fullDate(conflict.ilk_cakisma_tarihi)}{conflict.ilk_cakisan_kayit?` · ${conflict.ilk_cakisan_kayit}`:''}</span>}</div>
      <div className="smart-reasons">{reasonText.map(x=><span key={x}>{x}</span>)}</div>
      {!!conflict.onerilen_derslikler?.length&&<div className="smart-options"><b>Aynı saatte uygun {t.room.toLocaleLowerCase('tr-TR')}</b><div>{conflict.onerilen_derslikler.map((s,i)=><button type="button" className="suggestion-btn" key={`${s.derslik_id}-${i}`} onClick={()=>applySuggestion(s)}>{s.saat} · {s.derslik}</button>)}</div></div>}
      {!!conflict.onerilen_saatler?.length&&<div className="smart-options"><b>Yakın uygun saatler</b><div>{conflict.onerilen_saatler.map((s,i)=><button type="button" className="suggestion-btn" key={`${s.saat}-${s.derslik_id}-${i}`} onClick={()=>applySuggestion(s)}>{s.saat} · {s.derslik}</button>)}</div></div>}
      {!conflict.onerilen_derslikler?.length&&!conflict.onerilen_saatler?.length&&<div className="form-hint">Yakın bir uygun seçenek bulunamadı. Gün veya {t.teacherLower} bilgisini değiştirmeyi deneyin.</div>}
    </section>}

    <div className="wide form-hint">Sabit program yalnız şablonu değiştirir. Mevcut Planlandı dersler otomatik taşınmaz; ilgili hafta başında Haftayı Hazırla çalıştırıldığında eksik dersler oluşturulur ve değişmiş gün/saat/{t.room.toLocaleLowerCase('tr-TR')} bilgileri güvenli biçimde uygulanır. Yapıldı, İptal ve tek seferlik değişiklikler korunur.</div>
    <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy?'Kontrol ediliyor…':program?'Programı Güncelle':'Programı Kaydet'}</button></div>
  </form>
}
