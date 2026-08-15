import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function Sheet({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const actionHostRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const subtitleId = useId()
  const [hasGeneratedFooter, setHasGeneratedFooter] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, title])

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0)

      if (!focusable.length) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [open])

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
    <section ref={panelRef} className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined} tabIndex={-1}>
      <header className="sheet-header">
        <div><h2 id={titleId}>{title}</h2>{subtitle && <p id={subtitleId}>{subtitle}</p>}</div>
        <button ref={closeButtonRef} className="icon-btn" type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button>
      </header>
      <div ref={bodyRef} className="sheet-body">{children}</div>
      <footer className={`sheet-footer${footerVisible ? ' has-content' : ''}`} aria-hidden={!footerVisible}>
        {footer && <div className="sheet-explicit-footer">{footer}</div>}
        <div ref={actionHostRef} className="sheet-action-host"/>
      </footer>
    </section>
  </div>
}
