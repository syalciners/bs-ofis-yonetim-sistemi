import { BookOpenCheck, FileBarChart, GraduationCap, HeartPulse, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function MorePage(){const nav=useNavigate();const items=[
  {to:'/ogretmenler',Icon:GraduationCap,title:'Öğretmenler',text:'Hakediş, program ve iletişim'},
  {to:'/odevler',Icon:BookOpenCheck,title:'Ödevler',text:'Bekleyen ve tamamlanan ödevler'},
  {to:'/raporlar',Icon:FileBarChart,title:'Raporlar',text:'Öğrenci, öğretmen ve kurum özetleri'},
  {to:'/ayarlar',Icon:Settings,title:'Ayarlar',text:'Kullanıcı ve uygulama tercihleri'},
  {to:'/sistem',Icon:HeartPulse,title:'Sistem Durumu',text:'Veri ve program sağlık kontrolü'},
];return <div className="page-stack"><section className="page-title-row"><div><span className="eyebrow">DİĞER İŞLEMLER</span><h1>Menü</h1><p>Günlük olmayan yönetim alanları.</p></div></section><section className="menu-grid">{items.map(x=><button key={x.to} onClick={()=>nav(x.to)}><span className="menu-icon"><x.Icon/></span><span><strong>{x.title}</strong><small>{x.text}</small></span></button>)}</section></div>}
