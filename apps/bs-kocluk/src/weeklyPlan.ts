import { bookForStudentBook, isCancelled, isDone, isoToday, type Assignment, type CoachData } from './data'
import { buildStudentPulse } from './studentPulse'

export type WeeklyStudyType = 'Sayfa' | 'Test'

export interface WeeklyPlanSuggestion {
  id: string
  studentId: string
  studentBookId: string
  bookName: string
  bookMeta: string
  type: WeeklyStudyType
  startNo: number
  endNo: number
  maxNo: number | null
  dueDate: string
  reason: string
}

export interface WeeklyPlanDraft {
  studentId: string
  today: string
  planEnd: string
  openAssignments: Assignment[]
  suggestions: WeeklyPlanSuggestion[]
  holdNewWork: boolean
  holdReason: string | null
}

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function nextSunday(fromIso: string) {
  const [y, m, d] = fromIso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const offset = day === 0 ? 7 : 7 - day
  date.setDate(date.getDate() + offset)
  return localIso(date)
}

function assignmentDate(item: Assignment) {
  return item.son_teslim_tarihi || item.verilis_tarihi || ''
}

function validRange(item: Assignment): item is Assignment & { calisma_turu: WeeklyStudyType; baslangic_no: number; bitis_no: number; ogrenci_kitap_id: string } {
  return Boolean(
    item.ogrenci_kitap_id
    && (item.calisma_turu === 'Sayfa' || item.calisma_turu === 'Test')
    && item.baslangic_no != null
    && item.bitis_no != null
    && Number(item.baslangic_no) > 0
    && Number(item.bitis_no) >= Number(item.baslangic_no),
  )
}

export function buildWeeklyPlanDraft(data: CoachData, studentId: string): WeeklyPlanDraft {
  const today = isoToday()
  const planEnd = nextSunday(today)
  const pulse = buildStudentPulse(data, studentId)

  const studentAssignments = data.assignments.filter(item => item.ogrenci_id === studentId && !isCancelled(item.durum))
  const openAssignments = studentAssignments
    .filter(item => !isDone(item.durum))
    .filter(item => {
      const due = item.son_teslim_tarihi
      return !due || due <= planEnd
    })
    .sort((a, b) => assignmentDate(a).localeCompare(assignmentDate(b)))

  const holdForOverdue = pulse.metrics.overdue > 0
  const holdForCompletion = pulse.metrics.weekCompletion != null && pulse.metrics.weekCompletion < 65
  const holdNewWork = holdForOverdue || holdForCompletion
  const holdReason = holdForOverdue
    ? `${pulse.metrics.overdue} geciken çalışma varken sistem yeni yük önermiyor. Önce mevcut planı dengelemek daha doğru.`
    : holdForCompletion
      ? `Haftalık tamamlama %${pulse.metrics.weekCompletion}. Sistem yeni yük eklemek yerine mevcut planın sadeleştirilmesini öneriyor.`
      : null

  if (holdNewWork) {
    return { studentId, today, planEnd, openAssignments, suggestions: [], holdNewWork, holdReason }
  }

  const suggestions: WeeklyPlanSuggestion[] = []
  const activeBooks = data.studentBooks.filter(link => link.ogrenci_id === studentId && link.durum === 'Aktif')

  for (const link of activeBooks) {
    const alreadyOpen = studentAssignments.some(item =>
      item.ogrenci_kitap_id === link.ogrenci_kitap_id
      && !isDone(item.durum)
      && !isCancelled(item.durum),
    )
    if (alreadyOpen) continue

    const completedHistory = studentAssignments
      .filter(item => item.ogrenci_kitap_id === link.ogrenci_kitap_id && isDone(item.durum) && validRange(item))
      .sort((a, b) => assignmentDate(b).localeCompare(assignmentDate(a)))

    const last = completedHistory[0]
    if (!last || !validRange(last)) continue

    const span = Number(last.bitis_no) - Number(last.baslangic_no) + 1
    const startNo = Number(last.bitis_no) + 1
    const book = bookForStudentBook(data, link.ogrenci_kitap_id)
    const maxNo = book?.toplam_sayfa && last.calisma_turu === 'Sayfa' ? Number(book.toplam_sayfa) : null
    if (maxNo != null && startNo > maxNo) continue

    const rawEnd = startNo + span - 1
    const endNo = maxNo != null ? Math.min(rawEnd, maxNo) : rawEnd
    if (endNo < startNo) continue

    suggestions.push({
      id: `${studentId}:${link.ogrenci_kitap_id}:${last.calisma_turu}:${startNo}:${endNo}`,
      studentId,
      studentBookId: link.ogrenci_kitap_id,
      bookName: book?.kitap_adi || 'Aktif kitap',
      bookMeta: [book?.ders, book?.yayinevi].filter(Boolean).join(' · ') || 'Aktif kitap',
      type: last.calisma_turu,
      startNo,
      endNo,
      maxNo,
      dueDate: planEnd,
      reason: `Son tamamlanan çalışma ${last.baslangic_no}–${last.bitis_no}. Aynı çalışma yükü korunarak ${startNo}–${endNo} aralığı önerildi.`,
    })
  }

  return {
    studentId,
    today,
    planEnd,
    openAssignments,
    suggestions: suggestions.sort((a, b) => a.bookName.localeCompare(b.bookName, 'tr')),
    holdNewWork,
    holdReason,
  }
}
