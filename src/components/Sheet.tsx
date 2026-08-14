import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Sheet({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, title])

  if (!open) return null
  return <div className="sheet-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sheet-header">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button>
      </header>
      <div ref={bodyRef} className="sheet-body">{children}</div>
      {footer && <footer className="sheet-footer">{footer}</footer>}
    </section>
  </div>
}
