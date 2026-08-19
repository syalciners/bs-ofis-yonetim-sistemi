import { BookOpenCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { addDays, mondayOf, todayISO } from '../lib/format'
import { loadStudentBooks, saveCoachingStudy, type KoclukOgrenciProfili, type OgrenciKitabi } from '../services/coachingService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function CoachingStudyForm({
  profiles,
  onNeedBook,
  onDone,
  onCancel,
}: {
  profiles: KoclukOgrenciProfili[]
  onNeedBook: () => void
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { data, refresh } = useAppData()
  const { toast } = useToast()
  const activeProfiles = profiles.filter(x => x.durum === 'Aktif')
  const [studentId, setStudentId] = useState(activeProfiles.length === 1 ? activeProfiles[0].ogrenci_id : '')
  const [books, setBooks] = useState<OgrenciKitabi[]>([])
  const [bookId, setBookId] = useState('')
  const [type, setType] = useState<'Sayfa' | 'Test' | 'Konu'>('Sayfa')
  const [startNo, setStartNo] = useState('')
  const [endNo, setEndNo] = useState('')
  const [detail, setDetail] = useState('')
  const [dueDate, setDueDate] = useState(addDays(mondayOf(todayISO()), 6))
  const [busy, setBusy] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)

  useEffect(() => {
    if (!studentId) { setBooks([]); setBookId(''); return }
    setLoadingBooks(true)
    void loadStudentBooks(studentId)
      .then(rows => { setBooks(rows); setBookId(rows.length === 1 ? rows[0].ogrenci_kitap_id : '') })
      .catch((err: any) => toast(err?.message || String(err), 'error'))
      .finally(() => setLoadingBooks(false))
  }, [studentId, toast])

  const lastEnd = useMemo(() => {
    if (!data || !studentId || !bookId || type === 'Konu') return null
    const values = data.odevler
      .filter(x => x.ogrenci_id === studentId && x.ogrenci_kitap_id === bookId && x.calisma_turu === type && x.bitis_no)
      .map(x => Number(x.bitis_no))
    return values.length ? Math.max(...values) : null
  }, [data, studentId, bookId, type])

  useEffect(() => {
    if (type === 'Konu') { setStartNo(''); setEndNo(''); return }
    setStartNo(lastEnd ? String(lastEnd + 1) : '')
    setEndNo('')
  }, [lastEnd, type, bookId])

  if (!data) return null
  const students = activeProfiles.map(p => data.ogrenciler.find(x => x.ogrenci_id === p.ogrenci_id)).filter(Boolean)
  const selectedBook = books.find(x => x.ogrenci_kitap_id === bookId)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    try {
      await saveCoachingStudy({
        ogrenci_id: studentId,
        ogrenci_kitap_id: bookId,
        calisma_turu: type,
        baslangic_no: type === 'Konu' ? null : Number(startNo),
        bitis_no: type === 'Konu' ? null : Number(endNo),
        calisma_detayi: type === 'Konu' ? detail.trim() : null,
        son_teslim_tarihi: dueDate || null,
        oncelik: String(new FormData(e.currentTarget).get('oncelik') || 'Normal'),
        aciklama: String(new FormData(e.currentTarget).get('aciklama') || '').trim() || null,
      })
      await refresh()
      toast('Çalışma haftalık plana eklendi.')
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally { setBusy(false) }
  }

  return <form className="form-grid" onSubmit={submit}>
    <label>Öğrenci
      <select value={studentId} onChange={e => setStudentId(e.target.value)} required>
        <option value="">Öğrenci seçin</option>
        {students.map(x => x && <option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
      </select>
    </label>
    <label>Kitap
      <select value={bookId} onChange={e => setBookId(e.target.value)} required disabled={!studentId || loadingBooks}>
        <option value="">{loadingBooks ? 'Kitaplar yükleniyor…' : 'Kitap seçin'}</option>
        {books.map(x => <option key={x.ogrenci_kitap_id} value={x.ogrenci_kitap_id}>{x.kitap?.kitap_adi || 'Kitap'}</option>)}
      </select>
    </label>

    {studentId && !loadingBooks && books.length === 0 && <div className="wide calm-empty"><BookOpenCheck/><b>Bu öğrencinin kitabı henüz tanımlı değil.</b><span>Kitabı bir kez ekleyin; sonraki görevlerde sadece seçip sayfa aralığı yazılır.</span><button type="button" className="secondary-btn" onClick={onNeedBook}>Kitap Ekle</button></div>}

    <label>Çalışma Türü
      <select value={type} onChange={e => setType(e.target.value as 'Sayfa' | 'Test' | 'Konu')}>
        <option>Sayfa</option><option>Test</option><option>Konu</option>
      </select>
    </label>
    <label>Son Teslim<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required/></label>

    {type !== 'Konu' ? <>
      <label>Başlangıç<input type="number" min="1" inputMode="numeric" value={startNo} onChange={e => setStartNo(e.target.value)} placeholder={lastEnd ? String(lastEnd + 1) : 'Örn. 42'} required/></label>
      <label>Bitiş<input type="number" min={startNo || '1'} inputMode="numeric" value={endNo} onChange={e => setEndNo(e.target.value)} placeholder="Örn. 58" required/></label>
      {lastEnd && <div className="wide form-hint">{selectedBook?.kitap?.kitap_adi || 'Bu kitap'} için son kayıt {lastEnd}. sayfada/testte bitmiş; başlangıç otomatik {lastEnd + 1} olarak önerildi.</div>}
    </> : <label className="wide">Konu / Bölüm<input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Örn. Problemler · Yaş Problemleri" required/></label>}

    <label className="wide">Öncelik<select name="oncelik" defaultValue="Normal"><option>Düşük</option><option>Normal</option><option>Yüksek</option></select></label>
    <label className="wide">Kısa Not <span className="optional">(isteğe bağlı)</span><textarea name="aciklama" rows={2} placeholder="Yalnız gerekiyorsa ek not yazın."/></label>

    <div className="wide form-actions">
      <button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button>
      <button type="submit" className="primary-btn" disabled={busy || !studentId || !bookId}>{busy ? 'Kaydediliyor…' : 'Çalışmayı Ekle'}</button>
    </div>
  </form>
}
