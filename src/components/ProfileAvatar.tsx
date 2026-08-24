import { useEffect, useState } from 'react'

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toLocaleUpperCase('tr-TR')
}

export function ProfileAvatar({ name, photoPath, className = 'avatar' }: { name: string; photoPath?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [photoPath])

  return <div className={className} aria-label={`${name} profil fotoğrafı`}>
    {photoPath && !failed
      ? <img src={photoPath} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', display: 'block' }}/>
      : initials(name)}
  </div>
}
