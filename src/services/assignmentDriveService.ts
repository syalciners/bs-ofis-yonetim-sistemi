import { SUPABASE_KEY, SUPABASE_URL, supabase } from '../lib/supabase'

type DriveArchiveInput={
  assignmentId:string
  studentId:string
  studentName:string
  teacherName:string
  assignedDate:string
  file?:{path:string;file:File;existingDriveLink?:string|null}|null
  image?:{path:string;file:File;existingDriveLink?:string|null}|null
}

type DriveResponse={ok:boolean;mod?:'drive';kod?:string;hata?:string;path?:string;url?:string;file_id?:string;file_name?:string}

async function archiveOne(input:{
  assignmentId:string
  studentId:string
  studentName:string
  teacherName:string
  assignedDate:string
  kind:'dosya'|'fotograf'
  path:string
  file:File
  existingDriveLink?:string|null
}){
  const{data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)throw new Error('Drive arşivi için aktif oturum bulunamadı.')

  const response=await fetch(`${SUPABASE_URL}/functions/v1/odev-drive-yukle`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      odev_id:input.assignmentId,
      ogrenci_id:input.studentId,
      ogrenci_adi:input.studentName,
      ogretmen_adi:input.teacherName,
      verilis_tarihi:input.assignedDate,
      tur:input.kind,
      storage_path:input.path,
      dosya_adi:input.file.name,
      mime_type:input.file.type||'application/octet-stream',
      eski_drive_linki:input.existingDriveLink||null,
    }),
  })
  let body:DriveResponse|null=null
  try{body=await response.json() as DriveResponse}catch{body=null}
  if(response.status===503&&body?.kod==='DRIVE_NOT_CONFIGURED')return{configured:false as const,result:null}
  if(!response.ok||!body?.ok)throw new Error(body?.hata||`Drive arşivi tamamlanamadı (HTTP ${response.status}).`)
  return{configured:true as const,result:body}
}

export async function archiveAssignmentAttachmentsToDrive(input:DriveArchiveInput){
  let configured=true
  const results:DriveResponse[]=[]
  if(input.file){
    const response=await archiveOne({assignmentId:input.assignmentId,studentId:input.studentId,studentName:input.studentName,teacherName:input.teacherName,assignedDate:input.assignedDate,kind:'dosya',path:input.file.path,file:input.file.file,existingDriveLink:input.file.existingDriveLink})
    if(!response.configured)return{configured:false,results}
    if(response.result)results.push(response.result)
  }
  if(input.image){
    const response=await archiveOne({assignmentId:input.assignmentId,studentId:input.studentId,studentName:input.studentName,teacherName:input.teacherName,assignedDate:input.assignedDate,kind:'fotograf',path:input.image.path,file:input.image.file,existingDriveLink:input.image.existingDriveLink})
    if(!response.configured)configured=false
    else if(response.result)results.push(response.result)
  }
  return{configured,results}
}
