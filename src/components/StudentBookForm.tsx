import { BookOpen, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { assignBookToStudent, loadBookCatalog, saveCatalogBook, type KitapKatalogKaydi, type KoclukOgrenciProfili } from '../services/coachingService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

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

  const submitExisting = async () => {
    if (!studentId || !selectedBookId) return
    setBusy(true)
    try {
      await assignBookToStudent({ ogrenci_id: studentId, kitap_id: selectedBookId })
      toast('Kitap öğrencinin kitaplığına eklendi.')
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

  return <div className="detail-stack">
    <label>Öğrenci
      <select value={studentId} onChange={e => { setStudentId(e.target.value); setSelectedBookId('') }} required>
        <option value="">Öğrenci seçin</option>
        {students.map(x => x && <option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
      </select>
    </label>

    {!newBook ? <>
      <label className="wide">Kitap Ara
        <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kitap adı, yayınevi veya ISBN yazın"/></div>
      </label>
      {loading ? <div className="calm-empty"><BookOpen/><b>Kitap kataloğu yükleniyor…</b></div> : <div className="finance-list">
        {filtered.length ? filtered.map(book => <button type="button" key={book.kitap_id} className={`finance-card ${selectedBookId === book.kitap_id ? 'selected' : ''}`} onClick={() => setSelectedBookId(book.kitap_id)}>
          <div className="finance-icon"><BookOpen/></div>
          <div><strong>{book.kitap_adi}</strong><small>{[book.yayinevi, book.ders, book.sinav_turu].filter(Boolean).join(' · ') || 'Katalog kitabı'}</small></div>
          {selectedBookId === book.kitap_id && <span className="soft-pill">Seçildi</span>}
        </button>) : <div className="calm-empty"><Search/><b>Katalogda eşleşen kitap bulunamadı.</b><span>Kitabı bir kez ekleyin; sonraki öğrenciler aramadan seçebilir.</span></div>}
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button>
        <button type="button" className="secondary-btn" onClick={() => setNewBook(true)}><Plus size={16}/>Katalogda Yok</button>
        <button type="button" className="primary-btn" disabled={busy || !studentId || !selectedBookId} onClick={() => void submitExisting()}>{busy ? 'Ekleniyor…' : 'Öğrenciye Ekle'}</button>
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
