import { Bell, Check, Inbox, LoaderCircle, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

type PortalNotification = {
  bildirim_id: string
  kategori: string
  baslik: string
  icerik: string
  oncelik: string
  kaynak: string
  olusturulma_zamani: string
  okundu: boolean
  okunma_zamani?: string | null
}

const tarihSaat = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function PortalNotifications() {
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PortalNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('bildirimlerim_v1', { p_limit: 60 })
      if (rpcError) throw rpcError
      setItems(Array.isArray(data) ? data as PortalNotification[] : [])
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Bildirimler alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let live = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setActive(Boolean(data.session?.user))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!live) return
      const signedIn = Boolean(session?.user)
      setActive(signedIn)
      if (!signedIn) { setItems([]); setOpen(false) }
    })
    return () => { live = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!active) return
    let live = true
    const run = () => { if (live) void load() }
    const initial = window.setTimeout(run, 0)
    const interval = window.setInterval(run, 60000)
    return () => {
      live = false
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [active])

  const unread = useMemo(() => items.filter(item => !item.okundu).length, [items])

  const toggleRead = async (item: PortalNotification) => {
    if (workingId) return
    setWorkingId(item.bildirim_id)
    try {
      const next = !item.okundu
      const { error: rpcError } = await supabase.rpc('bildirim_okundu_v1', {
        p_bildirim_id: item.bildirim_id,
        p_okundu: next,
      })
      if (rpcError) throw rpcError
      setItems(current => current.map(row => row.bildirim_id === item.bildirim_id
        ? { ...row, okundu: next, okunma_zamani: next ? new Date().toISOString() : null }
        : row))
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Bildirim durumu güncellenemedi.')
    } finally {
      setWorkingId(null)
    }
  }

  if (!active) return null

  return <>
    <button
      type="button"
      className={`portal-notification-bell ${open ? 'active' : ''}`}
      aria-label={unread ? `${unread} okunmamış bildirim` : 'Bildirimler'}
      onClick={() => { setOpen(value => !value); if (!open) void load() }}
    >
      <Bell />
      {unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
    </button>

    {open && <>
      <button className="portal-notification-backdrop" aria-label="Bildirimleri kapat" onClick={() => setOpen(false)} />
      <aside className="portal-notification-panel" aria-label="Bildirimler">
        <header>
          <div><span>BİLDİRİMLER</span><h2>Size özel bildirimler</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Kapat"><X /></button>
        </header>

        {error && <div className="portal-notification-error">{error}</div>}
        {loading && items.length === 0 ? <div className="portal-notification-empty"><LoaderCircle className="spin"/><b>Bildirimler yükleniyor…</b></div>
          : items.length === 0 ? <div className="portal-notification-empty"><Inbox/><b>Yeni bildiriminiz yok.</b><span>Size ait bildirimler burada görünecek.</span></div>
          : <div className="portal-notification-list">{items.map(item => <article key={item.bildirim_id} className={item.okundu ? 'is-read' : 'is-unread'}>
            <div className="portal-notification-card-head"><span>{item.kategori}</span><time>{tarihSaat.format(new Date(item.olusturulma_zamani))}</time></div>
            <h3>{item.baslik}</h3>
            <p>{item.icerik}</p>
            <footer><small>{item.kaynak}</small><button type="button" disabled={workingId === item.bildirim_id} onClick={() => void toggleRead(item)}>{workingId === item.bildirim_id ? <LoaderCircle className="spin"/> : item.okundu ? <Inbox/> : <Check/>}{item.okundu ? 'Okunmadı yap' : 'Okundu yap'}</button></footer>
          </article>)}</div>}
      </aside>
    </>}
  </>
}
