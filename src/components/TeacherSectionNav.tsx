import { GraduationCap, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../lib/productProfile'

export function TeacherSectionNav({ active }: { active: 'teachers' | 'payments' }) {
  const nav = useNavigate()
  return <nav className="teacher-section-nav" aria-label={`${t.teacher} yönetimi`}>
    <button className={active==='teachers'?'active':''} onClick={()=>nav('/ogretmenler')}><GraduationCap size={16}/><span>{t.teachers}</span></button>
    <button className={active==='payments'?'active':''} onClick={()=>nav('/ogretmen-odemeleri')}><WalletCards size={16}/><span>Ödemeler</span></button>
  </nav>
}
