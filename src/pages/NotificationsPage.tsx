import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, ChevronRight, CircleAlert, Inbox, LoaderCircle, MailOpen, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { loadNotifications, setNotificationRead, type Bildirim } from '../services/notificationService'

const tarihSaat = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const metaAlanlari: Array<[string, string]> = [
  ['kurum_adi', 'Kurum'],
  ['ad_soyad', 'Yetkili'],
  ['yetkili', 'Yetkili'],
  ['telefon', 'Telefon'],
  ['email', 'E-posta'],
  ['ogrenci_sayisi', 'Öğrenci'],
  ['ogretmen_sayisi', 'Öğretmen'],
  ['not', 'Not'],
]

function bildirimMeta(bildirim: Bildirim) {
  if (!bildirim.meta) return []
  return metaAlanlari.flatMap(([anahtar, etiket]) => {
    const deger = bildirim.meta?.[anahtar]
    if (deger === null || deger === undefined || deger === '') return []
    if (!['string', 'number', 'boolean'].includes(typeof deger)) return []
    return [{ anahtar, etiket, deger: String(deger) }]
  })
}

export function NotificationsPage() {
  const nav = useNavigate()
  const { refreshNotifications } = useAppData()
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [filtre, setFiltre] = useState('Tümü')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const next = await loadNotifications(100)
      setBildirimler(next)
      setError(null)
      await refreshNotifications()
    } catch (e: any) {
      setError(e?.message || 'Bildirimler alınamadı.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const okunmamis = useMemo(() => bildirimler.filter(x => !x.okundu).length, [bildirimler])
  const kategoriler = useMemo(() => Array.from(new Set(bildirimler.map(x => x.kategori).filter(Boolean))), [bildirimler])
  const gorunenler = useMemo(() => {
    if (filtre === 'Tümü') return bildirimler
    if (filtre === 'Okunmamış') return bildirimler.filter(x => !x.okundu)
    return bildirimler.filter(x => x.kategori === filtre)
  }, [bildirimler, filtre])

  const toggleRead = async (bildirim: Bildirim) => {
    setWorkingId(bildirim.bildirim_id)
    try {
      const yeniOkundu = !bildirim.okundu
      await setNotificationRead(bildirim.bildirim_id, yeniOkundu)
      setBildirimler(prev => prev.map(x => x.bildirim_id === bildirim.bildirim_id
        ? { ...x, okundu: yeniOkundu, okunma_zamani: yeniOkundu ? new Date().toISOString() : null }
        : x))
      await refreshNotifications()
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Bildirim durumu güncellenemedi.')
    } finally {
      setWorkingId(null)
    }
  }

  const openAction = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.open(path, '_blank', 'noopener,noreferrer')
      return
    }
    nav(path)
  }

  return <div className="page-stack notifications-page">
    <section className="page-title-row notifications-title-row">
      <div>
        <span className="eyebrow">İLETİŞİM MERKEZİ</span>
        <h1>Bildirimler</h1>
        <p className="notifications-subtitle">Satış, operasyon, finans ve sistem bildirimlerini tek ekrandan takip edin.</p>
      </div>
      <button className="notifications-refresh" type="button" onClick={() => void load(true)} disabled={refreshing}>
        <RefreshCw size={17} className={refreshing ? 'spin' : ''}/>
        <span>Yenile</span>
      </button>
    </section>

    <section className="notifications-summary" aria-label="Bildirim özeti">
      <div><span className="notifications-summary-icon"><Bell size={19}/></span><span><strong>{bildirimler.length}</strong><small>Toplam</small></span></div>
      <div className={okunmamis > 0 ? 'is-unread' : ''}><span className="notifications-summary-icon"><Inbox size={19}/></span><span><strong>{okunmamis}</strong><small>Okunmamış</small></span></div>
    </section>

    <section className="notifications-filters" aria-label="Bildirim filtreleri">
      {['Tümü', 'Okunmamış', ...kategoriler].map(item => <button
        key={item}
        type="button"
        className={filtre === item ? 'active' : ''}
        onClick={() => setFiltre(item)}
      >{item}{item === 'Okunmamış' && okunmamis > 0 ? <span>{okunmamis}</span> : null}</button>)}
    </section>

    {error && <div className="notifications-error"><CircleAlert size={18}/><span>{error}</span></div>}

    {loading ? <section className="notifications-empty"><LoaderCircle className="spin" size={24}/><strong>Bildirimler yükleniyor…</strong></section>
      : gorunenler.length === 0 ? <section className="notifications-empty"><MailOpen size={28}/><strong>{filtre === 'Okunmamış' ? 'Okunmamış bildiriminiz yok' : 'Bu filtrede bildirim yok'}</strong><span>Yeni bildirimler burada görünecek.</span></section>
      : <section className="notifications-list">{gorunenler.map(bildirim => {
        const meta = bildirimMeta(bildirim)
        return <article key={bildirim.bildirim_id} className={`notification-card ${bildirim.okundu ? 'is-read' : 'is-unread'} priority-${bildirim.oncelik.toLocaleLowerCase('tr-TR')}`}>
          <div className="notification-card-head">
            <div className="notification-card-title">
              <span className="notification-dot" aria-hidden="true"/>
              <div><div className="notification-tags"><span>{bildirim.kategori}</span>{bildirim.oncelik !== 'Normal' && <span>{bildirim.oncelik}</span>}</div><h2>{bildirim.baslik}</h2></div>
            </div>
            <time dateTime={bildirim.olusturulma_zamani}>{tarihSaat.format(new Date(bildirim.olusturulma_zamani))}</time>
          </div>
          <p className="notification-body">{bildirim.icerik}</p>
          {meta.length > 0 && <dl className="notification-meta">{meta.map(item => <div key={`${bildirim.bildirim_id}-${item.anahtar}`}><dt>{item.etiket}</dt><dd>{item.deger}</dd></div>)}</dl>}
          <footer className="notification-card-footer">
            <span className="notification-source">Kaynak: {bildirim.kaynak}</span>
            <div className="notification-actions">
              <button type="button" className="notification-read-toggle" disabled={workingId === bildirim.bildirim_id} onClick={() => void toggleRead(bildirim)}>
                {workingId === bildirim.bildirim_id ? <LoaderCircle size={15} className="spin"/> : bildirim.okundu ? <Inbox size={15}/> : <Check size={15}/>}
                <span>{bildirim.okundu ? 'Okunmadı yap' : 'Okundu yap'}</span>
              </button>
              {bildirim.eylem_yolu && <button type="button" className="notification-open" onClick={() => openAction(bildirim.eylem_yolu!)}><span>Detaya git</span><ChevronRight size={16}/></button>}
            </div>
          </footer>
        </article>
      })}</section>}
  </div>
}
