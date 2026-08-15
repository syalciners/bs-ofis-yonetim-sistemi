import { readFileSync } from 'node:fs'

const page=readFileSync('src/pages/AssignmentsPage.tsx','utf8')
const overview=readFileSync('src/pages/OverviewPage.tsx','utf8')
const editor=readFileSync('src/components/AssignmentEditorForm.tsx','utf8')
const status=readFileSync('src/components/AssignmentStatusSafeForm.tsx','utf8')
const attachment=readFileSync('src/services/assignmentAttachmentService.ts','utf8')
const drive=readFileSync('src/services/assignmentDriveService.ts','utf8')
const share=readFileSync('src/services/assignmentShareService.ts','utf8')
const types=readFileSync('src/lib/types.ts','utf8')
const edge=readFileSync('supabase/functions/odev-drive-yukle/index.ts','utf8')
const appsScript=readFileSync('integrations/apps-script/OdevDriveServisi.gs','utf8')

const checks=[
  ['Ödev detayında WhatsApp gönder butonu vardır',page.includes('WhatsApp’tan Gönder')&&page.includes('buildAssignmentWhatsAppUrl')],
  ['WhatsApp telefonu önce veli sonra öğrenci telefonundan alır',share.includes('student.veli_telefon||student.ogrenci_telefon')],
  ['WhatsApp mesajı ödev metnini içerir',share.includes('assignment.odev_aciklamasi')&&share.includes('📝 *Yapılacaklar*')],
  ['WhatsApp mesajı kurumsal görsel şablonu kullanır',share.includes('✨ *ÖDEV BİLGİLENDİRMESİ*')&&share.includes('👤 *Öğrenci:*')&&share.includes('📘 *Konu:*')&&share.includes('📅 *Veriliş:*')&&share.includes('⏳ *Son Teslim:*')],
  ['WhatsApp mesajında ekler tıklanabilir bağlantı olarak yer alır',share.includes('📎 *Ekler*')&&share.includes('🖼️ *${imageName}:* ${imageUrl}')&&share.includes('📄 *${fileName}:* ${fileUrl}')],
  ['Drive kullanılamazsa WhatsApp ekleri süreli bağlantıyla çalışır',share.includes('assignmentLinkExpirySeconds')&&attachment.includes('createSignedUrl')],
  ['Ödev ekleri önce özel staging bucket kullanır',attachment.includes("const BUCKET='odev-ekleri'")&&attachment.includes('.storage.from(BUCKET).upload')],
  ['Ödev eki en fazla 15 MB ile sınırlıdır',attachment.includes('const MAX_SIZE=15*1024*1024')&&appsScript.includes('15 * 1024 * 1024')],
  ['Ödev ekleri staging aşamasında güvenli RPC ile kayda bağlanır',attachment.includes("supabase.rpc('odev_eklerini_guncelle_guvenli_v1'")],
  ['Drive arşivi yalnız özel test bağlantısında etkinleşir',page.includes("searchParams.get('drive_test')==='1'")&&page.includes('driveArchiveEnabled={driveArchiveEnabled}')&&editor.includes('if(driveArchiveEnabled)')],
  ['Normal ödev akışı özel Supabase depolamasında kalır',editor.includes('Ekler özel depoda tutulur. WhatsApp gönderiminde süreli güvenli bağlantı paylaşılır.')],
  ['Ödev formu Drive arşiv akışını çağırır',editor.includes('archiveAssignmentAttachmentsToDrive')&&editor.includes('Drive test modu açık')],
  ['Drive hatasında ödev eki güvenli depoda korunur',editor.includes('Drive arşivi tamamlanamadı; ek güvenli depoda korunuyor.')],
  ['Frontend Drive API anahtarı veya doğrudan Drive API kullanmaz',!drive.includes('googleapis.com/drive')&&!editor.includes('googleapis.com/drive')&&!drive.includes('service_role')],
  ['Drive aktarımı yalnız doğrulanmış Supabase Edge Function üzerinden gider',drive.includes('/functions/v1/odev-drive-yukle')&&drive.includes('Authorization:`Bearer ${session.access_token}`')],
  ['Edge Function kullanıcı JWT bilgisini doğrular',edge.includes('supabase.auth.getUser(accessToken)')&&edge.includes("kod:'UNAUTHORIZED'")],
  ['Edge Function yönetici yetkisini sunucuda tekrar doğrular',edge.includes("supabase.rpc('drive_yukleme_yetkili_mi_v1')")&&edge.includes("kod:'FORBIDDEN'")],
  ['Edge Function özel staging dosyasına kısa süreli imzalı URL üretir',edge.includes("storage.from(BUCKET).createSignedUrl(body.storage_path,10*60)")],
  ['Drive bağlantısı güvenli RPC ile ödeve kaydedilir',edge.includes("supabase.rpc('odev_drive_eklerini_guncelle_guvenli_v1'")],
  ['Drive aktarımı sonrası geçici Storage kopyası temizlenir',edge.includes("supabase.storage.from(BUCKET).remove([body.storage_path])")],
  ['Drive servisi yalnız beklenen Supabase imzalı URL adresini kabul eder',appsScript.includes("'/storage/v1/object/sign/odev-ekleri/'")&&appsScript.includes('sourceUrl.indexOf(expectedSourcePrefix) !== 0')],
  ['Drive servisi öğrenci klasörünü ID ve adla bulur veya oluşturur',appsScript.includes("ogrenciId + '_' + ogrenciAdi")&&appsScript.includes('klasorBulVeyaOlustur_')],
  ['Ödev başlığı PWA üzerinden Drive arşiv zincirine aktarılır',editor.includes('assignmentTitle')&&drive.includes('assignmentTitle:string')&&drive.includes('odev_basligi:input.assignmentTitle')&&edge.includes('odev_basligi:String(body.odev_basligi')],
  ['Drive dosya adı öğretmen tarih öğrenci ve ödev başlığı standardındadır',appsScript.includes("asciiUpper_(ogretmenAdi) + '_' + datePart + '_' + asciiUpper_(ogrenciAdi) + '_' + titlePart")&&appsScript.includes("asciiUpper_(odevBasligi).slice(0, 80) || 'ODEV'")],
  ['Drive dosyası WhatsApp için bağlantıyla görüntülenebilir olur',appsScript.includes('DriveApp.Access.ANYONE_WITH_LINK')&&appsScript.includes("'/view'")],
  ['Hızlı Ödev Ekle menüdeki ortak forma yönlenir',overview.includes("nav('/odevler?yeni=1')")&&!overview.includes('<AssignmentForm')&&page.includes("searchParams.get('yeni')!=='1'")],
  ['Ödev formunda kamera galeri ve Drive kaynakları görünürdür',editor.includes('Fotoğraf / Kamera')&&editor.includes('Kamera, galeri veya Drive')&&editor.includes('accept="image/*"')],
  ['Ödev formunda telefon bilgisayar ve Drive dosya seçimi görünürdür',editor.includes('Dosya / Drive')&&editor.includes('Telefon, bilgisayar veya Drive')],
  ['Ödev formunda görsel ve dosya ekleme akışı ortaktır',editor.includes('saveAssignmentAttachments')&&overview.includes("nav('/odevler?yeni=1')")],
  ['Ödev tipi ek dosya ve Drive link alanlarını taşır',types.includes('odev_dosyasi?: string | null')&&types.includes('odev_fotografi?: string | null')&&types.includes('odev_dosya_linki?: string | null')&&types.includes('odev_fotograf_linki?: string | null')],
  ['Ödev durumları veritabanı RPC değerleriyle aynıdır',status.includes('<option>Verildi</option>')&&status.includes('<option>Eksik</option>')&&status.includes('<option>Tamamlandı</option>')&&status.includes('<option>İptal</option>')&&!/Bekliyor|Devam Ediyor|Teslim Edildi/.test(status)],
  ['İptal ödev gecikmiş sayılmaz',page.includes("const canceled=(x:Odev)=>x.durum==='İptal'")&&page.includes('const pending=(x:Odev)=>!completed(x)&&!canceled(x)')],
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} ödev UX kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} ödev/WhatsApp/Drive kuralı doğrulandı.`)
