import { examTotalNet, isCancelled, isDone, isoToday, type CoachData } from './data'

export type PulseLevel = 'attention' | 'watch' | 'clear'
export type PulseActionKind = 'plan' | 'exam' | 'meeting' | 'student'

export interface PulseSignal {
  id: string
  title: string
  detail: string
  severity: 'high' | 'medium' | 'positive'
  action: PulseActionKind
}

export interface StudentPulse {
  studentId: string
  level: PulseLevel
  label: string
  headline: string
  summary: string
  signals: PulseSignal[]
  primaryAction: { label: string; to: string }
  metrics: {
    overdue: number
    weekCompletion: number | null
    examDelta: number | null
  }
}

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function currentWeekStart() {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - mondayOffset)
  return localIso(start)
}

function routeFor(studentId: string, action: PulseActionKind) {
  const encoded = encodeURIComponent(studentId)
  if (action === 'plan') return `/plan?ogrenci=${encoded}`
  if (action === 'exam') return `/denemeler?ogrenci=${encoded}`
  if (action === 'meeting') return `/gorusmeler?ogrenci=${encoded}`
  return `/ogrenciler/${encoded}`
}

function actionLabel(action: PulseActionKind) {
  if (action === 'plan') return 'Planı kontrol et'
  if (action === 'exam') return 'Denemeleri incele'
  if (action === 'meeting') return 'Görüşme planla'
  return 'Öğrenciyi aç'
}

export function buildStudentPulse(data: CoachData, studentId: string): StudentPulse {
  const today = isoToday()
  const weekStart = currentWeekStart()
  const assignments = data.assignments.filter(x => x.ogrenci_id === studentId && !isCancelled(x.durum))
  const open = assignments.filter(x => !isDone(x.durum))
  const overdue = open.filter(x => Boolean(x.son_teslim_tarihi && x.son_teslim_tarihi < today))

  const dueThisWeekToDate = assignments.filter(x => {
    const date = x.son_teslim_tarihi || x.verilis_tarihi
    return Boolean(date && date >= weekStart && date <= today)
  })
  const completedThisWeek = dueThisWeekToDate.filter(x => isDone(x.durum))
  const weekCompletion = dueThisWeekToDate.length
    ? Math.round((completedThisWeek.length / dueThisWeekToDate.length) * 100)
    : null

  const exams = data.exams
    .filter(x => x.ogrenci_id === studentId)
    .sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
  const examNets = exams
    .slice(0, 3)
    .map(exam => ({ exam, net: examTotalNet(data, exam.deneme_id) }))
  const latestNet = examNets[0]?.net ?? null
  const previousNet = examNets[1]?.net ?? null
  const thirdNet = examNets[2]?.net ?? null
  const examDelta = latestNet != null && previousNet != null
    ? Math.round((latestNet - previousNet) * 100) / 100
    : null

  const meetings = data.meetings
    .filter(x => x.ogrenci_id === studentId && x.durum !== 'İptal')
    .sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))
  const nextMeeting = meetings
    .filter(x => x.gorusme_tarihi >= today)
    .sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi))[0]
  const lastDecisionMeeting = meetings.find(x => Boolean(x.alinan_kararlar?.trim()))

  const signals: PulseSignal[] = []

  if (overdue.length >= 2) {
    signals.push({
      id: 'overdue-high',
      title: `${overdue.length} çalışma gecikmiş`,
      detail: 'Plan akışında birikme var; önce geciken çalışmaları sadeleştirmek veya yeniden tarihlemek iyi olur.',
      severity: 'high',
      action: 'plan',
    })
  } else if (overdue.length === 1) {
    signals.push({
      id: 'overdue-one',
      title: '1 çalışma gecikmiş',
      detail: 'Tek gecikme var. Yeni birikme oluşmadan planı kısa bir kontrol etmek yeterli olabilir.',
      severity: 'medium',
      action: 'plan',
    })
  }

  if (dueThisWeekToDate.length >= 3 && weekCompletion != null) {
    if (weekCompletion < 40) {
      signals.push({
        id: 'completion-low',
        title: `Haftalık tamamlama %${weekCompletion}`,
        detail: `${completedThisWeek.length}/${dueThisWeekToDate.length} çalışma tamamlandı. Mevcut yük öğrencinin sürdürebildiği seviyenin üzerinde olabilir.`,
        severity: 'high',
        action: 'plan',
      })
    } else if (weekCompletion < 65) {
      signals.push({
        id: 'completion-watch',
        title: `Haftalık tamamlama %${weekCompletion}`,
        detail: 'Haftalık plan hedefin gerisinde ilerliyor; çalışma yoğunluğu ve öncelikleri gözden geçirilebilir.',
        severity: 'medium',
        action: 'plan',
      })
    }
  }

  const threeExamDecline = latestNet != null && previousNet != null && thirdNet != null
    && latestNet < previousNet && previousNet < thirdNet

  if (threeExamDecline) {
    signals.push({
      id: 'exam-three-down',
      title: 'Toplam net 3 denemedir düşüyor',
      detail: `Son üç toplam net ${thirdNet.toLocaleString('tr-TR')} → ${previousNet.toLocaleString('tr-TR')} → ${latestNet.toLocaleString('tr-TR')}. Ders bazlı değişimi incelemek gerekir.`,
      severity: 'high',
      action: 'exam',
    })
  } else if (examDelta != null && examDelta <= -3) {
    signals.push({
      id: 'exam-drop-high',
      title: `Son denemede ${Math.abs(examDelta).toLocaleString('tr-TR')} net düşüş`,
      detail: 'Tek deneme kesin bir eğilim değildir; ancak düşüş belirgin olduğu için ders bazlı sonucu kontrol etmek iyi olur.',
      severity: 'medium',
      action: 'exam',
    })
  }

  if (lastDecisionMeeting?.alinan_kararlar && overdue.length > 0) {
    const postDecisionOverdue = overdue.filter(item => {
      const date = item.verilis_tarihi || item.son_teslim_tarihi || ''
      return date >= lastDecisionMeeting.gorusme_tarihi
    })
    if (postDecisionOverdue.length > 0) {
      signals.push({
        id: 'decision-followup',
        title: 'Son görüşme kararıyla planı karşılaştırın',
        detail: `Son kararın ardından ${postDecisionOverdue.length} çalışma gecikmiş görünüyor. Kararın uygulanabilirliği yeniden değerlendirilebilir.`,
        severity: 'medium',
        action: 'meeting',
      })
    }
  }

  const negativeSignals = signals.filter(x => x.severity !== 'positive')
  const highCount = negativeSignals.filter(x => x.severity === 'high').length
  const mediumCount = negativeSignals.filter(x => x.severity === 'medium').length

  if ((highCount > 0 || mediumCount >= 2) && !nextMeeting) {
    signals.push({
      id: 'meeting-needed',
      title: 'Yaklaşan görüşme planlı değil',
      detail: 'Birden fazla takip sinyali varken kısa bir koçluk görüşmesi planlamak karar kalitesini artırabilir.',
      severity: 'medium',
      action: 'meeting',
    })
  }

  if (!signals.some(x => x.severity !== 'positive')) {
    if (weekCompletion != null && weekCompletion >= 80) {
      signals.push({
        id: 'completion-positive',
        title: `Haftalık plan %${weekCompletion} tamamlandı`,
        detail: 'Plan akışı düzenli ilerliyor; şu anda ek müdahale gerektiren bir sapma görünmüyor.',
        severity: 'positive',
        action: 'student',
      })
    } else if (examDelta != null && examDelta >= 3) {
      signals.push({
        id: 'exam-positive',
        title: `Son denemede +${examDelta.toLocaleString('tr-TR')} net`,
        detail: 'Son denemede olumlu hareket var. Eğilimin kalıcı olup olmadığını sonraki sonuçlarla izleyin.',
        severity: 'positive',
        action: 'exam',
      })
    } else {
      signals.push({
        id: 'flow-clear',
        title: 'Kritik sapma görünmüyor',
        detail: 'Mevcut plan, gecikme ve deneme verilerinde bugün müdahale gerektiren güçlü bir sinyal yok.',
        severity: 'positive',
        action: 'student',
      })
    }
  }

  const finalNegative = signals.filter(x => x.severity !== 'positive')
  const finalHigh = finalNegative.filter(x => x.severity === 'high').length
  const finalMedium = finalNegative.filter(x => x.severity === 'medium').length
  const level: PulseLevel = finalHigh > 0 || finalMedium >= 2 ? 'attention' : finalMedium === 1 ? 'watch' : 'clear'
  const primarySignal = finalNegative[0] || signals[0]
  const primaryAction = primarySignal?.action || 'student'

  return {
    studentId,
    level,
    label: level === 'attention' ? 'Dikkat gerekiyor' : level === 'watch' ? 'İzlenmeli' : 'Normal akış',
    headline: level === 'attention' ? 'Bugün ilgilenmek iyi olur.' : level === 'watch' ? 'Yakından izleyin.' : 'Şu anda ek müdahale gerekmiyor.',
    summary: primarySignal?.detail || 'Kritik bir sapma görünmüyor.',
    signals,
    primaryAction: {
      label: actionLabel(primaryAction),
      to: routeFor(studentId, primaryAction),
    },
    metrics: {
      overdue: overdue.length,
      weekCompletion,
      examDelta,
    },
  }
}

export function buildAllStudentPulses(data: CoachData) {
  const rank: Record<PulseLevel, number> = { attention: 0, watch: 1, clear: 2 }
  return data.coachingProfiles
    .map(profile => buildStudentPulse(data, profile.ogrenci_id))
    .sort((a, b) => rank[a.level] - rank[b.level] || b.metrics.overdue - a.metrics.overdue)
}
