import { Clock3, Send, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { APP_MODE, supabase } from '../lib/supabase'
import { useAppData } from './AppDataProvider'
import './DemoBanner.css'

type LeadForm = {
  ad_soyad: string
  kurum_adi: string
  telefon: string
  ogrenci_sayisi: string
  ogretmen_sayisi: string
  notlar: string
}

const emptyForm: LeadForm = { ad_soyad: '', kurum_adi: '', telefon: '', ogrenci_sayisi: '', ogretmen_sayisi: '', notlar: '' }

function remainingLabel(expiresAt: string | null, now: number) {
  if (!expiresAt) return '2 saatlik kişisel demo'
  const diff = Math.max(0, new Date(expiresAt).getTime() - now)
  const totalMinutes = Math.ceil(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours} sa ${String(minutes).padStart(2, '0')} dk kaldı` : `${minutes} dk kaldı`
}

export function DemoBanner() {
  const { demoExpiresAt } = useAppData()
  const [now, setNow] = useState(Date.now())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LeadForm>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDemo = APP_MODE === 'demo'

  useEffect(() => {
    if (!isDemo) return
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [isDemo])

  const remaining = useMemo(() => remainingLabel(demoExpiresAt, now), [demoExpiresAt, now])
  if (!isDemo) return null

  const update = (key: keyof LeadForm, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const studentCount = form.ogrenci_sayisi.trim() ? Number(form.ogrenci_sayisi) : null
      const teacherCount = form.ogretmen_sayisi.trim() ? Number(form.ogretmen_sayisi) : null
      const { error: rpcError } = await supabase.rpc('demo_teklif_talebi_olustur_v1', {
        p_ad_soyad: form.ad_soyad.trim(),
        p_kurum_adi: form.kurum_adi.trim(),
        p_telefon: form.telefon.trim(),
        p_ogrenci_sayisi: Number.isFinite(studentCount) ? studentCount : null,
        p_ogretmen_sayisi: Number.isFinite(teacherCount) ? teacherCount : null,
        p_notlar: form.notlar.trim() || null,
      })
      if (rpcError) throw rpcError
      setDone(true)
      setForm(emptyForm)
    } catch (e: any) {
      setError(e?.message || 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  const close = () => { setOpen(false); setDone(false); setError(null) }

  return <>
    <div className="demo-banner" role="status">
      <div className="demo-banner-copy"><span className="demo-badge">DEMO</span><span>Bu kişisel tanıtım ortamındaki örnek veriler otomatik silinir.</span><span className="demo-time"><Clock3 size={14}/>{remaining}</span></div>
      <button type="button" className="demo-offer-btn" onClick={() => setOpen(true)}>Kurumum İçin Teklif Al</button>
    </div>
    {open && <div className="demo-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <section className="demo-lead-modal" role="dialog" aria-modal="true" aria-labelledby="demo-lead-title">
        <button className="demo-modal-close" type="button" onClick={close} aria-label="Kapat"><X size={19}/></button>
        {done ? <div className="demo-lead-success"><span>Talebiniz alındı</span><h2 id="demo-lead-title">Sizinle iletişime geçeceğiz.</h2><p>Kurumunuza uygun kurulum ve kullanım modelini birlikte netleştireceğiz.</p><button className="primary-btn" type="button" onClick={close}>Demoya Dön</button></div> : <>
          <div className="demo-lead-heading"><span>BS EĞİTİM YÖNETİMİ</span><h2 id="demo-lead-title">Kurumunuz için teklif alın</h2><p>İletişim bilgilerinizi bırakın; size uygun kurulum modelini görüşelim.</p></div>
          <form className="demo-lead-form" onSubmit={submit}>
            <label><span>Ad Soyad</span><input required maxLength={80} value={form.ad_soyad} onChange={e => update('ad_soyad', e.target.value)} /></label>
            <label><span>Kurum Adı</span><input required maxLength={120} value={form.kurum_adi} onChange={e => update('kurum_adi', e.target.value)} /></label>
            <label><span>Telefon</span><input required inputMode="tel" maxLength={30} placeholder="05xx xxx xx xx" value={form.telefon} onChange={e => update('telefon', e.target.value)} /></label>
            <div className="demo-lead-grid"><label><span>Öğrenci Sayısı</span><input type="number" min="1" max="5000" value={form.ogrenci_sayisi} onChange={e => update('ogrenci_sayisi', e.target.value)} /></label><label><span>Öğretmen Sayısı</span><input type="number" min="1" max="500" value={form.ogretmen_sayisi} onChange={e => update('ogretmen_sayisi', e.target.value)} /></label></div>
            <label><span>Kısa Not <small>(opsiyonel)</small></span><textarea maxLength={500} rows={3} value={form.notlar} onChange={e => update('notlar', e.target.value)} /></label>
            {error && <div className="demo-lead-error">{error}</div>}
            <button className="primary-btn demo-submit-btn" type="submit" disabled={busy}><Send size={17}/>{busy ? 'Gönderiliyor…' : 'Teklif Talebini Gönder'}</button>
          </form>
        </>}
      </section>
    </div>}
  </>
}
