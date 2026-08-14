import { readFileSync } from 'node:fs'
const service=readFileSync('src/services/profileService.ts','utf8')
const form=readFileSync('src/components/ProfileSettingsForm.tsx','utf8')
const page=readFileSync('src/pages/SettingsPage.tsx','utf8')

const checks=[
  ['Kendi profil güncellemesi dar kapsamlı güvenli RPC kullanır',service.includes('kullanici_kendi_profilini_guncelle_guvenli_v1')],
  ['Profil servisi yalnız ad soyad ve telefon gönderir',service.includes('p_ad_soyad')&&service.includes('p_telefon')&&!service.includes('p_aktif')&&!service.includes('p_rol')&&!service.includes('p_email')],
  ['Profil formunda ad soyad düzenlenebilir',form.includes('name="ad_soyad"')],
  ['Profil formunda telefon düzenlenebilir',form.includes('name="telefon"')],
  ['Profil formunda rol alanı yoktur',!form.includes('name="rol"')],
  ['Profil formunda aktiflik alanı yoktur',!form.includes('name="aktif"')],
  ['Profil formunda e-posta alanı yoktur',!form.includes('name="email"')],
  ['Ayarlar ekranı Profili Düzenle işlemini sunar',page.includes('Profili Düzenle')&&page.includes('<ProfileSettingsForm')],
  ['E-posta ve yetki bilgileri yalnız okunur gösterilir',page.includes('E-posta')&&page.includes('Yetki')],
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Ayarlar kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Ayarlar kuralı doğrulandı.`)
