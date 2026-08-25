import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const envRoot=resolve(process.cwd(),'../..')
const mode=process.env.VITE_BUILD_MODE?.trim()||'production'
const loaded=loadEnv(mode,envRoot,'')
const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']

function resolved(name){
  if(Object.prototype.hasOwnProperty.call(process.env,name))return String(process.env[name]??'').trim()
  return String(loaded[name]??'').trim()
}

for(const name of required){
  if(!resolved(name)){
    console.error(`Portal yapılandırması eksik: ${name}`)
    process.exit(1)
  }
}

try{
  const url=new URL(resolved('VITE_SUPABASE_URL'))
  if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('unsupported protocol')
}catch{
  console.error('Portal yapılandırması geçersiz: VITE_SUPABASE_URL')
  process.exit(1)
}

console.log('Portal instance environment yapılandırması doğrulandı.')
