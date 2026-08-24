export type DemoPersonaKind = 'student' | 'teacher' | 'manager'

function hashText(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const pick = <T,>(values: readonly T[], seed: number, shift = 0) => values[(seed >>> shift) % values.length]

const SKINS = ['#f6d2b8', '#eab995', '#d99a72', '#bd7954', '#8f573d'] as const
const HAIRS = ['#201914', '#3a2418', '#5b3824', '#6d4b36', '#1f2937'] as const
const BACKGROUNDS = [
  ['#dbeafe', '#eef2ff'],
  ['#dcfce7', '#ecfeff'],
  ['#fef3c7', '#fff7ed'],
  ['#fce7f3', '#fdf2f8'],
  ['#e0e7ff', '#f5f3ff'],
] as const
const SHIRTS = ['#e2e8f0', '#dbeafe', '#f1f5f9', '#e0f2fe', '#ede9fe'] as const
const BLAZERS = ['#1e3a5f', '#243b53', '#334155', '#312e81', '#164e63'] as const
const STUDENT_TOPS = ['#2563eb', '#0f766e', '#7c3aed', '#d97706', '#475569'] as const

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[ch] || ch))
}

export function demoPersonaPhoto(id: string, name: string, kind: DemoPersonaKind) {
  const seed = hashText(`${id}|${name}|${kind}`)
  const skin = pick(SKINS, seed, 1)
  const hair = pick(HAIRS, seed, 4)
  const [bg1, bg2] = pick(BACKGROUNDS, seed, 7)
  const shirt = pick(SHIRTS, seed, 10)
  const blazer = pick(BLAZERS, seed, 13)
  const studentTop = pick(STUDENT_TOPS, seed, 16)
  const faceWidth = 126 + (seed % 15)
  const faceX = 200 - faceWidth / 2
  const hairStyle = seed % 3
  const glasses = ((seed >>> 5) % 4) === 0 && kind !== 'student'
  const smile = 18 + ((seed >>> 8) % 8)
  const eyeOffset = 31 + ((seed >>> 11) % 5)

  const hairShape = hairStyle === 0
    ? `<path d="M${faceX - 4} 177 C${faceX + 3} 112 ${faceX + 35} 89 200 89 C${faceX + faceWidth - 30} 89 ${faceX + faceWidth + 7} 116 ${faceX + faceWidth + 4} 180 C236 149 170 144 ${faceX - 4} 177Z" fill="${hair}"/>`
    : hairStyle === 1
      ? `<path d="M${faceX - 2} 180 C${faceX} 111 ${faceX + 42} 91 202 91 C259 91 ${faceX + faceWidth + 10} 128 ${faceX + faceWidth + 1} 184 C245 140 191 132 ${faceX - 2} 180Z" fill="${hair}"/><path d="M${faceX + 5} 155 C145 120 177 100 224 101 C197 120 168 139 ${faceX + 5} 155Z" fill="${hair}"/>`
      : `<path d="M${faceX - 6} 183 C${faceX - 3} 119 ${faceX + 29} 92 197 92 C254 92 ${faceX + faceWidth + 8} 126 ${faceX + faceWidth + 6} 183 C238 153 213 136 184 139 C154 142 137 158 ${faceX - 6} 183Z" fill="${hair}"/>`

  const wardrobe = kind === 'manager'
    ? `<path d="M92 500 L105 355 C121 326 151 310 174 306 L200 339 L226 306 C252 310 280 326 296 355 L309 500Z" fill="${blazer}"/><path d="M174 306 L200 339 L226 306 L218 391 L182 391Z" fill="#fff"/><path d="M195 339 L205 339 L211 393 L200 410 L189 393Z" fill="#9f1239"/>`
    : kind === 'teacher'
      ? `<path d="M91 500 L108 357 C123 328 150 312 173 307 L200 337 L227 307 C252 312 279 329 294 357 L310 500Z" fill="${shirt}"/><path d="M172 307 L200 337 L227 307 L216 365 L184 365Z" fill="#fff"/><path d="M102 500 L112 373 C127 354 141 343 158 336 L172 500Z" fill="${blazer}" opacity=".88"/><path d="M298 500 L288 373 C273 354 259 343 242 336 L228 500Z" fill="${blazer}" opacity=".88"/>`
      : `<path d="M83 500 L103 363 C118 330 151 312 176 306 L200 332 L224 306 C251 312 282 331 297 363 L317 500Z" fill="${studentTop}"/><path d="M154 319 C166 343 181 355 200 355 C219 355 234 343 246 319" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="8" stroke-linecap="round"/>`

  const glassesSvg = glasses
    ? `<g fill="none" stroke="#334155" stroke-width="5"><rect x="${200 - eyeOffset - 23}" y="205" width="48" height="31" rx="12"/><rect x="${200 + eyeOffset - 25}" y="205" width="48" height="31" rx="12"/><path d="M${200 - 7} 219 H${200 + 7}"/></g>`
    : ''

  const label = escapeXml(`${name} - yapay zeka ile üretilmiş demo portresi`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500" role="img" aria-label="${label}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="400" height="500" fill="url(#bg)"/>
    <circle cx="322" cy="82" r="76" fill="#fff" opacity=".22"/><circle cx="72" cy="390" r="100" fill="#fff" opacity=".16"/>
    ${wardrobe}
    <rect x="177" y="278" width="46" height="54" rx="19" fill="${skin}"/>
    <ellipse cx="${faceX - 1}" cy="221" rx="13" ry="21" fill="${skin}"/><ellipse cx="${faceX + faceWidth + 1}" cy="221" rx="13" ry="21" fill="${skin}"/>
    <rect x="${faceX}" y="126" width="${faceWidth}" height="177" rx="64" fill="${skin}"/>
    ${hairShape}
    <g fill="#263238"><ellipse cx="${200 - eyeOffset}" cy="215" rx="6" ry="7"/><ellipse cx="${200 + eyeOffset}" cy="215" rx="6" ry="7"/></g>
    <path d="M191 246 Q200 252 209 246" fill="none" stroke="#b86d55" stroke-width="4" stroke-linecap="round"/>
    <path d="M${200 - smile} 270 Q200 ${284 + (seed % 5)} ${200 + smile} 270" fill="none" stroke="#8f4f46" stroke-width="5" stroke-linecap="round"/>
    ${glassesSvg}
    <ellipse cx="168" cy="244" rx="16" ry="8" fill="#dc8f84" opacity=".2"/><ellipse cx="232" cy="244" rx="16" ry="8" fill="#dc8f84" opacity=".2"/>
  </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
