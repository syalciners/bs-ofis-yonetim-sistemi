import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const write=(path,content)=>writeFileSync(path,content)
const replaceRequired=(source,find,replacement,label)=>{
  if(!source.includes(find))throw new Error(`Portal karşılama geçişi bulunamadı: ${label}`)
  return source.replace(find,replacement)
}

const pagePath='src/pages/PortalPreviewPage.tsx'
let page=read(pagePath)
page=replaceRequired(page,
  "const roleCopy = (role: PortalPreviewRole) => role === 'Öğretmen' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'\n",
  "const roleCopy = (role: PortalPreviewRole) => role === 'Öğretmen' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'\nconst greetingName = (name: string) => {\n  const parts = name.trim().split(/\\s+/).filter(Boolean)\n  return parts.length >= 3 ? parts.slice(0, 2).join(' ') : parts[0] || name\n}\n",
  'karşılama adı yardımcısı')
page=replaceRequired(page,
  "<div><span>{roleCopy(role)}</span><h2>Merhaba, {name.split(' ')[0]}</h2><p>{todayLong()}</p></div>",
  "<div><span>{roleCopy(role)}</span><h2>Merhaba, {greetingName(name)}</h2><p>{todayLong()}</p></div>",
  'karşılama metni')
write(pagePath,page)

const checkPath='scripts/check-manager-portal-preview.mjs'
let check=read(checkPath)
check=replaceRequired(check,
  "  ['Portal önizlemesi Bugün Program Ödevler Profil dört ekranını içerir',['Bugün','Program','Ödevler','Profil'].every(x=>preview.includes(`>${x}</span>`))],\n",
  "  ['Portal önizlemesi Bugün Program Ödevler Profil dört ekranını içerir',['Bugün','Program','Ödevler','Profil'].every(x=>preview.includes(`>${x}</span>`))],\n  ['Portal karşılama iki isimli kişilerde ilk iki adı kullanır',preview.includes('const greetingName = (name: string)')&&preview.includes(\"parts.length >= 3 ? parts.slice(0, 2).join(' ') : parts[0] || name\")&&preview.includes('Merhaba, {greetingName(name)}')],\n",
  'portal karşılama regresyonu')
write(checkPath,check)

const workflowPath='.github/workflows/ci.yml'
let workflow=read(workflowPath)
workflow=workflow.replace("      - name: Portal karşılama adı geçişi\n        run: node scripts/migrate-portal-greeting-name.mjs\n",'')
write(workflowPath,workflow)

unlinkSync('scripts/migrate-portal-greeting-name.mjs')
console.log('Portal karşılama adı geçişi uygulandı ve geçici migrasyon temizlendi.')
