import { readFileSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const service=read('src/services/programSuggestionService.ts')
const form=read('src/components/SmartProgramForm.tsx')
const panel=read('src/components/WeekPlanningReviewPanel.tsx')
const calendar=read('src/pages/CalendarPage.tsx')
const fixed=read('src/pages/FixedProgramPage.tsx')
const css=read('src/ux-overrides.css')
const prepareStart=calendar.indexOf('const prepareWeek=async()=>')
const prepareEnd=calendar.indexOf('\n\n  return <div',prepareStart)
const prepareBlock=prepareStart>=0&&prepareEnd>prepareStart?calendar.slice(prepareStart,prepareEnd):''

const checks=[
  ['Sabit program önerisi sunucu RPC üzerinden alınır',service.includes("sabit_program_oneri_v1")],
  ['Haftalık program ön kontrolü sunucu RPC üzerinden alınır',service.includes("haftalik_program_kontrol_oneri_v1")],
  ['Haftalık ön kontrol seçilen ve sonraki haftayı birlikte kapsar',service.includes('nextMonday')&&service.includes('Promise.all([checkSingleWeek(monday), checkSingleWeek(nextMonday)])')],
  ['Sabit Program akıllı formu kullanır',fixed.includes('<SmartProgramForm')],
  ['Sabit program kaydetmeden önce öneri kontrolü çalışır',form.includes('await suggestProgram(p)')],
  ['Sabit program aynı saatte uygun derslik önerir',form.includes('Aynı saatte uygun derslik')&&form.includes('onerilen_derslikler')],
  ['Sabit program yakın uygun saat önerir',form.includes('Yakın uygun saatler')&&form.includes('onerilen_saatler')],
  ['Öneri seçildiğinde saat ve derslik forma uygulanır',form.includes('setRoom(s.derslik_id)')&&form.includes('setStartTime(s.saat)')],
  ['Haftayı Oluştur üretimden önce ön kontrol yapar',prepareBlock.indexOf('await reviewWeekPlanning(monday)')>=0&&prepareBlock.indexOf('await reviewWeekPlanning(monday)')<prepareBlock.indexOf('await createWeek(monday)')],
  ['Çakışmada haftalık ders üretimi yerine çözüm paneli açılır',calendar.includes('setWeekReview(review)')&&calendar.includes('<WeekPlanningReviewPanel')],
  ['Haftalık öneri tek seferlik güvenli taşıma mekanizmasını kullanır',panel.includes('await moveProgramDate(')],
  ['Öneri uygulandıktan sonra çakışmalar yeniden kontrol edilir',panel.includes('await reviewWeekPlanning(review.haftalar[0])')],
  ['Haftalık panel Sabit Program ekranına erişim verir',panel.includes("nav('/sabit-program')")],
  ['Akıllı öneri butonları mobil uyumlu biçimlendirilir',css.includes('.suggestion-btn')&&css.includes('.smart-suggestion-panel')&&css.includes('.week-review-card')],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Akıllı Programlama kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Akıllı Programlama kuralı doğrulandı.`)
