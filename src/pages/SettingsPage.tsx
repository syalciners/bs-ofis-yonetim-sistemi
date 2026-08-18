import {
  BookOpenCheck,
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
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { ProfileSettingsForm } from '../components/ProfileSettingsForm'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import type { KullaniciProfili, Ogretmen } from '../lib/types'
import { loadManagedUsers, updateManagedUser } from '../services/userManagementService'

type SettingsInfoKey='kurum'|'kullanicilar'|'egitim'|'finans'|'program'|'portal'

function UserManagementPanel({currentUserId,teachers,onUpdated}:{currentUserId:string;teachers:Ogretmen[];onUpdated:()=>Promise<void>}){
  const{toast}=useToast()
  const[users,setUsers]=useState<KullaniciProfili[]>([])
  const[draft,setDraft]=useState<KullaniciProfili|null>(null)
  const[loading,setLoading]=useState(true)
  const[busy,setBusy]=useState(false)

  const reload=async(selectedId?:string)=>{
    const next=await loadManagedUsers()
    setUsers(next)
    if(selectedId)setDraft(next.find(x=>x.auth_user_id===selectedId)||null)
    setLoading(false)
  }

  useEffect(()=>{void reload().catch((err:any)=>{setLoading(false);toast(err.message||String(err),'error')})},[])

  const teacherName=(teacherId?:string|null)=>teacherId?teachers.find(x=>x.ogretmen_id===teacherId)?.ad_soyad||teacherId:'Bağlantı yok'
  const isSelf=draft?.auth_user_id===currentUserId

  if(loading)return <div className="settings-users-loading">Kullanıcılar yükleniyor…</div>

  return <div className="settings-users-panel">
    <div className="settings-info-note settings-users-safety"><ShieldCheck size={17}/><span>Bu aşamada e-posta, rol ve öğretmen bağlantısı güvenlik nedeniyle salt okunurdur. Mevcut RLS yalnız Yönetici rolüne uygulama erişimi verdiği için rol değişikliği ayrıca yetki matrisi kurulduktan sonra açılacaktır.</span></div>

    <div className="settings-users-layout">
      <div className="settings-users-list" aria-label="Yönetim kullanıcıları">
        {users.map(item=><button key={item.auth_user_id} type="button" className={`settings-user-row${draft?.auth_user_id===item.auth_user_id?' selected':''}`} onClick={()=>setDraft({...item})}>
          <span className={`settings-user-status ${item.aktif?'active':'passive'}`} aria-hidden="true"/>
          <span className="settings-user-copy"><strong>{item.ad_soyad}</strong><small>{item.email}</small><em>{item.rol} · {item.aktif?'Aktif':'Pasif'}</em></span>
          <ChevronRight size={16}/>
        </button>)}
      </div>

      <div className="settings-user-editor">
        {!draft?<div className="settings-users-empty"><UsersRound/><strong>Düzenlemek için kullanıcı seçin</strong><span>Ad soyad, telefon ve hesap durumu güvenli olarak yönetilebilir.</span></div>:
        <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await updateManagedUser({auth_user_id:draft.auth_user_id,ad_soyad:draft.ad_soyad,telefon:draft.telefon||null,aktif:draft.aktif});await onUpdated();await reload(draft.auth_user_id);toast('Kullanıcı bilgileri güncellendi.')}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
          <label className="wide">Ad Soyad<input value={draft.ad_soyad} onChange={e=>setDraft({...draft,ad_soyad:e.target.value})} required/></label>
          <label className="wide">Telefon<input value={draft.telefon||''} onChange={e=>setDraft({...draft,telefon:e.target.value})} inputMode="tel"/></label>
          <label className="wide">Hesap Durumu<select value={draft.aktif?'Aktif':'Pasif'} onChange={e=>setDraft({...draft,aktif:e.target.value==='Aktif'})} disabled={isSelf}><option>Aktif</option><option>Pasif</option></select></label>
          {isSelf&&<div className="wide form-hint">Oturum açmış kendi hesabınızı bu ekrandan pasifleştiremezsiniz.</div>}

          <div className="wide settings-user-readonly"><span>E-posta</span><strong>{draft.email}</strong><small>Giriş e-postası normal profil alanı olarak değiştirilemez.</small></div>
          <div className="wide settings-user-readonly"><span>Rol</span><strong>{draft.rol}</strong><small>Rol değişikliği bu aşamada kapalıdır; önce yetki matrisi oluşturulacaktır.</small></div>
          <div className="wide settings-user-readonly"><span>Öğretmen Bağlantısı</span><strong>{teacherName(draft.ogretmen_id)}</strong><small>Öğretmen hesabı bağlantısı ayrı güvenli yönetim adımında açılacaktır.</small></div>

          <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setDraft(null)}>Kapat</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Değişiklikleri Kaydet'}</button></div>
        </form>}
      </div>
    </div>
  </div>
}

export function SettingsPage(){
  const{profile,user,signOut,data,refresh}=useAppData()
  const[editing,setEditing]=useState(false)
  const[info,setInfo]=useState<SettingsInfoKey|null>(null)
  const isManager=profile?.rol==='Yönetici'

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
    {key:'kurum' as const,Icon:Building2,title:'Kurum',text:'Kurum bilgileri, marka ve genel tanımlar',meta:'Kurum ayarları'},
    {key:'kullanicilar' as const,Icon:UsersRound,title:'Kullanıcılar ve Yetkiler',text:'Yönetim kullanıcıları ve hesap durumu',meta:'Güvenli kullanıcı yönetimi'},
    {key:'egitim' as const,Icon:MapPinned,title:'Branşlar ve Derslikler',text:'Eğitim alanları, ders yerleri ve kapasiteler',meta:summary?`${summary.branches} branş · ${summary.rooms} derslik`:'Tanımlar'},
    {key:'finans' as const,Icon:Landmark,title:'Finans Tanımları',text:'Kasa, banka ve gider sınıflandırmaları',meta:summary?`${summary.accounts} hesap · ${summary.categories} kategori`:'Tanımlar'},
    {key:'program' as const,Icon:CalendarClock,title:'Program Ayarları',text:'Kurum genelindeki program varsayılanları',meta:summary?`${summary.fixedPrograms} aktif sabit program`:'Program'},
    {key:'portal' as const,Icon:PlugZap,title:'Portal ve Entegrasyonlar',text:'Portal erişimleri ve dış servis bağlantıları',meta:'Portal · Zoom'},
  ]

  const infoContent:Record<SettingsInfoKey,{title:string;body:string;rows:Array<[string,string]>}>={
    kurum:{title:'Kurum',body:'Kurum kimliği ve genel bilgiler burada yönetilecek. Bu aşamada kurum için merkezi bir ayar kaydı henüz kullanılmıyor.',rows:[['Durum','Yönetim merkezi hazır'],['Sonraki adım','Kurum bilgileri için güvenli kayıt yapısı']]},
    kullanicilar:{title:'Kullanıcılar ve Yetkiler',body:'Yönetim kullanıcılarının profil bilgileri ve hesap durumu güvenli servis üzerinden yönetilir.',rows:[['Mevcut kullanıcı',profile?.ad_soyad||'—'],['Rol',profile?.rol||'—'],['Güvenlik','E-posta ve rol salt okunur']]},
    egitim:{title:'Branşlar ve Derslikler',body:'Mevcut branş ve derslik kayıtları uygulama verisinde hazır. Bir sonraki geliştirmede ekleme, düzenleme ve aktif/pasif yönetimi kontrollü olarak açılacak.',rows:[['Aktif branş',summary?String(summary.branches):'—'],['Aktif derslik',summary?String(summary.rooms):'—'],['Sonraki adım','Branş ve derslik yönetimi']]},
    finans:{title:'Finans Tanımları',body:'Günlük tahsilat ve gider işlemleri Finans ekranında kalacak. Burada yalnız işlem sırasında kullanılan kasa/banka hesapları ve gider kategorileri yönetilecek.',rows:[['Aktif hesap',summary?String(summary.accounts):'—'],['Aktif gider kategorisi',summary?String(summary.categories):'—'],['Sonraki adım','Finans tanımlarını yönetme']]},
    program:{title:'Program Ayarları',body:'Kişiye özel ücret, hakediş veya ders planları buraya taşınmayacak. Bu alan yalnız kurum genelindeki program varsayılanları için kullanılacak.',rows:[['Aktif sabit program',summary?String(summary.fixedPrograms):'—'],['Kapsam','Kurum genel ayarları'],['Sonraki adım','Varsayılan program değerleri']]},
    portal:{title:'Portal ve Entegrasyonlar',body:'Öğretmen ve öğrenci portalı ile dış servis bağlantıları burada merkezi olarak yönetilecek. Gizli servis anahtarları hiçbir zaman uygulama ekranında gösterilmeyecek.',rows:[['Portal önizleme','Yönetici Menüsünde'],['Entegrasyon','Gizli bilgiler korunur'],['Sonraki adım','Portal ve bağlantı ayarları']]},
  }

  const selectedInfo=info?infoContent[info]:null

  return <div className="page-stack settings-hub-page">
    <section className="page-title-row"><div><span className="eyebrow">AYARLAR</span><h1>Ayarlar</h1></div></section>

    {isManager&&<>
      <section className="settings-hub-intro">
        <div className="settings-hub-intro-icon"><ShieldCheck/></div>
        <div><strong>Yönetim Merkezi</strong><span>Kurumun nasıl çalışacağını belirleyen tanımları tek yerden yönetin.</span></div>
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
    </>}

    <section className="settings-hub-section account-settings-section">
      <div className="settings-hub-heading"><span>HESABIM</span><strong>Kişisel profil ve oturum</strong></div>
      <section className="settings-card settings-account-card">
        <div className="settings-avatar"><UserCircle2/></div>
        <div><strong>{profile?.ad_soyad||user?.user_metadata?.full_name||'Kullanıcı'}</strong><span>{profile?.rol||'Yetkili Kullanıcı'}</span></div>
        <button className="secondary-btn" onClick={()=>setEditing(true)}><Edit3 size={16}/>Profili Düzenle</button>
      </section>
      <section className="settings-list settings-account-list">
        <div><Mail/><span><b>E-posta</b><small>{profile?.email||user?.email}</small></span></div>
        <div><Phone/><span><b>Telefon</b><small>{profile?.telefon||'Telefon eklenmemiş'}</small></span></div>
        <div><ShieldCheck/><span><b>Yetki</b><small>{profile?.aktif?'Aktif kullanıcı':'Pasif kullanıcı'} · {profile?.rol}</small></span></div>
      </section>
      <button className="danger-btn full settings-signout" onClick={()=>void signOut()}><LogOut size={17}/>Çıkış Yap</button>
    </section>

    <Sheet open={editing} title="Profili Düzenle" subtitle="Kendi iletişim bilgileriniz" onClose={()=>setEditing(false)}><ProfileSettingsForm onDone={()=>setEditing(false)} onCancel={()=>setEditing(false)}/></Sheet>
    <Sheet open={Boolean(selectedInfo)} title={selectedInfo?.title||'Ayarlar'} subtitle={info==='kullanicilar'?'Yönetim kullanıcıları':'Yönetim ayarı'} onClose={()=>setInfo(null)}>{selectedInfo&&(info==='kullanicilar'?<UserManagementPanel currentUserId={user?.id||''} teachers={data?.ogretmenler||[]} onUpdated={refresh}/>:<div className="settings-info-sheet">
      <p>{selectedInfo.body}</p>
      <div className="settings-info-rows">{selectedInfo.rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="settings-info-note"><BookOpenCheck size={17}/><span>Bu ekranda henüz veri değiştirilmez; yalnız mevcut yapı ve sıradaki güvenli yönetim alanı gösterilir.</span></div>
    </div>)}</Sheet>
  </div>
}
