const normalizeTeacherName = (name: string) => name.trim().toLocaleUpperCase('tr-TR')

export type TeacherTone = 'teacher-pink' | 'teacher-blue' | 'teacher-yellow'

export function teacherTone(name: string): TeacherTone {
  const normalized = normalizeTeacherName(name)
  if (normalized === 'BAŞAK ATİLLA') return 'teacher-pink'
  if (normalized === 'SÜLEYMAN YALÇINER') return 'teacher-blue'
  return 'teacher-yellow'
}

export function isManagerTeacher(name: string) {
  const normalized = normalizeTeacherName(name)
  return normalized === 'BAŞAK ATİLLA' || normalized === 'SÜLEYMAN YALÇINER'
}
