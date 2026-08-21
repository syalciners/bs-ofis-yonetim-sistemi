import { CalendarDays, Grid2X2, Home, Users, WalletCards } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { t } from '../lib/productProfile'

const items = [
  { to: '/', label: 'Özet', Icon: Home },
  { to: '/takvim', label: 'Program', Icon: CalendarDays },
  { to: '/ogrenciler', label: t.students, Icon: Users },
  { to: '/finans', label: 'Finans', Icon: WalletCards },
  { to: '/menu', label: 'Menü', Icon: Grid2X2 },
]

export function BottomNav() {
  const location=useLocation()
  return <nav className="bottom-nav">{items.map(({to,label,Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => (isActive||(to==='/menu'&&location.pathname.startsWith('/portal-onizleme'))) ? 'active' : ''}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
}
