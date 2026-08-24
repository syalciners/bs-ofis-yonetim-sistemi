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

export function demoPersonaPhoto(id: string, name: string, kind: DemoPersonaKind) {
  const normalized = normalizeName(name)

  if (kind === 'manager') {
    if (normalized === 'DENİZ ARMAN') return 'demo-sprite:0'
    if (normalized === 'SELİN AKSOY') return 'demo-sprite:1'
    return `demo-sprite:${hashText(`${id}|${name}|${kind}`) % 2}`
  }

  if (kind === 'teacher') {
    return `demo-sprite:${2 + (hashText(`${id}|${name}|${kind}`) % 4)}`
  }

  return `demo-sprite:${6 + (hashText(`${id}|${name}|${kind}`) % 6)}`
}
