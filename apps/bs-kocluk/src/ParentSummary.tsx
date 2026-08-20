import { Check, Copy, MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { shortDate } from './data'
import { supabase } from './supabase'

type ParentFacts = {
  baslangic: string
  bitis: string
  takip_edilen_calisma: number
  tamamlanan_calisma: number
  tamamlama_orani: number | null
  geciken_calisma: number
  gelecek_7_gun_calisma: number
  ai_planli_calisma: number
  son_deneme_turu: string | null
  son_deneme_tarihi: string | null
  son_deneme_net: number | null
  onceki_ayni_tur_net: number | null
  net_degisim: number | null
  sonraki_gorusme: string | null
  odak: string
}

type ParentSummaryResponse = {
  basarili?: boolean
  aktif?: boolean
  durum?: string
  ozet?: string
  gercekler?: ParentFacts
}

function makeMessage(parentName: string, body: string) {
  const greeting = parentName.trim() ? `Merhaba ${parentName.trim()},` : 'Merhaba,'
  return `${greeting}\n\n${body.trim()}\n\nBilginize, iyi günler dilerim.`
}

function whatsappNumber(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 11) digits = `90${digits.slice(1)}`
  else if (digits.startsWith('5') && digits.length === 10) digits = `90${digits}`
  return digits.length >= 10 ? digits : ''
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('erişim') || text.includes('yetki')) return 'Bu öğrenci için veli özeti hazırlama yetkiniz bulunmuyor.'
  if (text.includes('oturum')) return 'Oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin.'
  return 'Veli özeti hazırlanamadı. Lütfen tekrar deneyin.'
}

export function ParentSummary({
  studentId,
  studentName,
  onClose,
  onLogged,
}: {
  studentId: string
  studentName: string
  onClose: () => void
  onLogged?: () => void
}) {
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [facts, setFacts] = useState<ParentFacts | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyWarning, setHistoryWarning] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const phone = useMemo(() => whatsappNumber(parentPhone), [parentPhone])

  const prepare = async (knownParentName?: string) => {
    setLoading(true)
    setError(null)
    setHistoryWarning(null)
    setCopied(false)
    try {
      let name = knownParentName ?? parentName
      if (knownParentName == null) {
        const { data: contact, error: contactError } = await supabase
          .from('ogrenciler')
          .select('veli_adi,veli_telefon')
          .eq('ogrenci_id', studentId)
          .maybeSingle()
        if (contactError) throw contactError
        name = String(contact?.veli_adi || '')
        setParentName(name)
        setParentPhone(String(contact?.veli_telefon || ''))
      }

      const { data, error: functionError } = await supabase.functions.invoke('kocluk-veli-ozeti-v1', {
        body: { ogrenci_id: studentId },
      })
      if (functionError) throw functionError
      const response = data as ParentSummaryResponse | null
      if (!response?.basarili || !response.ozet) throw new Error('Özet alınamadı.')
      setFacts(response.gercekler || null)
      setMessage(makeMessage(name, response.ozet))
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void prepare() }, [studentId])

  const logCommunication = async (channel: 'Kopyalama' | 'WhatsApp') => {
    if (!message.trim()) return
    setHistoryWarning(null)
    try {
      const { data, error: logError } = await supabase.rpc('kocluk_veli_iletisim_kaydet_v1', {
        p_ogrenci_id: studentId,
        p_kanal: channel,
        p_icerik: message.trim(),
      })
      if (logError || !data?.basarili) throw logError || new Error('Kayıt oluşturulamadı.')
      onLogged?.()
    } catch {
      setHistoryWarning('İşlem tamamlandı ancak iletişim geçmişi şu anda güncellenemedi.')
    }
  }

  const copy = async () => {
    if (!message.trim()) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      void logCommunication('Kopyalama')
    } catch {
      setError('Mesaj panoya kopyalanamadı. Metni seçip kopyalayabilirsiniz.')
    }
  }

  const openWhatsApp = () => {
    if (!phone || !message.trim()) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    void logCommunication('WhatsApp')
  }

  return <div className="parent-summary-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !loading) onClose() }}>
    <section className="parent-summary-sheet" role="dialog" aria-modal="true" aria-labelledby="parent-summary-title">
      <header className="parent-summary-head">
        <div className="parent-summary-brand"><span><Sparkles/> OTOMATİK VELİ ÖZETİ</span><h2 id="parent-summary-title">Haftayı veli için hazırla</h2><p>{studentName} için gerçek kayıtlar kısa ve anlaşılır bir mesaja dönüştürülür.</p></div>
        <button type="button" className="parent-summary-close" onClick={onClose} disabled={loading} aria-label="Kapat"><X/></button>
      </header>

      {loading ? <div className="parent-summary-loading"><Sparkles/><b>Haftalık kayıtlar hazırlanıyor…</b><span>Çalışma, deneme ve yakın plan bilgileri kontrol ediliyor.</span></div> : error ? <div className="parent-summary-error"><b>Özet hazırlanamadı.</b><span>{error}</span><button type="button" onClick={() => void prepare(parentName)}><RefreshCw/> Tekrar Dene</button></div> : <div className="parent-summary-body">
        {facts && <section className="parent-summary-facts" aria-label="Doğrulanmış haftalık veriler">
          <article><span>Tamamlanan</span><b>{facts.tamamlanan_calisma}/{facts.takip_edilen_calisma || 0}</b><small>{facts.tamamlama_orani != null ? `%${facts.tamamlama_orani} takip oranı` : 'Takip verisi yok'}</small></article>
          <article className={facts.geciken_calisma ? 'attention' : ''}><span>Geciken</span><b>{facts.geciken_calisma}</b><small>{facts.geciken_calisma ? 'Mesajda nötr dille belirtilir' : 'Gecikme görünmüyor'}</small></article>
          <article><span>Önümüzdeki 7 gün</span><b>{facts.gelecek_7_gun_calisma}</b><small>{facts.ai_planli_calisma ? `${facts.ai_planli_calisma} AI planlı çalışma` : 'Açık çalışma'}</small></article>
          <article><span>Son deneme</span><b>{facts.son_deneme_net != null ? `${facts.son_deneme_net.toLocaleString('tr-TR')} net` : '—'}</b><small>{facts.son_deneme_turu ? `${facts.son_deneme_turu}${facts.net_degisim != null ? ` · ${facts.net_degisim > 0 ? '+' : ''}${facts.net_degisim.toLocaleString('tr-TR')} değişim` : ''}` : 'Karşılaştırılabilir veri yok'}</small></article>
        </section>}

        <section className="parent-summary-message-card">
          <div className="parent-summary-message-head"><div><span>HAZIR MESAJ</span><h3>Kontrol et, gerekiyorsa düzelt</h3></div><button type="button" onClick={() => void prepare(parentName)}><RefreshCw/> Yeniden Hazırla</button></div>
          <textarea value={message} onChange={event => setMessage(event.target.value)} rows={9} aria-label="Veliye gönderilecek mesaj"/>
          {facts?.sonraki_gorusme && <small className="parent-summary-next">Sıradaki görüşme: {shortDate(facts.sonraki_gorusme)} · Mesaja yalnız gerektiği kadar yansıtılır.</small>}
        </section>

        <div className="parent-summary-actions">
          <button type="button" className="parent-summary-copy" onClick={() => void copy()} disabled={!message.trim()}>{copied ? <Check/> : <Copy/>}{copied ? 'Kopyalandı' : 'Kopyala'}</button>
          <button type="button" className="parent-summary-whatsapp" onClick={openWhatsApp} disabled={!phone || !message.trim()}><Send/>{phone ? 'WhatsApp’ta Aç' : 'Veli telefonu kayıtlı değil'}</button>
        </div>

        {historyWarning && <div className="parent-summary-history-warning"><ShieldCheck/><span>{historyWarning}</span></div>}
        <div className="parent-summary-safety"><ShieldCheck/><span>Mesaj otomatik gönderilmez. Koç kontrol etmeden hiçbir veliye ulaşmaz; AI öğrenci adı, veli adı, telefon veya öğrenci kimliğini görmez.</span></div>
      </div>}
    </section>
  </div>
}

export function ParentSummaryButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="parent-summary-trigger" onClick={onClick}><MessageCircle/><span>Veli Özeti</span><Sparkles/></button>
}
