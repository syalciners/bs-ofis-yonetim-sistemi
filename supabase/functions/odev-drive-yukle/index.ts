import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const BUCKET='odev-ekleri'
const PUBLISHABLE_KEY='sb_publishable_scFk1bnw1-VCw_ZQrfc7Mw_N518OvBf'
const APPS_SCRIPT_URL=Deno.env.get('ODEV_DRIVE_APPS_SCRIPT_URL')||''
const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})

type UploadBody={
  odev_id:string
  ogrenci_id:string
  ogrenci_adi:string
  ogretmen_adi:string
  verilis_tarihi:string
  tur:'dosya'|'fotograf'
  storage_path:string
  dosya_adi:string
  mime_type:string
  eski_drive_linki?:string|null
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return json({ok:false,kod:'METHOD_NOT_ALLOWED',hata:'Yalnız POST desteklenir.'},405)

  const authHeader=req.headers.get('Authorization')||''
  if(!authHeader.startsWith('Bearer '))return json({ok:false,kod:'UNAUTHORIZED',hata:'Oturum doğrulanamadı.'},401)
  const accessToken=authHeader.slice(7)
  const supabase=createClient(Deno.env.get('SUPABASE_URL')||'',PUBLISHABLE_KEY,{global:{headers:{Authorization:authHeader}}})

  try{
    const{data:yetkili,error:yetkiError}=await supabase.rpc('drive_yukleme_yetkili_mi_v1')
    if(yetkiError||yetkili!==true)return json({ok:false,kod:'FORBIDDEN',hata:'Bu işlem için yönetici yetkisi gerekir.'},403)

    const body=await req.json() as UploadBody
    const required=[body.odev_id,body.ogrenci_id,body.ogrenci_adi,body.ogretmen_adi,body.verilis_tarihi,body.storage_path,body.dosya_adi,body.mime_type]
    if(required.some(x=>!String(x||'').trim()))return json({ok:false,kod:'INVALID_INPUT',hata:'Eksik ödev veya dosya bilgisi.'},400)
    if(body.tur!=='dosya'&&body.tur!=='fotograf')return json({ok:false,kod:'INVALID_TYPE',hata:'Geçersiz ek türü.'},400)
    if(!body.storage_path.startsWith(`${body.odev_id}/`))return json({ok:false,kod:'INVALID_PATH',hata:'Ödev eki yolu geçersiz.'},400)

    if(!APPS_SCRIPT_URL)return json({ok:false,kod:'DRIVE_NOT_CONFIGURED',hata:'Google Drive arşiv servisi henüz etkin değil.'},503)

    const{data:signed,error:signedError}=await supabase.storage.from(BUCKET).createSignedUrl(body.storage_path,10*60)
    if(signedError||!signed?.signedUrl)throw new Error(`Geçici ek bağlantısı oluşturulamadı: ${signedError?.message||'Bilinmeyen hata'}`)

    const scriptResponse=await fetch(APPS_SCRIPT_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        islem:'odev_drive_yukle',
        access_token:accessToken,
        odev_id:body.odev_id,
        ogrenci_id:body.ogrenci_id,
        ogrenci_adi:body.ogrenci_adi,
        ogretmen_adi:body.ogretmen_adi,
        verilis_tarihi:body.verilis_tarihi,
        tur:body.tur,
        mime_type:body.mime_type,
        dosya_adi:body.dosya_adi,
        dosya_url:signed.signedUrl,
        eski_drive_linki:body.eski_drive_linki||null,
      }),
    })
    if(!scriptResponse.ok)throw new Error(`Drive servisi HTTP ${scriptResponse.status} döndürdü.`)
    const drive=await scriptResponse.json() as {ok?:boolean;hata?:string;path?:string;url?:string;file_id?:string;file_name?:string}
    if(!drive.ok||!drive.path||!drive.url)throw new Error(drive.hata||'Drive yüklemesi tamamlanamadı.')

    const rpcArgs={
      p_odev_id:body.odev_id,
      p_odev_dosyasi:body.tur==='dosya'?drive.path:null,
      p_odev_dosya_linki:body.tur==='dosya'?drive.url:null,
      p_odev_fotografi:body.tur==='fotograf'?drive.path:null,
      p_odev_fotograf_linki:body.tur==='fotograf'?drive.url:null,
    }
    const{error:updateError}=await supabase.rpc('odev_drive_eklerini_guncelle_guvenli_v1',rpcArgs)
    if(updateError)throw new Error(`Drive bağlantısı ödeve kaydedilemedi: ${updateError.message}`)

    const{error:removeError}=await supabase.storage.from(BUCKET).remove([body.storage_path])
    if(removeError)console.warn('Geçici ödev eki silinemedi:',removeError.message)

    return json({ok:true,mod:'drive',path:drive.path,url:drive.url,file_id:drive.file_id,file_name:drive.file_name})
  }catch(error){
    console.error('odev-drive-yukle:',error)
    return json({ok:false,kod:'DRIVE_UPLOAD_FAILED',hata:error instanceof Error?error.message:String(error)},500)
  }
})
