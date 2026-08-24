import { useEffect, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { signedProfilePhotoUrl } from '../services/profilePhotoService'

const urlCache = new Map<string, string>()

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toLocaleUpperCase('tr-TR')
}

type ProfileAvatarProps = {
  name: string
  photoPath?: string | null
  className?: string
  preview?: boolean
}

export function ProfileAvatar({ name, photoPath, className = 'avatar', preview }: ProfileAvatarProps) {
  const [url, setUrl] = useState<string | null>(() => photoPath ? urlCache.get(photoPath) || null : null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewEnabled = preview ?? className.split(/\s+/).includes('profile-detail-avatar')

  useEffect(() => {
    let active = true
    if (!photoPath) {
      setUrl(null)
      setPreviewOpen(false)
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

  useEffect(() => {
    if (!previewOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [previewOpen])

  const canPreview = Boolean(previewEnabled && url)
  const openPreview = () => {
    if (canPreview) setPreviewOpen(true)
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!canPreview) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setPreviewOpen(true)
    }
  }

  return <>
    <div
      className={`${className}${canPreview ? ' profile-avatar-preview-trigger' : ''}`}
      aria-label={`${name} profil fotoğrafı${canPreview ? ', büyütmek için dokunun' : ''}`}
      role={canPreview ? 'button' : undefined}
      tabIndex={canPreview ? 0 : undefined}
      title={canPreview ? 'Fotoğrafı büyüt' : undefined}
      onClick={openPreview}
      onKeyDown={onKeyDown}
    >
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
        : initials(name)}
    </div>
    {canPreview && previewOpen && createPortal(
      <div className="profile-photo-lightbox" role="dialog" aria-modal="true" aria-label={`${name} profil fotoğrafı büyük önizleme`} onClick={() => setPreviewOpen(false)}>
        <button type="button" className="profile-photo-lightbox-close" aria-label="Büyük fotoğrafı kapat" onClick={() => setPreviewOpen(false)}>×</button>
        <div className="profile-photo-lightbox-stage" onClick={event => event.stopPropagation()}>
          <img className="profile-photo-lightbox-image" src={url} alt={`${name} profil fotoğrafı`}/>
          <span className="profile-photo-lightbox-name">{name}</span>
        </div>
      </div>,
      document.body,
    )}
  </>
}
