import { APP_MODE } from './supabase'

const normalizeTeacherName = (name: string) => name.trim().toLocaleUpperCase('tr-TR')

export type TeacherTone = 'teacher-pink' | 'teacher-blue' | 'teacher-yellow'

export function teacherTone(name: string): TeacherTone {
  const normalized = normalizeTeacherName(name)
  if (normalized === 'BAŞAK ATİLLA' || (APP_MODE === 'demo' && normalized === 'DENİZ ARMAN')) return 'teacher-pink'
  if (normalized === 'SÜLEYMAN YALÇINER' || (APP_MODE === 'demo' && normalized === 'SELİN AKSOY')) return 'teacher-blue'
  return 'teacher-yellow'
}

export function isManagerTeacher(name: string) {
  const normalized = normalizeTeacherName(name)
  if (normalized === 'BAŞAK ATİLLA' || normalized === 'SÜLEYMAN YALÇINER') return true
  return APP_MODE === 'demo' && (normalized === 'DENİZ ARMAN' || normalized === 'SELİN AKSOY')
}
