import { Camera } from 'lucide-react'
import { useState } from 'react'
import { saveProfilePhoto } from '../services/profilePhotoService'
import { useAppData } from './AppDataProvider'
import { ProfileAvatar } from './ProfileAvatar'
import { useToast } from './Toast'

export function ProfilePhotoEditor({ kind, recordId, name, photoPath }: { kind: 'ogrenci' | 'ogretmen'; recordId: string; name: string; photoPath?: string | null }) {
  const { refresh } = useAppData()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!file) return
    setBusy(true)
    try {
      await saveProfilePhoto(kind, recordId, file, photoPath)
      await refresh()
      setFile(null)
      toast('Profil fotoğrafı güncellendi.')
    } catch (error: any) {
      toast(error.message || String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return <section className="form-summary" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center', marginBottom: 16 }}>
    <ProfileAvatar name={name} photoPath={photoPath} className="avatar"/>
    <div style={{ display: 'grid', gap: 8 }}>
      <b>Profil Fotoğrafı</b>
      <span className="muted">JPG, PNG veya WEBP · en fazla 5 MB</span>
      <label className="secondary-btn" style={{ width: 'fit-content', cursor: busy ? 'default' : 'pointer' }}>
        <Camera size={16}/>{file ? file.name : photoPath ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç'}
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)}/>
      </label>
      {file && <button type="button" className="primary-btn" style={{ width: 'fit-content' }} disabled={busy} onClick={() => void save()}>{busy ? 'Yükleniyor…' : 'Fotoğrafı Kaydet'}</button>}
    </div>
  </section>
}
