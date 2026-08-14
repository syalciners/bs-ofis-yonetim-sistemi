import { supabase } from '../lib/supabase'
import type { Odev } from '../lib/types'

const BUCKET='odev-ekleri'
const MAX_SIZE=15*1024*1024
const safeName=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(-90)||'ek'
const isStoragePath=(assignmentId:string,path?:string|null)=>Boolean(path&&path.startsWith(`${assignmentId}/`))

export function assignmentAttachmentName(path?:string|null){
  if(!path)return''
  const last=decodeURIComponent(path.split('/').pop()||path)
  return last.replace(/^(?:dosya|fotograf)-\d+-/,'')
}

async function upload(assignmentId:string,kind:'dosya'|'fotograf',file:File){
  if(file.size>MAX_SIZE)throw new Error('Ödev eki en fazla 15 MB olabilir.')
  const path=`${assignmentId}/${kind}-${Date.now()}-${safeName(file.name)}`
  const {error}=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined})
  if(error)throw new Error(`Ödev eki yüklenemedi: ${error.message}`)
  return path
}

async function removeIfOwned(assignmentId:string,path?:string|null){
  if(!isStoragePath(assignmentId,path))return
  const {error}=await supabase.storage.from(BUCKET).remove([path!])
  if(error)console.warn('Eski ödev eki silinemedi:',error.message)
}

export async function saveAssignmentAttachments(input:{assignmentId:string;file?:File|null;image?:File|null;existingFile?:string|null;existingImage?:string|null}){
  let filePath=input.existingFile||null
  let imagePath=input.existingImage||null
  const oldFile=filePath,oldImage=imagePath
  if(input.file)filePath=await upload(input.assignmentId,'dosya',input.file)
  if(input.image)imagePath=await upload(input.assignmentId,'fotograf',input.image)
  const {error}=await supabase.rpc('odev_eklerini_guncelle_guvenli_v1',{p_odev_id:input.assignmentId,p_odev_dosyasi:filePath,p_odev_fotografi:imagePath})
  if(error)throw new Error(`Ödev ekleri kaydedilemedi: ${error.message}`)
  if(input.file&&oldFile!==filePath)await removeIfOwned(input.assignmentId,oldFile)
  if(input.image&&oldImage!==imagePath)await removeIfOwned(input.assignmentId,oldImage)
  return{filePath,imagePath}
}

export async function signedAssignmentAttachmentUrl(assignment:Odev,kind:'file'|'image',expiresIn=60*60*24*30){
  const path=kind==='file'?assignment.odev_dosyasi:assignment.odev_fotografi
  const legacy=kind==='file'?assignment.odev_dosya_linki:assignment.odev_fotograf_linki
  if(path&&isStoragePath(assignment.odev_id,path)){
    const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,expiresIn)
    if(error)throw new Error(`Ödev eki açılamadı: ${error.message}`)
    return data.signedUrl
  }
  return legacy||null
}

export function assignmentLinkExpirySeconds(due?:string|null){
  const day=24*60*60
  if(!due)return 30*day
  const target=new Date(`${due}T23:59:59`).getTime()+7*day*1000
  const diff=Math.ceil((target-Date.now())/1000)
  return Math.max(7*day,Math.min(60*day,diff))
}
