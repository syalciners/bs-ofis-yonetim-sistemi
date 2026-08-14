import { readFileSync } from 'node:fs'

const page=readFileSync('src/pages/AssignmentsPage.tsx','utf8')
const editor=readFileSync('src/components/AssignmentEditorForm.tsx','utf8')
const status=readFileSync('src/components/AssignmentStatusSafeForm.tsx','utf8')
const attachment=readFileSync('src/services/assignmentAttachmentService.ts','utf8')
const share=readFileSync('src/services/assignmentShareService.ts','utf8')
const types=readFileSync('src/lib/types.ts','utf8')

const checks=[
  ['Ödev detayında WhatsApp gönder butonu vardır',page.includes('WhatsApp’tan Gönder')&&page.includes('buildAssignmentWhatsAppUrl')],
  ['WhatsApp telefonu önce veli sonra öğrenci telefonundan alır',share.includes('student.veli_telefon||student.ogrenci_telefon')],
  ['WhatsApp mesajı ödev metnini içerir',share.includes('assignment.odev_aciklamasi')&&share.includes("'*Ekler*'")],
  ['WhatsApp ekleri süreli imzalı bağlantı kullanır',share.includes('assignmentLinkExpirySeconds')&&attachment.includes('createSignedUrl')],
  ['Ödev ekleri özel storage bucket kullanır',attachment.includes("const BUCKET='odev-ekleri'")&&attachment.includes('.storage.from(BUCKET).upload')],
  ['Ödev eki en fazla 15 MB ile sınırlıdır',attachment.includes('const MAX_SIZE=15*1024*1024')],
  ['Ödev ekleri güvenli RPC ile kayda bağlanır',attachment.includes("supabase.rpc('odev_eklerini_guncelle_guvenli_v1'")],
  ['Ödev formunda görsel ve dosya ekleme alanı vardır',editor.includes('Görsel Ekle')&&editor.includes('Dosya Ekle')&&editor.includes('saveAssignmentAttachments')],
  ['Ödev tipi ek dosya alanlarını taşır',types.includes('odev_dosyasi?: string | null')&&types.includes('odev_fotografi?: string | null')],
  ['Ödev durumları veritabanı RPC değerleriyle aynıdır',status.includes('<option>Verildi</option>')&&status.includes('<option>Eksik</option>')&&status.includes('<option>Tamamlandı</option>')&&status.includes('<option>İptal</option>')&&!/Bekliyor|Devam Ediyor|Teslim Edildi/.test(status)],
  ['İptal ödev gecikmiş sayılmaz',page.includes("const canceled=(x:Odev)=>x.durum==='İptal'")&&page.includes('const pending=(x:Odev)=>!completed(x)&&!canceled(x)')],
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} ödev UX kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} ödev/WhatsApp kuralı doğrulandı.`)
