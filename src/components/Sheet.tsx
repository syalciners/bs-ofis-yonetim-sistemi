import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Sheet({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null
  return <div className="sheet-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sheet-header">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button>
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <footer className="sheet-footer">{footer}</footer>}
    </section>
  </div>
}
