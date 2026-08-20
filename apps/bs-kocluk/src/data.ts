import { supabase } from './supabase'

export interface CoachUserProfile {
  auth_user_id: string
  email?: string | null
  ad_soyad: string
  rol: string
  aktif: boolean
  ogretmen_id?: string | null
}

export interface CoachingProfile {
  ogrenci_id: string
  koc_ogretmen_id?: string | null
  sinav_turu?: string | null
  hedef_okul?: string | null
  hedef_bolum?: string | null
  hedef_puan?: number | null
  hedef_siralama?: number | null
  baslangic_tarihi: string
  durum: string
  haftalik_calisma_yogunlugu?: 'Hafif' | 'Normal' | 'Yoğun' | null
  pazar_calisma?: boolean | null
}

export interface Student {
  ogrenci_id: string
  ad_soyad: string
  durum?: string | null
}

export interface Assignment {
  odev_id: string
  ogrenci_id: string
  ogretmen_id?: string | null
  konu?: string | null
  odev_basligi?: string | null
  verilis_tarihi?: string | null
  son_teslim_tarihi?: string | null
  durum: string
  oncelik?: string | null
  ogrenci_kitap_id?: string | null
  calisma_turu?: string | null
  baslangic_no?: number | null
  bitis_no?: number | null
  calisma_detayi?: string | null
  kaynak_gorusme_id?: string | null
  haftalik_plan_id?: string | null
  plan_kaynagi?: string | null
}

export interface Meeting {
  gorusme_id: string
  ogrenci_id: string
  koc_ogretmen_id: string
  gorusme_tarihi: string
  baslangic_saati?: string | null
  gorusme_turu?: string | null
  durum: string
  gundem?: string | null
  gorusme_notu?: string | null
  alinan_kararlar?: string | null
  sonraki_gorusme_tarihi?: string | null
}

export interface Exam {
  deneme_id: string
  ogrenci_id: string
  sinav_turu: string
  deneme_adi: string
  deneme_tarihi: string
  puan?: number | null
  siralama?: number | null
  yuzdelik?: number | null
  onay_durumu: string
}

export interface ExamSection {
  sonuc_id: string
  deneme_id: string
  bolum_adi: string
  sira_no?: number | null
  dogru?: number | null
  yanlis?: number | null
  bos?: number | null
  soru_sayisi?: number | null
  net?: number | null
}

export interface StudentBook {
  ogrenci_kitap_id: string
  ogrenci_id: string
  kitap_id: string
  durum: string
  eklenme_tarihi?: string | null
}

export interface CatalogBook {
  kitap_id: string
  kitap_adi: string
  yayinevi?: string | null
  isbn?: string | null
  ders?: string | null
  sinav_turu?: string | null
  baski?: string | null
  toplam_sayfa?: number | null
  kapak_url?: string | null
  durum: string
}

export interface CoachData {
  profile: CoachUserProfile
  coachingProfiles: CoachingProfile[]
  students: Student[]
  assignments: Assignment[]
  meetings: Meeting[]
  exams: Exam[]
  examSections: ExamSection[]
  studentBooks: StudentBook[]
  bookCatalog: CatalogBook[]
}

function ensure<T>(data: T | null, error: { message?: string } | null, label: string): T {
  if (error) throw new Error(`${label}: ${error.message || 'veri alınamadı'}`)
  return data as T
}

export async function loadCoachData(userId: string): Promise<CoachData> {
  const profileResult = await supabase
    .from('kullanici_profilleri')
    .select('auth_user_id,email,ad_soyad,rol,aktif,ogretmen_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  const profile = ensure(profileResult.data, profileResult.error, 'Kullanıcı profili') as CoachUserProfile | null
  if (!profile?.aktif) throw new Error('Bu kullanıcı hesabı aktif değil.')
  if (!['Yönetici', 'Koç'].includes(profile.rol)) throw new Error('BS Koçluk yalnız Yönetici veya Koç hesaplarına açıktır.')
  if (profile.rol === 'Koç' && !profile.ogretmen_id) throw new Error('Koç hesabı için personel eşleştirmesi eksik.')

  const profilesResult = await supabase
    .from('kocluk_ogrenci_profilleri')
    .select('ogrenci_id,koc_ogretmen_id,sinav_turu,hedef_okul,hedef_bolum,hedef_puan,hedef_siralama,baslangic_tarihi,durum,haftalik_calisma_yogunlugu,pazar_calisma')
    .eq('durum', 'Aktif')
    .order('guncellenme_zamani', { ascending: false })

  const coachingProfiles = ensure(profilesResult.data || [], profilesResult.error, 'Koçluk profilleri') as CoachingProfile[]
  const studentIds = coachingProfiles.map(x => x.ogrenci_id)

  if (!studentIds.length) {
    return {
      profile,
      coachingProfiles,
      students: [],
      assignments: [],
      meetings: [],
      exams: [],
      examSections: [],
      studentBooks: [],
      bookCatalog: [],
    }
  }

  const [studentsResult, assignmentsResult, meetingsResult, examsResult, studentBooksResult] = await Promise.all([
    supabase.from('ogrenciler').select('ogrenci_id,ad_soyad,durum').in('ogrenci_id', studentIds).order('ad_soyad'),
    supabase.from('odevler').select('odev_id,ogrenci_id,ogretmen_id,konu,odev_basligi,verilis_tarihi,son_teslim_tarihi,durum,oncelik,ogrenci_kitap_id,calisma_turu,baslangic_no,bitis_no,calisma_detayi,kaynak_gorusme_id,haftalik_plan_id,plan_kaynagi').in('ogrenci_id', studentIds).order('son_teslim_tarihi', { ascending: true, nullsFirst: false }),
    supabase.from('kocluk_gorusmeleri').select('gorusme_id,ogrenci_id,koc_ogretmen_id,gorusme_tarihi,baslangic_saati,gorusme_turu,durum,gundem,gorusme_notu,alinan_kararlar,sonraki_gorusme_tarihi').in('ogrenci_id', studentIds).order('gorusme_tarihi', { ascending: false }),
    supabase.from('kocluk_deneme_sinavlari').select('deneme_id,ogrenci_id,sinav_turu,deneme_adi,deneme_tarihi,puan,siralama,yuzdelik,onay_durumu').in('ogrenci_id', studentIds).neq('onay_durumu', 'İptal').order('deneme_tarihi', { ascending: false }),
    supabase.from('ogrenci_kitaplari').select('ogrenci_kitap_id,ogrenci_id,kitap_id,durum,eklenme_tarihi').in('ogrenci_id', studentIds).eq('durum', 'Aktif').order('eklenme_tarihi', { ascending: false, nullsFirst: false }),
  ])

  const students = ensure(studentsResult.data || [], studentsResult.error, 'Öğrenciler') as Student[]
  const assignments = ensure(assignmentsResult.data || [], assignmentsResult.error, 'Çalışmalar') as Assignment[]
  const meetings = ensure(meetingsResult.data || [], meetingsResult.error, 'Görüşmeler') as Meeting[]
  const exams = ensure(examsResult.data || [], examsResult.error, 'Denemeler') as Exam[]
  const studentBooks = ensure(studentBooksResult.data || [], studentBooksResult.error, 'Öğrenci kitapları') as StudentBook[]

  let examSections: ExamSection[] = []
  const examIds = [...new Set(exams.map(x => x.deneme_id))]
  if (examIds.length) {
    const sectionResult = await supabase
      .from('kocluk_deneme_bolum_sonuclari')
      .select('sonuc_id,deneme_id,bolum_adi,sira_no,dogru,yanlis,bos,soru_sayisi,net')
      .in('deneme_id', examIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
    examSections = ensure(sectionResult.data || [], sectionResult.error, 'Deneme bölüm sonuçları') as ExamSection[]
  }

  let bookCatalog: CatalogBook[] = []
  const bookIds = [...new Set(studentBooks.map(x => x.kitap_id))]
  if (bookIds.length) {
    const catalogResult = await supabase
      .from('kitap_katalogu')
      .select('kitap_id,kitap_adi,yayinevi,isbn,ders,sinav_turu,baski,toplam_sayfa,kapak_url,durum')
      .in('kitap_id', bookIds)
    bookCatalog = ensure(catalogResult.data || [], catalogResult.error, 'Kitap kataloğu') as CatalogBook[]
  }

  return {
    profile,
    coachingProfiles,
    students,
    assignments,
    meetings,
    exams,
    examSections,
    studentBooks,
    bookCatalog,
  }
}

export const isDone = (status: string) => ['Tamamlandı', 'Teslim Edildi'].includes(status)
export const isCancelled = (status: string) => status === 'İptal'
export const isCoachingAssignment = (item: Assignment) => Boolean(item.ogrenci_kitap_id || item.calisma_turu)

export function studentName(data: CoachData, studentId: string) {
  return data.students.find(x => x.ogrenci_id === studentId)?.ad_soyad || 'Öğrenci'
}

export function studentProfile(data: CoachData, studentId: string) {
  return data.coachingProfiles.find(x => x.ogrenci_id === studentId)
}

export function examTotalNet(data: CoachData, examId: string): number | null {
  const sections = data.examSections.filter(x => x.deneme_id === examId && x.net != null)
  if (!sections.length) return null
  return Math.round(sections.reduce((sum, x) => sum + Number(x.net || 0), 0) * 100) / 100
}

export function bookForStudentBook(data: CoachData, studentBookId: string) {
  const link = data.studentBooks.find(x => x.ogrenci_kitap_id === studentBookId)
  if (!link) return null
  return data.bookCatalog.find(x => x.kitap_id === link.kitap_id) || null
}

export function isoToday() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function shortDate(value?: string | null) {
  if (!value) return 'Tarih yok'
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}
