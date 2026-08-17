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
  ['Durum öğretmen adının altında ayrı satırdır',daily.includes('<small>{abbreviateName(fullTeacher)}</small><StatusIndicator status={lesson.ders_durumu}/>')&&css.includes('.daily-status-line{display:inline-flex')],
  ['Planlandı mavi nokta ve yazı kullanır',daily.includes('daily-status-line planned')&&daily.includes('<span>Planlandı</span>')&&css.includes('.daily-status-indicator.planned')&&css.includes('background:#2f6fdb')],
  ['Yapıldı yeşil tik ve yazı kullanır',daily.includes('daily-status-line done')&&daily.includes('<span>Yapıldı</span>')&&daily.includes('<Check size={9}')&&css.includes('.daily-status-indicator.done')],
  ['İptal kırmızı çarpı ve yazı göstergesi tanımlıdır',daily.includes('daily-status-line cancelled')&&daily.includes('<span>İptal</span>')&&daily.includes('<X size={9}')&&css.includes('.daily-status-indicator.cancelled')],
  ['İptal dersler günlük Takvimden gizlenmeye devam eder',daily.includes("const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])")&&daily.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")],
  ['Takvim 30 dakikalık hücreleri kompakt kullanır',daily.includes('const SLOT_HEIGHT=42')&&css.includes('.daily-room-grid{min-width:650px')&&css.includes('repeat(5,minmax(116px,1fr))')],
  ['Boş hücre yalnız küçük artı işareti gösterir',daily.includes('title="Ders ekle"><Plus size={12}/></button>')&&!daily.includes('<span>Ders ekle</span>')],
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
