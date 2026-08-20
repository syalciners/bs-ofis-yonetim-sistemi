import { examTotalNet, isCancelled, isDone, isoToday, type CoachData } from './data'

export type RhythmLevel = 'building' | 'steady' | 'mixed' | 'rebalance'

export interface DevelopmentWeek {
  start: string
  end: string
  label: string
  current: boolean
  total: number
  done: number
  completion: number | null
}

export interface ExamTrendPoint {
  examId: string
  date: string
  name: string
  type: string
  net: number
}

export interface SubjectTrend {
  name: string
  latest: number
  previous: number
  delta: number
}

export interface StudentDevelopment {
  rhythm: {
    level: RhythmLevel
    label: string
    description: string
    recentCompletion: number | null
    previousCompletion: number | null
    completionDelta: number | null
    activeWeeks: number
    steadyWeekStreak: number
    currentBacklog: number
    weeks: DevelopmentWeek[]
  }
  exams: {
    type: string | null
    points: ExamTrendPoint[]
    latestNet: number | null
    delta: number | null
    subjectTrends: SubjectTrend[]
  }
  insights: string[]
}

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function dateFromIso(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

function mondayOf(date: Date) {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  const offset = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - offset)
  return copy
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function shortDay(value: string) {
  const [, m, d] = value.split('-')
  return `${d}.${m}`
}

function weightedCompletion(weeks: DevelopmentWeek[]) {
  const total = weeks.reduce((sum, week) => sum + week.total, 0)
  if (!total) return null
  const done = weeks.reduce((sum, week) => sum + week.done, 0)
  return Math.round((done / total) * 100)
}

function normalizeSection(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü]+/gi, ' ')
    .trim()
}

function rhythmMeta(
  recentCompletion: number | null,
  currentBacklog: number,
  activeWeeks: number,
  totalAssignments: number,
): Pick<StudentDevelopment['rhythm'], 'level' | 'label' | 'description'> {
  if (activeWeeks < 3 || totalAssignments < 6 || recentCompletion == null) {
    return {
      level: 'building',
      label: 'Veri oluşuyor',
      description: 'Düzenli bir çalışma ritmi yorumu için birkaç haftalık gerçek plan verisi daha gerekiyor.',
    }
  }
  if (recentCompletion >= 80 && currentBacklog === 0) {
    return {
      level: 'steady',
      label: 'Ritim düzenli',
      description: 'Son haftalardaki plan tamamlama akışı istikrarlı görünüyor; ek müdahale gerektiren birikme yok.',
    }
  }
  if (recentCompletion >= 60 && currentBacklog <= 1) {
    return {
      level: 'mixed',
      label: 'Ritim dalgalı',
      description: 'Planın önemli bölümü tamamlanıyor; ancak sürekliliği korumak için haftalık yükü izlemek faydalı olur.',
    }
  }
  return {
    level: 'rebalance',
    label: 'Plan dengelenmeli',
    description: 'Son haftalardaki gerçekleşme ile mevcut plan yükü arasında belirgin bir fark oluşmuş görünüyor.',
  }
}

export function buildStudentDevelopment(data: CoachData, studentId: string): StudentDevelopment {
  const today = isoToday()
  const currentMonday = mondayOf(new Date())
  const assignments = data.assignments.filter(item => item.ogrenci_id === studentId && !isCancelled(item.durum))

  const weeks: DevelopmentWeek[] = Array.from({ length: 8 }, (_, index) => {
    const startDate = addDays(currentMonday, (index - 7) * 7)
    const endDate = addDays(startDate, 6)
    const start = localIso(startDate)
    const end = localIso(endDate)
    const rows = assignments.filter(item => {
      const date = item.son_teslim_tarihi || item.verilis_tarihi || ''
      return Boolean(date && date >= start && date <= end)
    })
    const done = rows.filter(item => isDone(item.durum)).length
    return {
      start,
      end,
      label: shortDay(start),
      current: index === 7,
      total: rows.length,
      done,
      completion: rows.length ? Math.round((done / rows.length) * 100) : null,
    }
  })

  const recentWeeks = weeks.slice(4)
  const previousWeeks = weeks.slice(0, 4)
  const recentCompletion = weightedCompletion(recentWeeks)
  const previousCompletion = weightedCompletion(previousWeeks)
  const recentTotal = recentWeeks.reduce((sum, week) => sum + week.total, 0)
  const previousTotal = previousWeeks.reduce((sum, week) => sum + week.total, 0)
  const completionDelta = recentCompletion != null && previousCompletion != null && recentTotal >= 3 && previousTotal >= 3
    ? recentCompletion - previousCompletion
    : null

  const activeWeeks = weeks.filter(week => week.total > 0).length
  const totalAssignments = weeks.reduce((sum, week) => sum + week.total, 0)
  const currentBacklog = assignments.filter(item => {
    if (isDone(item.durum)) return false
    const due = item.son_teslim_tarihi || ''
    return Boolean(due && due < today)
  }).length

  let steadyWeekStreak = 0
  for (let index = weeks.length - 2; index >= 0; index -= 1) {
    const week = weeks[index]
    if (!week.total || week.completion == null || week.completion < 70) break
    steadyWeekStreak += 1
  }

  const rhythm = rhythmMeta(recentCompletion, currentBacklog, activeWeeks, totalAssignments)

  const allExams = data.exams
    .filter(exam => exam.ogrenci_id === studentId)
    .sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
  const latestExam = allExams[0]
  const examType = latestExam?.sinav_turu || null
  const sameType = examType
    ? allExams.filter(exam => exam.sinav_turu === examType)
    : []
  const points = sameType
    .map(exam => ({ exam, net: examTotalNet(data, exam.deneme_id) }))
    .filter((row): row is { exam: typeof sameType[number]; net: number } => row.net != null)
    .slice(0, 4)
    .reverse()
    .map(row => ({
      examId: row.exam.deneme_id,
      date: row.exam.deneme_tarihi,
      name: row.exam.deneme_adi,
      type: row.exam.sinav_turu,
      net: row.net,
    }))

  const latestPoint = points[points.length - 1] || null
  const previousPoint = points[points.length - 2] || null
  const examDelta = latestPoint && previousPoint
    ? Math.round((latestPoint.net - previousPoint.net) * 100) / 100
    : null

  let subjectTrends: SubjectTrend[] = []
  if (latestPoint && previousPoint) {
    const latestSections = data.examSections.filter(section => section.deneme_id === latestPoint.examId && section.net != null)
    const previousSections = data.examSections.filter(section => section.deneme_id === previousPoint.examId && section.net != null)
    const previousMap = new Map(previousSections.map(section => [normalizeSection(section.bolum_adi), section]))
    subjectTrends = latestSections
      .map(section => {
        const previous = previousMap.get(normalizeSection(section.bolum_adi))
        if (!previous || previous.net == null || section.net == null) return null
        const latest = Number(section.net)
        const earlier = Number(previous.net)
        return {
          name: section.bolum_adi,
          latest,
          previous: earlier,
          delta: Math.round((latest - earlier) * 100) / 100,
        }
      })
      .filter((row): row is SubjectTrend => Boolean(row))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4)
  }

  const insights: string[] = []
  if (recentCompletion == null || activeWeeks < 3 || totalAssignments < 6) {
    insights.push('Çalışma alışkanlığı için henüz yeterli haftalık veri yok; sistem veri oluştukça ritmi otomatik değerlendirecek.')
  } else if (completionDelta != null && completionDelta >= 10) {
    insights.push(`Son 4 haftanın plan tamamlama oranı önceki 4 haftaya göre ${completionDelta} puan yükseldi.`)
  } else if (completionDelta != null && completionDelta <= -10) {
    insights.push(`Son 4 haftanın plan tamamlama oranı önceki döneme göre ${Math.abs(completionDelta)} puan geriledi; yükü gözden geçirmek faydalı olabilir.`)
  } else {
    insights.push(`Son 4 haftada planlanan çalışmaların %${recentCompletion}'i tamamlanmış görünüyor.`)
  }

  if (currentBacklog > 0) {
    insights.push(`Şu anda teslim tarihi geçmiş ve tamamlanmamış ${currentBacklog} çalışma var; bu yalnız mevcut birikimi gösterir, geçmişte geç tamamlanan işleri tahmin etmez.`)
  } else if (steadyWeekStreak >= 2) {
    insights.push(`Tamamlanmış haftalar içinde %70 ve üzeri gerçekleşme ${steadyWeekStreak} hafta üst üste korunmuş.`)
  }

  if (examDelta != null && latestPoint && previousPoint) {
    insights.push(`${examType || 'Aynı tür'} denemelerde son iki karşılaştırılabilir sonuç arasında ${examDelta > 0 ? '+' : ''}${examDelta.toLocaleString('tr-TR')} net değişim var; neden-sonuç yorumu yapılmıyor.`)
  }

  return {
    rhythm: {
      ...rhythm,
      recentCompletion,
      previousCompletion,
      completionDelta,
      activeWeeks,
      steadyWeekStreak,
      currentBacklog,
      weeks,
    },
    exams: {
      type: examType,
      points,
      latestNet: latestPoint?.net ?? null,
      delta: examDelta,
      subjectTrends,
    },
    insights: insights.slice(0, 3),
  }
}
