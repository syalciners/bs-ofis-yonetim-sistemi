import { readFileSync } from 'node:fs'

const read=(path)=>readFileSync(path,'utf8')
const app=read('src/App.tsx')
const more=read('src/pages/MorePage.tsx')
const preview=read('src/pages/PortalPreviewPage.tsx')
const managerNav=read('src/components/ManagerModeNav.tsx')
const header=read('src/components/AppHeader.tsx')
const bottomNav=read('src/components/BottomNav.tsx')
const layout=read('src/program-week-layout.css')
const css=read('src/portal-preview.css')
const main=read('src/main.tsx')

const checks=[
  ['Menüde portal geçişi yalnız Yönetici rolünde gösterilir',more.includes("const isManager=profile?.rol==='Yönetici'")&&more.includes('{isManager&&<ManagerModeNav active="yonetim"/>}')],
  ['Yönetici menüsünde Yönetim Öğretmen Portalı Öğrenci Portalı üçlüsü vardır',['Yönetim','Öğretmen Portalı','Öğrenci Portalı'].every(x=>managerNav.includes(x))],
  ['Öğretmen ve öğrenci portal seçim ve kişi routeları tanımlıdır',["/portal-onizleme/ogretmen","/portal-onizleme/ogretmen/:personId","/portal-onizleme/ogrenci","/portal-onizleme/ogrenci/:personId"].every(x=>app.includes(`path=\"${x}\"`))],
  ['Portal önizleme doğrudan URL ile Yönetici dışına kapalıdır',preview.includes("if (appProfile?.rol !== 'Yönetici') return <Navigate to=\"/\" replace/>")],
  ['Öğretmen seçiminde yöneticiler ve pasif öğretmenler dışlanır',preview.includes("x.durum !== 'Pasif' && x.rol !== 'Yönetici' && !isManagerTeacher(x.ad_soyad)")],
  ['Öğrenci seçiminde yalnız aktif öğrenciler listelenir',preview.includes("data.ogrenciler")&&preview.includes(".filter(x => x.durum !== 'Pasif')")],
  ['Portal önizlemesi gerçek V2 kapsamına göre kaynakta var satırları kullanır',preview.includes('sourceRowExists')&&preview.includes('kaynakta_var')&&preview.includes('addDays(today, 30)')],
  ['Portal önizlemesi Bugün Program Ödevler Profil dört ekranını içerir',['Bugün','Program','Ödevler','Profil'].every(x=>preview.includes(`>${x}</span>`))],
  ['Portal önizlemesi salt okunur kalır',preview.includes('Salt okunur')&&preview.includes('Yalnız görüntüleme')&&!preview.includes('saveLesson')&&!preview.includes('saveAssignment')&&!preview.includes('setLessonStatus')],
  ['Portal ayrıntısında yönetim alt navigasyonu gizlenir',app.includes("const portalDetail = /^\\/portal-onizleme\\/(ogretmen|ogrenci)\\/[^/]+$/.test(location.pathname)")&&app.includes('{!portalDetail&&<BottomNav/>}')],
  ['Portal seçim ekranında Menü alt navigasyonu aktif kalır',bottomNav.includes("to==='/menu'&&location.pathname.startsWith('/portal-onizleme')")],
  ['Portal routeu headerda Portal Önizlemesi olarak tanımlıdır',header.includes("pathname.startsWith('/portal-onizleme')")&&header.includes("'PORTAL ÖNİZLEMESİ'")],
  ['Takvim Liste düğmesinden sonraki alan tarih ve Bu Hafta için eşit iki sütundur',layout.includes('grid-template-columns:auto minmax(0,1fr) minmax(0,1fr)')&&layout.includes('.calendar-week-range-long')&&layout.includes('width:100%')&&layout.includes('grid-template-columns:26px minmax(0,1fr) 26px')],
  ['Eşit hafta yerleşimi mobilde de korunur',layout.includes('grid-template-columns:80px minmax(0,1fr) minmax(0,1fr)')&&layout.includes('grid-template-columns:72px minmax(0,1fr) minmax(0,1fr)')],
  ['Yeni Program ve portal stilleri production girişinden yüklenir',main.includes("import './program-week-layout.css'")&&main.includes("import './portal-preview.css'")&&css.includes('.manager-mode-nav')&&css.includes('.portal-preview-shell')],
]

let failed=false
for(const [name,ok] of checks){
  console.log(`${ok?'✓':'✗'} ${name}`)
  if(!ok)failed=true
}
if(failed)process.exit(1)
console.log(`Yönetici portal önizleme kontrolleri geçti: ${checks.length}`)
