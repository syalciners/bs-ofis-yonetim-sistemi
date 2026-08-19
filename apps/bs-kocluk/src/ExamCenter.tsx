import { Calculator, Check, ChevronDown, GraduationCap, Plus, Sparkles, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { examTotalNet, isoToday, shortDate, studentName, studentProfile, type CoachData, type Exam } from './data'
import { supabase } from './supabase'

type ExamType = 'LGS' | 'TYT' | 'AYT' | 'Diğer'
type Row = { key: string; name: string; questions: number; correct: string; wrong: string }

const preset = (type: ExamType): Row[] => {
  const rows: Array<[string, number]> = type === 'LGS'
    ? [['Türkçe',20],['T.C. İnkılap Tarihi ve Atatürkçülük',10],['Din Kültürü ve Ahlak Bilgisi',10],['İngilizce',10],['Matematik',20],['Fen Bilimleri',20]]
    : type === 'TYT'
      ? [['Türkçe',40],['Sosyal Bilimler',20],['Temel Matematik',40],['Fen Bilimleri',20]]
      : type === 'AYT'
        ? [['Türk Dili ve Edebiyatı-Sosyal Bilimler-1',40],['Sosyal Bilimler-2',40],['Matematik',40],['Fen Bilimleri',40]]
        : [['Ders / Bölüm',1]]
  return rows.map(([name, questions], index) => ({ key: `${type}-${index}-${name}`, name, questions, correct:'', wrong:'' }))
}

function normalizeType(value?: string | null): ExamType {
  return value === 'TYT' || value === 'AYT' || value === 'LGS' ? value : 'LGS'
}

function numberOrNull(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('erişim') || text.includes('yetki')) return 'Bu öğrenci için deneme sonucu ekleme yetkiniz bulunmuyor.'
  if (text.includes('gelecekte')) return 'Deneme tarihi gelecekte olamaz.'
  if (text.includes('doğru + yanlış')) return 'Bir derste doğru ve yanlış toplamı soru sayısını aşamaz.'
  if (text.includes('aktif koçluk')) return 'Öğrencinin aktif koçluk profili bulunamadı.'
  return 'Deneme sonucu kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.'
}

function previousComparable(data: CoachData, exam: Exam) {
  return data.exams
    .filter(x => x.ogrenci_id === exam.ogrenci_id && x.sinav_turu === exam.sinav_turu && x.deneme_id !== exam.deneme_id && x.deneme_tarihi <= exam.deneme_tarihi)
    .sort((a,b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))[0]
}

function ExamCard({ data, exam }: { data: CoachData; exam: Exam }) {
  const net = examTotalNet(data, exam.deneme_id)
  const previous = previousComparable(data, exam)
  const previousNet = previous ? examTotalNet(data, previous.deneme_id) : null
  const delta = net != null && previousNet != null ? Math.round((net - previousNet) * 100) / 100 : null
  const sections = data.examSections.filter(x => x.deneme_id === exam.deneme_id).sort((a,b) => Number(a.sira_no || 0) - Number(b.sira_no || 0))
  return <article className="exam-premium-card">
    <div className="exam-premium-icon"><GraduationCap/></div>
    <div className="exam-premium-copy">
      <div className="exam-premium-title"><b>{exam.deneme_adi}</b><span>{exam.sinav_turu}</span></div>
      <p>{studentName(data, exam.ogrenci_id)} · {shortDate(exam.deneme_tarihi)}</p>
      {sections.length > 0 && <div className="exam-section-chips">{sections.slice(0,4).map(section => <span key={section.sonuc_id}>{section.bolum_adi} <b>{Number(section.net || 0).toLocaleString('tr-TR',{maximumFractionDigits:2})}</b></span>)}</div>}
    </div>
    <div className="exam-premium-net"><small>Toplam net</small><b>{net == null ? '—' : net.toLocaleString('tr-TR',{maximumFractionDigits:2})}</b>{delta != null && <span className={delta < 0 ? 'down' : delta > 0 ? 'up' : ''}>{delta > 0 ? '+' : ''}{delta.toLocaleString('tr-TR',{maximumFractionDigits:2})}</span>}</div>
  </article>
}

function ExamAdd({ data, initialStudentId, onClose, onSaved }: { data: CoachData; initialStudentId?: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const validInitial = initialStudentId && data.coachingProfiles.some(x => x.ogrenci_id === initialStudentId) ? initialStudentId : ''
  const single = data.coachingProfiles.length === 1 ? data.coachingProfiles[0].ogrenci_id : ''
  const [studentId,setStudentId] = useState(validInitial || single)
  const profileType = normalizeType(studentProfile(data, validInitial || single)?.sinav_turu)
  const [examType,setExamType] = useState<ExamType>(profileType)
  const [examName,setExamName] = useState('')
  const [examDate,setExamDate] = useState(isoToday())
  const [divisor,setDivisor] = useState(profileType === 'LGS' ? 3 : 4)
  const [rows,setRows] = useState<Row[]>(preset(profileType))
  const [publisher,setPublisher] = useState('')
  const [score,setScore] = useState('')
  const [rank,setRank] = useState('')
  const [percentile,setPercentile] = useState('')
  const [notes,setNotes] = useState('')
  const [more,setMore] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const [saved,setSaved] = useState<string|null>(null)

  const stats = useMemo(() => rows.map(row => {
    const correct = Number(row.correct || 0)
    const wrong = Number(row.wrong || 0)
    const invalid = correct < 0 || wrong < 0 || correct + wrong > row.questions
    const blank = Math.max(row.questions - correct - wrong, 0)
    const net = Math.round((correct - wrong / divisor) * 100) / 100
    return { correct, wrong, blank, net, invalid }
  }), [rows,divisor])
  const totalNet = Math.round(stats.reduce((sum,x) => sum + x.net,0) * 100) / 100
  const answered = stats.reduce((sum,x) => sum + x.correct + x.wrong,0)
  const canSave = Boolean(studentId && examName.trim() && examDate && answered > 0 && !stats.some(x => x.invalid) && divisor > 0)

  const changeType = (type: ExamType) => {
    setExamType(type)
    setDivisor(type === 'LGS' ? 3 : 4)
    setRows(preset(type))
  }
  const update = (index: number, field: 'correct'|'wrong', value: string) => setRows(prev => prev.map((row,i) => i === index ? { ...row, [field]: value } : row))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave || busy) return
    setBusy(true); setError(null)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('kocluk_deneme_tam_kaydet_erisimli_v1', {
        p_deneme_id: null,
        p_ogrenci_id: studentId,
        p_sinav_turu: examType,
        p_deneme_adi: examName.trim(),
        p_deneme_tarihi: examDate,
        p_yayinevi: publisher.trim() || null,
        p_veri_kaynagi: 'Manuel',
        p_yanlis_boleni: divisor,
        p_puan: numberOrNull(score),
        p_siralama: numberOrNull(rank),
        p_yuzdelik: numberOrNull(percentile),
        p_katilimci_sayisi: null,
        p_sure_dakika: null,
        p_notlar: notes.trim() || null,
        p_bolumler: rows.map((row,index) => ({ bolum_adi: row.name, sira_no:index+1, dogru:stats[index].correct, yanlis:stats[index].wrong, bos:stats[index].blank, soru_sayisi:row.questions })),
      })
      if (rpcError) throw rpcError
      const value = result as { toplam_net?: number; tekrar?: boolean } | null
      setSaved(`${value?.tekrar ? 'Deneme güncellendi' : 'Deneme kaydedildi'} · ${Number(value?.toplam_net ?? totalNet).toLocaleString('tr-TR',{maximumFractionDigits:2})} net`)
      await onSaved()
      window.setTimeout(onClose,800)
    } catch (err:any) { setError(friendlyError(err?.message || String(err))) }
    finally { setBusy(false) }
  }

  return <div className="exam-add-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="exam-add-sheet" role="dialog" aria-modal="true" aria-labelledby="exam-add-title">
      <header className="exam-add-head"><div><span><Sparkles/> DENEME MERKEZİ</span><h2 id="exam-add-title">Deneme sonucu ekle</h2><p>Doğru ve yanlışı girin; boş ve neti sistem hesaplasın.</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Kapat"><X/></button></header>
      <form className="exam-add-form" onSubmit={submit}>
        {!validInitial && data.coachingProfiles.length > 1 && <label><span>Öğrenci</span><select value={studentId} onChange={e => { const id=e.target.value; setStudentId(id); changeType(normalizeType(studentProfile(data,id)?.sinav_turu)) }} required><option value="">Öğrenci seçin</option>{data.coachingProfiles.map(p => <option key={p.ogrenci_id} value={p.ogrenci_id}>{studentName(data,p.ogrenci_id)}</option>)}</select></label>}
        {studentId && <div className="exam-student-context"><span>Öğrenci</span><b>{studentName(data,studentId)}</b></div>}
        <div className="exam-type-chips">{(['LGS','TYT','AYT','Diğer'] as ExamType[]).map(type => <button type="button" key={type} className={examType===type?'selected':''} onClick={() => changeType(type)}>{type}</button>)}</div>
        <div className="exam-basics"><label><span>Deneme adı</span><input value={examName} onChange={e=>setExamName(e.target.value)} placeholder="Örn. Türkiye Geneli 3" required/></label><label><span>Tarih</span><input type="date" max={isoToday()} value={examDate} onChange={e=>setExamDate(e.target.value)} required/></label></div>
        <div className="exam-rule"><Calculator/><div><b>Net kuralı</b><span>{examType==='LGS'?'3 yanlış 1 doğruyu götürür.':examType==='TYT'||examType==='AYT'?'4 yanlış 1 doğruyu götürür.':'Kurum kuralına göre değiştirilebilir.'}</span></div><input aria-label="Yanlış böleni" type="number" min="0.1" step="0.1" value={divisor} onChange={e=>setDivisor(Number(e.target.value))}/></div>
        <div className="exam-score-head"><b>Ders sonuçları</b><span>Yalnız doğru ve yanlış</span></div>
        <div className="exam-score-grid">
          <div className="exam-score-header"><span>Ders</span><span>Doğru</span><span>Yanlış</span><span>Boş</span><span>Net</span></div>
          {rows.map((row,index) => <div className={`exam-score-row ${stats[index].invalid?'invalid':''}`} key={row.key}><div><b>{row.name}</b><small>{row.questions} soru</small></div><input aria-label={`${row.name} doğru`} type="number" min="0" max={row.questions} inputMode="numeric" value={row.correct} onChange={e=>update(index,'correct',e.target.value)} placeholder="0"/><input aria-label={`${row.name} yanlış`} type="number" min="0" max={row.questions} inputMode="numeric" value={row.wrong} onChange={e=>update(index,'wrong',e.target.value)} placeholder="0"/><output>{stats[index].blank}</output><output>{stats[index].net.toLocaleString('tr-TR',{maximumFractionDigits:2})}</output></div>)}
        </div>
        <div className="exam-total"><span><small>İşaretlenen</small><b>{answered}</b></span><span><small>Toplam net</small><b>{totalNet.toLocaleString('tr-TR',{maximumFractionDigits:2})}</b></span></div>
        <button type="button" className="exam-more-toggle" onClick={()=>setMore(x=>!x)}>Ek bilgiler <ChevronDown className={more?'open':''}/></button>
        {more && <div className="exam-more"><label><span>Yayın / Kurum</span><input value={publisher} onChange={e=>setPublisher(e.target.value)} /></label><label><span>Puan</span><input type="number" min="0" step="0.01" value={score} onChange={e=>setScore(e.target.value)}/></label><label><span>Sıralama</span><input type="number" min="1" value={rank} onChange={e=>setRank(e.target.value)}/></label><label><span>Yüzdelik</span><input type="number" min="0" max="100" step="0.001" value={percentile} onChange={e=>setPercentile(e.target.value)}/></label><label className="wide"><span>Koç notu</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></label></div>}
        {answered===0 && <div className="exam-hint">Kaydetmek için en az bir doğru veya yanlış sonucu girin.</div>}
        {stats.some(x=>x.invalid) && <div className="exam-error">Doğru + yanlış toplamı soru sayısını aşamaz.</div>}
        {error && <div className="exam-error">{error}</div>}
        {saved && <div className="exam-success"><Check/> {saved}</div>}
        <footer className="exam-add-actions"><button type="button" onClick={onClose} disabled={busy}>Vazgeç</button><button type="submit" className="primary" disabled={!canSave || busy || Boolean(saved)}>{busy?'Kaydediliyor…':'Sonucu Kaydet'}</button></footer>
      </form>
    </section>
  </div>
}

export function ExamCenter({ data, onRefresh }: { data: CoachData; onRefresh: () => void | Promise<void> }) {
  const [params] = useSearchParams()
  const requested = params.get('ogrenci') || ''
  const studentId = data.coachingProfiles.some(x => x.ogrenci_id === requested) ? requested : ''
  const [open,setOpen] = useState(false)
  const rows = data.exams.filter(x => !studentId || x.ogrenci_id === studentId).sort((a,b)=>b.deneme_tarihi.localeCompare(a.deneme_tarihi))
  return <div className="page-stack">
    <div className="exam-center-title"><header className="page-title"><h1>Deneme Merkezi</h1><p>Sonucu girin; net ve değişimi sistem hesaplasın.</p></header><button className="exam-add-trigger" onClick={()=>setOpen(true)}><Plus/> Deneme Sonucu Ekle</button></div>
    {studentId && <div className="student-filter-strip"><div><GraduationCap/><div><strong>{studentName(data,studentId)}</strong><span>Deneme filtresi aktif</span></div></div></div>}
    {rows.length ? <section className="exam-premium-list">{rows.map(exam => <ExamCard key={exam.deneme_id} data={data} exam={exam}/>)}</section> : <div className="empty">{studentId?'Bu öğrenci için henüz gerçek deneme sonucu yok.':'Henüz gerçek deneme sonucu yok.'}</div>}
    {open && <ExamAdd data={data} initialStudentId={studentId} onClose={()=>setOpen(false)} onSaved={onRefresh}/>} 
  </div>
}
