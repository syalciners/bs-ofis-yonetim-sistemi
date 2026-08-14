export type ReportFilenameType='kurum'|'ogrenci'|'ogretmen'

const trDate=(iso:string)=>{
  const[y,m,d]=iso.split('-')
  return `${d}.${m}.${y}`
}

const safePart=(value:string)=>value
  .trim()
  .replace(/[\\/:*?"<>|]+/g,' ')
  .replace(/\s+/g,'_')
  .replace(/_+/g,'_')
  .replace(/^_|_$/g,'')

const periodMonth=(startDate?:string|null)=>{
  if(!startDate)return''
  const label=new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric'}).format(new Date(`${startDate}T12:00:00`))
  return label.charAt(0).toLocaleUpperCase('tr-TR')+label.slice(1)
}

export function reportFilename(input:{
  type:ReportFilenameType
  today:string
  studentName?:string|null
  teacherName?:string|null
  periodStart?:string|null
}){
  const date=trDate(input.today)
  if(input.type==='kurum')return `Kurum_Yönetim_Ekstresi_${date}`
  if(input.type==='ogrenci')return input.studentName?`${safePart(input.studentName)}_${date}`:`Öğrenci_Ekstresi_${date}`
  const teacher=input.teacherName?safePart(input.teacherName):'Öğretmen'
  const period=periodMonth(input.periodStart)
  return period?`${teacher}_${safePart(period)}_Hakedişi`:`${teacher}_Hakedişi_${date}`
}
