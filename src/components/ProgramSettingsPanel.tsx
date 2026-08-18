import { CalendarClock, Clock3, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { saveProgramSettings, SYSTEM_DERS_BIRIMI_DAKIKA, type KurumAyarlari } from '../services/institutionService'
import { useToast } from './Toast'

export function ProgramSettingsPanel({settings,onUpdated}:{settings:KurumAyarlari;onUpdated:()=>Promise<void>}){
  const{toast}=useToast()
  const[units,setUnits]=useState(Number(settings.varsayilan_ders_birimi||1))
  const[start,setStart]=useState(String(settings.takvim_baslangic_saati||'08:00').slice(0,5))
  const[end,setEnd]=useState(String(settings.takvim_bitis_saati||'21:00').slice(0,5))
  const[busy,setBusy]=useState(false)

  useEffect(()=>{
    setUnits(Number(settings.varsayilan_ders_birimi||1))
    setStart(String(settings.takvim_baslangic_saati||'08:00').slice(0,5))
    setEnd(String(settings.takvim_bitis_saati||'21:00').slice(0,5))
  },[settings])

  return <div className="settings-definitions-panel program-settings-panel">
    <div className="settings-info-note settings-definitions-safety"><ShieldCheck size={17}/><span>Bu ayarlar yalnız yeni manuel ders kayıtlarının varsayılanını ve Takvim görünümünü etkiler. Mevcut dersler, sabit programlar, ücretler ve hakedişler geriye dönük değiştirilmez.</span></div>

    <div className="settings-user-readonly"><span>Mevcut Ders Birimi Standardı</span><strong>1 ders = {SYSTEM_DERS_BIRIMI_DAKIKA} dakika</strong><small>Çakışma motoru ve mevcut ders kayıtları bu standardı kullanıyor. Sistem bütünlüğü için bu sürümde değiştirilemez.</small></div>

    <form className="form-grid" onSubmit={async e=>{e.preventDefault();if(start>=end){toast('Takvim bitiş saati başlangıç saatinden sonra olmalıdır.','error');return}setBusy(true);try{await saveProgramSettings({varsayilan_ders_birimi:units,takvim_baslangic_saati:start,takvim_bitis_saati:end});await onUpdated();toast('Program ayarları güncellendi.')}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
      <label className="wide">Yeni Manuel Derste Varsayılan Ders Birimi<select value={String(units)} onChange={e=>setUnits(Number(e.target.value))}><option value="1">1 ders</option><option value="2">2 ders</option></select><small>Yeni manuel ders formu bu değerle açılır. Öğrenciye bağlı sabit program varsa o programın ders birimi daha önceliklidir; mevcut kayıtlar değişmez.</small></label>
      <label>Takvim Başlangıcı<input type="time" step="1800" value={start} onChange={e=>setStart(e.target.value)} required/></label>
      <label>Takvim Bitişi<input type="time" step="1800" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
      <div className="wide settings-info-note"><Clock3 size={16}/><span>Takvim bu saat aralığını temel alır. Daha erken başlayan veya daha geç biten mevcut bir ders varsa görünüm o dersi gösterecek şekilde otomatik genişler.</span></div>
      <div className="wide form-actions"><div className="form-hint institution-save-hint"><CalendarClock size={15}/>Ayarlar kaydedildikten sonra yeni manuel ders formunda ve günlük Takvimde kullanılır.</div><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Program Ayarlarını Kaydet'}</button></div>
    </form>
  </div>
}
