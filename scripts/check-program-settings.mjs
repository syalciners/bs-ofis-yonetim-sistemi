import { readFileSync } from 'node:fs'

const service=readFileSync('src/services/institutionService.ts','utf8')
const panel=readFileSync('src/components/ProgramSettingsPanel.tsx','utf8')
const settings=readFileSync('src/pages/SettingsPage.tsx','utf8')
const lessonForm=readFileSync('src/components/PremiumLessonForm.tsx','utf8')
const calendar=readFileSync('src/pages/DailyCalendarPage.tsx','utf8')
const migration=readFileSync('supabase/migrations/20260818231013_program_ayarlari_guvenli_yonetim_v1.sql','utf8')

const checks=[
  ['Kurum ayarı program varsayılanlarını yükler',service.includes('varsayilan_ders_birimi')&&service.includes('takvim_baslangic_saati')&&service.includes('takvim_bitis_saati')],
  ['Program ayarları yalnız güvenli RPC ile yazılır',service.includes("rpc('program_ayarlari_guncelle_guvenli_v1'")&&!service.includes("from('dersler').update")&&!service.includes("from('sabit_ders_programi').update")],
  ['Ders birimi motor standardı 60 dakika olarak sabitlenir',service.includes('SYSTEM_DERS_BIRIMI_DAKIKA=60')&&panel.includes('1 ders = {SYSTEM_DERS_BIRIMI_DAKIKA} dakika')],
  ['Program ayarları yalnız 1 veya 2 ders varsayılanını sunar',panel.includes('<option value="1">1 ders</option>')&&panel.includes('<option value="2">2 ders</option>')],
  ['Program paneli geriye dönük kayıt değiştirmediğini açıklar',panel.includes('Mevcut dersler, sabit programlar, ücretler ve hakedişler geriye dönük değiştirilmez')],
  ['Program paneli fiyat veya hakediş düzenleme alanı açmaz',!panel.includes('Öğrenci Birim Ücreti')&&!panel.includes('Öğretmen Birim Hakedişi')],
  ['Program paneli Ayarlar ekranına bağlıdır',settings.includes('<ProgramSettingsPanel')&&settings.includes("info==='program'")],
  ['Yeni ders formu kurum varsayılan ders birimini kullanır',lessonForm.includes('lesson?.ders_sayisi || institution?.varsayilan_ders_birimi || 1')],
  ['Mevcut ders birimi kurum varsayılanından önceliklidir',lessonForm.includes('lesson?.ders_sayisi || institution?.varsayilan_ders_birimi || 1')],
  ['Ders bitiş hesabı mevcut 60 dakikalık motor standardını korur',lessonForm.includes('Math.max(1, Number(units || 1)) * 60')],
  ['Takvim kurum başlangıç saatini kullanır',calendar.includes('institution?.takvim_baslangic_saati')&&calendar.includes('configuredStart')],
  ['Takvim kurum bitiş saatini kullanır',calendar.includes('institution?.takvim_bitis_saati')&&calendar.includes('configuredEnd')],
  ['Takvim mevcut dış saatli dersleri gizlememek için aralığı genişletir',calendar.includes('Math.min(configuredStart')&&calendar.includes('Math.max(configuredEnd')],
  ['Migration varsayılanları mevcut üretim davranışını korur',migration.includes("default '08:00'")&&migration.includes("default '21:00'")&&migration.includes('default 1')],
  ['Migration ders birimini 1 veya 2 ile sınırlar',migration.includes('varsayilan_ders_birimi between 1 and 2')],
  ['Program ayar RPC anonim kullanıma kapalıdır',migration.includes('from public, anon')&&migration.includes('to authenticated, service_role')],
  ['Program ayarı mevcut ders veya sabit program tablolarını güncellemez',!migration.includes('update public.dersler')&&!migration.includes('update public.sabit_ders_programi')],
]

const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Program Ayarları kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Program Ayarları kuralı doğrulandı.`)
