import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }
const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    setItems(x => [...x, { id, message, type }])
    setTimeout(() => setItems(x => x.filter(t => t.id !== id)), 3000)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack">{items.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}</div></ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
