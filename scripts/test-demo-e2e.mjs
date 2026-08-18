import { createClient } from '@supabase/supabase-js'

const url=(process.env.DEMO_SUPABASE_URL||'').trim()
const key=(process.env.DEMO_SUPABASE_PUBLISHABLE_KEY||'').trim()
if(!url||!key)throw new Error('Demo Supabase bağlantı değişkenleri eksik.')

const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const stamp=Date.now()
const testStudentId=`TEST-ANON-${stamp}`
const testPaymentId=`TEST-TAH-${stamp}`
const testCashId=`TEST-HAR-${stamp}`
let studentCreated=false
let paymentCreated=false
let lessonOriginal=null
let lessonChanged=false
const cleanupErrors=[]

async function rpc(name,args){
  const{data,error}=await supabase.rpc(name,args)
  if(error)throw new Error(`${name}: ${error.message}`)
  return data
}

async function cleanup(){
  if(paymentCreated){
    try{
      const{data:row,error}=await supabase.from('tahsilatlar').select('iptal_mi').eq('tahsilat_id',testPaymentId).maybeSingle()
      if(error)throw error
      if(row&&!row.iptal_mi)await rpc('tahsilat_iptal_guvenli_v1',{p_tahsilat_id:testPaymentId,p_aciklama:'E2E test temizliği'})
      if(row)await rpc('tahsilat_sil_guvenli_v1',{p_tahsilat_id:testPaymentId})
    }catch(e){cleanupErrors.push(`Tahsilat temizliği: ${e.message||e}`)}
  }
  if(lessonChanged&&lessonOriginal){
    try{
      const l=lessonOriginal
      await rpc('ders_guncelle_guvenli_v1',{
        p_ders_id:l.ders_id,
        p_tarih:l.tarih,
        p_ogrenci_id:l.ogrenci_id,
        p_ogretmen_id:l.ogretmen_id,
        p_brans_id:l.brans_id,
        p_derslik_id:l.derslik_id,
        p_baslangic_saati:l.baslangic_saati,
        p_ders_sayisi:Number(l.ders_sayisi),
        p_ogrenci_birim_ucreti:Number(l.ogrenci_birim_ucreti),
        p_ogretmen_birim_hakedisi:Number(l.ogretmen_birim_hakedisi),
        p_aciklama:l.aciklama,
      })
    }catch(e){cleanupErrors.push(`Ders geri alma: ${e.message||e}`)}
  }
  if(studentCreated){
    try{await rpc('ogrenci_sil_guvenli_v1',{p_ogrenci_id:testStudentId})}
    catch(e){cleanupErrors.push(`Öğrenci temizliği: ${e.message||e}`)}
  }
  try{await supabase.auth.signOut()}catch{/* no-op */}
}

let mainError=null
try{
  const{data:authData,error:authError}=await supabase.auth.signInAnonymously()
  if(authError)throw new Error(`Anonymous Auth: ${authError.message}`)
  if(!authData.user?.is_anonymous||!authData.session?.access_token)throw new Error('Anonymous Auth oturumu beklenen biçimde oluşmadı.')
  console.log('✓ Anonymous Auth oturumu oluştu')

  const{count:studentCount,error:readError}=await supabase.from('ogrenciler').select('*',{count:'exact',head:true})
  if(readError)throw new Error(`RLS veri okuma: ${readError.message}`)
  if((studentCount||0)<18)throw new Error(`RLS veri okuma: beklenen demo öğrencileri görünmüyor (${studentCount}).`)
  console.log(`✓ RLS veri okuma başarılı (${studentCount} öğrenci)`)

  await rpc('ogrenci_ekle_guvenli_v1',{
    p_ogrenci_id:testStudentId,
    p_ad_soyad:'Demo Test Öğrenci',
    p_veli_adi:null,
    p_veli_telefon:null,
    p_ogrenci_telefon:null,
    p_email:null,
    p_kayit_tarihi:new Date().toISOString().slice(0,10),
    p_notlar:'Geçici anonymous E2E testi',
  })
  studentCreated=true
  const{data:testStudent,error:testStudentError}=await supabase.from('ogrenciler').select('ogrenci_id,ad_soyad').eq('ogrenci_id',testStudentId).maybeSingle()
  if(testStudentError||!testStudent)throw new Error(`Öğrenci RPC doğrulaması: ${testStudentError?.message||'kayıt görünmüyor'}`)
  console.log('✓ Öğrenci ekleme RPC başarılı')

  const{data:lessons,error:lessonReadError}=await supabase.from('dersler')
    .select('ders_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,baslangic_saati,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,aciklama')
    .eq('ders_durumu','Planlandı').order('tarih',{ascending:true}).order('baslangic_saati',{ascending:true}).limit(1)
  if(lessonReadError||!lessons?.length)throw new Error(`Ders test kaydı: ${lessonReadError?.message||'planlanmış ders bulunamadı'}`)
  lessonOriginal=lessons[0]
  const l=lessonOriginal
  await rpc('ders_guncelle_guvenli_v1',{
    p_ders_id:l.ders_id,
    p_tarih:l.tarih,
    p_ogrenci_id:l.ogrenci_id,
    p_ogretmen_id:l.ogretmen_id,
    p_brans_id:l.brans_id,
    p_derslik_id:l.derslik_id,
    p_baslangic_saati:l.baslangic_saati,
    p_ders_sayisi:Number(l.ders_sayisi),
    p_ogrenci_birim_ucreti:Number(l.ogrenci_birim_ucreti),
    p_ogretmen_birim_hakedisi:Number(l.ogretmen_birim_hakedisi),
    p_aciklama:'DEMO ANONYMOUS E2E TEST',
  })
  lessonChanged=true
  const{data:changedLesson,error:changedLessonError}=await supabase.from('dersler').select('aciklama').eq('ders_id',l.ders_id).single()
  if(changedLessonError||changedLesson?.aciklama!=='DEMO ANONYMOUS E2E TEST')throw new Error(`Ders RPC doğrulaması: ${changedLessonError?.message||'açıklama değişmedi'}`)
  console.log('✓ Ders güncelleme RPC başarılı')

  await rpc('tahsilat_kaydet_guvenli_v1',{
    p_tahsilat_id:testPaymentId,
    p_hareket_id:testCashId,
    p_tarih:new Date().toISOString().slice(0,10),
    p_ogrenci_id:'STD-001',
    p_tutar:10,
    p_odeme_yontemi:'Nakit',
    p_aciklama:'Geçici anonymous E2E testi',
  })
  paymentCreated=true
  const[{data:payment,error:paymentError},{data:cash,error:cashError}]=await Promise.all([
    supabase.from('tahsilatlar').select('tahsilat_id,tutar,iptal_mi').eq('tahsilat_id',testPaymentId).maybeSingle(),
    supabase.from('kasa_hareketleri').select('hareket_id,kaynak_id,tutar,iptal_mi').eq('hareket_id',testCashId).maybeSingle(),
  ])
  if(paymentError||cashError||!payment||!cash)throw new Error(`Tahsilat/kasa RPC doğrulaması: ${paymentError?.message||cashError?.message||'kayıt eksik'}`)
  console.log('✓ Tahsilat + kasa RPC başarılı')
}catch(e){
  mainError=e
}finally{
  await cleanup()
}

const[{count:studentLeft,error:studentLeftError},{count:paymentLeft,error:paymentLeftError},{count:cashLeft,error:cashLeftError}]=await Promise.all([
  supabase.from('ogrenciler').select('*',{count:'exact',head:true}).eq('ogrenci_id',testStudentId),
  supabase.from('tahsilatlar').select('*',{count:'exact',head:true}).eq('tahsilat_id',testPaymentId),
  supabase.from('kasa_hareketleri').select('*',{count:'exact',head:true}).eq('hareket_id',testCashId),
])
if(studentLeftError||paymentLeftError||cashLeftError)cleanupErrors.push('Son temizlik doğrulaması okunamadı.')
if((studentLeft||0)!==0||(paymentLeft||0)!==0||(cashLeft||0)!==0)cleanupErrors.push(`Test kalıntısı var: öğrenci=${studentLeft}, tahsilat=${paymentLeft}, kasa=${cashLeft}`)

if(mainError)throw mainError
if(cleanupErrors.length)throw new Error(cleanupErrors.join(' | '))
console.log('✓ Test kayıtları temizlendi ve ders eski haline döndürüldü')
console.log('DEMO_E2E_OK')
