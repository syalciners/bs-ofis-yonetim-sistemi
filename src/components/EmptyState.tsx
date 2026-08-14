import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={21}/></div><strong>{title}</strong><p>{text}</p>{action}</div>
}
