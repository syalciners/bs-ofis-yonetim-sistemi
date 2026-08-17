import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const repoRoot=resolve('.')
const distRoot=resolve('dist')
const manifestPath=join(repoRoot,'.pages-published-files.json')
const fail=(message)=>{console.error(`✗ ${message}`);process.exit(1)}
const hash=(path)=>createHash('sha256').update(readFileSync(path)).digest('hex')
const walk=(dir)=>readdirSync(dir).flatMap(name=>{
  const full=join(dir,name)
  return statSync(full).isDirectory()?walk(full):[full]
})

if(!existsSync(manifestPath))fail('Pages yayın manifesti bulunamadı.')
if(!existsSync(join(repoRoot,'.nojekyll')))fail('.nojekyll bulunamadı.')
if(!existsSync(join(distRoot,'index.html')))fail('dist/index.html bulunamadı.')

const expected=walk(distRoot).map(full=>relative(distRoot,full).replaceAll('\\','/')).sort()
let published
try{published=JSON.parse(readFileSync(manifestPath,'utf8'))}catch{fail('Pages yayın manifesti okunamadı.')}
if(JSON.stringify(expected)!==JSON.stringify(published))fail('Yayın dosya listesi güncel build ile eşleşmiyor.')

for(const rel of expected){
  const distFile=join(distRoot,rel),publishedFile=join(repoRoot,rel)
  if(!existsSync(publishedFile))fail(`Yayın dosyası eksik: ${rel}`)
  if(hash(distFile)!==hash(publishedFile))fail(`Yayın dosyası build ile farklı: ${rel}`)
}

const index=readFileSync(join(repoRoot,'index.html'),'utf8')
if(index.includes('src/main.tsx'))fail('Yayın indexi kaynak TSX dosyasını çağırıyor.')
if(!/assets\/index-[A-Za-z0-9_-]+\.js/.test(index))fail('Yayın indexinde derlenmiş uygulama JS dosyası bulunamadı.')
if(!index.includes('BS Eğitim Yönetimi'))fail('Yayın indexinde uygulama başlığı bulunamadı.')

console.log(`✓ ${expected.length} Pages dosyası güncel production build ile birebir eşleşiyor.`)
