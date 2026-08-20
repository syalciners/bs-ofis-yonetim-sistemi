import { Bell, BookOpenCheck, ClipboardCheck, FileBarChart, GraduationCap, HeartPulse, Repeat2, Settings, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { ManagerModeNav } from '../components/ManagerModeNav'

export function MorePage(){
  const nav=useNavigate()
  const {profile}=useAppData()
  const isManager=profile?.rol==='Yönetici'
  const items=[
    {to:'/ogretmenler',Icon:GraduationCap,title:'Öğretmenler',text:'Hakediş, program ve iletişim'},
    {to:'/sabit-program',Icon:Repeat2,title:'Sabit Ders Programı',text:'Tekrar eden ders şablonları'},
    {to:'/odevler',Icon:BookOpenCheck,title:'Ödevler',text:'Bekleyen ve tamamlanan ödevler'},
    {to:'/kocluk',Icon:Target,title:'Koçluk',text:'Öğrenci hedefi, plan ve görüşme takibi'},
    {to:'/deneme-merkezi',Icon:ClipboardCheck,title:'Deneme Merkezi',text:'Net değişimi, ders analizi ve koçluk sinyalleri'},
    ...(isManager?[{to:'/bildirimler',Icon:Bell,title:'Bildirimler',text:'Satış, operasyon ve sistem uyarıları'}]:[]),
    {to:'/raporlar',Icon:FileBarChart,title:'Raporlar',text:'Öğrenci, öğretmen ve kurum özetleri'},
    {to:'/ayarlar',Icon:Settings,title:'Ayarlar',text:'Kullanıcı ve uygulama tercihleri'},
    {to:'/sistem',Icon:HeartPulse,title:'Sistem Durumu',text:'Veri ve program sağlık kontrolü'},
  ]
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">DİĞER İŞLEMLER</span><h1>Menü</h1></div></section>
    {isManager&&<ManagerModeNav active="yonetim"/>}
    <section className="menu-grid">{items.map(x=><button key={x.to} onClick={()=>nav(x.to)}><span className="menu-icon"><x.Icon/></span><span><strong>{x.title}</strong><small>{x.text}</small></span></button>)}</section>
  </div>
}
