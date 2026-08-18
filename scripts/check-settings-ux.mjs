import { readFileSync } from 'node:fs'
const service=readFileSync('src/services/profileService.ts','utf8')
const userService=readFileSync('src/services/userManagementService.ts','utf8')
const definitionsService=readFileSync('src/services/educationDefinitionsService.ts','utf8')
const definitionsPanel=readFileSync('src/components/EducationDefinitionsPanel.tsx','utf8')
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
  ['Henüz güvenli yazma servisi olmayan yönetim alanları doğrudan veri yazmaz',page.includes('Bu ekranda henüz veri değiştirilmez')&&!page.includes('supabase.')&&!page.includes('update(')&&!page.includes('insert(')],
  ['Yönetici kullanıcı listesi RLS korumalı profil tablosundan okunur',userService.includes("from('kullanici_profilleri')")&&userService.includes("select('auth_user_id,email,ad_soyad,rol,ogretmen_id,aktif,telefon')")],
  ['Yönetici kullanıcı güncellemesi güvenli v2 RPC kullanır',userService.includes('kullanici_profili_guncelle_guvenli_v2')],
  ['Yönetici kullanıcı servisi rol e-posta ve öğretmen bağlantısı yazmaz',!userService.includes('p_rol')&&!userService.includes('p_email')&&!userService.includes('p_ogretmen_id')],
  ['Kullanıcı yönetiminde rol ve e-posta salt okunur kalır',page.includes('Rol değişikliği bu aşamada kapalıdır')&&page.includes('Giriş e-postası normal profil alanı olarak değiştirilemez')],
  ['Kendi hesabını pasifleştirme arayüzde engellenir',page.includes('disabled={isSelf}')&&page.includes('kendi hesabınızı bu ekrandan pasifleştiremezsiniz')],
  ['Kullanıcı yönetimi responsive iki kolon düzenine sahiptir',css.includes('.settings-users-layout')&&css.includes('grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)')&&css.includes('@media(max-width:760px)')],
  ['Branş kaydı doğrudan tablo yazmak yerine güvenli RPC kullanır',definitionsService.includes('brans_kaydet_guvenli_v1')&&!definitionsService.includes("from('branslar')")],
  ['Derslik kaydı doğrudan tablo yazmak yerine güvenli RPC kullanır',definitionsService.includes('derslik_kaydet_guvenli_v1')&&!definitionsService.includes("from('derslikler')")],
  ['Branş ve derslik servisinde silme işlemi yoktur',!definitionsService.includes('.delete(')&&!definitionsService.includes('sil_')],
  ['Yeni branş ve derslik kimliği uygulama standardıyla otomatik üretilir',definitionsService.includes("uid('BR')")&&definitionsService.includes("uid('LOC')")],
  ['Eğitim tanımları paneli ID düzenlemeyi açmaz',definitionsPanel.includes('kimlik değiştirilemez')&&!definitionsPanel.includes('name="brans_id"')&&!definitionsPanel.includes('name="derslik_id"')],
  ['Eğitim tanımları paneli branş ve derslik eklemeyi destekler',definitionsPanel.includes('Yeni Branş')&&definitionsPanel.includes('Yeni Derslik')&&definitionsPanel.includes('Branşı Kaydet')&&definitionsPanel.includes('Dersliği Kaydet')],
  ['Branş ve derslik aktiflik alanları arayüzden yönetilir',definitionsPanel.includes("value={branchDraft.aktif?'Aktif':'Pasif'}")&&definitionsPanel.includes("value={roomDraft.aktif?'Aktif':'Pasif'}")],
  ['Branş ve derslik paneli Ayarlar ekranına bağlanmıştır',page.includes('<EducationDefinitionsPanel')&&page.includes("info==='egitim'")],
  ['Eğitim tanımları responsive iki kolon düzenine sahiptir',css.includes('.settings-definition-layout')&&css.includes('grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)')],
  ['Ayarlar yönetim merkezi responsive kart düzenine sahiptir',css.includes('.settings-hub-grid')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('@media(max-width:620px)')],
  ['Yeni Ayarlar stili production girişinden yüklenir',main.includes("import './settings-hub.css'")],
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`\n${failed.length} Ayarlar kontrolü başarısız.`);process.exit(1)}
console.log(`\n${checks.length} Ayarlar kuralı doğrulandı.`)
