const normalizeTeacherName = (name: string) => name.trim().toLocaleUpperCase('tr-TR')

const teacherIdentityName = (name: string) => normalizeTeacherName(name)
  .replace(/^(?:(?:PROF|DOÇ|DR|UZM)\.?\s+)+/u, '')
  .trim()

const normalizeTeacherRole = (role?: string | null) => (role || '').trim().toLocaleUpperCase('tr-TR')

export type TeacherTone = 'teacher-pink' | 'teacher-blue' | 'teacher-yellow'

export function teacherTone(name: string): TeacherTone {
  const normalized = teacherIdentityName(name)
  if (normalized === 'BAŞAK ATİLLA') return 'teacher-pink'
  if (normalized === 'SÜLEYMAN YALÇINER') return 'teacher-blue'
  return 'teacher-yellow'
}

export function isManagerTeacher(teacher: { rol?: string | null } | string) {
  if (typeof teacher !== 'string') return normalizeTeacherRole(teacher.rol) === 'YÖNETİCİ'

  // Eski çağrılar için geriye dönük güvenli davranış; yeni ekranlar rol alanını kullanır.
  const normalized = teacherIdentityName(teacher)
  return normalized === 'BAŞAK ATİLLA' || normalized === 'SÜLEYMAN YALÇINER'
}
