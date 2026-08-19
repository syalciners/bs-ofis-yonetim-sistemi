import { Calculator, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { todayISO } from '../lib/format'
import { saveFullCoachingExam, type DenemeTuru } from '../services/examService'
import type { KoclukOgrenciProfili } from '../services/coachingService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

type RowState = {
  key: string
  bolum_adi: string
  soru_sayisi: string
  dogru: string
  yanlis: string
}

const presetRows = (type: DenemeTuru): RowState[] => {
  const rows: Array<[string, number]> = type === 'LGS'
    ? [['Türkçe', 20], ['T.C. İnkılap Tarihi ve Atatürkçülük', 10], ['Din Kültürü ve Ahlak Bilgisi', 10], ['İngilizce', 10], ['Matematik', 20], ['Fen Bilimleri', 20]]
    : type === 'TYT'
      ? [['Türkçe', 40], ['Sosyal Bilimler', 20], ['Temel Matematik', 40], ['Fen Bilimleri', 20]]
      : type === 'AYT'
        ? [['Türk Dili ve Edebiyatı-Sosyal Bilimler-1', 40], ['Sosyal Bilimler-2', 40], ['Matematik', 40], ['Fen Bilimleri', 40]]
        : [['', 0]]
  return rows.map(([bolum_adi, soru_sayisi], i) => ({ key: `${type}-${i}-${bolum_adi}`, bolum_adi, soru_sayisi: soru_sayisi ? String(soru_sayisi) : '', dogru: '', yanlis: '' }))
}

const n = (value: string) => Number(value || 0)
const nullableNumber = (value: string) => value.trim() === '' ? null : Number(value)

export function ExamResultForm({ profiles, onDone, onCancel }: {
  profiles: KoclukOgrenciProfili[]
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { data } = useAppData()
  const { toast } = useToast()
  const activeProfiles = profiles.filter(x => x.durum === 'Aktif')
  const [studentId, setStudentId] = useState(activeProfiles.length === 1 ? activeProfiles[0].ogrenci_id : '')
  const profileExamType = activeProfiles.find(x => x.ogrenci_id === studentId)?.sinav_turu
  const initialType: DenemeTuru = ['LGS', 'TYT', 'AYT'].includes(String(profileExamType)) ? profileExamType as DenemeTuru : 'LGS'
  const [examType, setExamType] = useState<DenemeTuru>(initialType)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState(todayISO())
  const [publisher, setPublisher] = useState('')
  const [wrongDivisor, setWrongDivisor] = useState(initialType === 'LGS' ? '3' : '4')
  const [score, setScore] = useState('')
  const [rank, setRank] = useState('')
  const [percentile, setPercentile] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<RowState[]>(presetRows(initialType))
  const [busy, setBusy] = useState(false)

  if (!data) return null
  const students = activeProfiles.map(p => data.ogrenciler.find(x => x.ogrenci_id === p.ogrenci_id)).filter(Boolean)
  const divisor = Math.max(Number(wrongDivisor || 0), 0.01)

  const rowStats = useMemo(() => rows.map(row => {
    const q = n(row.soru_sayisi)
    const d = n(row.dogru)
    const y = n(row.yanlis)
    const blank = Math.max(q - d - y, 0)
    const invalid = q <= 0 || d < 0 || y < 0 || d + y > q || !row.bolum_adi.trim()
    const net = Number((d - y / divisor).toFixed(2))
    return { q, d, y, blank, invalid, net }
  }), [rows, divisor])

  const totalNet = Number(rowStats.reduce((sum, x) => sum + x.net, 0).toFixed(2))
  const totalQuestions = rowStats.reduce((sum, x) => sum + x.q, 0)
  const totalAnswered = rowStats.reduce((sum, x) => sum + x.d + x.y, 0)
  const canSave = Boolean(studentId && examName.trim() && examDate && rows.length && !rowStats.some(x => x.invalid) && totalAnswered > 0 && divisor > 0)

  const changeType = (next: DenemeTuru) => {
    setExamType(next)
    setWrongDivisor(next === 'LGS' ? '3' : '4')
    setRows(presetRows(next))
  }

  const updateRow = (index: number, field: keyof Omit<RowState, 'key'>, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const addRow = () => setRows(prev => [...prev, { key: `custom-${Date.now()}-${prev.length}`, bolum_adi: '', soru_sayisi: '', dogru: '', yanlis: '' }])
  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index))

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      const result = await saveFullCoachingExam({
        ogrenci_id: studentId,
        sinav_turu: examType,
        deneme_adi: examName.trim(),
        deneme_tarihi: examDate,
        yayinevi: publisher.trim() || null,
        veri_kaynagi: 'Manuel',
        yanlis_boleni: divisor,
        puan: nullableNumber(score),
        siralama: nullableNumber(rank),
        yuzdelik: nullableNumber(percentile),
        notlar: notes.trim() || null,
        bolumler: rows.map((row, index) => ({
          bolum_adi: row.bolum_adi.trim(),
          sira_no: index + 1,
          dogru: n(row.dogru),
          yanlis: n(row.yanlis),
          bos: rowStats[index].blank,
          soru_sayisi: n(row.soru_sayisi),
        })),
      })
      toast(`Deneme kaydedildi · ${Number(result.toplam_net).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net`)
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally { setBusy(false) }
  }

  return <form className="form-grid exam-result-form" onSubmit={submit}>
    <label>Öğrenci
      <select value={studentId} onChange={e => setStudentId(e.target.value)} required>
        <option value="">Koçluk öğrencisi seçin</option>
        {students.map(x => x && <option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
      </select>
    </label>
    <label>Sınav Türü
      <select value={examType} onChange={e => changeType(e.target.value as DenemeTuru)}>
        <option>LGS</option><option>TYT</option><option>AYT</option><option>Diğer</option>
      </select>
    </label>
    <label className="wide">Deneme Adı<input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Örn. Türkiye Geneli 3. Deneme" required/></label>
    <label>Deneme Tarihi<input type="date" max={todayISO()} value={examDate} onChange={e => setExamDate(e.target.value)} required/></label>
    <label>Yayın / Kurum <span className="optional">(isteğe bağlı)</span><input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Örn. Fenomen"/></label>

    <div className="wide exam-rule-strip"><Calculator size={18}/><span><b>Net kuralı</b><small>{examType === 'LGS' ? '2026 LGS için 3 yanlış 1 doğruyu götürür.' : examType === 'TYT' || examType === 'AYT' ? 'YKS için 4 yanlış 1 doğruyu götürür.' : 'Kurum/sınav kuralına göre değiştirilebilir.'}</small></span><label>Yanlış böleni<input type="number" min="0.1" step="0.1" value={wrongDivisor} onChange={e => setWrongDivisor(e.target.value)} required/></label></div>

    <div className="wide exam-section-heading"><div><b>Ders Sonuçları</b><span>Koç yalnızca doğru ve yanlışı girer; boş ve net otomatik hesaplanır.</span></div><button type="button" className="text-btn" onClick={addRow}><Plus size={16}/>Ders Ekle</button></div>

    <div className="wide exam-entry-table">
      <div className="exam-entry-header"><span>Ders / Bölüm</span><span>Soru</span><span>Doğru</span><span>Yanlış</span><span>Boş</span><span>Net</span><span></span></div>
      {rows.map((row, index) => {
        const stat = rowStats[index]
        return <div className={`exam-entry-row ${stat.invalid ? 'invalid' : ''}`} key={row.key}>
          <input aria-label="Ders / bölüm" value={row.bolum_adi} onChange={e => updateRow(index, 'bolum_adi', e.target.value)} placeholder="Ders adı" required/>
          <input aria-label="Soru sayısı" type="number" min="1" inputMode="numeric" value={row.soru_sayisi} onChange={e => updateRow(index, 'soru_sayisi', e.target.value)} required/>
          <input aria-label="Doğru" type="number" min="0" inputMode="numeric" value={row.dogru} onChange={e => updateRow(index, 'dogru', e.target.value)} placeholder="0" required/>
          <input aria-label="Yanlış" type="number" min="0" inputMode="numeric" value={row.yanlis} onChange={e => updateRow(index, 'yanlis', e.target.value)} placeholder="0" required/>
          <output>{stat.blank}</output>
          <output className={stat.net < 0 ? 'negative' : ''}>{stat.net.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</output>
          <button type="button" className="icon-btn" aria-label="Dersi kaldır" onClick={() => removeRow(index)} disabled={rows.length === 1}><Trash2 size={16}/></button>
        </div>
      })}
    </div>

    <div className="wide exam-total-strip"><span><small>Toplam Soru</small><b>{totalQuestions}</b></span><span><small>İşaretlenen</small><b>{totalAnswered}</b></span><span className="exam-total-net"><small>Toplam Net</small><b>{totalNet.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</b></span></div>

    <label>Puan <span className="optional">(isteğe bağlı)</span><input type="number" min="0" step="0.01" value={score} onChange={e => setScore(e.target.value)}/></label>
    <label>Sıralama <span className="optional">(isteğe bağlı)</span><input type="number" min="1" inputMode="numeric" value={rank} onChange={e => setRank(e.target.value)}/></label>
    <label>Yüzdelik <span className="optional">(isteğe bağlı)</span><input type="number" min="0" max="100" step="0.001" value={percentile} onChange={e => setPercentile(e.target.value)}/></label>
    <label className="wide">Koç Notu <span className="optional">(isteğe bağlı)</span><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Yalnız gerekli olduğunda kısa not ekleyin."/></label>

    {totalAnswered === 0 && <div className="wide form-hint">Kaydetmek için en az bir doğru veya yanlış sonucu girin. Sahte/boş deneme kaydı oluşturulmaz.</div>}
    {rowStats.some(x => x.invalid) && <div className="wide form-hint form-error">Doğru + yanlış toplamı soru sayısını aşamaz; ders adı ve soru sayısı zorunludur.</div>}

    <div className="wide form-actions">
      <button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button>
      <button type="submit" className="primary-btn" disabled={busy || !canSave}>{busy ? 'Kaydediliyor…' : 'Sonucu Kaydet'}</button>
    </div>
  </form>
}
