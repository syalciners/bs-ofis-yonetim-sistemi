import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function Sheet({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const actionHostRef = useRef<HTMLDivElement>(null)
  const [hasGeneratedFooter, setHasGeneratedFooter] = useState(false)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, title])

  useEffect(() => {
    if (!open) return
    const body = bodyRef.current
    const host = actionHostRef.current
    if (!body || !host) return

    let sourceActions: HTMLElement | null = null
    let scheduled = false

    const restoreSource = () => {
      if (sourceActions) sourceActions.style.removeProperty('display')
    }

    const syncFooterActions = () => {
      scheduled = false
      const nextSource = body.querySelector<HTMLElement>('.form-actions')

      if (sourceActions && sourceActions !== nextSource) {
        sourceActions.style.removeProperty('display')
      }
      sourceActions = nextSource
      host.replaceChildren()

      if (!sourceActions) {
        setHasGeneratedFooter(false)
        return
      }

      if (sourceActions.style.getPropertyValue('display') !== 'none' || sourceActions.style.getPropertyPriority('display') !== 'important') {
        sourceActions.style.setProperty('display', 'none', 'important')
      }

      const clone = sourceActions.cloneNode(true) as HTMLElement
      clone.style.removeProperty('display')
      clone.classList.add('sheet-footer-actions')

      const sourceButtons = Array.from(sourceActions.querySelectorAll<HTMLButtonElement>('button'))
      const cloneButtons = Array.from(clone.querySelectorAll<HTMLButtonElement>('button'))

      cloneButtons.forEach((button, index) => {
        const sourceButton = sourceButtons[index]
        if (!sourceButton) return
        button.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          if (sourceButton.disabled) return

          const type = (sourceButton.getAttribute('type') || 'submit').toLowerCase()
          if (type === 'submit') {
            const form = sourceButton.closest('form')
            if (form) form.requestSubmit(sourceButton)
            else sourceButton.click()
          } else {
            sourceButton.click()
          }
        })
      })

      host.appendChild(clone)
      setHasGeneratedFooter(true)
    }

    const scheduleSync = () => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(syncFooterActions)
    }

    syncFooterActions()
    const observer = new MutationObserver(scheduleSync)
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'class', 'style', 'aria-disabled'],
    })

    return () => {
      observer.disconnect()
      restoreSource()
      host.replaceChildren()
      setHasGeneratedFooter(false)
    }
  }, [open, title])

  if (!open) return null
  const footerVisible = Boolean(footer || hasGeneratedFooter)

  return <div className="sheet-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sheet-header">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button>
      </header>
      <div ref={bodyRef} className="sheet-body">{children}</div>
      <footer className={`sheet-footer${footerVisible ? ' has-content' : ''}`} aria-hidden={!footerVisible}>
        {footer && <div className="sheet-explicit-footer">{footer}</div>}
        <div ref={actionHostRef} className="sheet-action-host"/>
      </footer>
    </section>
  </div>
}
