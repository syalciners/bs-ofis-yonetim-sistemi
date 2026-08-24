function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toLocaleUpperCase('tr-TR')
}

export function ProfileAvatar({ name, photoPath, className = 'avatar' }: { name: string; photoPath?: string | null; className?: string }) {
  return <div className={className} aria-label={`${name} profil fotoğrafı`}>
    {photoPath
      ? <img src={photoPath} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
      : initials(name)}
  </div>
}
