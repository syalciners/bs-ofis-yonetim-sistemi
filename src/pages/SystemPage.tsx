import { CheckCircle2, Database, HeartPulse, RefreshCw, Server, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { healthCheck } from '../services/officeService'
import { useToast } from '../components/Toast'

const systemChecks=[
  ['hatali_program_brans','Program / branş uyumsuzluğu'],
  ['gecersiz_tekrar_program','Geçersiz tekrar kuralı'],
  ['hatali_ders_toplam','Hatalı ders tutarı'],
  ['mukerrer_program_ders','Mükerrer program dersi'],
  ['tahsilat_kasa_eksik','Tahsilat / kasa eşleşme sorunu'],
  ['ogretmen_odeme_kasa_eksik','Öğretmen ödemesi / kasa sorunu'],
  ['gider_kasa_eksik','Gider / kasa eşleşme sorunu'],
  ['yetim_ders','Bağlantısı eksik ders kaydı'],
] as const
const programChecks=[
  ['gecersiz_tekrar','Geçersiz tekrar kuralı'],
  ['brans_hata','Öğretmen / branş uyumsuzluğu'],
  ['istisna_hata','Geçersiz program istisnası'],
  ['tasima_hata','Eksik taşınmış ders bağlantısı'],
  ['gelecek_cakisma_programi','Gelecekte çakışan program'],
] as const

export function SystemPage(){
  const{data,refresh,refreshing}=useAppData();const{toast}=useToast();const[result,setResult]=useState<any|null>(null);const[busy,setBusy]=useState(false);if(!data)return null
  const run=async()=>{setBusy(true);try{const r=await healthCheck();setResult(r);const ok=Boolean(r?.system?.basarili)&&Boolean(r?.program?.basarili);toast(ok?'Sistem sağlıklı.':'Sağlık kontrolünde incelenmesi gereken kayıtlar bulundu.',ok?'success':'error')}catch(e:any){toast(e.message||String(e),'error')}finally{setBusy(false)}}
  const system=result?.system||null,program=result?.program||null,allOk=Boolean(system?.basarili)&&Boolean(program?.basarili)
  const problems=[...(system?systemChecks.filter(([key])=>Number(system[key]||0)>0).map(([key,label])=>({label,count:Number(system[key]||0)})):[]),...(program?programChecks.filter(([key])=>Number(program[key]||0)>0).map(([key,label])=>({label,count:Number(program[key]||0)})):[])]
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">SİSTEM</span><h1>Sistem Durumu</h1></div><button className="secondary-btn" onClick={()=>void refresh()}><RefreshCw size={17} className={refreshing?'spin':''}/>Veriyi Yenile</button></section>
    <section className="kpi-grid four compact-kpis"><div className="kpi-card teal"><span>Öğrenci</span><strong>{data.ogrenciler.length}</strong><small>toplam kayıt</small></div><div className="kpi-card blue"><span>Öğretmen</span><strong>{data.ogretmenler.length}</strong><small>toplam kayıt</small></div><div className="kpi-card orange"><span>Sabit Program</span><strong>{data.sabitProgramlar.length}</strong><small>program şablonu</small></div><div className="kpi-card red"><span>Ders</span><strong>{data.dersler.length}</strong><small>tarihsel kayıt</small></div></section>
    <button className="primary-btn full health-run" disabled={busy} onClick={()=>void run()}><HeartPulse size={18}/>{busy?'Kontrol ediliyor…':'Sağlık Kontrolünü Çalıştır'}</button>

    {result&&<>
      {allOk?<div className="all-good"><CheckCircle2/><span><b>Sistem sağlıklı.</b><small>Veri bütünlüğü, finans bağlantıları ve sabit program kontrollerinde sorun bulunmadı.</small></span></div>:<div className="attention-grid"><div className="all-good"><TriangleAlert/><span><b>{problems.reduce((s,x)=>s+x.count,0)} kontrol uyarısı bulundu.</b><small>Aşağıdaki kayıt gruplarını inceleyin.</small></span></div></div>}
      <section className="mini-grid two"><div><span>Genel Sistem</span><b className={system?.basarili?'success-text':'danger-text'}>{system?.basarili?'Sağlıklı':`${Number(system?.toplam_hata||0)} sorun`}</b></div><div><span>Ders Programı</span><b className={program?.basarili?'success-text':'danger-text'}>{program?.basarili?'Sağlıklı':`${Number(program?.toplam_hata||0)} sorun`}</b></div></section>
      {problems.length>0&&<section className="settings-list">{problems.map((x,i)=><div key={`${x.label}-${i}`}><TriangleAlert/><span><b>{x.label}</b><small>{x.count} kayıt kontrol edilmeli</small></span></div>)}</section>}
    </>}

    <section className="settings-list"><div><Database/><span><b>Veri Güvenliği</b><small>Bilgiler bulutta güvenli bağlantıyla saklanır.</small></span></div><div><Server/><span><b>Kayıt Güvenliği</b><small>Tahsilat, gider, ödeme ve ders işlemleri kontrollü olarak birlikte kaydedilir.</small></span></div><div><TriangleAlert/><span><b>Entegrasyon Güvenliği</b><small>Gizli anahtarlar ve servis bilgileri uygulama ekranına aktarılmaz.</small></span></div></section>
  </div>
}
