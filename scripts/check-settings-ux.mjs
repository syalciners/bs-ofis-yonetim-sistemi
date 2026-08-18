import { readFileSync } from 'node:fs'
const service=readFileSync('src/services/profileService.ts','utf8')
const form=readFileSync('src/components/ProfileSettingsForm.tsx','utf8')
const page=readFileSync('src/pages/SettingsPage.tsx','utf8')
const css=readFileSync('src/settings-hub.css','utf8')
const main=readFileSync('src/main.tsx','utf8')

const checks=[
  ['Kendi profil güncellemesi dar kapsamlı güvenli RPC kullanır',service.includes('kullanici_kendi_profilini_guncelle_guvenli_v1')],
  ['Profil servisi yalnız ad soyad ve telefon gönderir',service.includes('p_ad_soyad')&&service.includes('p_telefon')&&!service.includes('p_aktif')&&!service.includes('p_rol')&&!service.includes('p_email')],
  ['Profil formunda ad soyad düzenlenebilir',form.includes('name="ad_soyad"')],
  ['Profil formunda telefon düzenlenebilir',form.includes('name="telefon"')],
  ['Profil formunda rol alanı yoktur',!form.includes('name="rol"')],
  ['Profil formunda aktiflik alanı yoktur',!form.includes('name="aktif"')],
  ['Profil formunda e-posta alanı yoktur',!form.includes('name="email"')],
  ['Ayarlar ekranı Profili Düzenle işlemini korur',page.includes('Profili Düzenle')&&page.includes('<ProfileSettingsForm')],
  ['E-posta ve yetki bilgileri yalnız okunur gösterilir',page.includes('E-posta')&&page.includes('Yetki')],
  ['Yönetim merkezi yalnız Yönetici rolünde gösterilir',page.includes("const isManager=profile?.rol==='Yönetici'")&&page.includes('{isManager&&<>')],
  ['Ayarlar altı temel yönetim alanını içerir',['Kurum','Kullanıcılar ve Yetkiler','Branşlar ve Derslikler','Finans Tanımları','Program Ayarları','Portal ve Entegrasyonlar'].every(x=>page.includes(x))],
  ['Branş derslik finans ve program özetleri mevcut AppData üzerinden hesaplanır',page.includes('data.branslar.filter')&&page.includes('data.derslikler.filter')&&page.includes('data.kasaHesaplari.filter')&&page.includes('data.giderKategorileri.filter')&&page.includes('data.sabitProgramlar.filter')],
  ['Henüz güvenli yazma servisi olmayan yönetim alanları veri değiştirmez',page.includes('Bu ekranda henüz veri değiştirilmez')&&!page.includes('supabase.')&&!page.includes('update(')&&!page.includes('insert(')],
  ['Ayarlar yönetim merkezi responsive kart düzenine sahiptir',css.includes('.settings-hub-grid')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('@media(max-width:620px)')],
  ['Yeni Ayarlar stili production girişinden yüklenir',main.includes("import './settings-hub.css'")],
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Ayarlar kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Ayarlar kuralı doğrulandı.`)
