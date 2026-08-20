import { AlertTriangle, BookOpenCheck, CalendarRange, Check, RefreshCw, Sparkles, Target, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { requestAiWeeklyPlan, type AiWeeklyPlanItem, type AiWeeklyPlanResponse, type WeeklyIntensity } from './aiWeeklyPlan'
import { isCancelled, isDone, shortDate, studentName, type CoachData } from './data'
import { buildStudentPulse } from './studentPulse'
import { supabase } from './supabase'

type ItemEdit = { startNo: number; endNo: number; dueDate: string }

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10)
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${iso}T12:00:00`))
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('erişim') || text.includes('yetki')) return 'Bu öğrenci için işlem yetkiniz bulunmuyor.'
  if (text.includes('kitap')) return 'Plan içindeki kitaplardan biri artık aktif değil. Öğrenci kitaplarını kontrol edin.'
  if (text.includes('aralığı') || text.includes('sayfasını')) return 'Çalışma aralığını kontrol edin.'
  if (text.includes('teslim') || text.includes('tarih')) return 'Çalışma tarihini kontrol edin.'
  return 'Plan işlemi tamamlanamadı. Lütfen tekrar deneyin.'
}

function itemEdit(item: AiWeeklyPlanItem, edits: Record<string, ItemEdit>): ItemEdit {
  return edits[item.id] || { startNo: item.baslangic_no, endNo: item.bitis_no, dueDate: item.son_teslim_tarihi }
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
  const validInitial = initialStudentId && data.coachingProfiles.some(x => x.ogrenci_id === initialStudentId) ? initialStudentId : ''
  const singleStudent = data.coachingProfiles.length === 1 ? data.coachingProfiles[0].ogrenci_id : ''
  const [studentId, setStudentId] = useState(validInitial || singleStudent)
  const [response, setResponse] = useState<AiWeeklyPlanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingBusy, setSettingBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({})
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const profile = data.coachingProfiles.find(item => item.ogrenci_id === studentId)
  const pulse = useMemo(() => studentId ? buildStudentPulse(data, studentId) : null, [data, studentId])
  const plan = response?.plan || null

  const currentAssignments = useMemo(() => {
    if (!studentId || !plan) return []
    return data.assignments.filter(item =>
      item.ogrenci_id === studentId
      && !isDone(item.durum)
      && !isCancelled(item.durum)
      && Boolean(item.son_teslim_tarihi && item.son_teslim_tarihi >= plan.baslangic && item.son_teslim_tarihi <= plan.bitis),
    )
  }, [data.assignments, studentId, plan])

  const generate = async (mode: 'hazirla' | 'denge' = 'hazirla') => {
    if (!studentId || loading || saving) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    setEditing(false)
    setEdits({})
    setExcluded(new Set())
    try {
      setResponse(await requestAiWeeklyPlan(studentId, mode))
    } catch (err: any) {
      setResponse(null)
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) void generate('hazirla')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const updateEdit = (item: AiWeeklyPlanItem, patch: Partial<ItemEdit>) => {
    setEdits(current => ({ ...current, [item.id]: { ...itemEdit(item, current), ...patch } }))
  }

  const toggleExcluded = (id: string) => {
    setExcluded(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveSettings = async (intensity: WeeklyIntensity, sundayWork: boolean) => {
    if (!studentId || settingBusy) return
    setSettingBusy(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('kocluk_haftalik_plan_ayari_kaydet_v2', {
        p_ogrenci_id: studentId,
        p_yogunluk: intensity,
        p_pazar_calisma: sundayWork,
      })
      if (rpcError) throw rpcError
      await onSaved()
      await generate('hazirla')
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setSettingBusy(false)
    }
  }

  const approveAll = async () => {
    if (!studentId || !plan || saving) return
    const items = plan.maddeler.filter(item => !excluded.has(item.id))
    if (!items.length) return setError('Onaylanacak yeni çalışma bulunmuyor.')

    const payload = items.map(item => {
      const edit = itemEdit(item, edits)
      if (!Number.isFinite(edit.startNo) || !Number.isFinite(edit.endNo) || edit.startNo < 1 || edit.endNo < edit.startNo) {
        throw new Error('Çalışma aralığı geçersiz.')
      }
      if (item.max_no != null && item.calisma_turu === 'Sayfa' && edit.endNo > item.max_no) {
        throw new Error(`Bu kitapta kayıtlı son sayfa ${item.max_no}.`)
      }
      if (edit.dueDate < plan.baslangic || edit.dueDate > plan.bitis) throw new Error('Tarih plan haftasının dışında.')
      return {
        ogrenci_kitap_id: item.ogrenci_kitap_id,
        calisma_turu: item.calisma_turu,
        baslangic_no: edit.startNo,
        bitis_no: edit.endNo,
        son_teslim_tarihi: edit.dueDate,
        gerekce: item.gerekce,
      }
    })

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('kocluk_ai_haftalik_plan_onayla_v2', {
        p_ogrenci_id: studentId,
        p_plan_id: plan.plan_id,
        p_maddeler: payload,
      })
      if (rpcError) throw rpcError
      const rows = (result as { maddeler?: Array<{ tekrar?: boolean }> } | null)?.maddeler || []
      const newCount = rows.filter(row => !row.tekrar).length
      const repeatCount = rows.length - newCount
      setSuccess(repeatCount ? `${newCount} yeni çalışma öğrenci planına gönderildi. ${repeatCount} mevcut çalışma tekrar oluşturulmadı.` : `${newCount} çalışma öğrenci planına gönderildi.`)
      await onSaved()
      window.setTimeout(onClose, 1100)
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  const days = plan ? Array.from({ length: 7 }, (_, index) => addDays(plan.baslangic, index)) : []
  const visibleAiItems = plan?.maddeler.filter(item => !excluded.has(item.id)) || []

  return <div className="weekly-plan-overlay ai-weekly-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className="weekly-plan-sheet ai-weekly-sheet" role="dialog" aria-modal="true" aria-labelledby="weekly-plan-title">
      <header className="weekly-plan-head ai-weekly-head">
        <div><span><Sparkles/> AI HAFTALIK PLAN · PREMIUM</span><h2 id="weekly-plan-title">Haftayı sistem hazırlasın</h2><p>AI yalnız gerçek kitap, çalışma geçmişi, deneme ve görüşme verisini kullanır; koç onaylamadan hiçbir görev yayınlanmaz.</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Kapat"><X/></button>
      </header>

      <div className="weekly-plan-body ai-weekly-body">
        {!validInitial && data.coachingProfiles.length > 1 && <label className="weekly-plan-student-select ai-student-select">
          <span>Öğrenci</span>
          <select value={studentId} onChange={event => { setStudentId(event.target.value); setResponse(null); setError(null); setSuccess(null) }}>
            <option value="">Öğrenci seçin</option>
            {data.coachingProfiles.map(item => <option key={item.ogrenci_id} value={item.ogrenci_id}>{studentName(data, item.ogrenci_id)}</option>)}
          </select>
        </label>}

        {!studentId && <div className="weekly-plan-empty choose"><CalendarRange/><b>Plan hazırlanacak öğrenciyi seçin.</b><span>AI yalnız seçilen öğrencinin erişilebilir gerçek kayıtlarını kullanır.</span></div>}

        {studentId && loading && <div className="ai-weekly-loading"><Sparkles/><div><b>Hafta hazırlanıyor…</b><span>Mevcut yük, çalışma ritmi, kitap ilerlemesi ve son performans sinyalleri birlikte değerlendiriliyor.</span></div></div>}

        {studentId && plan && !loading && <>
          <section className="ai-weekly-hero">
            <div className="ai-weekly-hero-copy">
              <div className="ai-weekly-badges"><span className={response?.aktif ? 'ai-live' : 'ai-safe'}><Sparkles/> {response?.aktif ? 'AI planı' : 'Güvenli plan'}</span><span>{shortDate(plan.baslangic)} – {shortDate(plan.bitis)}</span><span>{plan.yogunluk}</span></div>
              <h3>{plan.baslik}</h3>
              <p>{plan.ozet}</p>
              {plan.odaklar.length > 0 && <div className="ai-weekly-focus">{plan.odaklar.map(item => <span key={item}><Target/> {item}</span>)}</div>}
            </div>
            <div className="ai-weekly-scorecard">
              <div><small>Son 7 gün</small><b>{plan.son_7_gun_tamamlama_yuzdesi == null ? '—' : `%${plan.son_7_gun_tamamlama_yuzdesi}`}</b><span>Tamamlama</span></div>
              <div className={plan.geciken ? 'attention' : ''}><small>Geciken</small><b>{plan.geciken}</b><span>Çalışma</span></div>
              <div><small>Yeni plan</small><b>{visibleAiItems.length}</b><span>Çalışma</span></div>
            </div>
          </section>

          <section className="ai-weekly-toolbar">
            <div className="ai-weekly-student"><BookOpenCheck/><div><b>{studentName(data, studentId)}</b><span>{pulse?.label || 'Öğrenci Nabzı'} · {currentAssignments.length} mevcut açık çalışma</span></div></div>
            <div className="ai-weekly-toolbar-actions">
              <button type="button" onClick={() => setSettingsOpen(value => !value)}>Plan Ayarı</button>
              <button type="button" onClick={() => void generate('denge')} disabled={loading || saving}><RefreshCw/> AI ile Dengele</button>
              {visibleAiItems.length > 0 && <button type="button" onClick={() => setEditing(value => !value)}>{editing ? 'Düzenlemeyi Bitir' : 'Düzenle'}</button>}
            </div>
          </section>

          {settingsOpen && <section className="ai-weekly-settings">
            <div><b>Çalışma yoğunluğu</b><span>Bir kez seçilir; AI öğrencinin gerçek ritmiyle birlikte kullanır.</span></div>
            <div className="ai-setting-chips">{(['Hafif', 'Normal', 'Yoğun'] as WeeklyIntensity[]).map(value => <button key={value} type="button" className={(profile?.haftalik_calisma_yogunlugu || 'Normal') === value ? 'selected' : ''} disabled={settingBusy} onClick={() => void saveSettings(value, profile?.pazar_calisma !== false)}>{value}</button>)}</div>
            <label className="ai-sunday-toggle"><input type="checkbox" checked={profile?.pazar_calisma !== false} disabled={settingBusy} onChange={event => void saveSettings((profile?.haftalik_calisma_yogunlugu || 'Normal') as WeeklyIntensity, event.target.checked)}/><span>Pazar günü çalışma planlanabilir</span></label>
          </section>}

          {response?.durum === 'mevcut_plani_koru' && <div className="weekly-plan-hold ai-plan-hold"><AlertTriangle/><div><b>Yeni yük eklenmedi.</b><span>{plan.ozet}</span></div></div>}

          {response?.durum === 'ilk_calisma_gerekli' && <div className="weekly-plan-empty ai-first-study"><Sparkles/><b>AI ilk sayfayı uydurmaz.</b><span>Bu öğrencinin kitaplarında güvenli devam aralığı çıkaracak kadar gerçek tamamlanmış çalışma yok. İlk aralığı bir kez belirlediğinizde sonraki haftalar otomatikleşir.</span><button type="button" onClick={() => onOpenQuickStudy(studentId)}>İlk Çalışmayı Belirle</button></div>}

          <section className="ai-weekly-board">
            {days.map(date => {
              const existing = currentAssignments.filter(item => item.son_teslim_tarihi === date)
              const aiItems = visibleAiItems.filter(item => itemEdit(item, edits).dueDate === date)
              return <article className={`ai-day-card ${existing.length || aiItems.length ? 'has-work' : ''}`} key={date}>
                <header><span>{dayLabel(date)}</span><b>{existing.length + aiItems.length}</b></header>
                <div className="ai-day-items">
                  {existing.map(item => <div className="ai-day-item existing" key={item.odev_id}><span>MEVCUT</span><b>{item.odev_basligi || item.konu || 'Çalışma'}</b><small>{item.durum}</small></div>)}
                  {aiItems.map(item => {
                    const edit = itemEdit(item, edits)
                    return <div className="ai-day-item suggested" key={item.id}>
                      <span><Sparkles/> AI ÖNERİSİ</span>
                      <b>{item.kitap_adi}</b>
                      <small>{item.ders || item.kitap_meta} · {item.calisma_turu} {edit.startNo}–{edit.endNo}</small>
                      <p>{item.gerekce}</p>
                      {editing && <div className="ai-item-edit">
                        <label><span>Başlangıç</span><input type="number" min="1" value={edit.startNo} onChange={event => updateEdit(item, { startNo: Number(event.target.value) })}/></label>
                        <label><span>Bitiş</span><input type="number" min={edit.startNo || 1} max={item.max_no || undefined} value={edit.endNo} onChange={event => updateEdit(item, { endNo: Number(event.target.value) })}/></label>
                        <label><span>Gün</span><input type="date" min={plan.baslangic} max={plan.bitis} value={edit.dueDate} onChange={event => updateEdit(item, { dueDate: event.target.value })}/></label>
                        <button type="button" onClick={() => toggleExcluded(item.id)}>Bu çalışmayı çıkar</button>
                      </div>}
                    </div>
                  })}
                  {!existing.length && !aiItems.length && <div className="ai-day-rest">Planlı çalışma yok</div>}
                </div>
              </article>
            })}
          </section>

          {excluded.size > 0 && editing && <div className="ai-excluded-note"><Check/> {excluded.size} çalışma plandan çıkarıldı. <button type="button" onClick={() => setExcluded(new Set())}>Geri al</button></div>}
          {plan.uyarilar.length > 0 && <div className="ai-weekly-warnings">{plan.uyarilar.map(item => <span key={item}><AlertTriangle/> {item}</span>)}</div>}
          {error && <div className="weekly-plan-error">{error}</div>}
          {success && <div className="weekly-plan-success"><Check/> {success}</div>}

          <div className="ai-weekly-safety"><Sparkles/><span>AI yalnız taslak hazırlar. <b>Onayla ve Öğrenciye Gönder</b> denmeden veritabanına yeni çalışma yazılmaz. Öğrenci adı/e-postası OpenAI'a gönderilmez.</span></div>
        </>}
      </div>

      {studentId && plan && !loading && <footer className="ai-weekly-footer">
        <button type="button" onClick={onClose} disabled={saving}>Vazgeç</button>
        <button type="button" className="primary" onClick={() => void approveAll()} disabled={saving || visibleAiItems.length === 0}>{saving ? 'Gönderiliyor…' : `Onayla ve Öğrenciye Gönder${visibleAiItems.length ? ` · ${visibleAiItems.length}` : ''}`}</button>
      </footer>}
    </section>
  </div>
}
