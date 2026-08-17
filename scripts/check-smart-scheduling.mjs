import { readFileSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const service=read('src/services/programSuggestionService.ts')
const form=read('src/components/SmartProgramForm.tsx')
const sharedForms=read('src/components/forms.tsx')
const panel=read('src/components/WeekPlanningReviewPanel.tsx')
const calendar=read('src/pages/CalendarPage.tsx')
const fixed=read('src/pages/FixedProgramPage.tsx')
const manualProgram=read('src/services/manualProgramService.ts')
const css=read('src/ux-overrides.css')
const prepareStart=calendar.indexOf('const prepareWeek=async()=>')
const prepareEnd=calendar.indexOf('\n  const openWeekPdf',prepareStart)
const prepareBlock=prepareStart>=0&&prepareEnd>prepareStart?calendar.slice(prepareStart,prepareEnd):''

const checks=[
  ['Sabit program önerisi sunucu RPC üzerinden alınır',service.includes('sabit_program_oneri_v1')],
  ['Haftalık program ön kontrolü güncel V2 RPC üzerinden alınır',service.includes('haftalik_program_kontrol_oneri_v2')],
  ['Haftalık ön kontrol yalnız seçilen haftayı kapsar',service.includes('const result=await checkSingleWeek(monday)')&&!service.includes('nextMonday')&&!service.includes('Promise.all([checkSingleWeek')],
  ['Sabit Program akıllı formu kullanır',fixed.includes('<SmartProgramForm')],
  ['Sabit program kaydetme manuel V4 RPC kullanır',manualProgram.includes("sabit_program_kaydet_guvenli_v4")&&form.includes('saveProgramManual')&&fixed.includes('saveProgramManual')],
  ['Sabit program kaydetmeden önce öneri kontrolü çalışır',form.includes('await suggestProgram(p)')],
  ['Program düzenleme manuel hafta uygulamasını açıkça onaylatır',form.includes('Sabit program güncellensin mi?')&&form.includes('Mevcut dersler otomatik değiştirilmez')&&form.includes('Haftayı Hazırla')],
  ['Program düzenleme sonuçlanmış ve tek seferlik dersleri koruduğunu açıklar',form.includes('Yapıldı, İptal ve tek seferlik değişiklikler korunur')],
  ['Pasife alma mevcut dersleri korur ve yeni hafta hazırlamasını durdurur',fixed.includes('Mevcut dersler korunur; bu sabit program yeni Haftayı Hazırla işlemlerine dahil edilmez.')],
  ['Sabit program aynı saatte uygun derslik önerir',form.includes('Aynı saatte uygun derslik')&&form.includes('onerilen_derslikler')],
  ['Sabit program yakın uygun saat önerir',form.includes('Yakın uygun saatler')&&form.includes('onerilen_saatler')],
  ['Sabit program ekranı yalnız aktif kayıtları gösterir',fixed.includes("data.sabitProgramlar.filter(x=>!(x.program_durumu==='Pasif'||x.aktif===false))")&&!fixed.includes('showPassive')&&!fixed.includes('Pasifleri Göster')&&!fixed.includes('Pasifleri Gizle')],
  ['Sabit program görünümü tek karşı-görünüm düğmesiyle değişir',fixed.includes('fixed-program-view-toggle')&&fixed.includes("viewMode==='calendar'?'list':'calendar'")&&fixed.includes('<List size={16}/>Liste')&&fixed.includes('<CalendarDays size={16}/>Takvim')&&!fixed.includes('fixed-program-view-switch')],
  ['Sabit program özet satırı görünüm düğmesini sağda tutar',read('src/fixed-program-calendar.css').includes('.fixed-program-summary-toolbar')&&read('src/fixed-program-calendar.css').includes('.fixed-program-view-toggle')],
  ['Sabit program Takvim dokunmatik sürükleme 0,55 saniye kullanır',fixed.includes('const LONG_PRESS_MS=550')&&fixed.includes('window.setTimeout(()=>activateProgramDrag')],
  ['Sabit program Takvim yalnız aktif kayıtları sürükler',fixed.includes("const canDragProgram=(program:SabitProgram)=>!dragBusy&&!(program.program_durumu==='Pasif'||program.aktif===false)")],
  ['Sabit program Takvim derslik ve 30 dakikalık slotu sürükleme hedefi yapar',fixed.includes('data-room-id={column.id}')&&fixed.includes("target?'drag-target':''")],
  ['Sabit program bırakmada sunucu çakışma önerisi yeniden kontrol edilir',fixed.includes('const check=await suggestProgram(nextProgram)')&&fixed.includes('if(!check?.uygun)throw new Error(programConflictMessage(check))')],
  ['Sabit program sürükleme güvenli V4 kayıt akışını kullanır',fixed.includes('await saveProgramManual(nextProgram)')&&fixed.includes('Sabit program şablonu değişir. Mevcut dersler otomatik değiştirilmez')&&fixed.includes('Haftayı Hazırla ile uygulanır')],
  ['Sabit program sürükleme sonrası normal detay tıklamasını bastırır',fixed.includes('suppressClickRef.current=true')&&fixed.includes('if(suppressClickRef.current)return;setSelectedProgram(program)')],
  ['Öneri seçildiğinde saat ve derslik forma uygulanır',form.includes('setRoom(s.derslik_id)')&&form.includes('setStartTime(formatClockInput(s.saat))')],
  ['Sabit program saat girişi iOS çarkı yerine yazılabilir sayısal klavye kullanır',form.includes('inputMode="numeric"')&&form.includes('formatClockInput')&&!form.includes('type="time"')],
  ['Ders ve tek seferlik program saat girişleri yazılabilir sayısal klavye kullanır',sharedForms.includes('formatClockInput')&&!sharedForms.includes('type="time"')],
  ['Haftayı Hazırla üretimden önce ön kontrol yapar',prepareBlock.indexOf('await reviewWeekPlanning(monday)')>=0&&prepareBlock.indexOf('await reviewWeekPlanning(monday)')<prepareBlock.indexOf('await createWeek(monday)')],
  ['Hazır hafta kontrolü çakışma taramasından önce yapılır',prepareBlock.indexOf('await readWeekStatus()')>=0&&prepareBlock.indexOf('await readWeekStatus()')<prepareBlock.indexOf('await reviewWeekPlanning(monday)')],
  ['Çakışmada haftalık ders üretimi yerine çözüm paneli açılır',calendar.includes('setWeekReview(review)')&&calendar.includes('<WeekPlanningReviewPanel')],
  ['Haftalık öneri tek seferlik güvenli taşıma mekanizmasını kullanır',panel.includes('await moveProgramDate(')],
  ['Öneri uygulandıktan sonra seçilen hafta yeniden kontrol edilir',panel.includes('await reviewWeekPlanning(review.haftalar[0])')&&panel.includes('Seçilen hafta çakışmasız görünüyor.')],
  ['Haftalık panel Sabit Program ekranına erişim verir',panel.includes("nav('/sabit-program')")],
  ['Akıllı öneri butonları mobil uyumlu biçimlendirilir',css.includes('.suggestion-btn')&&css.includes('.smart-suggestion-panel')&&css.includes('.week-review-card')],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Akıllı Programlama kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Akıllı Programlama kuralı doğrulandı.`)
