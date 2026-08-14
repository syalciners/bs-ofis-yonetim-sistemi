import { GraduationCap, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function TeacherSectionNav({ active }: { active: 'teachers' | 'payments' }) {
  const nav = useNavigate()
  return <nav className="teacher-section-nav" aria-label="Öğretmen yönetimi">
    <button className={active==='teachers'?'active':''} onClick={()=>nav('/ogretmenler')}><GraduationCap size={16}/><span>Öğretmenler</span></button>
    <button className={active==='payments'?'active':''} onClick={()=>nav('/ogretmen-odemeleri')}><WalletCards size={16}/><span>Ödemeler</span></button>
  </nav>
}
