import { AlertTriangle, BookOpenCheck, CalendarRange, Check, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isCoachingAssignment, shortDate, studentName, type CoachData } from './data'
import { buildStudentPulse } from './studentPulse'
import { supabase } from './supabase'
import { buildWeeklyPlanDraft, type WeeklyPlanSuggestion } from './weeklyPlan'

type SuggestionEdit = Pick<WeeklyPlanSuggestion, 'startNo' | 'endNo' | 'dueDate'>

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('erişim') || text.includes('yetki')) return 'Bu öğrenci için işlem yetkiniz bulunmuyor.'
  if (text.includes('kitap')) return 'Seçilen kitap artık aktif değil. Öğrenci kitaplarını kontrol edin.'
  if (text.includes('geçmiş')) return 'Teslim tarihi geçmişte olamaz.'
  if (text.includes('aralığı')) return 'Çalışma aralığını kontrol edin.'
  return 'Plan kaydedilemedi. Lütfen tekrar deneyin.'
}

export function WeeklyPlan({
  data,
  initialStudentId,
  onClose,
  onSaved,
  onOpenQuickStudy,
}: {
  data: CoachData
  initialStudentId?: string
  onClose: () => void
  onSaved: () => void | Promise<void>
  onOpenQuickStudy: (studentId: string) => void
}) {
  const validInitial = initialStudentId && data.coachingProfiles.some(x => x.ogrenci_id === initialStudentId)
    ? initialStudentId
    : ''
  const singleStudent = data.coachingProfiles.length === 1 ? data.coachingProfiles[0].ogrenci_id : ''
  const [studentId, setStudentId] = useState(validInitial || singleStudent)
  const [edits, setEdits] = useState<Record<string, SuggestionEdit>>({})
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const draft = useMemo(
    () => studentId ? buildWeeklyPlanDraft(data, studentId) : null,
    [data, studentId],
  )
  const pulse = useMemo(
    () => studentId ? buildStudentPulse(data, studentId) : null,
    [data, studentId],
  )

  const editFor = (item: WeeklyPlanSuggestion): SuggestionEdit => edits[item.id] || {
    startNo: item.startNo,
    endNo: item.endNo,
    dueDate: item.dueDate,
  }

  const updateEdit = (item: WeeklyPlanSuggestion, patch: Partial<SuggestionEdit>) => {
    setEdits(current => ({ ...current, [item.id]: { ...editFor(item), ...patch } }))
  }

  const approve = async (item: WeeklyPlanSuggestion) => {
    if (busyId) return
    const edit = editFor(item)
    setError(null)
    setSuccess(null)

    if (!Number.isFinite(edit.startNo) || !Number.isFinite(edit.endNo) || edit.startNo < 1 || edit.endNo < edit.startNo) {
      return setError('Başlangıç ve bitiş aralığını kontrol edin.')
    }
    if (item.maxNo != null && item.type === 'Sayfa' && edit.endNo > item.maxNo) {
      return setError(`Bu kitapta kayıtlı son sayfa ${item.maxNo}. Bitiş değerini kontrol edin.`)
    }
    if (!draft || edit.dueDate < draft.today) return setError('Teslim tarihi geçmişte olamaz.')

    setBusyId(item.id)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('kocluk_haftalik_plan_onayla_v1', {
        p_ogrenci_id: item.studentId,
        p_ogrenci_kitap_id: item.studentBookId,
        p_calisma_turu: item.type,
        p_baslangic_no: edit.startNo,
        p_bitis_no: edit.endNo,
        p_calisma_detayi: null,
        p_son_teslim_tarihi: edit.dueDate,
        p_oncelik: 'Normal',
        p_aciklama: null,
      })
      if (rpcError) throw rpcError
      const response = result as { baslik?: string; tekrar?: boolean } | null
      setSuccess(response?.tekrar ? 'Bu çalışma zaten açık planda vardı; ikinci kayıt oluşturulmadı.' : (response?.baslik || 'Çalışma plana eklendi.'))
      await onSaved()
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setBusyId('')
    }
  }

  return <div className="weekly-plan-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busyId) onClose() }}>
    <section className="weekly-plan-sheet" role="dialog" aria-modal="true" aria-labelledby="weekly-plan-title">
      <header className="weekly-plan-head">
        <div><span><Sparkles/> AKILLI HAFTALIK PLAN</span><h2 id="weekly-plan-title">Haftayı hazırla</h2><p>Mevcut yükü korur, yalnız yeterli gerçek geçmiş varsa devam çalışması önerir.</p></div>
        <button type="button" onClick={onClose} disabled={Boolean(busyId)} aria-label="Kapat"><X/></button>
      </header>

      <div className="weekly-plan-body">
        {!validInitial && data.coachingProfiles.length > 1 && <label className="weekly-plan-student-select">
          <span>Öğrenci</span>
          <select value={studentId} onChange={event => { setStudentId(event.target.value); setEdits({}); setError(null); setSuccess(null) }}>
            <option value="">Öğrenci seçin</option>
            {data.coachingProfiles.map(profile => <option key={profile.ogrenci_id} value={profile.ogrenci_id}>{studentName(data, profile.ogrenci_id)}</option>)}
          </select>
        </label>}

        {studentId && draft && pulse && <>
          <section className="weekly-plan-summary">
            <div><span>Öğrenci</span><b>{studentName(data, studentId)}</b></div>
            <div><span>Plan sonu</span><b>{shortDate(draft.planEnd)}</b></div>
            <div><span>Açık iş</span><b>{draft.openAssignments.length}</b></div>
            <div className={`pulse-${pulse.level}`}><span>Öğrenci Nabzı</span><b>{pulse.label}</b></div>
          </section>

          {draft.holdNewWork && <div className="weekly-plan-hold"><AlertTriangle/><div><b>Yeni yük önermiyorum.</b><span>{draft.holdReason}</span></div></div>}

          <section className="weekly-plan-section">
            <div className="weekly-plan-section-title"><div><span>MEVCUT PLAN</span><h3>Önce korunacak çalışmalar</h3></div><small>{draft.openAssignments.length} açık kayıt</small></div>
            {draft.openAssignments.length ? <div className="weekly-plan-existing">{draft.openAssignments.map(item => <article key={item.odev_id}>
              <BookOpenCheck/><div><b>{item.odev_basligi || item.konu || 'Çalışma'}</b><span>{isCoachingAssignment(item) ? 'Koçluk çalışması' : 'Ders ödevi'}</span></div><small>{item.durum}<br/>{shortDate(item.son_teslim_tarihi || item.verilis_tarihi)}</small>
            </article>)}</div> : <div className="weekly-plan-empty"><Check/><b>Açık çalışma yok.</b><span>Yeni plan önerileri aşağıda hazırlanabilir.</span></div>}
          </section>

          {!draft.holdNewWork && <section className="weekly-plan-section">
            <div className="weekly-plan-section-title"><div><span>SİSTEM ÖNERİLERİ</span><h3>Geçmiş ritme göre devam</h3></div><small>{draft.suggestions.length} öneri</small></div>
            {draft.suggestions.length ? <div className="weekly-plan-suggestions">{draft.suggestions.map(item => {
              const edit = editFor(item)
              const busy = busyId === item.id
              return <article className="weekly-plan-suggestion" key={item.id}>
                <div className="weekly-plan-suggestion-top"><div className="weekly-plan-book-icon"><CalendarRange/></div><div><b>{item.bookName}</b><span>{item.bookMeta}</span></div><em>{item.type}</em></div>
                <p><Sparkles/> {item.reason}</p>
                <div className="weekly-plan-edit-grid">
                  <label><span>Başlangıç</span><input type="number" min="1" value={edit.startNo} onChange={event => updateEdit(item, { startNo: Number(event.target.value) })}/></label>
                  <label><span>Bitiş</span><input type="number" min={edit.startNo || 1} max={item.maxNo || undefined} value={edit.endNo} onChange={event => updateEdit(item, { endNo: Number(event.target.value) })}/></label>
                  <label><span>Son teslim</span><input type="date" min={draft.today} value={edit.dueDate} onChange={event => updateEdit(item, { dueDate: event.target.value })}/></label>
                  <button type="button" onClick={() => void approve(item)} disabled={Boolean(busyId)}><Check/> {busy ? 'Ekleniyor…' : 'Plana Ekle'}</button>
                </div>
              </article>
            })}</div> : <div className="weekly-plan-empty"><Sparkles/><b>Otomatik aralık için yeterli geçmiş yok.</b><span>Sistem rastgele sayfa veya test üretmez. İlk gerçek çalışma aralığını koç belirledikten sonra sonraki haftalarda ritmi devam ettirebilir.</span><button type="button" onClick={() => onOpenQuickStudy(studentId)}>İlk Çalışmayı Belirle</button></div>}
          </section>}

          {error && <div className="weekly-plan-error">{error}</div>}
          {success && <div className="weekly-plan-success"><Check/> {success}</div>}
          <div className="weekly-plan-safety"><Sparkles/><span>Öneriler gerçek kayıt değildir. Yalnız <b>Plana Ekle</b> dediğiniz çalışma kaydedilir; aynı açık çalışma ikinci kez oluşturulmaz.</span></div>
        </>}

        {!studentId && <div className="weekly-plan-empty choose"><CalendarRange/><b>Plan hazırlanacak öğrenciyi seçin.</b><span>Sistem yalnız o öğrencinin gerçek çalışma geçmişini kullanır.</span></div>}
      </div>
    </section>
  </div>
}
