import { BookOpenCheck, FileBarChart, GraduationCap, HeartPulse, Repeat2, Settings, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { ManagerModeNav } from '../components/ManagerModeNav'
import { featureEnabled, t } from '../lib/productProfile'

export function MorePage(){
  const nav=useNavigate()
  const {profile}=useAppData()
  const isManager=profile?.rol==='Yönetici'
  const items=[
    {to:'/ogretmenler',Icon:GraduationCap,title:t.teachers,text:'Hakediş, program ve iletişim'},
    ...(featureEnabled('groups')?[{to:'/gruplar',Icon:Users,title:'Gruplar',text:'Grup dersleri, kontenjan ve katılımcılar'}]:[]),
    {to:'/sabit-program',Icon:Repeat2,title:'Sabit Ders Programı',text:'Tekrar eden ders şablonları'},
    ...(featureEnabled('assignments')?[{to:'/odevler',Icon:BookOpenCheck,title:'Ödevler',text:`${t.student} çalışma takibi`}]:[]),
    {to:'/raporlar',Icon:FileBarChart,title:'Raporlar',text:`${t.student}, ${t.teacherLower} ve kurum özetleri`},
    {to:'/ayarlar',Icon:Settings,title:'Ayarlar',text:'Kullanıcı ve uygulama tercihleri'},
    {to:'/sistem',Icon:HeartPulse,title:'Sistem Durumu',text:'Veri ve program sağlık kontrolü'},
  ]
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">DİĞER İŞLEMLER</span><h1>Menü</h1></div></section>
    {isManager&&<ManagerModeNav active="yonetim"/>}
    <section className="menu-grid">{items.map(x=><button key={x.to} onClick={()=>nav(x.to)}><span className="menu-icon"><x.Icon/></span><span><strong>{x.title}</strong><small>{x.text}</small></span></button>)}</section>
  </div>
}
