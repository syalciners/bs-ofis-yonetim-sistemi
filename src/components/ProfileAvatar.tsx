function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toLocaleUpperCase('tr-TR')
}

function spriteStyle(photoPath: string) {
  const match = photoPath.match(/^demo-sprite:(\d+)$/)
  if (!match) return null
  const index = Number(match[1])
  if (!Number.isInteger(index) || index < 0 || index > 11) return null
  const column = index % 4
  const row = Math.floor(index / 4)
  return {
    backgroundImage: "url(./demo-persona-sprite.webp)",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '400% 300%',
    backgroundPosition: `${(column / 3) * 100}% ${(row / 2) * 100}%`,
    width: '100%',
    height: '100%',
    borderRadius: 'inherit',
    display: 'block',
  } as const
}

export function ProfileAvatar({ name, photoPath, className = 'avatar' }: { name: string; photoPath?: string | null; className?: string }) {
  const style = photoPath ? spriteStyle(photoPath) : null
  return <div className={className} aria-label={`${name} profil fotoğrafı`}>
    {style
      ? <span aria-hidden="true" style={style}/>
      : photoPath
        ? <img src={photoPath} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', display: 'block' }}/>
        : initials(name)}
  </div>
}
