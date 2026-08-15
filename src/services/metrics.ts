import type { AppData, Ders, Ogrenci, Ogretmen } from '../lib/types'
import { addDays, firstOfMonth, mondayOf, todayISO } from '../lib/format'

export const activeStudents = (d: AppData) => d.ogrenciler.filter(x => x.durum !== 'Pasif')
export const activeTeachers = (d: AppData) => d.ogretmenler.filter(x => x.durum !== 'Pasif')
export const studentName = (d: AppData, id?: string | null) => d.ogrenciler.find(x => x.ogrenci_id === id)?.ad_soyad || '—'
export const teacherName = (d: AppData, id?: string | null) => d.ogretmenler.find(x => x.ogretmen_id === id)?.ad_soyad || '—'
export const branchName = (d: AppData, id?: string | null) => d.branslar.find(x => x.brans_id === id)?.brans_adi || '—'
export const roomName = (d: AppData, id?: string | null) => d.derslikler.find(x => x.derslik_id === id)?.mekan_adi || '—'
export const accountName = (d: AppData, id?: string | null) => d.kasaHesaplari.find(x => x.hesap_id === id)?.hesap_adi || '—'
export const expenseName = (d: AppData, id?: string | null) => d.giderKategorileri.find(x => x.kategori_id === id)?.kategori_adi || 'Gider'

export const studentDebt = (d: AppData, id: string) => {
  const debt = d.dersler.filter(x => x.ogrenci_id === id && x.ders_durumu === 'Yapıldı').reduce((s, x) => s + Number(x.ogrenci_toplam_tutar || 0), 0)
  const paid = d.tahsilatlar.filter(x => x.ogrenci_id === id && !x.iptal_mi).reduce((s, x) => s + Number(x.tutar || 0), 0)
  return debt - paid
}

export const totalOpenDebt = (d: AppData) => activeStudents(d).reduce((s, x) => s + Math.max(studentDebt(d, x.ogrenci_id), 0), 0)

export const teacherBalance = (d: AppData, id: string) => {
  const earned = d.dersler.filter(x => x.ogretmen_id === id && x.ders_durumu === 'Yapıldı').reduce((s, x) => s + Number(x.ogretmen_toplam_hakedis || 0), 0)
  const paid = d.ogretmenOdemeleri.filter(x => x.ogretmen_id === id && !x.iptal_mi).reduce((s, x) => s + Number(x.tutar || 0), 0)
  return earned - paid
}

export const totalTeacherBalance = (d: AppData) => activeTeachers(d).reduce((s, x) => s + Math.max(teacherBalance(d, x.ogretmen_id), 0), 0)

export const matchingActiveCollection = (d: AppData, input: { ogrenci_id: string; tarih: string; tutar: number; odeme_yontemi: string }) =>
  d.tahsilatlar.find(x =>
    !x.iptal_mi &&
    x.ogrenci_id === input.ogrenci_id &&
    x.tarih === input.tarih &&
    Math.abs(Number(x.tutar || 0) - Number(input.tutar || 0)) < 0.005 &&
    String(x.odeme_yontemi || '') === input.odeme_yontemi
  )

export const monthCollections = (d: AppData, prefix = firstOfMonth().slice(0,7)) => d.tahsilatlar.filter(x => !x.iptal_mi && x.tarih?.startsWith(prefix)).reduce((s, x) => s + Number(x.tutar || 0), 0)
export const monthExpenses = (d: AppData, prefix = firstOfMonth().slice(0,7)) => d.giderler.filter(x => !x.iptal_mi && x.tarih?.startsWith(prefix)).reduce((s, x) => s + Number(x.tutar || 0), 0)
export const monthTeacherPayments = (d: AppData, prefix = firstOfMonth().slice(0,7)) => d.ogretmenOdemeleri.filter(x => !x.iptal_mi && x.tarih?.startsWith(prefix)).reduce((s, x) => s + Number(x.tutar || 0), 0)
export const monthRevenue = (d: AppData, prefix = firstOfMonth().slice(0,7)) => d.dersler.filter(x => x.ders_durumu === 'Yapıldı' && x.tarih?.startsWith(prefix)).reduce((s, x) => s + Number(x.ogrenci_toplam_tutar || 0), 0)

export const cashBalance = (d: AppData) => {
  const opening = d.kasaHesaplari.filter(x => x.aktif !== false).reduce((s, x) => s + Number(x.acilis_bakiyesi || 0), 0)
  const flow = d.kasaHareketleri.filter(x => !x.iptal_mi).reduce((s, x) => s + (x.hareket_turu === 'Gelir' ? Number(x.tutar || 0) : -Number(x.tutar || 0)), 0)
  return opening + flow
}

export const todayLessons = (d: AppData) => d.dersler.filter(x => x.tarih === todayISO()).sort(sortLesson)
export const weekLessons = (d: AppData, monday = mondayOf()) => {
  const end = addDays(monday, 7)
  return d.dersler.filter(x => (x.tarih || '') >= monday && (x.tarih || '') < end).sort(sortLesson)
}
export const upcomingLessons = (d: AppData, days = 7) => {
  const t = todayISO(), e = addDays(t, days)
  return d.dersler.filter(x => (x.tarih || '') >= t && (x.tarih || '') <= e && x.ders_durumu === 'Planlandı').sort(sortLesson)
}
export const overdueAssignments = (d: AppData) => d.odevler.filter(x => x.son_teslim_tarihi && x.son_teslim_tarihi < todayISO() && !['Tamamlandı','Teslim Edildi'].includes(x.durum))
export const zoomProblems = (d: AppData) => d.dersler.filter(x => x.zoom_islem_durumu && ['Hata','Başarısız'].includes(x.zoom_islem_durumu))

export const nextLessonForStudent = (d: AppData, studentId: string) => d.dersler.filter(x => x.ogrenci_id === studentId && x.ders_durumu === 'Planlandı' && (x.tarih || '') >= todayISO()).sort(sortLesson)[0]
export const nextLessonForTeacher = (d: AppData, teacherId: string) => d.dersler.filter(x => x.ogretmen_id === teacherId && x.ders_durumu === 'Planlandı' && (x.tarih || '') >= todayISO()).sort(sortLesson)[0]

export function sortLesson(a: Ders, b: Ders) {
  return String(a.tarih || '').localeCompare(String(b.tarih || '')) || String(a.baslangic_saati || '').localeCompare(String(b.baslangic_saati || ''))
}

export const studentById = (d: AppData, id: string): Ogrenci | undefined => d.ogrenciler.find(x => x.ogrenci_id === id)
export const teacherById = (d: AppData, id: string): Ogretmen | undefined => d.ogretmenler.find(x => x.ogretmen_id === id)
