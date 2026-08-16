import { readFileSync } from 'node:fs'

const daily = readFileSync('src/pages/DailyCalendarPage.tsx','utf8')
const weekly = readFileSync('src/pages/CalendarPage.tsx','utf8')
const premium = readFileSync('src/components/PremiumLessonForm.tsx','utf8')
const pdf = readFileSync('src/services/weeklyProgramPdfService.ts','utf8')

const required = ["'İptal'","'Ertelendi'","'Öğretmen İptali'"]
const failures=[]

if(!daily.includes('CALENDAR_HIDDEN_STATUSES') || !daily.includes("!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||''))")) failures.push('Günlük Takvim iptal/ertelenen dersleri görünümden çıkarmıyor.')
if(!weekly.includes('CALENDAR_HIDDEN_STATUSES') || !weekly.includes("visibleLessons=useMemo(()=>lessons.filter(x=>!CALENDAR_HIDDEN_STATUSES.has(String(x.ders_durumu||'')))")) failures.push('Haftalık Takvim iptal/ertelenen dersleri görünümden çıkarmıyor.')
for(const status of required){
  if(!daily.includes(status)||!weekly.includes(status)||!premium.includes(status)) failures.push(`${status} görünürlük/çakışma kuralında eksik.`)
}
if(!premium.includes("!CANCELLED_STATUSES.has(String(x.ders_durumu||''))")) failures.push('Ders Ekle formu iptal edilen dersleri yerel uygunluk hesabından dışlamıyor.')
if(!weekly.includes('openWeeklyProgramPdf(data,lessons')) failures.push('PDF, seçili haftanın tam ders listesini kullanmıyor.')
if(!weekly.includes('disabled={!lessons.length}')) failures.push('Yalnız iptal ders olan haftada PDF butonu kullanılamıyor.')
if(!weekly.includes('lessons={visibleLessons}')) failures.push('Program gönderme görünür Takvim dersleriyle sınırlandırılmıyor.')
if(!pdf.includes("if(value==='İptal')")) failures.push('PDF iptal ders durumunu görünür biçimde işlemiyor.')

if(failures.length){
  failures.forEach(x=>console.error(`✗ ${x}`))
  process.exit(1)
}
console.log('✓ İptal/ertelenen dersler Takvimde görünmez, yeni ders uygunluğunu bloke etmez ve PDF tam ders listesini korur.')
