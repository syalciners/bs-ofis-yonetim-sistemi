import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const repoRoot=resolve('.')
const distRoot=resolve('dist')
const manifestPath=join(repoRoot,'.pages-published-files.json')

if(!existsSync(join(distRoot,'index.html'))||!existsSync(join(distRoot,'manifest.webmanifest'))){
  throw new Error('dist yayını hazır değil. Önce npm run build çalıştırılmalıdır.')
}

const walk=(dir)=>readdirSync(dir).flatMap(name=>{
  const full=join(dir,name)
  return statSync(full).isDirectory()?walk(full):[full]
})

let previous=[]
if(existsSync(manifestPath)){
  try{previous=JSON.parse(readFileSync(manifestPath,'utf8'))}catch{previous=[]}
}
for(const rel of previous){
  if(typeof rel!=='string'||!rel||rel.startsWith('.')||rel.includes('..'))continue
  rmSync(join(repoRoot,rel),{force:true})
}
// İlk geçişte eski hashli yayın kalıntıları bırakılmasın.
rmSync(join(repoRoot,'assets'),{recursive:true,force:true})
for(const name of readdirSync(repoRoot))if(/^workbox-.*\.js$/.test(name))rmSync(join(repoRoot,name),{force:true})

const files=walk(distRoot).map(full=>relative(distRoot,full).replaceAll('\\','/')).sort()
for(const rel of files){
  const source=join(distRoot,rel)
  const target=join(repoRoot,rel)
  mkdirSync(dirname(target),{recursive:true})
  copyFileSync(source,target)
}
writeFileSync(manifestPath,`${JSON.stringify(files,null,2)}\n`,'utf8')
writeFileSync(join(repoRoot,'.nojekyll'),'','utf8')
console.log(`${files.length} derlenmiş Pages dosyası repo köküne senkronlandı.`)
