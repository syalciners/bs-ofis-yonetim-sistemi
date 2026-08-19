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
  return data as ExamPhotoResponse
}
