import { buildStudentPulse } from './studentPulse'
import { examTotalNet, isCancelled, isDone, isoToday, type CoachData } from './data'
import { supabase } from './supabase'

export type AssistantActionType = 'plan-balance' | 'weekly-plan' | 'exam-review' | 'meeting-prepare' | 'decision-action' | 'parent-summary'
export type AssistantTone = 'urgent' | 'attention' | 'info'

export interface CoachAssistantCandidate {
  id: string
  studentId: string
  type: AssistantActionType
  priority: number
  tone: AssistantTone
  title: string
  detail: string
  cta: string
  to: string
  fallbackReason: string
  facts: {
    overdue: number
    weekCompletion: number | null
    examDelta: number | null
    daysToMeeting: number | null
    openNext7: number
    hasPendingDecision: boolean
  }
}

export interface RankedAssistantAction extends CoachAssistantCandidate {
  aiReason: string
}

export interface AssistantRanking {
  actions: RankedAssistantAction[]
  aiActive: boolean
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T12:00:00Z`).getTime()
  const b = new Date(`${to}T12:00:00Z`).getTime()
  return Math.round((b - a) / 86400000)
}

function weekdayFromIso(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

function uniqueByType(candidates: CoachAssistantCandidate[]) {
  const seen = new Set<string>()
  return candidates.filter(item => {
    const key = `${item.studentId}:${item.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function localRanking(candidates: CoachAssistantCandidate[]): RankedAssistantAction[] {
  return [...candidates]
    .sort((a, b) => b.priority - a.priority || a.studentId.localeCompare(b.studentId))
    .slice(0, 3)
    .map(item => ({ ...item, aiReason: item.fallbackReason }))
}

export function buildCoachAssistantCandidates(data: CoachData): CoachAssistantCandidate[] {
  const today = isoToday()
  const next7 = addDays(today, 6)
  const last7 = addDays(today, -6)
  const weekday = weekdayFromIso(today)
  const candidates: CoachAssistantCandidate[] = []

  for (const profile of data.coachingProfiles) {
    const studentId = profile.ogrenci_id
    const encoded = encodeURIComponent(studentId)
    const pulse = buildStudentPulse(data, studentId)
    const assignments = data.assignments.filter(item => item.ogrenci_id === studentId && !isCancelled(item.durum))
    const openAssignments = assignments.filter(item => !isDone(item.durum))
    const overdue = openAssignments.filter(item => Boolean(item.son_teslim_tarihi && item.son_teslim_tarihi < today))
    const upcoming = openAssignments.filter(item => Boolean(item.son_teslim_tarihi && item.son_teslim_tarihi >= today && item.son_teslim_tarihi <= next7))
    const recentAssignments = assignments.filter(item => {
      const date = item.son_teslim_tarihi || item.verilis_tarihi || ''
      return Boolean(date && date >= last7 && date <= today)
    })

    const meetings = data.meetings
      .filter(item => item.ogrenci_id === studentId && item.durum !== 'İptal')
      .sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))
    const nextMeeting = meetings
      .filter(item => item.gorusme_tarihi >= today)
      .sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi))[0]
    const daysToMeeting = nextMeeting ? daysBetween(today, nextMeeting.gorusme_tarihi) : null

    const completedDecision = meetings.find(item => item.durum === 'Yapıldı' && Boolean(item.alinan_kararlar?.trim()))
    const decisionConverted = completedDecision
      ? data.assignments.some(item => item.kaynak_gorusme_id === completedDecision.gorusme_id && !isCancelled(item.durum))
      : false
    const hasPendingDecision = Boolean(completedDecision && !decisionConverted)

    const exams = data.exams
      .filter(item => item.ogrenci_id === studentId)
      .sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
    const latestExam = exams[0]
    const recentExam = latestExam && latestExam.deneme_tarihi >= last7
    const latestNet = latestExam ? examTotalNet(data, latestExam.deneme_id) : null

    const facts = {
      overdue: overdue.length,
      weekCompletion: pulse.metrics.weekCompletion,
      examDelta: pulse.metrics.examDelta,
      daysToMeeting,
      openNext7: upcoming.length,
      hasPendingDecision,
    }

    const lowCompletion = pulse.metrics.weekCompletion != null && pulse.metrics.weekCompletion < 65
    if (overdue.length > 0 || lowCompletion) {
      const completionText = pulse.metrics.weekCompletion != null ? ` Haftalık tamamlama %${pulse.metrics.weekCompletion}.` : ''
      candidates.push({
        id: `plan-balance:${studentId}`,
        studentId,
        type: 'plan-balance',
        priority: Math.min(110, 88 + overdue.length * 7 + (lowCompletion ? 8 : 0)),
        tone: overdue.length >= 2 || (pulse.metrics.weekCompletion != null && pulse.metrics.weekCompletion < 40) ? 'urgent' : 'attention',
        title: overdue.length ? 'Planı şimdi dengele' : 'Haftalık yükü dengele',
        detail: overdue.length ? `${overdue.length} çalışma gecikmiş.${completionText}` : `Haftalık tamamlama %${pulse.metrics.weekCompletion}; yeni yük eklemeden ritmi dengelemek iyi olur.`,
        cta: 'AI ile Dengele',
        to: `/plan?ogrenci=${encoded}&hafta=1`,
        fallbackReason: overdue.length ? 'Gecikme büyümeden planı sadeleştir.' : 'Tamamlama ritmi planın gerisinde.',
        facts,
      })
    } else if ((weekday === 0 || weekday === 1 || weekday === 2) && upcoming.length === 0 && data.studentBooks.some(item => item.ogrenci_id === studentId)) {
      candidates.push({
        id: `weekly-plan:${studentId}`,
        studentId,
        type: 'weekly-plan',
        priority: 68,
        tone: 'info',
        title: 'Haftayı hazırla',
        detail: 'Önümüzdeki 7 gün için açık çalışma görünmüyor. Kayıtlı kitaplardan güvenli bir AI taslağı hazırlanabilir.',
        cta: 'Haftayı Hazırla',
        to: `/plan?ogrenci=${encoded}&hafta=1`,
        fallbackReason: 'Yeni hafta için plan henüz görünmüyor.',
        facts,
      })
    }

    if (daysToMeeting != null && daysToMeeting >= 0 && daysToMeeting <= 2) {
      candidates.push({
        id: `meeting-prepare:${studentId}`,
        studentId,
        type: 'meeting-prepare',
        priority: daysToMeeting === 0 ? 104 : daysToMeeting === 1 ? 94 : 82,
        tone: daysToMeeting === 0 ? 'urgent' : 'attention',
        title: daysToMeeting === 0 ? 'Bugünkü görüşmeye hazırlan' : daysToMeeting === 1 ? 'Yarınki görüşmeye hazırlan' : 'Yaklaşan görüşmeyi hazırla',
        detail: 'Son 7 günlük çalışma, deneme ve önceki karar özeti görüşme ekranında hazır.',
        cta: 'Hazırlığı Aç',
        to: `/gorusmeler?ogrenci=${encoded}`,
        fallbackReason: daysToMeeting === 0 ? 'Görüşme bugün; hazırlık bekletilmemeli.' : 'Görüşme yaklaşıyor; brief hazır.',
        facts,
      })
    }

    if (hasPendingDecision) {
      candidates.push({
        id: `decision-action:${studentId}`,
        studentId,
        type: 'decision-action',
        priority: 96,
        tone: 'attention',
        title: 'Görüşme kararını aksiyona çevir',
        detail: 'Son tamamlanan görüşmede karar var ancak bu karardan üretilmiş açık bir çalışma görünmüyor.',
        cta: 'Kararı Plana Aktar',
        to: `/gorusmeler?ogrenci=${encoded}`,
        fallbackReason: 'Alınan karar henüz öğrenci planına dönüşmedi.',
        facts,
      })
    }

    const examSignal = pulse.signals.find(signal => signal.action === 'exam' && signal.severity !== 'positive')
    if (examSignal) {
      candidates.push({
        id: `exam-review:${studentId}`,
        studentId,
        type: 'exam-review',
        priority: examSignal.severity === 'high' ? 90 : 76,
        tone: examSignal.severity === 'high' ? 'urgent' : 'attention',
        title: 'Deneme değişimini incele',
        detail: examSignal.title,
        cta: 'Denemeleri İncele',
        to: `/denemeler?ogrenci=${encoded}`,
        fallbackReason: 'Karşılaştırılabilir sonuçta anlamlı değişim var.',
        facts,
      })
    }

    const parentSummaryWindow = weekday === 0 || weekday >= 4
    const hasWeeklyEvidence = recentAssignments.length > 0 || Boolean(recentExam)
    if (parentSummaryWindow && hasWeeklyEvidence) {
      const evidenceText = [
        recentAssignments.length ? `${recentAssignments.length} çalışma` : '',
        recentExam && latestNet != null ? `son deneme ${latestNet.toLocaleString('tr-TR')} net` : recentExam ? 'son deneme' : '',
      ].filter(Boolean).join(' · ')
      candidates.push({
        id: `parent-summary:${studentId}`,
        studentId,
        type: 'parent-summary',
        priority: 52,
        tone: 'info',
        title: 'Veli bilgilendirmesi hazır',
        detail: `${evidenceText || 'Haftalık kayıtlar'} kısa bir veli mesajına dönüştürülebilir.`,
        cta: 'Kontrol Et',
        to: `/ogrenciler/${encoded}?veli=1`,
        fallbackReason: 'Haftanın veliye aktarılabilecek gerçek verisi hazır.',
        facts,
      })
    }
  }

  return uniqueByType(candidates).sort((a, b) => b.priority - a.priority)
}

export async function rankCoachAssistantCandidates(candidates: CoachAssistantCandidate[]): Promise<AssistantRanking> {
  const fallback = localRanking(candidates)
  if (candidates.length <= 1) return { actions: fallback, aiActive: false }

  const shortlist = [...candidates].sort((a, b) => b.priority - a.priority).slice(0, 8)
  const aliases = new Map<string, CoachAssistantCandidate>()
  const payload = shortlist.map((item, index) => {
    const key = `a${index + 1}`
    aliases.set(key, item)
    return {
      anahtar: key,
      tur: item.type,
      oncelik: item.priority,
      geciken: item.facts.overdue,
      haftalik_tamamlama: item.facts.weekCompletion,
      deneme_degisim: item.facts.examDelta,
      gorusmeye_gun: item.facts.daysToMeeting,
      gelecek_7_gun_acik: item.facts.openNext7,
      bekleyen_gorusme_karari: item.facts.hasPendingDecision,
    }
  })

  try {
    const { data, error } = await supabase.functions.invoke('kocluk-ai-asistan-v1', { body: { adaylar: payload } })
    if (error || !data?.basarili || !Array.isArray(data?.sirali)) return { actions: fallback, aiActive: false }

    const aiMap = new Map<string, string>()
    const aiOrder: CoachAssistantCandidate[] = []
    for (const row of data.sirali as Array<{ anahtar?: unknown; gerekce?: unknown }>) {
      const key = String(row?.anahtar || '')
      const item = aliases.get(key)
      if (!item || aiOrder.some(existing => existing.id === item.id)) continue
      aiOrder.push(item)
      aiMap.set(item.id, String(row?.gerekce || '').trim())
    }

    const pinned = shortlist.filter(item => item.priority >= 94).sort((a, b) => b.priority - a.priority)
    const ordered = [...pinned, ...aiOrder, ...shortlist]
      .filter((item, index, list) => list.findIndex(other => other.id === item.id) === index)
      .slice(0, 3)
      .map(item => ({ ...item, aiReason: aiMap.get(item.id) || item.fallbackReason }))

    return { actions: ordered.length ? ordered : fallback, aiActive: Boolean(data?.aktif) }
  } catch {
    return { actions: fallback, aiActive: false }
  }
}
