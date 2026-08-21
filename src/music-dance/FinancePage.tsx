import { ArrowLeft, Banknote, BarChart3, Check, ChevronRight, CircleDollarSign, CreditCard, GraduationCap, Landmark, LoaderCircle, Pencil, Plus, ReceiptText, RefreshCw, Sparkles, Users, WalletCards, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { t } from '../lib/productProfile'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { CashPage } from './CashPage'
import { ReportsPage } from './ReportsPage'
import { mdKasaVerisiniGetir, type MdKasaHesabi } from './cashService'
import { mdEgitmenOdemeKaydet, mdFinansVerisiniGetir, mdProgramFinansAyariGuncelle, mdTahsilatKaydet } from './financeService'
import type { MdFinansVerisi, MdOdemeYontemi, MdSabitProgram, MusicDanceData } from './types'

type Tab = 'kursiyer' | 'egitmen' | 'tarife'

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value || 0)
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const localDate = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function FinanceModal({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="md-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="md-modal md-finance-modal" role="dialog" aria-modal="true">
      <header><div><span>FİNANSIN TEMPOSU</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button></header>
      <div className="md-modal-body">{children}</div>
    </section>
  </div>
}

export function FinancePage() {
  const { aktifKurum, data, refresh } = useMusicDanceData()
  const [finans, setFinans] = useState<MdFinansVerisi | null>(null)
  const [cashAccounts, setCashAccounts] = useState<MdKasaHesabi[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('kursiyer')
  const [cashMode, setCashMode] = useState(false)
  const [reportMode, setReportMode] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pricingProgram, setPricingProgram] = useState<MdSabitProgram | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!aktifKurum?.kurum_id) return
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const [nextFinance, nextCash] = await Promise.all([
        mdFinansVerisiniGetir(aktifKurum.kurum_id),
        mdKasaVerisiniGetir(aktifKurum.kurum_id),
      ])
      setFinans(nextFinance)
      setCashAccounts(nextCash.hesaplar.filter(x => x.aktif))
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [aktifKurum?.kurum_id])

  useEffect(() => { void load() }, [load])

  const metrics = useMemo(() => {
    if (!finans) return { studentDebt: 0, studentCredit: 0, teacherDue: 0, collected: 0 }
    return {
      studentDebt: sum(finans.kursiyerBakiyeleri.map(x => Math.max(0, x.bakiye))),
      studentCredit: sum(finans.kursiyerBakiyeleri.map(x => Math.max(0, -x.bakiye))),
      teacherDue: sum(finans.egitmenBakiyeleri.map(x => Math.max(0, x.bakiye))),
      collected: sum(finans.tahsilatlar.map(x => x.tutar)),
    }
  }, [finans])

  if (!aktifKurum || !data) return null

  if (cashMode) return <div className="md-page-stack"><div className="md-finance-cash-back"><button className="md-secondary" type="button" onClick={() => setCashMode(false)}><ArrowLeft/>Finansın Temposuna Dön</button></div><CashPage/></div>
  if (reportMode) return <ReportsPage onBack={() => setReportMode(false)}/>

  const afterAction = async (message: string) => {
    setNotice(message)
    await load(true)
    window.setTimeout(() => setNotice(null), 3200)
  }

  return <div className="md-page-stack md-finance-page">
    <section className="md-finance-hero">
      <div><span>FİNANSIN TEMPOSU</span><h1>Para akışı sade, dengesi görünür.</h1><p>Ders ücretleri, tahsilatlar, eğitmen hakedişleri ve ödemeleri aynı ritimde izleyin. Peşin ödemeler kursiyer hesabında alacak olarak korunur.</p></div>
      <div className="md-finance-orbit"><CircleDollarSign/><i/><i/><i/></div>
    </section>

    {notice && <div className="md-finance-notice"><Check size={16}/>{notice}</div>}
    {error && <div className="md-error">{error}</div>}

    <section className="md-finance-kpis">
      <article><span className="blue"><ReceiptText/></span><div><small>Kursiyer Alacağı</small><strong>{money(metrics.studentDebt)}</strong><em>kurumun tahsil edeceği</em></div></article>
      <article><span className="violet"><WalletCards/></span><div><small>Peşin Bakiye</small><strong>{money(metrics.studentCredit)}</strong><em>kursiyer hesabında</em></div></article>
      <article><span className="rose"><GraduationCap/></span><div><small>Eğitmen Borcu</small><strong>{money(metrics.teacherDue)}</strong><em>ödenecek hakediş</em></div></article>
      <article><span className="gold"><Banknote/></span><div><small>Son Tahsilatlar</small><strong>{money(metrics.collected)}</strong><em>son 30 kayıt</em></div></article>
    </section>

    <section className="md-finance-toolbar">
      <div className="md-finance-tabs">
        <button className={tab === 'kursiyer' ? 'active' : ''} onClick={() => setTab('kursiyer')}><Users/>Kursiyer Hesapları</button>
        <button className={tab === 'egitmen' ? 'active' : ''} onClick={() => setTab('egitmen')}><GraduationCap/>Eğitmen Hesapları</button>
        <button className={tab === 'tarife' ? 'active' : ''} onClick={() => setTab('tarife')}><Sparkles/>Ücret Tarifeleri</button>
      </div>
      <div className="md-finance-actions">
        <button className="md-secondary" type="button" onClick={() => setReportMode(true)}><BarChart3/>Raporlar</button>
        <button className="md-secondary" type="button" onClick={() => setCashMode(true)}><WalletCards/>Kasa & Giderler</button>
        <button className="md-secondary" type="button" onClick={() => void load(true)}><RefreshCw className={refreshing ? 'spin' : ''}/>Yenile</button>
        {tab === 'kursiyer' && <button className="md-primary" type="button" onClick={() => setCollectionOpen(true)}><Plus/>Tahsilat Gir</button>}
        {tab === 'egitmen' && <button className="md-primary" type="button" onClick={() => setPaymentOpen(true)}><Plus/>Ödeme Gir</button>}
      </div>
    </section>

    {loading ? <section className="md-finance-loading"><LoaderCircle className="spin"/><span>Finans verisi hazırlanıyor…</span></section> : <>
      {tab === 'kursiyer' && <StudentAccounts finans={finans} onCollect={() => setCollectionOpen(true)}/>} 
      {tab === 'egitmen' && <TeacherAccounts finans={finans} onPay={() => setPaymentOpen(true)}/>} 
      {tab === 'tarife' && <Pricing data={data} onEdit={setPricingProgram}/>} 
    </>}

    <FinanceModal open={collectionOpen} title="Tahsilat Gir" subtitle="Borcu aşan tutar peşin bakiye olarak korunur." onClose={() => setCollectionOpen(false)}>
      <CollectionForm busy={busy} students={data.kursiyerler.filter(x => x.durum !== 'Pasif')} accounts={cashAccounts} onCancel={() => setCollectionOpen(false)} onSubmit={async input => {
        setBusy(true)
        try { await mdTahsilatKaydet(input); setCollectionOpen(false); await afterAction('Tahsilat kaydedildi.') } finally { setBusy(false) }
      }}/>
    </FinanceModal>

    <FinanceModal open={paymentOpen} title={`${t.teacher} Ödemesi`} subtitle="Hakedişten bağımsız ödeme kaydı; bakiye otomatik hesaplanır." onClose={() => setPaymentOpen(false)}>
      <TeacherPaymentForm busy={busy} teachers={data.egitmenler.filter(x => x.durum !== 'Pasif')} accounts={cashAccounts} onCancel={() => setPaymentOpen(false)} onSubmit={async input => {
        setBusy(true)
        try { await mdEgitmenOdemeKaydet(input); setPaymentOpen(false); await afterAction(`${t.teacher} ödemesi kaydedildi.`) } finally { setBusy(false) }
      }}/>
    </FinanceModal>

    <FinanceModal open={!!pricingProgram} title="Ücret Tarifesi" subtitle={pricingProgram ? programName(pricingProgram, data) : undefined} onClose={() => setPricingProgram(null)}>
      {pricingProgram && <PricingForm program={pricingProgram} busy={busy} onCancel={() => setPricingProgram(null)} onSubmit={async (studentFee, teacherFee) => {
        setBusy(true)
        try {
          await mdProgramFinansAyariGuncelle(pricingProgram.program_id, studentFee, teacherFee)
          await refresh()
          setPricingProgram(null)
          await afterAction('Ücret tarifesi güncellendi. Yeni dersler bu tarifeyi kullanacak.')
        } finally { setBusy(false) }
      }}/>} 
    </FinanceModal>
  </div>
}

function StudentAccounts({ finans, onCollect }: { finans: MdFinansVerisi | null; onCollect: () => void }) {
  const rows = finans?.kursiyerBakiyeleri || []
  if (!rows.length) return <FinanceEmpty icon={<Users/>} title="Henüz finans hareketi yok." text="Dersler yapıldıkça borç; tahsilat girdikçe ödeme hareketi burada oluşur." action="İlk Tahsilatı Gir" onAction={onCollect}/>
  return <section className="md-finance-ledger">
    <header><div><span>KURSİYER CARİLERİ</span><h2>Bakiye görünümü</h2></div><small>{rows.length} hesap</small></header>
    <div className="md-finance-table-head"><span>Kursiyer</span><span>Ders Borcu</span><span>Tahsilat</span><span>Bakiye</span></div>
    {rows.map((x, i) => <div className={`md-finance-row tone-${i % 4 + 1}`} key={x.kursiyer_id}>
      <div className="md-finance-name"><i>{x.ad_soyad.split(/\s+/).slice(0,2).map(p => p[0]).join('').toLocaleUpperCase('tr-TR')}</i><strong>{x.ad_soyad}</strong></div>
      <span>{money(x.toplam_borc)}</span><span>{money(x.toplam_tahsilat)}</span>
      <b className={x.bakiye > 0 ? 'debt' : x.bakiye < 0 ? 'credit' : 'zero'}>{x.bakiye < 0 ? `${money(Math.abs(x.bakiye))} alacak` : money(x.bakiye)}</b>
    </div>)}
  </section>
}

function TeacherAccounts({ finans, onPay }: { finans: MdFinansVerisi | null; onPay: () => void }) {
  const rows = finans?.egitmenBakiyeleri || []
  if (!rows.length) return <FinanceEmpty icon={<GraduationCap/>} title="Henüz eğitmen hakedişi yok." text="Yapılan ve katılım gerçekleşen derslerden hakediş otomatik oluşur." action="Ödeme Gir" onAction={onPay}/>
  return <section className="md-finance-ledger">
    <header><div><span>EĞİTMEN CARİLERİ</span><h2>Hakediş görünümü</h2></div><small>{rows.length} hesap</small></header>
    <div className="md-finance-table-head"><span>Eğitmen</span><span>Hakediş</span><span>Ödeme</span><span>Kalan</span></div>
    {rows.map((x, i) => <div className={`md-finance-row tone-${i % 4 + 1}`} key={x.egitmen_id}>
      <div className="md-finance-name"><i>{x.ad_soyad.split(/\s+/).slice(0,2).map(p => p[0]).join('').toLocaleUpperCase('tr-TR')}</i><strong>{x.ad_soyad}</strong></div>
      <span>{money(x.toplam_hakedis)}</span><span>{money(x.toplam_odeme)}</span><b className={x.bakiye > 0 ? 'debt' : 'zero'}>{money(x.bakiye)}</b>
    </div>)}
  </section>
}

function Pricing({ data, onEdit }: { data: MusicDanceData; onEdit: (p: MdSabitProgram) => void }) {
  const active = data.programlar.filter(x => x.durum !== 'Pasif')
  if (!active.length) return <FinanceEmpty icon={<Sparkles/>} title="Tarife bağlanacak program yok." text="Önce Program ekranından bireysel veya grup sabit programı oluşturun."/>
  return <section className="md-pricing-grid">
    {active.map((p, i) => <article className={`md-pricing-card tone-${i % 4 + 1}`} key={p.program_id}>
      <header><span>{p.program_turu}</span><button type="button" onClick={() => onEdit(p)}><Pencil/>Düzenle</button></header>
      <h3>{programName(p, data)}</h3>
      <p>{data.branslar.find(x => x.brans_id === p.brans_id)?.brans_adi || t.branch} · {data.egitmenler.find(x => x.egitmen_id === p.egitmen_id)?.ad_soyad || t.teacher}</p>
      <div><span><small>Kursiyer / ders</small><b>{money(p.kursiyer_birim_ucreti)}</b></span><span><small>Eğitmen / ders</small><b>{money(p.egitmen_birim_hakedisi)}</b></span></div>
      {p.program_turu === 'Grup' && <em>Grup üyelerindeki özel birim ücret varsa kursiyer ücretinde önceliklidir.</em>}
    </article>)}
  </section>
}

function programName(p: MdSabitProgram, data: MusicDanceData) {
  return p.program_turu === 'Grup'
    ? data.gruplar.find(x => x.grup_id === p.grup_id)?.grup_adi || 'Grup dersi'
    : data.kursiyerler.find(x => x.kursiyer_id === p.kursiyer_id)?.ad_soyad || 'Bireysel ders'
}

function CollectionForm({ students, accounts, busy, onCancel, onSubmit }: { students: { kursiyer_id: string; ad_soyad: string }[]; accounts: MdKasaHesabi[]; busy: boolean; onCancel: () => void; onSubmit: (input: { kursiyerId: string; kasaHesapId: string; tarih: string; tutar: number; odemeYontemi: MdOdemeYontemi; aciklama?: string | null }) => Promise<void> }) {
  return <form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); await onSubmit({ kursiyerId: String(f.get('kursiyer_id')), kasaHesapId: String(f.get('kasa_hesap_id')), tarih: String(f.get('tarih')), tutar: Number(f.get('tutar')), odemeYontemi: String(f.get('odeme_yontemi')) as MdOdemeYontemi, aciklama: String(f.get('aciklama') || '') || null }) }}>
    <label>{t.student}<select name="kursiyer_id" required autoFocus><option value="">Seçin</option>{students.map(x => <option key={x.kursiyer_id} value={x.kursiyer_id}>{x.ad_soyad}</option>)}</select></label>
    <div className="md-form-two"><label>Kasa Hesabı<select name="kasa_hesap_id" required defaultValue={accounts[0]?.hesap_id || ''}><option value="">Seçin</option>{accounts.map(x => <option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi} · {x.hesap_turu}</option>)}</select></label><label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue="Nakit"><option>Nakit</option><option>Kredi Kartı</option><option>Banka</option><option>Havale</option><option>Diğer</option></select></label></div>
    <div className="md-form-two"><label>Tarih<input name="tarih" type="date" defaultValue={localDate()} required/></label><label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" required placeholder="0,00"/></label></div>
    <label>Açıklama <small>(opsiyonel)</small><input name="aciklama" placeholder="Örn. Eylül peşin ödeme"/></label>
    <div className="md-finance-form-note"><CreditCard/><span>Tahsilat mevcut borçtan büyük olabilir. Fazla tutar kursiyerin peşin bakiyesi olarak kalır.</span></div>
    <FinanceFormActions busy={busy} onCancel={onCancel} label="Tahsilatı Kaydet"/>
  </form>
}

function TeacherPaymentForm({ teachers, accounts, busy, onCancel, onSubmit }: { teachers: { egitmen_id: string; ad_soyad: string }[]; accounts: MdKasaHesabi[]; busy: boolean; onCancel: () => void; onSubmit: (input: { egitmenId: string; kasaHesapId: string; tarih: string; tutar: number; odemeYontemi: Exclude<MdOdemeYontemi, 'Kredi Kartı'>; aciklama?: string | null }) => Promise<void> }) {
  return <form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); await onSubmit({ egitmenId: String(f.get('egitmen_id')), kasaHesapId: String(f.get('kasa_hesap_id')), tarih: String(f.get('tarih')), tutar: Number(f.get('tutar')), odemeYontemi: String(f.get('odeme_yontemi')) as Exclude<MdOdemeYontemi, 'Kredi Kartı'>, aciklama: String(f.get('aciklama') || '') || null }) }}>
    <label>{t.teacher}<select name="egitmen_id" required autoFocus><option value="">Seçin</option>{teachers.map(x => <option key={x.egitmen_id} value={x.egitmen_id}>{x.ad_soyad}</option>)}</select></label>
    <div className="md-form-two"><label>Kasa Hesabı<select name="kasa_hesap_id" required defaultValue={accounts[0]?.hesap_id || ''}><option value="">Seçin</option>{accounts.map(x => <option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi} · {x.hesap_turu}</option>)}</select></label><label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue="Banka"><option>Nakit</option><option>Banka</option><option>Havale</option><option>Diğer</option></select></label></div>
    <div className="md-form-two"><label>Tarih<input name="tarih" type="date" defaultValue={localDate()} required/></label><label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" required placeholder="0,00"/></label></div>
    <label>Açıklama <small>(opsiyonel)</small><input name="aciklama"/></label>
    <FinanceFormActions busy={busy} onCancel={onCancel} label="Ödemeyi Kaydet"/>
  </form>
}

function PricingForm({ program, busy, onCancel, onSubmit }: { program: MdSabitProgram; busy: boolean; onCancel: () => void; onSubmit: (studentFee: number, teacherFee: number) => Promise<void> }) {
  return <form className="md-form" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); await onSubmit(Number(f.get('kursiyer_ucret')), Number(f.get('egitmen_hakedis'))) }}>
    <div className="md-form-two"><label>Kursiyer Ders Ücreti<input name="kursiyer_ucret" type="number" min="0" step="0.01" defaultValue={program.kursiyer_birim_ucreti || 0} required/></label><label>Eğitmen Ders Hakedişi<input name="egitmen_hakedis" type="number" min="0" step="0.01" defaultValue={program.egitmen_birim_hakedisi || 0} required/></label></div>
    <div className="md-finance-form-note"><Landmark/><span>Değişiklik yalnız bundan sonra oluşturulan derslerde kullanılır. Geçmiş derslerin ücret ve hakediş snapshot'ları değişmez.</span></div>
    <FinanceFormActions busy={busy} onCancel={onCancel} label="Tarifeyi Kaydet"/>
  </form>
}

function FinanceFormActions({ busy, onCancel, label }: { busy: boolean; onCancel: () => void; label: string }) {
  return <div className="md-form-actions"><button type="button" className="md-secondary" onClick={onCancel}>Vazgeç</button><button className="md-primary" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Check/>}{busy ? 'Kaydediliyor…' : label}</button></div>
}

function FinanceEmpty({ icon, title, text, action, onAction }: { icon: ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <section className="md-finance-empty"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p>{action && onAction && <button type="button" onClick={onAction}>{action}<ChevronRight/></button>}</div></section>
}
