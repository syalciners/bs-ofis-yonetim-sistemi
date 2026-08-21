import { Check, Clock3, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Ders } from '../lib/types'
import { formatClockInput, todayISO } from '../lib/format'
import { t } from '../lib/productProfile'
import { lessonConflict, saveLesson, updateLesson } from '../services/officeService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

const CANCELLED_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])

const timeToMinutes=(value?:string|null)=>{
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/)
  if(!match)return null
  const hour=Number(match[1]),minute=Number(match[2])
  if(!Number.isFinite(hour)||!Number.isFinite(minute)||hour<0||hour>23||minute<0||minute>59)return null
  return hour*60+minute
}

const lessonRange=(lesson:Ders)=>{
  const start=timeToMinutes(lesson.baslangic_saati)
  if(start==null)return null
  const explicitEnd=timeToMinutes(lesson.bitis_saati)
  return{start,end:explicitEnd??start+Math.max(Number(lesson.ders_sayisi||1),1)*60}
}

const overlaps=(aStart:number,aEnd:number,bStart:number,bEnd:number)=>aStart<bEnd&&bStart<aEnd

const conflictMessage=(result:any)=>{
  const messages:string[]=[]
  if(result?.ogrenci_cakisma)messages.push(`${t.student} bu saat aralığında başka bir derste.`)
  if(result?.ogretmen_cakisma)messages.push(`${t.teacher} bu saat aralığında başka bir derste.`)
  if(result?.derslik_dolu)messages.push(`Seçilen ${t.room.toLocaleLowerCase('tr-TR')} bu saat aralığında dolu.`)
  const first=result?.ilk_cakisma
  const detail=first?` Çakışan ders: ${first.ogrenci||'—'} · ${first.ogretmen||'—'} · ${String(first.baslangic||'').slice(0,5)}–${String(first.bitis||'').slice(0,5)}.`:''
  return `${messages.join(' ')}${detail}`.trim()||result?.mesaj||'Bu tarih ve saatte çakışma var.'
}

type PremiumLessonFormProps={
  lesson?:Ders
  studentId?:string
  defaultDate?:string
  defaultStartTime?:string
  defaultRoomId?:string
  lockDateTime?:boolean
  onDone:()=>void
  onCancel:()=>void
}

export function PremiumLessonForm({lesson,studentId,defaultDate,defaultStartTime,defaultRoomId,lockDateTime=false,onDone,onCancel}:PremiumLessonFormProps){
  const{data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const[student,setStudent]=useState(lesson?.ogrenci_id||studentId||'')
  const[teacher,setTeacher]=useState(lesson?.ogretmen_id||'')
  const[branch,setBranch]=useState(lesson?.brans_id||'')
  const[room,setRoom]=useState(lesson?.derslik_id||defaultRoomId||'')
  const[date,setDate]=useState(lesson?.tarih||defaultDate||todayISO())
  const[startTime,setStartTime]=useState(String(lesson?.baslangic_saati||defaultStartTime||'').slice(0,5))
  const[units,setUnits]=useState(Number(lesson?.ders_sayisi||1))
  const[studentPrice,setStudentPrice]=useState(lesson?.ogrenci_birim_ucreti!=null?String(lesson.ogrenci_birim_ucreti):'')
  const[teacherPrice,setTeacherPrice]=useState(lesson?.ogretmen_birim_hakedisi!=null?String(lesson.ogretmen_birim_hakedisi):'')

  const branchOptions=useMemo(()=>{
    if(!data||!teacher)return[]
    const ids=new Set(data.ogretmenBranslari.filter(x=>x.ogretmen_id===teacher&&x.aktif!==false).map(x=>x.brans_id))
    return data.branslar.filter(x=>x.aktif!==false&&ids.has(x.brans_id))
  },[data,teacher])

  useEffect(()=>{
    if(!teacher){if(!lesson)setBranch('');return}
    if(branchOptions.length===1){if(branch!==branchOptions[0].brans_id)setBranch(branchOptions[0].brans_id);return}
    if(branch&&!branchOptions.some(x=>x.brans_id===branch))setBranch('')
  },[branchOptions,branch,teacher,lesson])

  useEffect(()=>{
    if(!data||lesson||!student||!teacher||!branch)return
    const program=data.sabitProgramlar.find(x=>x.ogrenci_id===student&&x.ogretmen_id===teacher&&x.brans_id===branch&&x.program_durumu!=='Pasif'&&x.aktif!==false)
    if(program){setStudentPrice(String(program.ogrenci_birim_ucreti??''));setTeacherPrice(String(program.ogretmen_birim_hakedisi??''))}
    else{setStudentPrice('');setTeacherPrice('')}
  },[data,lesson,student,teacher,branch])

  const proposedStart=timeToMinutes(startTime)
  const proposedEnd=proposedStart==null?null:proposedStart+Math.max(units,1)*60
  const scheduleReady=Boolean(date&&proposedStart!=null&&proposedEnd!=null)

  const overlappingLessons=useMemo(()=>{
    if(!data||!scheduleReady||proposedStart==null||proposedEnd==null)return[]
    return data.dersler.filter(x=>x.ders_id!==lesson?.ders_id&&x.tarih===date&&!CANCELLED_STATUSES.has(String(x.ders_durumu||''))).filter(x=>{
      const range=lessonRange(x);return range?overlaps(proposedStart,proposedEnd,range.start,range.end):false
    })
  },[data,scheduleReady,proposedStart,proposedEnd,lesson?.ders_id,date])

  const studentBusy=Boolean(student&&overlappingLessons.some(x=>x.ogrenci_id===student))
  const teacherBusy=Boolean(teacher&&overlappingLessons.some(x=>x.ogretmen_id===teacher))

  const availableRooms=useMemo(()=>{
    if(!data||!scheduleReady)return[]
    return data.derslikler.filter(x=>x.aktif!==false).filter(x=>{
      const capacity=Math.max(Number(x.kapasite||1),1)
      const occupied=overlappingLessons.filter(d=>d.derslik_id===x.derslik_id).length
      return occupied<capacity
    })
  },[data,scheduleReady,overlappingLessons])

  useEffect(()=>{
    if(room&&scheduleReady&&!availableRooms.some(x=>x.derslik_id===room))setRoom('')
  },[room,scheduleReady,availableRooms])

  if(!data)return null

  const lockedSlot=Boolean(!lesson&&lockDateTime&&defaultDate&&defaultStartTime)
  const selectedRoomName=data.derslikler.find(x=>x.derslik_id===room)?.mekan_adi||''
  const slotLabel=date&&startTime?`${new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} · ${startTime}${selectedRoomName?` · ${selectedRoomName}`:''}`:''
  const hasLegacyUnits=units>2
  const canSubmit=!busy&&Boolean(student&&teacher&&branch&&room&&date&&proposedStart!=null)&&!studentBusy&&!teacherBusy

  const chooseBranch=(id:string)=>setBranch(id)
  const chooseRoom=(id:string)=>setRoom(id)

  return <form className="form-grid premium-lesson-form" onSubmit={async e=>{
    e.preventDefault()
    if(!student){toast(`${t.student} seçin.`,'error');return}
    if(!teacher){toast(`${t.teacher} seçin.`,'error');return}
    if(!branch){toast(`${t.branch} seçin.`,'error');return}
    if(studentBusy){toast(`${t.student} bu saat aralığında başka bir derste.`,'error');return}
    if(teacherBusy){toast(`${t.teacher} bu saat aralığında başka bir derste.`,'error');return}
    if(!room){toast(scheduleReady?`Bu saat aralığında müsait bir ${t.room.toLocaleLowerCase('tr-TR')} seçin.`:'Tarih ve saati tamamlayın.','error');return}
    setBusy(true)
    const f=new FormData(e.currentTarget)
    const input={ders_id:lesson?.ders_id,tarih:String(f.get('tarih')),ogrenci_id:student,ogretmen_id:teacher,brans_id:branch,derslik_id:room,baslangic_saati:String(f.get('baslangic_saati')),ders_sayisi:units,ogrenci_birim_ucreti:Number(f.get('ogrenci_birim_ucreti')),ogretmen_birim_hakedisi:Number(f.get('ogretmen_birim_hakedisi')),aciklama:String(f.get('aciklama')||'')||null}
    try{
      const c:any=await lessonConflict({...input,haric_ders_id:lesson?.ders_id||null})
      if(!c?.uygun)throw new Error(conflictMessage(c))
      if(lesson)await updateLesson(input as any);else await saveLesson(input as any)
      await refresh();toast(lesson?'Ders güncellendi.':'Ders eklendi.');onDone()
    }catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}
  }}>
    {lockedSlot&&<div className="wide lesson-slot-lock"><span className="lesson-slot-icon"><Clock3 size={18}/></span><div><small>TAKVİMDEN SEÇİLEN ZAMAN</small><strong>{slotLabel}</strong></div><span className="lesson-slot-ready"><Check size={14}/>Hazır</span></div>}

    <label className="lesson-primary-field">{t.student}<select name="ogrenci_id" value={student} onChange={e=>setStudent(e.target.value)} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label className="lesson-primary-field">{t.teacher}<select name="ogretmen_id" value={teacher} onChange={e=>{setTeacher(e.target.value);setBranch('')}} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>

    <div className="wide lesson-choice-field"><span className="field-label">{t.branch}</span>{!teacher?<small className="lesson-choice-help">Önce {t.teacherLower} seçin.</small>:branchOptions.length?<div className="lesson-chip-row">{branchOptions.map(x=><button key={x.brans_id} type="button" className={`lesson-choice-chip ${branch===x.brans_id?'active':''}`} onClick={()=>chooseBranch(x.brans_id)}>{branch===x.brans_id&&<Check size={14}/>}<span>{x.brans_adi}</span></button>)}</div>:<div className="lesson-inline-alert danger">Bu {t.teacherLower} için aktif {t.branch.toLocaleLowerCase('tr-TR')} tanımlanmamış.</div>}<input type="hidden" name="brans_id" value={branch}/>{teacher&&branchOptions.length===1&&<small className="lesson-auto-note">Tek {t.branch.toLocaleLowerCase('tr-TR')} otomatik seçildi.</small>}</div>

    {!lockedSlot?<><label>Tarih<input name="tarih" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Saat<input name="baslangic_saati" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00" title="Saati 00:00–23:59 arasında girin." value={startTime} onChange={e=>setStartTime(formatClockInput(e.target.value))} required/></label></>:<><input type="hidden" name="tarih" value={date}/><input type="hidden" name="baslangic_saati" value={startTime}/></>}

    <div className="lesson-choice-field"><span className="field-label">Ders Sayısı</span><div className="lesson-chip-row compact">{[1,2].map(x=><button key={x} type="button" className={`lesson-unit-chip ${units===x?'active':''}`} onClick={()=>setUnits(x)}><strong>{x}</strong><span>Ders</span></button>)}</div><input type="hidden" name="ders_sayisi" value={units}/>{hasLegacyUnits&&<small className="lesson-auto-note warning">Mevcut kayıtta {units} ders birimi var. Değiştirmek için 1 veya 2 seçin.</small>}</div>

    <div className="wide lesson-choice-field"><div className="lesson-field-heading"><span className="field-label">Müsait {t.room}</span>{scheduleReady&&<small>{availableRooms.length} uygun</small>}</div>{!scheduleReady?<small className="lesson-choice-help">Tarih ve saat belirlenince uygun mekanlar burada görünür.</small>:availableRooms.length?<div className="lesson-chip-row room-row">{availableRooms.map(x=>{const capacity=Math.max(Number(x.kapasite||1),1);const occupied=overlappingLessons.filter(d=>d.derslik_id===x.derslik_id).length;return <button key={x.derslik_id} type="button" className={`lesson-choice-chip room ${room===x.derslik_id?'active':''}`} onClick={()=>chooseRoom(x.derslik_id)}><MapPin size={14}/><span>{x.mekan_adi}</span><small>{capacity-occupied} yer</small></button>})}</div>:<div className="lesson-inline-alert danger">Bu saat aralığında müsait mekan yok.</div>}<input type="hidden" name="derslik_id" value={room}/></div>

    {(studentBusy||teacherBusy)&&<div className="wide lesson-conflict-alert">{studentBusy&&<span><b>{t.student} dolu</b> — bu saat aralığında başka bir dersi var.</span>}{teacherBusy&&<span><b>{t.teacher} dolu</b> — bu saat aralığında başka bir dersi var.</span>}<small>Kayıt bu çakışmalar giderilmeden yapılamaz.</small></div>}

    <label>{t.student} Birim Ücreti<input name="ogrenci_birim_ucreti" type="number" min="0" step="0.01" inputMode="decimal" value={studentPrice} onChange={e=>setStudentPrice(e.target.value)} required/></label>
    <label>{t.teacher} Birim Hakedişi<input name="ogretmen_birim_hakedisi" type="number" min="0" step="0.01" inputMode="decimal" value={teacherPrice} onChange={e=>setTeacherPrice(e.target.value)} required/></label>
    {!lesson&&student&&teacher&&branch&&studentPrice!==''&&<div className="wide form-summary lesson-price-note">Ücret ve hakediş mevcut sabit programdan otomatik getirildi. Bu derse özel değiştirebilirsin.</div>}
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={lesson?.aciklama||''} placeholder="İsteğe bağlı not"/></label>
    <div className="wide lesson-security-note"><Check size={15}/><span>Kaydetmeden önce {t.studentLower}, {t.teacherLower} ve mekan çakışması sunucuda tekrar doğrulanır.</span></div>
    <div className="wide form-actions lesson-form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={!canSubmit}>{busy?'Kaydediliyor…':lesson?'Dersi Güncelle':'Ders Ekle'}</button></div>
  </form>
}
