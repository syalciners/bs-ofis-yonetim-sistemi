import { BookOpen, Check, Globe2, LoaderCircle, Plus, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { studentName, type CatalogBook, type CoachData } from './data'
import { supabase } from './supabase'

type ExternalBook = {
  kaynak: 'Open Library'
  kaynak_id: string
  kitap_adi: string
  yayinevi?: string | null
  isbn?: string | null
  kapak_url?: string | null
  yayin_yili?: number | null
}

const cleanIsbn = (value?: string | null) => String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
const normalize = (value?: string | null) => String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')

function smartQuery(value: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\bmat\b/gi, 'matematik'],
    [/\bmatem\b/gi, 'matematik'],
    [/\bfen\b/gi, 'fen bilimleri'],
    [/\bturkce\b/gi, 'türkçe'],
    [/\bsinif\b/gi, 'sınıf'],
    [/\bsb\b/gi, 'soru bankası'],
  ]
  let result = value.trim().replace(/\s+/g, ' ')
  for (const [pattern, replacement] of replacements) result = result.replace(pattern, replacement)
  result = result.replace(/\b([1-8])\s+sınıf\b/gi, '$1. sınıf')
  return result.trim()
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('yönetici') || text.includes('yetki')) return 'Bu işlem için yönetici yetkisi gerekiyor.'
  if (text.includes('oturum') || text.includes('jwt')) return 'Oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin.'
  if (text.includes('isbn')) return 'ISBN bilgisi kontrol edilemedi. Başka bir sonuç deneyin.'
  if (text.includes('duplicate') || text.includes('unique')) return 'Bu kitap zaten katalogda veya öğrencinin kitaplığında olabilir.'
  return 'Kitap eklenemedi. Lütfen tekrar deneyin.'
}

async function searchLocalBooks(query: string): Promise<CatalogBook[]> {
  const q = query.trim().replace(/[%,()]/g, ' ').replace(/\s+/g, ' ')
  let request = supabase
    .from('kitap_katalogu')
    .select('kitap_id,kitap_adi,yayinevi,isbn,ders,sinav_turu,baski,toplam_sayfa,kapak_url,durum')
    .eq('durum', 'Onaylı')
    .order('kitap_adi', { ascending: true })
    .limit(12)

  if (q) request = request.or(`kitap_adi.ilike.%${q}%,yayinevi.ilike.%${q}%,isbn.ilike.%${q}%,ders.ilike.%${q}%`)
  const { data, error } = await request
  if (error) throw error
  return (data || []) as CatalogBook[]
}

async function searchExternalBooks(query: string): Promise<ExternalBook[]> {
  const expanded = smartQuery(query)
  const { data, error } = await supabase.functions.invoke('kitap-arama-v1', { body: { query: expanded, limit: 10 } })
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return Array.isArray(data?.sonuclar) ? data.sonuclar as ExternalBook[] : []
}

async function findCatalogMatch(book: ExternalBook): Promise<CatalogBook | null> {
  const isbn = cleanIsbn(book.isbn)
  if (isbn) {
    const { data, error } = await supabase
      .from('kitap_katalogu')
      .select('kitap_id,kitap_adi,yayinevi,isbn,ders,sinav_turu,baski,toplam_sayfa,kapak_url,durum')
      .eq('isbn', isbn)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data) return data as CatalogBook
  }
  return null
}

async function saveCatalogBook(book: { kitap_adi: string; yayinevi?: string | null; isbn?: string | null; kapak_url?: string | null }) {
  const { data, error } = await supabase.rpc('kitap_katalogu_kaydet_guvenli_v1', {
    p_kitap_id: null,
    p_kitap_adi: book.kitap_adi,
    p_yayinevi: book.yayinevi || null,
    p_isbn: cleanIsbn(book.isbn) || null,
    p_ders: null,
    p_sinav_turu: null,
    p_baski: null,
    p_toplam_sayfa: null,
    p_kapak_url: book.kapak_url || null,
  })
  if (error) throw error
  return data as { kitap_id: string }
}

async function assignToStudent(studentId: string, bookId: string) {
  const { data, error } = await supabase.rpc('ogrenci_kitabi_kaydet_guvenli_v1', {
    p_ogrenci_id: studentId,
    p_kitap_id: bookId,
    p_notlar: null,
  })
  if (error) throw error
  return data as { ogrenci_kitap_id: string }
}

export function BookAdd({
  data,
  initialStudentId,
  onClose,
  onSaved,
}: {
  data: CoachData
  initialStudentId?: string
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const validInitial = initialStudentId && data.coachingProfiles.some(x => x.ogrenci_id === initialStudentId) ? initialStudentId : ''
  const singleStudent = data.coachingProfiles.length === 1 ? data.coachingProfiles[0].ogrenci_id : ''
  const [studentId, setStudentId] = useState(validInitial || singleStudent)
  const [query, setQuery] = useState('')
  const [local, setLocal] = useState<CatalogBook[]>([])
  const [external, setExternal] = useState<ExternalBook[]>([])
  const [selectedLocalId, setSelectedLocalId] = useState('')
  const [selectedExternalId, setSelectedExternalId] = useState('')
  const [loadingLocal, setLoadingLocal] = useState(true)
  const [loadingExternal, setLoadingExternal] = useState(false)
  const [externalError, setExternalError] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let live = true
    setLoadingLocal(true)
    const timer = window.setTimeout(() => {
      void searchLocalBooks(query)
        .then(rows => { if (live) setLocal(rows) })
        .catch(err => { if (live) setError(friendlyError(err?.message || String(err))) })
        .finally(() => { if (live) setLoadingLocal(false) })
    }, query.trim() ? 220 : 0)
    return () => { live = false; window.clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    const q = query.trim()
    if (manual || q.length < 3) {
      setExternal([])
      setExternalError(null)
      setLoadingExternal(false)
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      setLoadingExternal(true)
      setExternalError(null)
      void searchExternalBooks(q)
        .then(rows => { if (live) setExternal(rows) })
        .catch(err => { if (live) { setExternal([]); setExternalError(err?.message || String(err)) } })
        .finally(() => { if (live) setLoadingExternal(false) })
    }, 650)
    return () => { live = false; window.clearTimeout(timer) }
  }, [query, manual])

  const selectedLocal = local.find(x => x.kitap_id === selectedLocalId) || null
  const selectedExternal = external.find(x => x.kaynak_id === selectedExternalId) || null
  const expanded = useMemo(() => smartQuery(query), [query])

  const addSelected = async () => {
    if (!studentId || (!selectedLocal && !selectedExternal)) return
    setBusy(true)
    setError(null)
    try {
      let bookId = selectedLocal?.kitap_id || ''
      if (!bookId && selectedExternal) {
        const existing = await findCatalogMatch(selectedExternal)
        if (existing) bookId = existing.kitap_id
        else bookId = (await saveCatalogBook(selectedExternal)).kitap_id
      }
      await assignToStudent(studentId, bookId)
      setSaved(true)
      await onSaved()
      window.setTimeout(onClose, 650)
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setBusy(false)
    }
  }

  const addManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentId) return setError('Önce öğrenciyi seçin.')
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const kitapAdi = String(form.get('kitap_adi') || '').trim()
      const yayinevi = String(form.get('yayinevi') || '').trim() || null
      const isbn = cleanIsbn(String(form.get('isbn') || '')) || null
      if (!kitapAdi) throw new Error('Kitap adı gerekli.')
      let bookId = ''
      if (isbn) {
        const existing = await findCatalogMatch({ kaynak: 'Open Library', kaynak_id: isbn, kitap_adi: kitapAdi, yayinevi, isbn })
        if (existing) bookId = existing.kitap_id
      }
      if (!bookId) bookId = (await saveCatalogBook({ kitap_adi: kitapAdi, yayinevi, isbn })).kitap_id
      await assignToStudent(studentId, bookId)
      setSaved(true)
      await onSaved()
      window.setTimeout(onClose, 650)
    } catch (err: any) {
      setError(err?.message === 'Kitap adı gerekli.' ? err.message : friendlyError(err?.message || String(err)))
    } finally {
      setBusy(false)
    }
  }

  return <div className="quick-study-overlay book-add-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="quick-study-sheet book-add-sheet" role="dialog" aria-modal="true" aria-labelledby="book-add-title">
      <header className="quick-study-head">
        <div><span><Sparkles/> AKILLI KİTAP BUL</span><h2 id="book-add-title">Kitap ekle</h2><p>Adını bildiğiniz kadar yazın. Sistem önce kurum kataloğunu, sonra dış kataloğu tarar.</p></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Kapat"><X/></button>
      </header>

      {!validInitial && data.coachingProfiles.length > 1 && <label className="book-add-field"><span>Öğrenci</span><select value={studentId} onChange={event => setStudentId(event.target.value)} required><option value="">Öğrenci seçin</option>{data.coachingProfiles.map(profile => <option key={profile.ogrenci_id} value={profile.ogrenci_id}>{studentName(data, profile.ogrenci_id)}</option>)}</select></label>}
      {studentId && <div className="quick-study-student"><span>Öğrenci</span><strong>{studentName(data, studentId)}</strong></div>}

      {!manual ? <>
        <label className="book-add-search"><Search/><input autoFocus value={query} onChange={event => { setQuery(event.target.value); setSelectedLocalId(''); setSelectedExternalId('') }} placeholder="Örn. fenomen 6 mat a veya ISBN" autoComplete="off"/></label>
        {query.trim() && expanded !== query.trim() && <div className="book-add-smart-hint"><Sparkles/><span>Akıllı arama <b>{expanded}</b> olarak genişletildi.</span></div>}

        <section className="book-add-section">
          <div className="book-add-section-head"><span>Kurum kataloğu</span>{loadingLocal && <LoaderCircle className="spin"/>}</div>
          {!loadingLocal && local.length === 0 ? <div className="book-add-empty"><BookOpen/><span>Kurum kataloğunda eşleşme yok.</span></div> : <div className="book-add-results">{local.map(book => <button type="button" key={book.kitap_id} className={selectedLocalId === book.kitap_id ? 'selected' : ''} onClick={() => { setSelectedLocalId(book.kitap_id); setSelectedExternalId('') }}><span className="book-add-cover">{book.kapak_url ? <img src={book.kapak_url} alt="" loading="lazy"/> : <BookOpen/>}</span><span className="book-add-copy"><b>{book.kitap_adi}</b><small>{[book.yayinevi, book.ders, book.isbn ? `ISBN ${book.isbn}` : null].filter(Boolean).join(' · ') || 'Katalog kitabı'}</small></span>{selectedLocalId === book.kitap_id && <Check/>}</button>)}</div>}
        </section>

        {query.trim().length >= 3 && <section className="book-add-section external">
          <div className="book-add-section-head"><span><Globe2/> Dış katalog</span>{loadingExternal && <LoaderCircle className="spin"/>}</div>
          {externalError ? <div className="book-add-empty"><Globe2/><span>Dış arama şu anda tamamlanamadı. Kurum kataloğu kullanılmaya devam edebilir.</span></div> : !loadingExternal && external.length === 0 ? <div className="book-add-empty"><Search/><span>Dış katalogda eşleşme bulunamadı.</span></div> : <div className="book-add-results">{external.map(book => <button type="button" key={book.kaynak_id} className={selectedExternalId === book.kaynak_id ? 'selected' : ''} onClick={() => { setSelectedExternalId(book.kaynak_id); setSelectedLocalId('') }}><span className="book-add-cover">{book.kapak_url ? <img src={book.kapak_url} alt="" loading="lazy"/> : <BookOpen/>}</span><span className="book-add-copy"><b>{book.kitap_adi}</b><small>{[book.yayinevi, book.yayin_yili, book.isbn ? `ISBN ${book.isbn}` : null].filter(Boolean).join(' · ') || 'Dış katalog kaydı'}</small></span>{selectedExternalId === book.kaynak_id && <Check/>}</button>)}</div>}
          <small className="book-add-note">Baskıya göre sayfa numarası değişebildiği için dış kaynaktaki sayfa sayısı otomatik kesin bilgi olarak kaydedilmez.</small>
        </section>}

        {error && <div className="quick-study-error">{error}</div>}
        {saved && <div className="quick-study-success"><Check/> Kitap öğrenciye eklendi.</div>}

        <footer className="quick-study-actions book-add-actions">
          <button type="button" className="quick-study-cancel" onClick={() => setManual(true)} disabled={busy}><Plus/> Bulamadım</button>
          <button type="button" className="quick-study-save" onClick={() => void addSelected()} disabled={busy || !studentId || (!selectedLocal && !selectedExternal) || saved}>{busy ? 'Ekleniyor…' : 'Öğrenciye Ekle'}</button>
        </footer>
      </> : <form className="book-add-manual" onSubmit={addManual}>
        <div className="book-add-smart-hint"><BookOpen/><span>Yalnız bildiğiniz bilgileri girin. Kitap adı yeterlidir.</span></div>
        <label className="book-add-field"><span>Kitap adı</span><input name="kitap_adi" autoFocus required placeholder="Örn. Fenomen 6. Sınıf Matematik A"/></label>
        <label className="book-add-field"><span>Yayınevi <small>isteğe bağlı</small></span><input name="yayinevi" placeholder="Fenomen Yayıncılık"/></label>
        <label className="book-add-field"><span>ISBN / barkod <small>isteğe bağlı</small></span><input name="isbn" inputMode="numeric" placeholder="978..."/></label>
        {error && <div className="quick-study-error">{error}</div>}
        {saved && <div className="quick-study-success"><Check/> Kitap öğrenciye eklendi.</div>}
        <footer className="quick-study-actions"><button type="button" className="quick-study-cancel" onClick={() => { setManual(false); setError(null) }} disabled={busy}>Aramaya dön</button><button type="submit" className="quick-study-save" disabled={busy || !studentId || saved}>{busy ? 'Ekleniyor…' : 'Kitabı Ekle'}</button></footer>
      </form>}
    </section>
  </div>
}
