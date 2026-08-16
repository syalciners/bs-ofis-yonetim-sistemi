import { readFileSync } from 'node:fs'

const daily = readFileSync('src/pages/DailyCalendarPage.tsx','utf8')
const weekly = readFileSync('src/pages/CalendarPage.tsx','utf8')
const premium = readFileSync('src/components/PremiumLessonForm.tsx','utf8')

const required = ["'İptal'","'Ertelendi'","'Öğretmen İptali'"]
const failures=[]

if(!daily.includes('CALENDAR_HIDDEN_STATUSES') || !daily.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")) failures.push('Günlük Takvim iptal/ertelenen dersleri görünümden çıkarmıyor.')
if(!weekly.includes('CALENDAR_HIDDEN_STATUSES') || !weekly.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")) failures.push('Haftalık Takvim iptal/ertelenen dersleri görünümden çıkarmıyor.')
for(const status of required){
  if(!daily.includes(status)||!weekly.includes(status)||!premium.includes(status)) failures.push(`${status} görünürlük/çakışma kuralında eksik.`)
}
if(!premium.includes("!CANCELLED_STATUSES.has(String(x.ders_durumu||''))")) failures.push('Ders Ekle formu iptal edilen dersleri yerel uygunluk hesabından dışlamıyor.')

if(failures.length){
  failures.forEach(x=>console.error(`✗ ${x}`))
  process.exit(1)
}
console.log('✓ İptal/ertelenen dersler Takvimde görünmez ve yeni ders uygunluk hesabını bloke etmez.')
