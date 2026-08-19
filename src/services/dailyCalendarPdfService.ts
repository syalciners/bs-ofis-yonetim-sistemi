import { fullDate, time } from '../lib/format'
import { calendarRoomColumns } from '../lib/calendarRooms'
import type { AppData, Ders } from '../lib/types'
import { branchName, studentName, teacherName } from './metrics'

const NAVY='#0a2852'
const NAVY_DARK='#071b36'
const BLUE='#0d7ff2'
const CYAN='#20a8df'
const MUTED='#71809a'
const LINE='#dbe4ef'
const LINE_DARK='#c8d5e5'
const SOFT='#f6f9fd'
const BLUE_SOFT='#eef6ff'
const GREEN='#15915a'
const GREEN_SOFT='#edf9f2'
const SLOT_MINUTES=30

const minutesFromTime=(value?:string|null)=>{
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/)
  if(!match)return null
  return Number(match[1])*60+Number(match[2])
}

const minutesToTime=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`

const lessonEnd=(lesson:Ders,start:number)=>minutesFromTime(lesson.bitis_saati)??start+Math.max(Number(lesson.ders_sayisi||1),1)*60

const imageElementAsDataUrl=(image:HTMLImageElement)=>{
  if(!image.complete||!image.naturalWidth||!image.naturalHeight)throw new Error('Logo görseli henüz yüklenmedi.')
  const canvas=document.createElement('canvas')
  canvas.width=image.naturalWidth
  canvas.height=image.naturalHeight
  const context=canvas.getContext('2d')
  if(!context)throw new Error('Logo görseli işlenemedi.')
  context.drawImage(image,0,0)
  return canvas.toDataURL('image/png')
}

const loadLogo=async()=>{
  const fileNames=['bs-egitim-icon-512-v2.png','bs-egitim-icon-192-v2.png']
  const existing=Array.from(document.images).find(image=>fileNames.some(name=>image.src.includes(name))&&image.complete&&image.naturalWidth>0)
  if(existing){
    try{return imageElementAsDataUrl(existing)}catch{/* dosyadan yeniden dene */}
  }
  for(const fileName of fileNames){
    const url=new URL(`${import.meta.env.BASE_URL}${fileName}`,window.location.origin)
    url.searchParams.set('pdf','1')
    try{
      const dataUrl=await new Promise<string>((resolve,reject)=>{
        const image=new Image()
        image.decoding='async'
        image.onload=()=>{
          try{resolve(imageElementAsDataUrl(image))}catch(error){reject(error)}
        }
        image.onerror=()=>reject(new Error(`${fileName} yüklenemedi.`))
        image.src=url.href
      })
      if(dataUrl)return dataUrl
    }catch{/* sonraki resmi dene */}
  }
  throw new Error('BS Eğitim Yönetimi logosu yüklenemedi. PDF oluşturulmadı.')
}

const titleCase=(value:string)=>value?value.charAt(0).toLocaleUpperCase('tr-TR')+value.slice(1):value

export async function openDailyCalendarPdf(data:AppData,lessons:Ders[],date:string,rangeStart:number,rangeEnd:number){
  const sorted=[...lessons].sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.derslik_id||'').localeCompare(String(b.derslik_id||'')))
  if(!sorted.length)throw new Error('Seçili günde PDF oluşturulacak ders yok.')

  const roomColumns=calendarRoomColumns(data.derslikler,sorted.map(x=>x.derslik_id))
  if(!roomColumns.length)throw new Error('Takvim PDF’i için derslik bulunamadı.')

  const[pdfMakeImport,pdfFontsImport]=await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport
  const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport
  pdfMake.addVirtualFileSystem(pdfFonts)
  const logoData=await loadLogo()

  const safeStart=Math.floor(rangeStart/SLOT_MINUTES)*SLOT_MINUTES
  const safeEnd=Math.ceil(rangeEnd/SLOT_MINUTES)*SLOT_MINUTES
  const slotCount=Math.max(1,Math.ceil((safeEnd-safeStart)/SLOT_MINUTES))
  const slots=Array.from({length:slotCount},(_,index)=>safeStart+index*SLOT_MINUTES)
  const cellMap=new Map<string,Ders[]>()

  sorted.forEach(lesson=>{
    const start=minutesFromTime(lesson.baslangic_saati)
    if(start==null)return
    const slotIndex=Math.max(0,Math.min(slotCount-1,Math.floor((start-safeStart)/SLOT_MINUTES)))
    const key=`${lesson.derslik_id||''}:${slotIndex}`
    const list=cellMap.get(key)||[]
    list.push(lesson)
    cellMap.set(key,list)
  })

  const compact=roomColumns.length>=6
  const cellFont=compact?5.05:5.55
  const studentFont=compact?5.5:6.15
  const tableBody:any[]=[[
    {text:'SAAT',style:'th',alignment:'center'},
    ...roomColumns.map(column=>({text:column.label.toLocaleUpperCase('tr-TR'),style:'th',alignment:'center'})),
  ]]

  slots.forEach((minute,slotIndex)=>{
    tableBody.push([
      {text:minutesToTime(minute),bold:minute%60===0,color:minute%60===0?NAVY:MUTED,fontSize:minute%60===0?6.3:5.5,alignment:'center',margin:[1,4,1,3],fillColor:minute%60===0?'#f5f8fc':'#fbfcfe'},
      ...roomColumns.map(column=>{
        const items=cellMap.get(`${column.id}:${slotIndex}`)||[]
        if(!items.length)return{text:'',fillColor:minute%60===0?'#ffffff':'#fcfdff',margin:[1,4,1,3]}
        const stack:any[]=[]
        items.forEach((lesson,index)=>{
          const start=minutesFromTime(lesson.baslangic_saati)??minute
          const end=lessonEnd(lesson,start)
          if(index>0)stack.push({canvas:[{type:'line',x1:0,y1:0,x2:86,y2:0,lineWidth:.35,lineColor:LINE_DARK}],margin:[0,2,0,2]})
          stack.push(
            {text:`${time(lesson.baslangic_saati)}–${time(lesson.bitis_saati)||minutesToTime(end)}`,fontSize:cellFont,bold:true,color:BLUE,margin:[0,0,0,1]},
            {text:studentName(data,lesson.ogrenci_id),fontSize:studentFont,bold:true,color:NAVY_DARK,margin:[0,0,0,.8]},
            {text:branchName(data,lesson.brans_id),fontSize:cellFont,bold:true,color:'#405875',margin:[0,0,0,.6]},
            {text:teacherName(data,lesson.ogretmen_id),fontSize:cellFont,color:MUTED},
          )
        })
        const done=items.every(x=>x.ders_durumu==='Yapıldı')
        return{stack,fillColor:done?GREEN_SOFT:BLUE_SOFT,margin:[2.5,2.5,2.5,2.5]}
      }),
    ])
  })

  const lessonHours=sorted.reduce((sum,lesson)=>sum+Number(lesson.ders_sayisi||1),0)
  const dayName=titleCase(new Intl.DateTimeFormat('tr-TR',{weekday:'long',timeZone:'Europe/Istanbul'}).format(new Date(`${date}T12:00:00+03:00`)))
  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'landscape',
    pageMargins:[24,20,24,25],
    info:{
      title:`BS Eğitim Yönetimi - ${dayName} ${fullDate(date)} - Günlük Takvim`,
      author:'BS Eğitim Yönetimi',
      subject:`${dayName} ${fullDate(date)} günlük derslik takvimi`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:5.6,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      columns:[
        {text:`BS Eğitim Yönetimi · Günlük Takvim · Oluşturma: ${generatedAt}`,alignment:'left'},
        {text:`${currentPage} / ${pageCount}`,alignment:'right'},
      ],margin:[24,5,24,0],fontSize:5.2,color:'#8390a4'
    }),
    content:[
      {
        columns:[
          {width:46,image:logoData,fit:[46,46]},
          {width:'*',stack:[
            {text:'BS Eğitim Yönetimi',fontSize:13.5,bold:true,color:NAVY_DARK,margin:[8,4,0,0]},
            {text:'GÜNLÜK TAKVİM',fontSize:6.1,bold:true,color:BLUE,characterSpacing:1.1,margin:[8,3,0,0]},
          ]},
          {width:290,stack:[
            {text:`${dayName} · ${fullDate(date)}`,fontSize:12.2,bold:true,color:NAVY_DARK,alignment:'right',margin:[0,4,0,0]},
            {text:`${sorted.length} ders · ${lessonHours} ders saati · ${minutesToTime(safeStart)}–${minutesToTime(safeEnd)}`,fontSize:6.4,color:MUTED,alignment:'right',margin:[0,4,0,0]},
          ]},
        ],
        columnGap:8,
      },
      {canvas:[{type:'line',x1:0,y1:0,x2:793,y2:0,lineWidth:.7,lineColor:LINE_DARK},{type:'line',x1:0,y1:0,x2:120,y2:0,lineWidth:2.4,lineColor:CYAN}],margin:[0,7,0,8]},
      {
        table:{
          headerRows:1,
          widths:[42,...roomColumns.map(()=>'*')],
          body:tableBody,
          dontBreakRows:true,
        },
        layout:{
          hLineWidth:(i:number)=>i<=1?.65:.35,
          vLineWidth:(i:number)=>i===0||i===roomColumns.length+1?.55:.35,
          hLineColor:()=>LINE,
          vLineColor:()=>LINE,
          paddingLeft:()=>1.5,paddingRight:()=>1.5,paddingTop:()=>0,paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      th:{fontSize:5.65,bold:true,color:NAVY,fillColor:SOFT,characterSpacing:.35,margin:[2,4,2,4]},
    },
  }

  await pdfMake.createPdf(docDefinition).download(`BS-Egitim-Gunluk-Takvim-${date}.pdf`)
  return true
}
