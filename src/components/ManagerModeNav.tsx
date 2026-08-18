import { GraduationCap, LayoutDashboard, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export type ManagerMode = 'yonetim' | 'ogretmen' | 'ogrenci'

export function ManagerModeNav({ active }: { active: ManagerMode }) {
  const nav = useNavigate()
  const items = [
    { key: 'yonetim' as const, label: 'Yönetim', Icon: LayoutDashboard, to: '/menu' },
    { key: 'ogretmen' as const, label: 'Öğretmen Portalı', Icon: GraduationCap, to: '/portal-onizleme/ogretmen' },
    { key: 'ogrenci' as const, label: 'Öğrenci Portalı', Icon: UsersRound, to: '/portal-onizleme/ogrenci' },
  ]

  return <nav className="manager-mode-nav" aria-label="Yönetici görünüm seçimi">
    {items.map(({ key, label, Icon, to }) => <button key={key} type="button" className={active === key ? 'active' : ''} onClick={() => nav(to)}><Icon size={16}/><span>{label}</span></button>)}
  </nav>
}
