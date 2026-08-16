import { readFileSync } from 'node:fs'

const daily=readFileSync('src/pages/DailyCalendarPage.tsx','utf8')
const form=readFileSync('src/components/PremiumLessonForm.tsx','utf8')
const css=readFileSync('src/daily-calendar.css','utf8')
const pdf=readFileSync('src/services/weeklyProgramPdfService.ts','utf8')

const checks=[
  ['Takvim Yalçıner sütununu içerir',daily.includes("{id:'LOC-002',label:'Yalçıner'}")],
  ['Takvim Başak sütununu içerir',daily.includes("{id:'LOC-001',label:'Başak'}")],
  ['Takvim Salon sütununu içerir',daily.includes("{id:'LOC-003',label:'Salon'}")],
  ['Takvim OSM sütununu içerir',daily.includes("{id:'LOC-005',label:'OSM'}")],
  ['Takvim Online sütununu içerir',daily.includes("{id:'LOC-004',label:'Online'}")],
  ['Derslik başlık satırı grid üstündedir',daily.includes('daily-room-header-row')&&daily.includes('daily-room-body-row')],
  ['Boş hücre tarih saat ve dersliği Ders Ekle formuna taşır',daily.includes("roomId:column.id")&&daily.includes('defaultRoomId={quickSlot.roomId}')],
  ['Ders Ekle formu takvimden gelen dersliği varsayılan seçer',form.includes('defaultRoomId?:string')&&form.includes("lesson?.derslik_id||defaultRoomId||''")],
  ['Takvim kartında öğrenci ve öğretmen adı kısaltılır',daily.includes('abbreviateName(fullStudent)')&&daily.includes('abbreviateName(fullTeacher)')],
  ['Takvim kartında derslik adı tekrar yazılmaz',!daily.includes('roomName(lesson.derslik_id)')],
  ['Planlandı mavi nokta kullanır',daily.includes('daily-status-indicator planned')&&css.includes('.daily-status-indicator.planned')&&css.includes('background:#2f6fdb')],
  ['Yapıldı yeşil tik kullanır',daily.includes('daily-status-indicator done')&&daily.includes('<Check size={10}')&&css.includes('.daily-status-indicator.done')],
  ['İptal kırmızı çarpı göstergesi tanımlıdır',daily.includes('daily-status-indicator cancelled')&&daily.includes('<X size={10}')&&css.includes('.daily-status-indicator.cancelled')],
  ['İptal dersler günlük Takvimden gizlenmeye devam eder',daily.includes("const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])")&&daily.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")],
  ['Mobilde derslik grid yatay kaydırılır',css.includes('.daily-room-grid-scroll')&&css.includes('overflow-x:auto')&&css.includes('.daily-room-grid{min-width:')],
  ['Saat sütunu yatay kaydırmada sabit kalır',css.includes('.daily-time-axis{position:sticky;left:0')&&css.includes('.daily-time-head{position:sticky;left:0')],
  ['PDF servisi Takvim kısaltma fonksiyonunu kullanmaz',!pdf.includes('abbreviateName')],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){
  console.error(`\n${failed.length} beş sütunlu Takvim kontrolü başarısız.`)
  process.exit(1)
}
