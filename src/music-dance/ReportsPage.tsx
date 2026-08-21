import { ArrowLeft, Banknote, BarChart3, ChevronRight, CircleDollarSign, GraduationCap, Layers3, LoaderCircle, Music2, RefreshCw, Sparkles, TrendingUp, Users, WalletCards } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { mdRaporVerisiniGetir, type MdRaporVerisi } from './reportService'

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0)
const monthLabel = (value: string) => new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' }).format(new Date(`${value}T12:00:00`))
const pct = (part: number, total: number) => total > 0 ? Math.round(part / total * 100) : 0

export function ReportsPage({ onBack }: { onBack?: () => void }) {
  const { aktifKurum, data } = useMusicDanceData()
  const [report, setReport] = useState<MdRaporVerisi | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!aktifKurum?.kurum_id) return
    quiet ? setRefreshing(true) : setLoading(true)
    try { setReport(await mdRaporVerisiniGetir(aktifKurum.kurum_id)); setError(null) }
    catch (e: any) { setError(e?.message || String(e)) }
    finally { setLoading(false); setRefreshing(false) }
  }, [aktifKurum?.kurum_id])

  useEffect(() => { void load() }, [load])

  const current = report?.aylik[report.aylik.length - 1]
  const maxFlow = useMemo(() => Math.max(1, ...(report?.aylik || []).map(x => Math.max(x.tahsilat, x.egitmen_odemesi + x.gider))), [report])
  const bestBranch = report?.branslar[0]
  const bestGroup = report?.gruplar[0]

  if (!aktifKurum || !data) return null

  return <div className="md-page-stack md-report-page">
    {onBack && <div className="md-report-back"><button className="md-secondary" type="button" onClick={onBack}><ArrowLeft/>Finansa Dön</button></div>}
    <section className="md-report-hero"><div><span>YÖNETİM PANORAMASI</span><h1>Rakamları değil, merkezin ritmini okuyun.</h1><p>Finans, branş ve grup performansını aynı kaynaktan; sade, karşılaştırılabilir ve güncel bir görünümde izleyin.</p></div><div className="md-report-mark"><BarChart3/><span>BS</span></div></section>

    {error && <div className="md-error">{error}</div>}
    <section className="md-report-toolbar"><div><span>SON 12 AY</span><strong>{aktifKurum.kurum_adi}</strong></div><button className="md-secondary" type="button" onClick={() => void load(true)}><RefreshCw className={refreshing ? 'spin' : ''}/>Yenile</button></section>

    {loading ? <section className="md-report-loading"><LoaderCircle className="spin"/><span>Yönetim panoraması hazırlanıyor…</span></section> : <>
      <section className="md-report-kpis">
        <article><span className="blue"><CircleDollarSign/></span><div><small>Kursiyer Alacağı</small><strong>{money(report?.kursiyerAlacagi || 0)}</strong><em>tahsil edilecek</em></div></article>
        <article><span className="violet"><WalletCards/></span><div><small>Peşin Bakiye</small><strong>{money(report?.pesinBakiye || 0)}</strong><em>kursiyer alacağı</em></div></article>
        <article><span className="rose"><GraduationCap/></span><div><small>Eğitmen Borcu</small><strong>{money(report?.egitmenBorcu || 0)}</strong><em>ödenecek</em></div></article>
        <article><span className="gold"><Banknote/></span><div><small>Toplam Kasa</small><strong>{money(report?.kasaBakiyesi || 0)}</strong><em>aktif hesaplar</em></div></article>
      </section>

      <section className="md-report-grid-main">
        <div className="md-report-panel md-report-flow"><header><div><span>NAKİT RİTMİ</span><h2>Aylık akış</h2></div><small>{current ? `${monthLabel(current.ay)} · ${money(current.nakit_akisi)}` : 'Henüz hareket yok'}</small></header>
          {(report?.aylik || []).length ? <div className="md-flow-chart">{report!.aylik.map(x => {
            const incoming = Math.max(2, x.tahsilat / maxFlow * 100); const outgoing = Math.max(2, (x.egitmen_odemesi + x.gider) / maxFlow * 100)
            return <div className="md-flow-month" key={x.ay}><div className="md-flow-bars"><i className="in" style={{ height: `${incoming}%` }}/><i className="out" style={{ height: `${outgoing}%` }}/></div><strong>{monthLabel(x.ay)}</strong><small>{money(x.nakit_akisi)}</small></div>
          })}</div> : <ReportEmpty icon={<BarChart3/>} title="Aylık veri henüz oluşmadı." text="Tahsilat, ödeme ve gider hareketleri başladığında finans ritmi burada görünür."/>}
          <footer><span><i className="in"/>Tahsilat</span><span><i className="out"/>Ödeme + gider</span></footer>
        </div>

        <div className="md-report-panel md-report-snapshot"><header><div><span>BU AY</span><h2>Finans özeti</h2></div><Sparkles/></header>
          {current ? <div className="md-report-stat-stack"><div><span>Ders ücretleri</span><b>{money(current.ders_ucreti)}</b></div><div><span>Eğitmen hakedişi</span><b>{money(current.egitmen_hakedisi)}</b></div><div><span>Ders brüt katkısı</span><b className={current.ders_brut_katkisi >= 0 ? 'positive' : 'negative'}>{money(current.ders_brut_katkisi)}</b></div><div><span>Tahsilat</span><b>{money(current.tahsilat)}</b></div><div><span>Gider</span><b>{money(current.gider)}</b></div><div className="accent"><span>Nakit akışı</span><b className={current.nakit_akisi >= 0 ? 'positive' : 'negative'}>{money(current.nakit_akisi)}</b></div></div> : <ReportEmpty icon={<CircleDollarSign/>} title="Bu ay henüz finans hareketi yok." text="İlk işlemle birlikte özet otomatik oluşur." compact/>}
        </div>
      </section>

      <section className="md-report-two-col">
        <div className="md-report-panel"><header><div><span>SANAT ALANLARI</span><h2>Branş katkısı</h2></div>{bestBranch && <small>Önde · {bestBranch.brans_adi}</small>}</header>
          {(report?.branslar || []).length ? <div className="md-report-ranking">{report!.branslar.slice(0, 8).map((x, i) => <article key={x.brans_id} className={`tone-${i % 4 + 1}`}><span className="rank">{String(i + 1).padStart(2, '0')}</span><div><strong>{x.brans_adi}</strong><small>{x.yapilan_ders_sayisi} ders · {x.ucretlenen_katilim_sayisi} ücretlenen katılım</small><div className="md-report-progress"><i style={{ width: `${Math.min(100, Math.max(4, pct(x.brut_katki, Math.max(x.ders_ucreti, 1))))}%` }}/></div></div><b>{money(x.brut_katki)}</b></article>)}</div> : <ReportEmpty icon={<Music2/>} title="Branş performansı henüz oluşmadı." text="Yapılan dersler ve finans kayıtları burada branş bazında toplanır." compact/>}
        </div>

        <div className="md-report-panel"><header><div><span>TOPLULUKLAR</span><h2>Grup performansı</h2></div>{bestGroup && <small>Önde · {bestGroup.grup_adi}</small>}</header>
          {(report?.gruplar || []).length ? <div className="md-group-report-list">{report!.gruplar.slice(0, 8).map((x, i) => { const occupancy = x.kapasite ? pct(x.aktif_uye_sayisi, x.kapasite) : 0; return <article key={x.grup_id} className={`tone-${i % 4 + 1}`}><span><Layers3/></span><div><strong>{x.grup_adi}</strong><small>{x.aktif_uye_sayisi}{x.kapasite ? ` / ${x.kapasite}` : ''} üye · {x.yapilan_ders_sayisi} ders</small>{x.kapasite ? <div className="md-group-report-progress"><i style={{ width: `${Math.min(100, occupancy)}%` }}/></div> : null}</div><aside><small>Brüt katkı</small><b>{money(x.brut_katki)}</b></aside></article> })}</div> : <ReportEmpty icon={<Users/>} title="Grup performansı henüz oluşmadı." text="Grup dersleri gerçekleştikçe doluluk ve katkı birlikte görünür." compact/>}
        </div>
      </section>

      <section className="md-report-insight"><span><TrendingUp/></span><div><small>YÖNETİM NOTU</small><strong>{bestBranch ? `${bestBranch.brans_adi}, mevcut veride en yüksek ders brüt katkısını üreten branş.` : 'Karşılaştırmalı yönetim notu için henüz yeterli finans verisi yok.'}</strong><p>Bu ekran kârlılığı muhasebe kârı olarak değil, ders ücretleri eksi eğitmen hakedişi üzerinden operasyonel “brüt katkı” olarak gösterir. Genel giderler ayrıca nakit akışında izlenir.</p></div><ChevronRight/></section>
    </>}
  </div>
}

function ReportEmpty({ icon, title, text, compact }: { icon: ReactNode; title: string; text: string; compact?: boolean }) { return <div className={`md-report-empty${compact ? ' compact' : ''}`}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div> }
