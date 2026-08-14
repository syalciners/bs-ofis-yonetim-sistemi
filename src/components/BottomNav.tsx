import { CalendarDays, Grid2X2, Home, Users, WalletCards } from 'lucide-react'
import { NavLink } from 'react-router-dom'
const items = [
  { to: '/', label: 'Özet', Icon: Home },
  { to: '/takvim', label: 'Takvim', Icon: CalendarDays },
  { to: '/ogrenciler', label: 'Öğrenciler', Icon: Users },
  { to: '/finans', label: 'Finans', Icon: WalletCards },
  { to: '/menu', label: 'Menü', Icon: Grid2X2 },
]
export function BottomNav() {
  return <nav className="bottom-nav">{items.map(({to,label,Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => isActive ? 'active' : ''}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
}
