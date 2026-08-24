import { supabase } from '../lib/supabase'

const BUCKET = 'profil-fotograflari'
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type ProfileKind = 'ogrenci' | 'ogretmen'

const folderFor = (kind: ProfileKind) => kind === 'ogrenci' ? 'ogrenciler' : 'ogretmenler'
const isStoragePath = (path?: string | null) => Boolean(path && !/^https?:\/\//i.test(path))

function safeName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-80) || 'profil'
}

async function uploadProfilePhoto(kind: ProfileKind, recordId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Profil fotoğrafı JPG, PNG veya WEBP olmalıdır.')
  if (file.size > MAX_SIZE) throw new Error('Profil fotoğrafı en fazla 5 MB olabilir.')

  const path = `${folderFor(kind)}/${recordId}/profil-${Date.now()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw new Error(`Profil fotoğrafı yüklenemedi: ${error.message}`)
  return path
}

async function removeOldPhoto(path?: string | null) {
  if (!isStoragePath(path)) return
  const { error } = await supabase.storage.from(BUCKET).remove([path!])
  if (error) console.warn('Eski profil fotoğrafı silinemedi:', error.message)
}

export async function saveProfilePhoto(kind: ProfileKind, recordId: string, file: File, existingPath?: string | null) {
  const newPath = await uploadProfilePhoto(kind, recordId, file)
  const { error } = await supabase.rpc('profil_fotografi_guncelle_guvenli_v1', {
    p_kayit_turu: kind,
    p_kayit_id: recordId,
    p_profil_fotografi: newPath,
  })

  if (error) {
    await supabase.storage.from(BUCKET).remove([newPath])
    throw new Error(`Profil fotoğrafı kaydedilemedi: ${error.message}`)
  }

  if (existingPath && existingPath !== newPath) await removeOldPhoto(existingPath)
  return newPath
}

export async function signedProfilePhotoUrl(path?: string | null, expiresIn = 60 * 60 * 12) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw new Error(`Profil fotoğrafı açılamadı: ${error.message}`)
  return data.signedUrl
}
