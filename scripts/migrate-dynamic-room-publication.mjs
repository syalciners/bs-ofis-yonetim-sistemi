import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const WORKING_FORM_COMMIT='ebde84a6ed5d1c01e9adb5a6d81527863346f1c3'
const replaceOnce=(source,from,to,label)=>{
  const count=source.split(from).length-1
  if(count!==1)throw new Error(`${label}: beklenen 1 eşleşme yerine ${count} eşleşme bulundu.`)
  return source.replace(from,to)
}

{
  const path='scripts/check-calendar-ux.mjs'
  let src=readFileSync(path,'utf8')
  const old="  ['Sabit Program Takvimi beş gerçek derslik sütununu içerir',['LOC-002','LOC-001','LOC-003','LOC-005','LOC-004'].every(id=>fixed.includes(`id:'${id}'`))],"
  const next="  ['Sabit Program Takvimi derslik sütunlarını veri kaynağından oluşturur',fixed.includes(\"import { calendarRoomColumns } from '../lib/calendarRooms'\")&&fixed.includes('calendarRoomColumns(data.derslikler,selectedPrograms.map(x=>x.derslik_id))')&&!fixed.includes('const ROOM_COLUMNS=')],"
  src=replaceOnce(src,old,next,'Eski beş derslik Takvim UX kuralı')
  writeFileSync(path,src)
}

{
  const path='src/components/PremiumLessonForm.tsx'
  let src=execFileSync('git',['show',`${WORKING_FORM_COMMIT}:${path}`],{encoding:'utf8'})
  src=replaceOnce(src,"  const{data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)","  const{data,refresh,institution}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)",'Kurum program ayarı erişimi')
  src=replaceOnce(src,"  const[units,setUnits]=useState(Number(lesson?.ders_sayisi||1))","  const[units,setUnits]=useState(Number(lesson?.ders_sayisi || institution?.varsayilan_ders_birimi || 1))",'Yeni ders varsayılan ders birimi')
  src=replaceOnce(src,"    if(program){setStudentPrice(String(program.ogrenci_birim_ucreti??''));setTeacherPrice(String(program.ogretmen_birim_hakedisi??''))}\n    else{setStudentPrice('');setTeacherPrice('')}\n  },[data,lesson,student,teacher,branch])","    if(program){setStudentPrice(String(program.ogrenci_birim_ucreti??''));setTeacherPrice(String(program.ogretmen_birim_hakedisi??''));setUnits(Number(program.ders_sayisi||institution?.varsayilan_ders_birimi||1))}\n    else{setStudentPrice('');setTeacherPrice('');setUnits(Number(institution?.varsayilan_ders_birimi||1))}\n  },[data,lesson,student,teacher,branch,institution?.varsayilan_ders_birimi])",'Sabit program ders birimi önceliği')
  src=replaceOnce(src,"  const proposedEnd=proposedStart==null?null:proposedStart+Math.max(units,1)*60","  const proposedEnd=proposedStart==null?null:proposedStart+Math.max(1, Number(units || 1)) * 60",'60 dakikalık ders birimi standardı')
  writeFileSync(path,src)
}

{
  const path='src/pages/SettingsPage.tsx'
  let src=readFileSync(path,'utf8')
  src=replaceOnce(src,"import { ProfileSettingsForm } from '../components/ProfileSettingsForm'","import { ProfileSettingsForm } from '../components/ProfileSettingsForm'\nimport { ProgramSettingsPanel } from '../components/ProgramSettingsPanel'",'Program Ayarları panel importu')
  src=replaceOnce(src,"const sheetSubtitle=info==='kurum'?'Kurum bilgileri':info==='kullanicilar'?'Yönetim kullanıcıları':info==='egitim'?'Eğitim tanımları':info==='finans'?'Finans tanımları':'Yönetim ayarı'","const sheetSubtitle=info==='kurum'?'Kurum bilgileri':info==='kullanicilar'?'Yönetim kullanıcıları':info==='egitim'?'Eğitim tanımları':info==='finans'?'Finans tanımları':info==='program'?'Program varsayılanları':'Yönetim ayarı'",'Program Ayarları Sheet alt başlığı')
  src=replaceOnce(src,"info==='finans'?<FinancialDefinitionsPanel accounts={data?.kasaHesaplari||[]} categories={data?.giderKategorileri||[]} movements={data?.kasaHareketleri||[]} onUpdated={refresh}/>:<div className=\"settings-info-sheet\">","info==='finans'?<FinancialDefinitionsPanel accounts={data?.kasaHesaplari||[]} categories={data?.giderKategorileri||[]} movements={data?.kasaHareketleri||[]} onUpdated={refresh}/>:info==='program'?<ProgramSettingsPanel settings={institution||DEFAULT_KURUM_AYARLARI} onUpdated={refresh}/>:<div className=\"settings-info-sheet\">",'Program Ayarları panel bağlantısı')
  writeFileSync(path,src)
}

{
  const path='.github/workflows/ci.yml'
  let src=readFileSync(path,'utf8')
  const block="      - name: Takvim yayın uyumluluğunu uygula\n        run: |\n          git fetch --depth=1 origin ebde84a6ed5d1c01e9adb5a6d81527863346f1c3\n          node scripts/migrate-dynamic-room-publication.mjs\n"
  src=replaceOnce(src,block,'','Geçici CI migrasyon adımı')
  writeFileSync(path,src)
}

unlinkSync('scripts/migrate-dynamic-room-publication.mjs')
console.log('Çalışan ders formu ve dinamik Takvim yayın uyumluluğu uygulandı; geçici migrasyon temizlendi.')
