import { Clock3, Copy, MessageCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type Communication = {
  iletisim_id: string
  ogrenci_id: string
  kanal: 'Kopyalama' | 'WhatsApp'
  durum: 'Kopyalandı' | "WhatsApp'ta Açıldı"
  icerik: string
  kaynak: string
  iletisim_zamani: string
}

function dateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tarih yok'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function preview(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > 170 ? `${compact.slice(0, 167)}…` : compact
}

export function ParentCommunicationHistory({ studentId, refreshKey = 0 }: { studentId: string; refreshKey?: number }) {
  const [rows, setRows] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(false)
    void supabase
      .from('kocluk_veli_iletisimleri')
      .select('iletisim_id,ogrenci_id,kanal,durum,icerik,kaynak,iletisim_zamani')
      .eq('ogrenci_id', studentId)
      .order('iletisim_zamani', { ascending: false })
      .limit(12)
      .then(({ data, error: queryError }) => {
        if (!live) return
        if (queryError) {
          setError(true)
          setRows([])
          return
        }
        setRows((data || []) as Communication[])
      })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [studentId, refreshKey])

  return <section className="parent-history" aria-labelledby="parent-history-title">
    <header className="parent-history-head">
      <div>
        <span>VELİ İLETİŞİMİ</span>
        <h2 id="parent-history-title">Son temaslar hazır</h2>
        <p>Koçun ayrıca kayıt girmesine gerek yok; veli özeti dışarı taşındığında temas otomatik iz bırakır.</p>
      </div>
      {rows.length > 0 && <div className="parent-history-last"><Clock3/><span>Son temas</span><b>{dateTime(rows[0].iletisim_zamani)}</b></div>}
    </header>

    {loading ? <div className="parent-history-state"><Clock3/><span>İletişim geçmişi yükleniyor…</span></div>
      : error ? <div className="parent-history-state warning"><ShieldCheck/><span>İletişim geçmişi şu anda gösterilemiyor. Diğer öğrenci bilgileri kullanılmaya devam edebilir.</span></div>
      : rows.length === 0 ? <div className="parent-history-empty"><MessageCircle/><div><b>Henüz kayıtlı veli teması yok.</b><span>İlk veli özeti kopyalandığında veya WhatsApp'ta açıldığında burada görünür.</span></div></div>
      : <div className="parent-history-list">{rows.map(row => <article className="parent-history-item" key={row.iletisim_id}>
        <span className={`parent-history-icon ${row.kanal === 'WhatsApp' ? 'whatsapp' : 'copy'}`}>{row.kanal === 'WhatsApp' ? <MessageCircle/> : <Copy/>}</span>
        <div className="parent-history-copy">
          <div className="parent-history-meta"><b>{row.durum}</b><span>{dateTime(row.iletisim_zamani)}</span></div>
          <p>{preview(row.icerik)}</p>
          <details><summary>Mesajı göster</summary><pre>{row.icerik}</pre></details>
        </div>
      </article>)}</div>}

    <footer className="parent-history-note"><ShieldCheck/><span><b>Doğru kayıt dili:</b> “WhatsApp'ta Açıldı” gönderimin doğrulandığı anlamına gelmez. Sistem yalnız uygulamada gerçekleşen aksiyonu kaydeder.</span></footer>
  </section>
}
