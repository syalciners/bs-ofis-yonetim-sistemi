export type ProductProfileKey = 'egitim' | 'muzik-dans' | 'muzik' | 'dans'

type ProductTerms = {
  student: string
  students: string
  studentLower: string
  studentsLower: string
  teacher: string
  teachers: string
  teacherLower: string
  teachersLower: string
  branch: string
  room: string
}

type ProductFeatures = {
  assignments: boolean
  parentFields: boolean
}

export type ProductProfile = {
  key: ProductProfileKey
  brand: string
  brandShort: string
  brandSuffix: string
  demoLeadLabel: string
  terms: ProductTerms
  features: ProductFeatures
}

const profiles: Record<ProductProfileKey, ProductProfile> = {
  egitim: {
    key: 'egitim',
    brand: 'BS Eğitim Yönetimi',
    brandShort: 'BS Eğitim',
    brandSuffix: 'Yönetimi',
    demoLeadLabel: 'BS EĞİTİM YÖNETİMİ',
    terms: {
      student: 'Öğrenci', students: 'Öğrenciler', studentLower: 'öğrenci', studentsLower: 'öğrenciler',
      teacher: 'Öğretmen', teachers: 'Öğretmenler', teacherLower: 'öğretmen', teachersLower: 'öğretmenler',
      branch: 'Branş', room: 'Derslik',
    },
    features: { assignments: true, parentFields: true },
  },
  'muzik-dans': {
    key: 'muzik-dans',
    brand: 'BS Müzik & Dans Yönetimi',
    brandShort: 'BS Müzik & Dans',
    brandSuffix: 'Yönetimi',
    demoLeadLabel: 'BS MÜZİK & DANS YÖNETİMİ',
    terms: {
      student: 'Kursiyer', students: 'Kursiyerler', studentLower: 'kursiyer', studentsLower: 'kursiyerler',
      teacher: 'Eğitmen', teachers: 'Eğitmenler', teacherLower: 'eğitmen', teachersLower: 'eğitmenler',
      branch: 'Branş', room: 'Stüdyo / Salon',
    },
    features: { assignments: false, parentFields: true },
  },
  muzik: {
    key: 'muzik',
    brand: 'BS Müzik Kursu Yönetimi',
    brandShort: 'BS Müzik',
    brandSuffix: 'Kurs Yönetimi',
    demoLeadLabel: 'BS MÜZİK KURSU YÖNETİMİ',
    terms: {
      student: 'Öğrenci', students: 'Öğrenciler', studentLower: 'öğrenci', studentsLower: 'öğrenciler',
      teacher: 'Eğitmen', teachers: 'Eğitmenler', teacherLower: 'eğitmen', teachersLower: 'eğitmenler',
      branch: 'Enstrüman / Alan', room: 'Stüdyo / Oda',
    },
    features: { assignments: false, parentFields: true },
  },
  dans: {
    key: 'dans',
    brand: 'BS Dans Kursu Yönetimi',
    brandShort: 'BS Dans',
    brandSuffix: 'Kurs Yönetimi',
    demoLeadLabel: 'BS DANS KURSU YÖNETİMİ',
    terms: {
      student: 'Katılımcı', students: 'Katılımcılar', studentLower: 'katılımcı', studentsLower: 'katılımcılar',
      teacher: 'Eğitmen', teachers: 'Eğitmenler', teacherLower: 'eğitmen', teachersLower: 'eğitmenler',
      branch: 'Dans Türü', room: 'Stüdyo',
    },
    features: { assignments: false, parentFields: true },
  },
}

const isKey = (value: string | null | undefined): value is ProductProfileKey => Boolean(value && value in profiles)
const appMode = (import.meta.env.VITE_APP_MODE || 'live').trim().toLowerCase()
const envKey = (import.meta.env.VITE_PRODUCT_PROFILE || '').trim().toLowerCase()

let selectedKey: ProductProfileKey = isKey(envKey) ? envKey : 'egitim'

// Yalnız demo/preview sırasında URL ile ürün varyantı karşılaştırmasına izin verir.
// Bu değer kurum ayarı değildir ve kalıcı veri olarak kullanılmaz.
if (appMode === 'demo' && typeof window !== 'undefined') {
  const queryKey = new URLSearchParams(window.location.search).get('urun')?.trim().toLowerCase()
  if (isKey(queryKey)) {
    sessionStorage.setItem('bs-demo-product-profile', queryKey)
    selectedKey = queryKey
  } else {
    const storedKey = sessionStorage.getItem('bs-demo-product-profile')
    if (isKey(storedKey)) selectedKey = storedKey
  }
}

export const productProfile = profiles[selectedKey]
export const productProfiles = profiles
export const t = productProfile.terms
export const featureEnabled = (feature: keyof ProductFeatures) => productProfile.features[feature]
