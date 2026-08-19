import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

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
  const path='scripts/check-cancelled-calendar.mjs'
  let src=readFileSync(path,'utf8')
  const old="if(!premium.includes(\"!CANCELLED_STATUSES.has(String(x.ders_durumu||''))\")) failures.push('Ders Ekle formu iptal edilen dersleri yerel uygunluk hesabından dışlamıyor.')"
  const next="if(!premium.includes('validateAndSaveLesson')) failures.push('Ders Ekle formu merkezi ders doğrulama servisini kullanmıyor.')"
  src=replaceOnce(src,old,next,'Eski yerel uygunluk iptal kuralı')
  writeFileSync(path,src)
}

{
  const path='src/components/PremiumLessonForm.tsx'
  let src=readFileSync(path,'utf8')
  src=replaceOnce(src,
`  initialDate,
  initialTime,
  studentPreset,`,
`  initialDate,
  initialTime,
  defaultDate,
  defaultStartTime,
  defaultRoomId,
  lockDateTime = false,
  studentPreset,`,'PremiumLessonForm parametreleri')
  src=replaceOnce(src,
`  initialDate?: string
  initialTime?: string
  studentPreset?: StudentPreset`,
`  initialDate?: string
  initialTime?: string
  defaultDate?: string
  defaultStartTime?: string
  defaultRoomId?: string
  lockDateTime?: boolean
  studentPreset?: StudentPreset`,'PremiumLessonForm prop tipleri')
  src=replaceOnce(src,"  const [date, setDate] = useState(lesson?.tarih || initialDate || today)","  const [date, setDate] = useState(lesson?.tarih || initialDate || defaultDate || today)",'Takvim tarihi varsayılanı')
  src=replaceOnce(src,"  const [time, setTime] = useState(fmtTime(lesson?.baslangic_saati) || initialTime || '09:00')","  const [time, setTime] = useState(fmtTime(lesson?.baslangic_saati) || initialTime || defaultStartTime || '09:00')",'Takvim saati varsayılanı')
  src=replaceOnce(src,"  const [roomId, setRoomId] = useState(lesson?.derslik_id || '')","  const [roomId, setRoomId] = useState(lesson?.derslik_id || defaultRoomId || '')",'Takvim dersliği varsayılanı')
  src=replaceOnce(src,"      if (only.derslik_id && !isOnlineLesson) setRoomId(only.derslik_id)","      if (only.derslik_id && !isOnlineLesson && !defaultRoomId) setRoomId(only.derslik_id)",'Takvim dersliğini sabit program başlangıcından koruma')
  src=replaceOnce(src,"  }, [studentId, studentAssignments, lesson?.ders_id, isOnlineLesson])","  }, [studentId, studentAssignments, lesson?.ders_id, isOnlineLesson, defaultRoomId])",'Takvim dersliği effect bağımlılığı')
  src=replaceOnce(src,'<input type="date" value={date} onChange={event => setDate(event.target.value)} required />','<input type="date" value={date} onChange={event => setDate(event.target.value)} disabled={lockDateTime} required />','Takvim tarihi kilidi')
  src=replaceOnce(src,'<div className="premium-input-icon"><Clock3 size={15}/><input type="time" value={time} onChange={event => setTime(event.target.value)} required /></div>','<div className="premium-input-icon"><Clock3 size={15}/><input type="time" value={time} onChange={event => setTime(event.target.value)} disabled={lockDateTime} required /></div>','Takvim saati kilidi')
  writeFileSync(path,src)
}

{
  const path='scripts/check-daily-room-calendar.mjs'
  let src=readFileSync(path,'utf8')
  const old="  ['Ders Ekle formu takvimden gelen dersliği varsayılan seçer',form.includes('defaultRoomId?:string')&&form.includes(\"lesson?.derslik_id||defaultRoomId||''\")],"
  const next=`  ['Ders Ekle formu takvimden gelen dersliği varsayılan seçer',form.includes('defaultRoomId?: string')&&form.includes("lesson?.derslik_id || defaultRoomId || ''")],\n  ['Takvimden gelen tarih ve saat formda kilitlenir',form.includes('defaultDate?: string')&&form.includes('defaultStartTime?: string')&&form.includes('lockDateTime?: boolean')&&(form.match(/disabled=\\{lockDateTime\\}/g)||[]).length>=2],\n  ['Takvimden gelen derslik sabit program başlangıcı tarafından ezilmez',form.includes('!isOnlineLesson && !defaultRoomId')&&form.includes('isOnlineLesson, defaultRoomId')],`
  src=replaceOnce(src,old,next,'Takvimden Ders Ekle regresyonu')
  writeFileSync(path,src)
}

{
  const path='.github/workflows/ci.yml'
  let src=readFileSync(path,'utf8')
  const block="      - name: Takvim yayın uyumluluğunu uygula\n        run: node scripts/migrate-dynamic-room-publication.mjs\n"
  src=replaceOnce(src,block,'','Geçici CI migrasyon adımı')
  writeFileSync(path,src)
}

unlinkSync('scripts/migrate-dynamic-room-publication.mjs')
console.log('Takvim yayın uyumluluğu uygulandı; geçici migrasyon dosyası temizlendi.')
