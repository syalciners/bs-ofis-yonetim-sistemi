import { BookOpen, Check, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { bookForStudentBook, isoToday, studentName, type Assignment, type CoachData } from './data'
import { supabase } from './supabase'

type StudyType = 'Sayfa' | 'Test' | 'Konu'

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return localIso(date)
}

function sundayOfCurrentWeek() {
  const today = new Date()
  const offset = today.getDay() === 0 ? 0 : 7 - today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + offset)
  return localIso(sunday)
}

function assignmentDate(item: Assignment) {
  return item.verilis_tarihi || item.son_teslim_tarihi || ''
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('geçmiş') || text.includes('past')) return 'Teslim tarihi geçmişte olamaz.'
  if (text.includes('aktif') && text.includes('koçluk')) return 'Öğrencinin aktif koçluk profili bulunamadı.'
  if (text.includes('kitap')) return 'Seçilen kitap öğrenciye bağlı değil veya artık aktif değil.'
  return 'Çalışma kaydedilemedi. Lütfen tekrar deneyin.'
}

export function QuickStudy({
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
  const validInitial = initialStudentId && data.coachingProfiles.some(x => x.ogrenci_id === initialStudentId)
    ? initialStudentId
    : ''
  const singleStudent = data.coachingProfiles.length === 1 ? data.coachingProfiles[0].ogrenci_id : ''
  const [studentId, setStudentId] = useState(validInitial || singleStudent)
  const [bookId, setBookId] = useState('')
  const [type, setType] = useState<StudyType>('Sayfa')
  const [startNo, setStartNo] = useState('')
  const [endNo, setEndNo] = useState('')
  const [detail, setDetail] = useState('')
  const [dueDate, setDueDate] = useState(sundayOfCurrentWeek())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const studentBooks = useMemo(
    () => data.studentBooks.filter(x => x.ogrenci_id === studentId),
    [data.studentBooks, studentId],
  )

  const recommendedBookId = useMemo(() => {
    if (!studentId || !studentBooks.length) return ''
    const recent = [...data.assignments]
      .filter(x => x.ogrenci_id === studentId && x.ogrenci_kitap_id && studentBooks.some(book => book.ogrenci_kitap_id === x.ogrenci_kitap_id))
      .sort((a, b) => assignmentDate(b).localeCompare(assignmentDate(a)))[0]
    if (recent?.ogrenci_kitap_id) return recent.ogrenci_kitap_id
    return studentBooks.length === 1 ? studentBooks[0].ogrenci_kitap_id : studentBooks[0].ogrenci_kitap_id
  }, [data.assignments, studentBooks, studentId])

  useEffect(() => {
    setBookId(recommendedBookId)
    setEndNo('')
    setDetail('')
  }, [recommendedBookId, studentId])

  const lastAssignment = useMemo(() => {
    if (!studentId || !bookId || type === 'Konu') return null
    return [...data.assignments]
      .filter(x => x.ogrenci_id === studentId && x.ogrenci_kitap_id === bookId && x.calisma_turu === type && x.bitis_no != null)
      .sort((a, b) => assignmentDate(b).localeCompare(assignmentDate(a)))[0] || null
  }, [data.assignments, studentId, bookId, type])

  const suggestedStart = lastAssignment?.bitis_no != null ? Number(lastAssignment.bitis_no) + 1 : null

  useEffect(() => {
    if (type === 'Konu') {
      setStartNo('')
      setEndNo('')
      return
    }
    setStartNo(suggestedStart ? String(suggestedStart) : '')
    setEndNo('')
  }, [bookId, suggestedStart, type])

  const selectedBook = bookId ? bookForStudentBook(data, bookId) : null
  const today = isoToday()
  const quickDates = Array.from(new Map([
    ['Bugün', today],
    ['Yarın', addDays(today, 1)],
    ['Pazar', sundayOfCurrentWeek()],
  ].map(([label, value]) => [value, { label, value }])).values())

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!studentId) return setError('Öğrenci seçin.')
    if (!bookId) return setError('Önce öğrencinin kitabını seçin.')
    if (dueDate < today) return setError('Teslim tarihi geçmişte olamaz.')

    const start = type === 'Konu' ? null : Number(startNo)
    const end = type === 'Konu' ? null : Number(endNo)
    if (type !== 'Konu' && (!Number.isFinite(start) || !Number.isFinite(end) || Number(start) < 1 || Number(end) < Number(start))) {
      return setError('Başlangıç ve bitiş aralığını kontrol edin.')
    }
    if (type === 'Konu' && !detail.trim()) return setError('Konu veya bölüm adını yazın.')

    setBusy(true)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('kocluk_calisma_kaydet_guvenli_v1', {
        p_ogrenci_id: studentId,
        p_ogrenci_kitap_id: bookId,
        p_calisma_turu: type,
        p_baslangic_no: start,
        p_bitis_no: end,
        p_calisma_detayi: type === 'Konu' ? detail.trim() : null,
        p_son_teslim_tarihi: dueDate,
        p_oncelik: 'Normal',
        p_aciklama: null,
      })
      if (rpcError) throw rpcError
      const title = (result as { baslik?: string } | null)?.baslik
      setSaved(title || 'Çalışma plana eklendi.')
      await onSaved()
      window.setTimeout(onClose, 700)
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setBusy(false)
    }
  }

  return <div className="quick-study-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="quick-study-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-study-title">
      <header className="quick-study-head">
        <div><span><Sparkles/> HIZLI ÇALIŞMA</span><h2 id="quick-study-title">Çalışma ekle</h2><p>Öğrenci, kitap ve aralık. Geri kalanını sistem hazırlar.</p></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Kapat"><X/></button>
      </header>

      <form onSubmit={submit} className="quick-study-form">
        {!validInitial && data.coachingProfiles.length > 1 && <label className="quick-study-field">
          <span>Öğrenci</span>
          <select value={studentId} onChange={event => setStudentId(event.target.value)} required>
            <option value="">Öğrenci seçin</option>
            {data.coachingProfiles.map(profile => <option key={profile.ogrenci_id} value={profile.ogrenci_id}>{studentName(data, profile.ogrenci_id)}</option>)}
          </select>
        </label>}

        {studentId && <div className="quick-study-student"><span>Öğrenci</span><strong>{studentName(data, studentId)}</strong></div>}

        {studentId && studentBooks.length > 0 && <fieldset className="quick-study-books">
          <legend>Kitap</legend>
          <div>{studentBooks.map(link => {
            const book = bookForStudentBook(data, link.ogrenci_kitap_id)
            const selected = link.ogrenci_kitap_id === bookId
            return <button key={link.ogrenci_kitap_id} type="button" className={selected ? 'selected' : ''} onClick={() => setBookId(link.ogrenci_kitap_id)}>
              <BookOpen/><span><b>{book?.kitap_adi || 'Kitap'}</b><small>{[book?.ders, book?.yayinevi].filter(Boolean).join(' · ') || 'Aktif kitap'}</small></span>{selected && <Check/>}
            </button>
          })}</div>
        </fieldset>}

        {studentId && studentBooks.length === 0 && <div className="quick-study-no-book"><BookOpen/><div><b>Aktif kitap bulunmuyor.</b><span>Bu öğrenciye bir kitap bağlandıktan sonra çalışma iki adımda verilebilir.</span></div></div>}

        {bookId && <>
          <div className="quick-study-types" role="group" aria-label="Çalışma türü">
            {(['Sayfa', 'Test', 'Konu'] as StudyType[]).map(value => <button key={value} type="button" className={type === value ? 'selected' : ''} onClick={() => setType(value)}>{value}</button>)}
          </div>

          {type !== 'Konu' ? <div className="quick-study-range">
            <label><span>Başlangıç</span><input type="number" min="1" inputMode="numeric" value={startNo} onChange={event => setStartNo(event.target.value)} placeholder="42" required/></label>
            <span className="range-separator">→</span>
            <label className="range-end"><span>Bitiş</span><input autoFocus type="number" min={startNo || '1'} inputMode="numeric" value={endNo} onChange={event => setEndNo(event.target.value)} placeholder="58" required/></label>
          </div> : <label className="quick-study-field"><span>Konu / Bölüm</span><input autoFocus value={detail} onChange={event => setDetail(event.target.value)} placeholder="Örn. Problemler · Yaş Problemleri" required/></label>}

          {suggestedStart && type !== 'Konu' && <div className="quick-study-suggestion"><Sparkles/><span><b>{selectedBook?.kitap_adi || 'Bu kitap'}</b> son çalışmada {lastAssignment?.bitis_no}. noktada kaldı. Başlangıç {suggestedStart} olarak hazırlandı.</span></div>}

          <div className="quick-study-date-block">
            <span>Son teslim</span>
            <div className="quick-date-chips">{quickDates.map(item => <button type="button" key={item.value} className={dueDate === item.value ? 'selected' : ''} onClick={() => setDueDate(item.value)}>{item.label}</button>)}</div>
            <input type="date" value={dueDate} min={today} onChange={event => setDueDate(event.target.value)} required/>
          </div>
        </>}

        {error && <div className="quick-study-error">{error}</div>}
        {saved && <div className="quick-study-success"><Check/> {saved}</div>}

        <footer className="quick-study-actions">
          <button type="button" className="quick-study-cancel" onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className="quick-study-save" disabled={busy || !studentId || !bookId || Boolean(saved)}>{busy ? 'Ekleniyor…' : 'Çalışmayı Ekle'}</button>
        </footer>
      </form>
    </section>
  </div>
}
