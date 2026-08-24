export type DemoPersonaKind = 'student' | 'teacher' | 'manager'

function hashText(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeName(name: string) {
  return name.trim().toLocaleUpperCase('tr-TR')
}

function demoPhotoPath(index: number) {
  return `/demo-photos/p${String(index).padStart(2, '0')}.webp`
}

export function demoPersonaPhoto(id: string, name: string, kind: DemoPersonaKind) {
  const normalized = normalizeName(name)

  if (kind === 'manager') {
    if (normalized === 'DENİZ ARMAN') return demoPhotoPath(0)
    if (normalized === 'SELİN AKSOY') return demoPhotoPath(1)
    return demoPhotoPath(hashText(`${id}|${name}|${kind}`) % 2)
  }

  if (kind === 'teacher') {
    return demoPhotoPath(2 + (hashText(`${id}|${name}|${kind}`) % 4))
  }

  return demoPhotoPath(6 + (hashText(`${id}|${name}|${kind}`) % 6))
}
