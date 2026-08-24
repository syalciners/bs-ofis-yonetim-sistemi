import {
  Building2,
  CalendarClock,
  ChevronRight,
  Edit3,
  Landmark,
  LogOut,
  Mail,
  MapPinned,
  Phone,
  PlugZap,
  ShieldCheck,
  UserCircle2,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { APP_MODE } from '../lib/supabase'
import { EducationDefinitionsPanel } from '../components/EducationDefinitionsPanel'
import { FinancialDefinitionsPanel } from '../components/FinancialDefinitionsPanel'
import { ProfileSettingsForm } from '../components/ProfileSettingsForm'
import { Sheet } from '../components/Sheet'

type SettingsInfoKey='kurum'|'kullanicilar'|'egitim'|'finans'|'program'|'portal'

export function SettingsPage(){
  const{profile,signOut,data,refresh}=useAppData()
  const isDemo=APP_MODE==='demo'
  const[editing,setEditing]=useState(false)
  const[info,setInfo]=useState<SettingsInfoKey|null>(null)

  const summary=useMemo(()=>{
    if(!data)return null
    return{
      branches:data.branslar.filter(x=>x.aktif!==false).length,
      rooms:data.derslikler.filter(x=>x.aktif!==false).length,
      accounts:data.kasaHesaplari.filter(x=>x.aktif!==false).length,
      categories:data.giderKategorileri.filter(x=>x.aktif!==false).length,
      fixedPrograms:data.sabitProgramlar.filter(x=>x.aktif!==false&&x.program_durumu!=='Pasif').length,
    }
  },[data])

  const managerItems=[
    {key:'kurum' as const,Icon:Building2,title:'Kurum',text:'Kurum bilgileri, marka ve logo',meta:'Demo ortamı · Salt okunur'},
    {key:'kullanicilar' as const,Icon:UsersRound,title:'Kullanıcılar ve Yetkiler',text:'Yönetim kullanıcıları ve hesap rolleri',meta:'Demo ortamı · Salt okunur'},
    {key:'egitim' as const,Icon:MapPinned,title:'Branşlar ve Derslikler',text:'Eğitim alanları, ders yerleri ve kapasiteler',meta:summary?`${summary.branches} branş · ${summary.rooms} derslik`:'Tanımlar'},
    {key:'finans' as const,Icon:Landmark,title:'Finans Tanımları',text:'Kasa, banka ve gider sınıflandırmaları',meta:summary?`${summary.accounts} hesap · ${summary.categories} kategori`:'Tanımlar'},
    {key:'program' as const,Icon:CalendarClock,title:'Program Ayarları',text:'Kurum genelindeki program varsayılanları',meta:summary?`${summary.fixedPrograms} aktif sabit program`:'Program'},
    {key:'portal' as const,Icon:PlugZap,title:'Portal ve Entegrasyonlar',text:'Portal erişimleri ve dış servis bağlantıları',meta:'Demo ortamı · Salt okunur'},
  ]

  const infoContent:Record<Exclude<SettingsInfoKey,'egitim'|'finans'>,{title:string;body:string;rows:Array<[string,string]>}>={
    kurum:{title:'Kurum',body:'Gerçek uygulamada kurum adı, marka ve logo yönetici tarafından değiştirilebilir. Satış demosunda ortak demo ortamını korumak için bu alanlar salt okunurdur.',rows:[['Kurum','BS Eğitim Demo'],['Marka','BS Eğitim Yönetimi'],['Demo güvenliği','Global kurum ayarı değiştirilemez']]},
    kullanicilar:{title:'Kullanıcılar ve Yetkiler',body:'Gerçek uygulamada yönetim kullanıcıları ve hesap durumları güvenli servis üzerinden yönetilir. Anonim satış demosunda yeni gerçek kullanıcı veya rol oluşturulmaz.',rows:[['Mevcut oturum',profile?.ad_soyad||'Demo Yönetici'],['Rol','Yönetici'],['Demo güvenliği','Kullanıcı ve rol değişikliği kapalı']]},
    program:{title:'Program Ayarları',body:'Demo takvimi ana uygulamadaki varsayılan çalışma aralığını kullanır. Kişiye özel ücret, hakediş ve ders planları bu ayar ekranından değiştirilmez.',rows:[['Takvim başlangıcı','08:00'],['Takvim bitişi','21:00'],['Aktif sabit program',summary?String(summary.fixedPrograms):'—']]},
    portal:{title:'Portal ve Entegrasyonlar',body:'Gerçek üründe öğrenci/öğretmen portalı ve dış servis bağlantıları merkezi olarak yönetilir. Gizli servis anahtarları hiçbir zaman uygulama ekranında gösterilmez; satış demosunda entegrasyon ayarları salt okunurdur.',rows:[['Portal önizleme','Menüden görüntülenebilir'],['Gizli anahtarlar','Gösterilmez'],['Demo güvenliği','Harici bağlantı ayarı değiştirilemez']]},
  }

  const selectedInfo=info&&info!=='egitim'&&info!=='finans'?infoContent[info]:null
  const sheetTitle=info==='egitim'?'Branşlar ve Derslikler':info==='finans'?'Finans Tanımları':selectedInfo?.title||'Ayarlar'
  const sheetSubtitle=info==='egitim'?'Demo oturumuna özel eğitim tanımları':info==='finans'?'Demo oturumuna özel finans tanımları':'Satış demosu'

  return <div className="page-stack settings-hub-page">
    <section className="page-title-row"><div><span className="eyebrow">AYARLAR</span><h1>Ayarlar</h1></div></section>

    <section className="settings-hub-intro">
      <div className="settings-hub-intro-icon"><ShieldCheck/></div>
      <div><strong>Yönetim Merkezi</strong><span>Gerçek üründeki merkezi ayar yapısını inceleyin. Demo içinde değiştirilebilir tanımlar yalnız bu oturuma aittir.</span></div>
    </section>

    <section className="settings-hub-section">
      <div className="settings-hub-heading"><span>YÖNETİM AYARLARI</span><strong>Kurum ve sistem tanımları</strong></div>
      <div className="settings-hub-grid">
        {managerItems.map(({key,Icon,title,text,meta})=><button key={key} type="button" className="settings-hub-card" onClick={()=>setInfo(key)}>
          <span className="settings-hub-card-icon"><Icon/></span>
          <span className="settings-hub-card-copy"><strong>{title}</strong><small>{text}</small><em>{meta}</em></span>
          <ChevronRight size={18}/>
        </button>)}
      </div>
    </section>

    <section className="settings-hub-section account-settings-section">
      <div className="settings-hub-heading"><span>DEMO OTURUMU</span><strong>Oturum bilgileri</strong></div>
      <section className="settings-card settings-account-card">
        <div className="settings-avatar"><UserCircle2/></div>
        <div><strong>{profile?.ad_soyad||'Demo Yönetici'}</strong><span>{profile?.rol||'Yönetici'}</span></div>
        {!isDemo&&<button className="secondary-btn" onClick={()=>setEditing(true)}><Edit3 size={16}/>Profili Düzenle</button>}
      </section>
      <section className="settings-list settings-account-list">
        <div><Mail/><span><b>E-posta</b><small>{profile?.email||'demo@bsegitim.local'}</small></span></div>
        <div><Phone/><span><b>Telefon</b><small>{profile?.telefon||'Telefon eklenmemiş'}</small></span></div>
        <div><ShieldCheck/><span><b>Yetki</b><small>Oturuma özel · {profile?.rol||'Yönetici'}</small></span></div>
      </section>
      <button className="danger-btn full settings-signout" onClick={()=>void signOut()}><LogOut size={17}/>Demo Oturumundan Çık</button>
    </section>

    <Sheet open={!isDemo&&editing} title="Profili Düzenle" subtitle="Profil bilgileri" onClose={()=>setEditing(false)}><ProfileSettingsForm onDone={()=>setEditing(false)} onCancel={()=>setEditing(false)}/></Sheet>
    <Sheet open={Boolean(info)} title={sheetTitle} subtitle={sheetSubtitle} onClose={()=>setInfo(null)}>
      {info==='egitim'&&<EducationDefinitionsPanel branches={data?.branslar||[]} rooms={data?.derslikler||[]} onUpdated={refresh}/>} 
      {info==='finans'&&<FinancialDefinitionsPanel accounts={data?.kasaHesaplari||[]} categories={data?.giderKategorileri||[]} movements={data?.kasaHareketleri||[]} onUpdated={refresh}/>} 
      {selectedInfo&&<div className="settings-info-sheet">
        <p>{selectedInfo.body}</p>
        <div className="settings-info-rows">{selectedInfo.rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="settings-info-note"><ShieldCheck size={17}/><span>Satış demosundaki değişiklikler yalnız anonim demo oturumunda tutulur ve canlı BS Eğitim verilerini etkilemez.</span></div>
      </div>}
    </Sheet>
  </div>
}