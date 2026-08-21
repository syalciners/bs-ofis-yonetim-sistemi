import { ArrowDownLeft, ArrowUpRight, Banknote, Building2, Check, ChevronRight, CircleDollarSign, Landmark, LoaderCircle, Plus, Receipt, RefreshCw, Sparkles, Tags, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { mdGiderIptal, mdGiderKategorisiEkle, mdGiderKaydet, mdKasaHesabiEkle, mdKasaVerisiniGetir, type MdKasaHesapTuru, type MdKasaVerisi } from './cashService'
import type { MdOdemeYontemi } from './types'

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value || 0)
const today = () => {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const monthStart = () => `${today().slice(0, 8)}01`

function CashModal({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="md-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="md-modal md-cash-modal" role="dialog" aria-modal="true"><header><div><span>KASANIN AKIŞI</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button></header><div className="md-modal-body">{children}</div></section>
  </div>
}

export function CashPage() {
  const { aktifKurum } = useMusicDanceData()
  const [cash, setCash] = useState<MdKasaVerisi | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!aktifKurum?.kurum_id) return
    quiet ? setRefreshing(true) : setLoading(true)
    try { setCash(await mdKasaVerisiniGetir(aktifKurum.kurum_id)); setError(null) }
    catch (e: any) { setError(e?.message || String(e)) }
    finally { setLoading(false); setRefreshing(false) }
  }, [aktifKurum?.kurum_id])

  useEffect(() => { void load() }, [load])

  const metrics = useMemo(() => {
    if (!cash) return { balance: 0, todayIn: 0, todayOut: 0, monthExpense: 0 }
    const now = today(); const first = monthStart()
    return {
      balance: cash.bakiyeler.reduce((s, x) => s + x.bakiye, 0),
      todayIn: cash.hareketler.filter(x => x.tarih === now && x.yon === 'Giriş').reduce((s, x) => s + x.tutar, 0),
      todayOut: cash.hareketler.filter(x => x.tarih === now && x.yon === 'Çıkış').reduce((s, x) => s + x.tutar, 0),
      monthExpense: cash.giderler.filter(x => x.durum === 'Aktif' && x.tarih >= first).reduce((s, x) => s + x.tutar, 0),
    }
  }, [cash])

  if (!aktifKurum) return null

  const done = async (message: string) => {
    setNotice(message); await load(true); window.setTimeout(() => setNotice(null), 3000)
  }

  return <div className="md-page-stack md-cash-page">
    <section className="md-cash-hero"><div><span>KASANIN AKIŞI</span><h1>Her girişin ve çıkışın izi net.</h1><p>Tahsilatlar, eğitmen ödemeleri ve giderler tek bakiye görünümünde birleşir; aynı işlem ikinci kez kopyalanmaz.</p></div><div className="md-cash-symbol"><Wallet/><i/><i/></div></section>

    {notice && <div className="md-cash-notice"><Check/>{notice}</div>}
    {error && <div className="md-error">{error}</div>}

    <section className="md-cash-kpis">
      <article><span className="blue"><Wallet/></span><div><small>Toplam Kasa</small><strong>{money(metrics.balance)}</strong><em>tüm aktif hesaplar</em></div></article>
      <article><span className="green"><ArrowDownLeft/></span><div><small>Bugün Giriş</small><strong>{money(metrics.todayIn)}</strong><em>tahsilatlar</em></div></article>
      <article><span className="rose"><ArrowUpRight/></span><div><small>Bugün Çıkış</small><strong>{money(metrics.todayOut)}</strong><em>ödeme + gider</em></div></article>
      <article><span className="gold"><Receipt/></span><div><small>Bu Ay Gider</small><strong>{money(metrics.monthExpense)}</strong><em>aktif giderler</em></div></article>
    </section>

    <section className="md-cash-toolbar"><div><span>KASA & GİDERLER</span><strong>Günlük finans akışı</strong></div><div><button className="md-secondary" onClick={() => void load(true)}><RefreshCw className={refreshing ? 'spin' : ''}/>Yenile</button><button className="md-secondary" onClick={() => setAccountOpen(true)}><Landmark/>Hesap</button><button className="md-secondary" onClick={() => setCategoryOpen(true)}><Tags/>Kategori</button><button className="md-primary" onClick={() => setExpenseOpen(true)}><Plus/>Gider Ekle</button></div></section>

    {loading ? <section className="md-cash-loading"><LoaderCircle className="spin"/><span>Kasa hazırlanıyor…</span></section> : <>
      <section className="md-cash-account-grid">{(cash?.bakiyeler || []).map((x, i) => <article className={`tone-${i % 4 + 1}`} key={x.hesap_id}><header><span>{x.hesap_turu === 'Nakit' ? <Banknote/> : <Building2/>}</span><div><small>{x.hesap_turu}</small><strong>{x.hesap_adi}</strong></div></header><b>{money(x.bakiye)}</b><footer><span>Giren <em>{money(x.giren)}</em></span><span>Çıkan <em>{money(x.cikan)}</em></span></footer></article>)}</section>

      <section className="md-cash-two-col">
        <div className="md-cash-panel"><header><div><span>HAREKET AKIŞI</span><h2>Son hareketler</h2></div><small>{cash?.hareketler.length || 0} kayıt</small></header>{(cash?.hareketler || []).slice(0, 20).map(x => <div className="md-cash-movement" key={`${x.hareket_turu}-${x.kaynak_id}`}><span className={x.yon === 'Giriş' ? 'in' : 'out'}>{x.yon === 'Giriş' ? <ArrowDownLeft/> : <ArrowUpRight/>}</span><div><strong>{x.hareket_turu}</strong><small>{x.tarih} · {x.odeme_yontemi}{x.aciklama ? ` · ${x.aciklama}` : ''}</small></div><b className={x.yon === 'Giriş' ? 'in' : 'out'}>{x.yon === 'Giriş' ? '+' : '−'}{money(x.tutar)}</b></div>)}{!cash?.hareketler.length && <CashEmpty icon={<CircleDollarSign/>} title="Henüz kasa hareketi yok." text="Tahsilat, eğitmen ödemesi veya gider kaydedildiğinde burada görünür."/>}</div>

        <div className="md-cash-panel"><header><div><span>GİDER AKIŞI</span><h2>Son giderler</h2></div><button onClick={() => setExpenseOpen(true)}>Gider Ekle <ChevronRight/></button></header>{(cash?.giderler || []).filter(x => x.durum === 'Aktif').slice(0, 12).map(x => <div className="md-expense-row" key={x.gider_id}><span><Receipt/></span><div><strong>{cash?.kategoriler.find(k => k.kategori_id === x.kategori_id)?.kategori_adi || 'Gider'}</strong><small>{x.tarih} · {cash?.hesaplar.find(h => h.hesap_id === x.kasa_hesap_id)?.hesap_adi || 'Kasa'}{x.aciklama ? ` · ${x.aciklama}` : ''}</small></div><b>{money(x.tutar)}</b><button title="Gideri iptal et" onClick={async () => { if (!window.confirm('Bu gider iptal edilsin mi?')) return; setBusy(true); try { await mdGiderIptal(x.gider_id); await done('Gider iptal edildi.') } finally { setBusy(false) } }} disabled={busy}><X/></button></div>)}{!cash?.giderler.some(x => x.durum === 'Aktif') && <CashEmpty icon={<Receipt/>} title="Henüz gider yok." text="Kira, fatura, malzeme ve diğer giderleri tek işlemle kaydedin."/>}</div>
      </section>
    </>}

    <CashModal open={expenseOpen} title="Yeni Gider" subtitle="Gider doğrudan seçilen kasa hesabından düşer." onClose={() => setExpenseOpen(false)}><form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try { await mdGiderKaydet({ kategoriId: String(f.get('kategori_id')), kasaHesapId: String(f.get('hesap_id')), tarih: String(f.get('tarih')), tutar: Number(f.get('tutar')), odemeYontemi: String(f.get('odeme_yontemi')) as MdOdemeYontemi, aciklama: String(f.get('aciklama') || '') || null }); setExpenseOpen(false); await done('Gider kaydedildi.') } finally { setBusy(false) } }}><div className="md-form-two"><label>Kategori<select name="kategori_id" required autoFocus><option value="">Seçin</option>{cash?.kategoriler.filter(x => x.aktif).map(x => <option key={x.kategori_id} value={x.kategori_id}>{x.kategori_adi}</option>)}</select></label><label>Kasa Hesabı<select name="hesap_id" required><option value="">Seçin</option>{cash?.hesaplar.filter(x => x.aktif).map(x => <option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label></div><div className="md-form-two"><label>Tarih<input name="tarih" type="date" defaultValue={today()} required/></label><label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" required/></label></div><label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue="Nakit"><option>Nakit</option><option>Kredi Kartı</option><option>Banka</option><option>Havale</option><option>Diğer</option></select></label><label>Açıklama <small>(opsiyonel)</small><input name="aciklama" placeholder="Örn. Ağustos elektrik faturası"/></label><CashFormActions busy={busy} onCancel={() => setExpenseOpen(false)} label="Gideri Kaydet"/></form></CashModal>

    <CashModal open={accountOpen} title="Kasa Hesabı Ekle" subtitle="Nakit kasa, banka veya POS hesabı tanımlayın." onClose={() => setAccountOpen(false)}><form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try { await mdKasaHesabiEkle(aktifKurum.kurum_id, { hesap_adi: String(f.get('hesap_adi')), hesap_turu: String(f.get('hesap_turu')) as MdKasaHesapTuru, acilis_bakiyesi: Number(f.get('acilis_bakiyesi') || 0), aciklama: String(f.get('aciklama') || '') || null }); setAccountOpen(false); await done('Kasa hesabı eklendi.') } finally { setBusy(false) } }}><label>Hesap Adı<input name="hesap_adi" required autoFocus placeholder="Örn. Ziraat Bankası"/></label><div className="md-form-two"><label>Hesap Türü<select name="hesap_turu"><option>Nakit</option><option>Banka</option><option>POS</option><option>Diğer</option></select></label><label>Açılış Bakiyesi<input name="acilis_bakiyesi" type="number" step="0.01" defaultValue="0"/></label></div><label>Açıklama <small>(opsiyonel)</small><input name="aciklama"/></label><CashFormActions busy={busy} onCancel={() => setAccountOpen(false)} label="Hesabı Kaydet"/></form></CashModal>

    <CashModal open={categoryOpen} title="Gider Kategorisi" subtitle="Gider raporlarının düzenli kalması için kısa bir kategori adı kullanın." onClose={() => setCategoryOpen(false)}><form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try { await mdGiderKategorisiEkle(aktifKurum.kurum_id, String(f.get('kategori_adi'))); setCategoryOpen(false); await done('Gider kategorisi eklendi.') } finally { setBusy(false) } }}><label>Kategori Adı<input name="kategori_adi" required autoFocus placeholder="Örn. Enstrüman Bakımı"/></label><CashFormActions busy={busy} onCancel={() => setCategoryOpen(false)} label="Kategoriyi Kaydet"/></form></CashModal>
  </div>
}

function CashFormActions({ busy, onCancel, label }: { busy: boolean; onCancel: () => void; label: string }) { return <div className="md-form-actions"><button type="button" className="md-secondary" onClick={onCancel}>Vazgeç</button><button className="md-primary" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Check/>}{busy ? 'Kaydediliyor…' : label}</button></div> }
function CashEmpty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="md-cash-empty"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div> }
