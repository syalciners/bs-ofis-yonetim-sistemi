import { readFileSync } from 'node:fs'

const daily=readFileSync('src/pages/DailyCalendarPage.tsx','utf8')
const fixed=readFileSync('src/pages/FixedProgramPage.tsx','utf8')
const helper=readFileSync('src/lib/calendarRooms.ts','utf8')
const form=readFileSync('src/components/PremiumLessonForm.tsx','utf8')
const css=readFileSync('src/daily-calendar.css','utf8')
const pdf=readFileSync('src/services/weeklyProgramPdfService.ts','utf8')

const checks=[
  ['Günlük Takvim sabit ROOM_COLUMNS listesi kullanmaz',!daily.includes('const ROOM_COLUMNS=')&&daily.includes("import { calendarRoomColumns } from '../lib/calendarRooms'")],
  ['Sabit Program Takvimi sabit ROOM_COLUMNS listesi kullanmaz',!fixed.includes('const ROOM_COLUMNS=')&&fixed.includes("import { calendarRoomColumns } from '../lib/calendarRooms'")],
  ['Derslik başlığı mekan_adi üzerinden türetilir',helper.includes('room.mekan_adi||room.derslik_id')&&helper.includes('calendarRoomLabel(room)')],
  ['Başak Derslik gibi genel Derslik son eki otomatik kaldırılır',helper.includes("derslik|dersliği|ders|salonu|salon")],
  ['Mevcut Çalışma Salonu etiketi Salon olarak korunur',helper.includes("type==='salon'&&full.toLocaleLowerCase('tr-TR')==='çalışma salonu'")&&helper.includes("return 'Salon'")],
  ['Ev türü mekanlarda kompakt üç harfli etiket üretilir',helper.includes("type==='ev'")&&helper.includes("slice(0,3).toLocaleUpperCase('tr-TR')")],
  ['Mevcut operasyonel derslik sırası yalnız ID sırası olarak korunur',helper.includes("['LOC-002','LOC-001','LOC-003','LOC-005','LOC-004']")],
  ['Yeni derslikler sabit listeye ihtiyaç duymadan veri kaynağından eklenir',helper.includes('rooms.filter(room=>room.aktif!==false||referenced.has(room.derslik_id))')],
  ['Pasif fakat mevcut derste kullanılan derslik günlük Takvimde korunur',daily.includes('calendarRoomColumns(data.derslikler,dayLessons.map(x=>x.derslik_id))')],
  ['Pasif fakat mevcut sabit programda kullanılan derslik Sabit Program Takviminde korunur',fixed.includes('calendarRoomColumns(data.derslikler,selectedPrograms.map(x=>x.derslik_id))')],
  ['Günlük Takvim sütun sayısını CSS değişkenine verir',daily.includes("'--room-count':roomColumns.length")&&daily.includes('Math.max(650,52+roomColumns.length*116)')],
  ['Sabit Program Takvimi sütun sayısını CSS değişkenine verir',fixed.includes("'--room-count':roomColumns.length")&&fixed.includes('Math.max(650,52+roomColumns.length*116)')],
  ['Grid sabit beş sütun yerine dinamik oda sayısını kullanır',css.includes('repeat(var(--room-count),minmax(116px,1fr))')&&css.includes('repeat(var(--room-count),minmax(114px,1fr))')&&css.includes('repeat(var(--room-count),minmax(112px,1fr))')&&!css.includes('repeat(5,minmax(116px,1fr))')],
  ['Derslik başlık satırı grid üstündedir',daily.includes('daily-room-header-row')&&daily.includes('daily-room-body-row')],
  ['Boş hücre tarih saat ve dersliği Ders Ekle formuna taşır',daily.includes('roomId:column.id')&&daily.includes('defaultRoomId={quickSlot.roomId}')],
  ['Ders Ekle formu takvimden gelen dersliği varsayılan seçer',form.includes('defaultRoomId?:string')&&form.includes("lesson?.derslik_id||defaultRoomId||''")],
  ['Takvim kartında öğrenci ve öğretmen adı kısaltılır',daily.includes('abbreviateName(fullStudent)')&&daily.includes('abbreviateName(fullTeacher)')],
  ['Takvim kartında derslik adı tekrar yazılmaz',!daily.includes('roomName(lesson.derslik_id)')],
  ['İptal dersler günlük Takvimden gizlenmeye devam eder',daily.includes("const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])")&&daily.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")],
  ['Takvim 30 dakikalık hücreleri kompakt kullanır',daily.includes('const SLOT_HEIGHT=42')&&css.includes('.daily-room-grid{min-width:650px')],
  ['Mobilde derslik grid yatay kaydırılır',css.includes('.daily-room-grid-scroll')&&css.includes('overflow-x:auto')],
  ['Saat sütunu yatay kaydırmada sabit kalır',css.includes('.daily-time-axis{position:sticky;left:0')&&css.includes('.daily-time-head{position:sticky;left:0')],
  ['PDF servisi Takvim kısaltma fonksiyonunu kullanmaz',!pdf.includes('calendarRoomLabel')&&!pdf.includes('abbreviateName')],
  ['Yalnız Planlandı ders sürüklenebilir',daily.includes("const canDragLesson=(lesson:Ders)=>String(lesson.ders_durumu||'Planlandı')==='Planlandı'")],
  ['Derslik sütunları sürükleme hedefi olarak işaretlidir',daily.includes('data-room-id={column.id}')&&fixed.includes('data-room-id={column.id}')&&css.includes('.daily-room-slot.drag-target')],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){
  console.error(`\n${failed.length} dinamik derslik Takvimi kontrolü başarısız.`)
  process.exit(1)
}
