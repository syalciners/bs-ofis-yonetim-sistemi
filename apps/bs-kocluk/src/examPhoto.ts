import { supabase } from './supabase'

export type ExamPhotoSection = {
  bolum_adi: string
  soru_sayisi: string
  dogru: string
  yanlis: string
  bos: string
  guven: number
}

export type ExamPhotoRead = {
  sinav_turu: 'LGS' | 'TYT' | 'AYT' | 'Diğer' | 'Belirsiz'
  deneme_adi: string
  deneme_tarihi: string
  yayinevi: string
  puan: string
  siralama: string
  yuzdelik: string
  genel_guven: number
  bolumler: ExamPhotoSection[]
  uyarilar: string[]
}

export type ExamPhotoResponse = {
  basarili: boolean
  aktif: boolean
  durum?: 'yapilandirma_gerekli' | 'gecici_hata'
  model?: string
  okuma?: ExamPhotoRead
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Fotoğraf okunamadı.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Fotoğraf açılamadı. JPG veya PNG olarak tekrar deneyin.'))
    image.src = url
  })
}

function norm(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function strictInt(value: string) {
  const compact = value.trim()
  return /^\d+$/.test(compact) ? Number(compact) : null
}

function completeSection(row: ExamPhotoSection) {
  const q = strictInt(row.soru_sayisi)
  const d = strictInt(row.dogru)
  const y = strictInt(row.yanlis)
  const b = strictInt(row.bos)
  if (q == null || d == null || y == null || b == null) return null
  if (q <= 0 || d < 0 || y < 0 || b < 0 || d + y + b !== q) return null
  return { q, d, y, b }
}

function aggregateRows(name: string, expectedQuestions: number, rows: ExamPhotoSection[]) {
  const complete = rows.map(row => ({ row, values: completeSection(row) })).filter(x => x.values != null) as Array<{
    row: ExamPhotoSection
    values: { q: number; d: number; y: number; b: number }
  }>
  if (!complete.length || complete.length !== rows.length) return null
  const q = complete.reduce((sum, x) => sum + x.values.q, 0)
  const d = complete.reduce((sum, x) => sum + x.values.d, 0)
  const y = complete.reduce((sum, x) => sum + x.values.y, 0)
  const b = complete.reduce((sum, x) => sum + x.values.b, 0)
  if (q !== expectedQuestions || d + y + b !== q) return null
  return {
    bolum_adi: name,
    soru_sayisi: String(q),
    dogru: String(d),
    yanlis: String(y),
    bos: String(b),
    guven: Math.min(...complete.map(x => x.row.guven)),
  } satisfies ExamPhotoSection
}

function tytGroup(name: string) {
  const text = norm(name)
  if (text === 'turkce' || text.includes('turkce testi')) return 'turkce'
  if (text.includes('sosyal bilimler')) return 'sosyal-direct'
  if (text === 'tarih' || text.includes('tarih testi') || text.includes('cograf') || text.includes('felsefe') || text === 'dkab' || text.includes('din kultur')) return 'sosyal'
  if (text.includes('temel matematik')) return 'matematik-direct'
  if (text.includes('matematik')) return 'matematik'
  if (text.includes('fen bilimleri')) return 'fen-direct'
  if (text === 'fizik' || text.includes('fizik testi') || text === 'kimya' || text.includes('kimya testi') || text === 'biyoloji' || text.includes('biyoloji testi')) return 'fen'
  return ''
}

function normalizeTytSections(read: ExamPhotoRead): ExamPhotoRead {
  if (read.sinav_turu !== 'TYT' || !read.bolumler.length) return read

  const groups = new Map<string, ExamPhotoSection[]>()
  for (const row of read.bolumler) {
    const key = tytGroup(row.bolum_adi)
    if (!key) continue
    groups.set(key, [...(groups.get(key) || []), row])
  }

  const directOrAggregate = (directKey: string, detailKey: string, name: string, expected: number) => {
    const direct = groups.get(directKey) || []
    if (direct.length === 1) {
      const valid = aggregateRows(name, expected, direct)
      if (valid) return valid
    }
    const details = groups.get(detailKey) || []
    return details.length ? aggregateRows(name, expected, details) : null
  }

  const turkceRows = groups.get('turkce') || []
  const turkce = turkceRows.length === 1 ? aggregateRows('Türkçe', 40, turkceRows) : null
  const sosyal = directOrAggregate('sosyal-direct', 'sosyal', 'Sosyal Bilimler', 20)
  const matematik = directOrAggregate('matematik-direct', 'matematik', 'Temel Matematik', 40)
  const fen = directOrAggregate('fen-direct', 'fen', 'Fen Bilimleri', 20)
  const normalized = [turkce, sosyal, matematik, fen].filter(Boolean) as ExamPhotoSection[]

  if (!normalized.length) return read

  const missing: string[] = []
  if (!turkce) missing.push('Türkçe')
  if (!sosyal) missing.push('Sosyal Bilimler')
  if (!matematik) missing.push('Temel Matematik')
  if (!fen) missing.push('Fen Bilimleri')

  const extraWarnings = missing.length
    ? [`TYT özetinde ${missing.join(', ')} bölümü güvenle birleştirilemedi; bu alanları kontrol edin.`]
    : []

  return {
    ...read,
    bolumler: normalized,
    uyarilar: [...read.uyarilar, ...extraWarnings].slice(0, 8),
  }
}

function normalizeRead(read?: ExamPhotoRead) {
  if (!read) return read
  return normalizeTytSections(read)
}

export async function prepareExamPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Lütfen bir fotoğraf seçin.')
  if (file.size > 18 * 1024 * 1024) throw new Error('Fotoğraf çok büyük. Daha düşük çözünürlüklü bir fotoğraf seçin.')

  const source = await readAsDataUrl(file)
  const image = await loadImage(source)
  const maxSide = 1800
  const longest = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longest > maxSide ? maxSide / longest : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Fotoğraf hazırlanamadı.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  if (dataUrl.length > 7_800_000) throw new Error('Fotoğraf hâlâ çok büyük. Biraz daha yakından çekip tekrar deneyin.')
  return dataUrl
}

export async function readExamPhoto(input: {
  imageDataUrl: string
  studentId?: string
  examTypeHint?: string
}): Promise<ExamPhotoResponse> {
  const { data, error } = await supabase.functions.invoke('deneme-fotograf-oku-v1', {
    body: {
      image_data_url: input.imageDataUrl,
      ogrenci_id: input.studentId || null,
      sinav_turu_ipucu: input.examTypeHint || null,
    },
  })
  if (error) throw new Error(error.message || 'Fotoğraf okunamadı.')
  const response = data as ExamPhotoResponse
  return response.okuma ? { ...response, okuma: normalizeRead(response.okuma) } : response
}
