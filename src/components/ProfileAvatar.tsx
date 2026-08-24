import { useEffect, useState } from 'react'
import { signedProfilePhotoUrl } from '../services/profilePhotoService'

const urlCache = new Map<string, string>()

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toLocaleUpperCase('tr-TR')
}

export function ProfileAvatar({ name, photoPath, className = 'avatar' }: { name: string; photoPath?: string | null; className?: string }) {
  const [url, setUrl] = useState<string | null>(() => photoPath ? urlCache.get(photoPath) || null : null)

  useEffect(() => {
    let active = true
    if (!photoPath) {
      setUrl(null)
      return () => { active = false }
    }

    const cached = urlCache.get(photoPath)
    if (cached) {
      setUrl(cached)
      return () => { active = false }
    }

    void signedProfilePhotoUrl(photoPath)
      .then(next => {
        if (!active || !next) return
        urlCache.set(photoPath, next)
        setUrl(next)
      })
      .catch(() => {
        if (active) setUrl(null)
      })

    return () => { active = false }
  }, [photoPath])

  return <div className={className} aria-label={`${name} profil fotoğrafı`}>
    {url
      ? <img src={url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
      : initials(name)}
  </div>
}
