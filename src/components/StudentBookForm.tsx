import { BookOpen, Globe2, LoaderCircle, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { searchMarketBooks, type DisKitapAramaSonucu } from '../services/bookSearchService'
import { assignBookToStudent, loadBookCatalog, saveCatalogBook, type KitapKatalogKaydi, type KoclukOgrenciProfili } from '../services/coachingService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

const cleanIsbn = (value?: string | null) => String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
const normalizeText = (value?: string | null) => String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')

export function StudentBookForm({
  profiles,
  onDone,
  onCancel,
}: {
  profiles: KoclukOgrenciProfili[]
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { data } = useAppData()
  const { toast } = useToast()
  const activeProfiles = profiles.filter(x => x.durum === 'Aktif')
  const [studentId, setStudentId] = useState(activeProfiles.length === 1 ? activeProfiles[0].ogrenci_id : '')
  const [catalog, setCatalog] = useState<KitapKatalogKaydi[]>([])
  const [query, setQuery] = useState('')
  const [selectedBookId, setSelectedBookId] = useState('')
  const [selectedExternalKey, setSelectedExternalKey] = useState('')
  const [externalResults, setExternalResults] = useState<DisKitapAramaSonucu[]>([])
  const [externalLoading, setExternalLoading] = useState(false)
  const [externalError, setExternalError] = useState<string | null>(null)
  const [externalQuery, setExternalQuery] = useState('')
  const [newBook, setNewBook] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try { setCatalog(await loadBookCatalog()) }
      catch (err: any) { toast(err?.message || String(err), 'error') }
      finally { setLoading(false) }
    })()
  }, [toast])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3 || newBook) {
      setExternalResults([])
      setExternalError(null)
      setExternalLoading(false)
      setExternalQuery('')
      setSelectedExternalKey('')
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setExternalLoading(true)
      setExternalError(null)
      void searchMarketBooks(q, 10)
        .then(rows => {
          if (cancelled) return
          setExternalResults(rows)
          setExternalQuery(q)
        })
        .catch((err: any) => {
          if (cancelled) return
          setExternalResults([])
          setExternalQuery(q)
          setExternalError(err?.message || String(err))
        })
        .finally(() => { if (!cancelled) setExternalLoading(false) })
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, newBook])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return catalog.slice(0, 12)
    return catalog.filter(x => [x.kitap_adi, x.yayinevi, x.isbn, x.ders, x.sinav_turu]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR')
      .includes(q)).slice(0, 12)
  }, [catalog, query])

  if (!data) return null

  const selectedExternal = externalResults.find(x => x.kaynak_id === selectedExternalKey) || null

  const findExistingCatalogBook = (book: DisKitapAramaSonucu) => {
    const isbn = cleanIsbn(book.isbn)
    if (isbn) {
      const byIsbn = catalog.find(x => cleanIsbn(x.isbn) === isbn)
      if (byIsbn) return byIsbn
    }
    const title = normalizeText(book.kitap_adi)
    const publisher = normalizeText(book.yayinevi)
    return catalog.find(x => normalizeText(x.kitap_adi) === title && normalizeText(x.yayinevi) === publisher) || null
  }

  const submitSelected = async () => {
    if (!studentId || (!selectedBookId && !selectedExternal)) return
    setBusy(true)
    try {
      if (selectedBookId) {
        await assignBookToStudent({ ogrenci_id: studentId, kitap_id: selectedBookId })
        toast('Kitap öğrencinin kitaplığına eklendi.')
      } else if (selectedExternal) {
        const existing = findExistingCatalogBook(selectedExternal)
        let catalogBookId = existing?.kitap_id || ''
        let imported = false

        if (!catalogBookId) {
          const saved = await saveCatalogBook({
            kitap_adi: selectedExternal.kitap_adi,
            yayinevi: selectedExternal.yayinevi || null,
            isbn: selectedExternal.isbn || null,
            kapak_url: selectedExternal.kapak_url || null,
            toplam_sayfa: null,
          })
          catalogBookId = saved.kitap_id
          imported = true
        }

        await assignBookToStudent({ ogrenci_id: studentId, kitap_id: catalogBookId })
        toast(imported ? 'Kitap dış katalogdan bulundu, kuruma eklendi ve öğrenciye bağlandı.' : 'Kitap kurum kataloğunda bulundu ve öğrenciye bağlandı.')
      }
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally { setBusy(false) }
  }

  const submitNew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!studentId) return
    setBusy(true)
    const f = new FormData(e.currentTarget)
    const pagesRaw = String(f.get('toplam_sayfa') || '').trim()
    try {
      const saved = await saveCatalogBook({
        kitap_adi: String(f.get('kitap_adi') || '').trim(),
        yayinevi: String(f.get('yayinevi') || '').trim() || null,
        isbn: String(f.get('isbn') || '').trim() || null,
        ders: String(f.get('ders') || '').trim() || null,
        sinav_turu: String(f.get('sinav_turu') || '').trim() || null,
        baski: String(f.get('baski') || '').trim() || null,
        toplam_sayfa: pagesRaw ? Number(pagesRaw) : null,
      })
      await assignBookToStudent({ ogrenci_id: studentId, kitap_id: saved.kitap_id })
      toast('Yeni kitap kataloğa ve öğrencinin kitaplığına eklendi.')
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally { setBusy(false) }
  }

  const students = activeProfiles.map(p => data.ogrenciler.find(x => x.ogrenci_id === p.ogrenci_id)).filter(Boolean)

  return <div className="detail-stack book-search-v1">
    <label>Öğrenci
      <select value={studentId} onChange={e => { setStudentId(e.target.value); setSelectedBookId(''); setSelectedExternalKey('') }} required>
        <option value="">Öğrenci seçin</option>
        {students.map(x => x && <option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
      </select>
    </label>

    {!newBook ? <>
      <label className="wide">Kitap Ara
        <div className="search-box"><Search size={17}/><input value={query} onChange={e => { setQuery(e.target.value); setSelectedBookId(''); setSelectedExternalKey('') }} placeholder="Kitap adı, yayınevi veya ISBN yazın — dış katalogda da aranır" autoComplete="off"/></div>
      </label>
      <div className="form-hint">Önce kurum kataloğu taranır. En az 3 karakter yazınca dış kitap kataloğunda da otomatik arama yapılır. ISBN yazmak en kesin eşleşmeyi verir.</div>

      <div className="book-result-section">
        <div className="book-result-heading"><span>Kurum Kataloğu</span><small>{loading ? 'yükleniyor' : `${filtered.length} sonuç`}</small></div>
        {loading ? <div className="calm-empty"><LoaderCircle className="spin"/><b>Kitap kataloğu yükleniyor…</b></div> : <div className="finance-list">
          {filtered.length ? filtered.map(book => <button type="button" key={book.kitap_id} className={`finance-card ${selectedBookId === book.kitap_id ? 'selected' : ''}`} onClick={() => { setSelectedBookId(book.kitap_id); setSelectedExternalKey('') }}>
            <div className="finance-icon book-cover-shell">{book.kapak_url ? <img src={book.kapak_url} alt="" loading="lazy"/> : <BookOpen/>}</div>
            <div><strong>{book.kitap_adi}</strong><small>{[book.yayinevi, book.ders, book.sinav_turu, book.isbn ? `ISBN ${book.isbn}` : null].filter(Boolean).join(' · ') || 'Katalog kitabı'}</small></div>
            <span className="book-source-pill local">{selectedBookId === book.kitap_id ? 'Seçildi' : 'Kurum'}</span>
          </button>) : <div className="calm-empty compact"><Search/><b>Kurum kataloğunda eşleşme yok.</b><span>Dış katalog araması aşağıda devam ediyor.</span></div>}
        </div>}
      </div>

      {query.trim().length >= 3 && <div className="book-result-section external">
        <div className="book-result-heading"><span><Globe2 size={15}/> Dış Kitap Araması</span><small>{externalLoading ? 'aranıyor…' : externalQuery ? `${externalResults.length} sonuç` : ''}</small></div>
        {externalLoading ? <div className="calm-empty compact"><LoaderCircle className="spin"/><b>Dış katalog taranıyor…</b><span>Kitap adı, yayınevi ve ISBN eşleşmeleri kontrol ediliyor.</span></div> : externalError ? <div className="calm-empty compact"><Globe2/><b>Dış arama şu anda tamamlanamadı.</b><span>{externalError}</span></div> : externalResults.length ? <div className="finance-list">
          {externalResults.map(book => <button type="button" key={book.kaynak_id} className={`finance-card ${selectedExternalKey === book.kaynak_id ? 'selected' : ''}`} onClick={() => { setSelectedExternalKey(book.kaynak_id); setSelectedBookId('') }}>
            <div className="finance-icon book-cover-shell">{book.kapak_url ? <img src={book.kapak_url} alt="" loading="lazy"/> : <BookOpen/>}</div>
            <div><strong>{book.kitap_adi}</strong><small>{[book.yayinevi, book.yayin_yili, book.isbn ? `ISBN ${book.isbn}` : null].filter(Boolean).join(' · ') || 'Dış katalog kaydı'}</small></div>
            <span className="book-source-pill external">{selectedExternalKey === book.kaynak_id ? 'Seçildi' : 'Dış'}</span>
          </button>)}
        </div> : externalQuery ? <div className="calm-empty compact"><Globe2/><b>Dış katalogda da eşleşme bulunamadı.</b><span>ISBN/barkod numarasını deneyin veya kitabı “Katalogda Yok” ile bir kez ekleyin.</span></div> : null}
        {externalResults.length > 0 && <div className="form-hint">Dış kaynak sayfa sayısı baskılar arasında değişebildiği için otomatik kesin veri olarak kaydedilmez. Kitap seçildiğinde başlık, yayınevi, ISBN ve varsa kapak bilgisi kurum kataloğuna alınır.</div>}
      </div>}

      <div className="form-actions book-search-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button>
        <button type="button" className="secondary-btn" onClick={() => setNewBook(true)}><Plus size={16}/>Katalogda Yok</button>
        <button type="button" className="primary-btn" disabled={busy || !studentId || (!selectedBookId && !selectedExternal)} onClick={() => void submitSelected()}>{busy ? 'Ekleniyor…' : selectedExternal ? 'Bul ve Öğrenciye Ekle' : 'Öğrenciye Ekle'}</button>
      </div>
    </> : <form className="form-grid" onSubmit={submitNew}>
      <div className="wide form-hint">Bu kayıt merkezi kataloğa eklenir. Aynı kitap daha sonra diğer öğrenciler için yalnızca aranıp seçilir.</div>
      <label className="wide">Kitap Adı<input name="kitap_adi" required placeholder="Örn. 3D TYT Matematik Soru Bankası"/></label>
      <label>Yayınevi<input name="yayinevi" placeholder="Örn. 3D Yayınları"/></label>
      <label>ISBN / Barkod<input name="isbn" inputMode="numeric" placeholder="Varsa barkod numarası"/></label>
      <label>Ders<input name="ders" placeholder="Örn. Matematik"/></label>
      <label>Sınav Türü<select name="sinav_turu" defaultValue=""><option value="">Seçin</option><option>YKS</option><option>LGS</option><option>MSÜ</option><option>Diğer</option></select></label>
      <label>Baskı<input name="baski" placeholder="Varsa baskı bilgisi"/></label>
      <label>Toplam Sayfa<input name="toplam_sayfa" type="number" min="1" inputMode="numeric"/></label>
      <div className="wide form-actions">
        <button type="button" className="secondary-btn" onClick={() => setNewBook(false)}>Aramaya Dön</button>
        <button type="submit" className="primary-btn" disabled={busy || !studentId}>{busy ? 'Ekleniyor…' : 'Kitabı Ekle'}</button>
      </div>
    </form>}
  </div>
}
