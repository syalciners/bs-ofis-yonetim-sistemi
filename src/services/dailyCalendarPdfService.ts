import { addDays, fullDate, mondayOf, shortDate, time } from '../lib/format'
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
const GREEN_SOFT='#edf9f2'
const SLOT_MINUTES=30
const CALENDAR_HIDDEN_STATUSES=new Set(['İptal','Ertelendi','Öğretmen İptali'])

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
const dayName=(date:string)=>titleCase(new Intl.DateTimeFormat('tr-TR',{weekday:'long',timeZone:'Europe/Istanbul'}).format(new Date(`${date}T12:00:00+03:00`)))
const lessonSlot=(lesson:Ders)=>{
  const start=minutesFromTime(lesson.baslangic_saati)
  return start==null?null:Math.floor(start/SLOT_MINUTES)*SLOT_MINUTES
}

export async function openDailyCalendarPdf(data:AppData,lessons:Ders[],date:string,rangeStart:number,rangeEnd:number){
  void lessons
  void rangeStart
  void rangeEnd

  const monday=mondayOf(date)
  const sunday=addDays(monday,6)
  const sorted=data.dersler
    .filter(lesson=>lesson.tarih>=monday&&lesson.tarih<=sunday&&!CALENDAR_HIDDEN_STATUSES.has(String(lesson.ders_durumu||''))&&minutesFromTime(lesson.baslangic_saati)!=null)
    .sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.derslik_id||'').localeCompare(String(b.derslik_id||'')))
  if(!sorted.length)throw new Error('Seçilen haftada PDF oluşturulacak ders yok.')

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

  const cellMap=new Map<string,Ders[]>()
  sorted.forEach(lesson=>{
    const slot=lessonSlot(lesson)
    if(slot==null||!lesson.tarih)return
    const key=`${lesson.tarih}:${lesson.derslik_id||''}:${slot}`
    const list=cellMap.get(key)||[]
    list.push(lesson)
    cellMap.set(key,list)
  })

  const dayGroups=Array.from({length:7},(_,index)=>addDays(monday,index)).map(day=>{
    const dayLessons=sorted.filter(lesson=>lesson.tarih===day)
    const occupiedSlots=[...new Set(dayLessons.map(lessonSlot).filter((slot):slot is number=>slot!=null))].sort((a,b)=>a-b)
    return{day,dayLessons,occupiedSlots}
  }).filter(group=>group.occupiedSlots.length>0)

  const compact=roomColumns.length>=6
  const cellFont=compact?4.8:5.35
  const studentFont=compact?5.2:5.85
  const tableBody:any[]=[[
    {text:'GÜN',style:'th',alignment:'center'},
    {text:'SAAT',style:'th',alignment:'center'},
    ...roomColumns.map(column=>({text:column.label.toLocaleUpperCase('tr-TR'),style:'th',alignment:'center'})),
  ]]

  dayGroups.forEach(({day,occupiedSlots})=>{
    occupiedSlots.forEach((minute,slotIndex)=>{
      const firstSlot=slotIndex===0
      tableBody.push([
        {
          text:`${dayName(day)}\n${shortDate(day)}`,
          bold:firstSlot,
          color:firstSlot?NAVY:'#526177',
          fontSize:firstSlot?6.2:5.5,
          alignment:'center',
          margin:[2,4,2,3],
          fillColor:firstSlot?'#eef4fb':'#f8fafc',
        },
        {text:minutesToTime(minute),bold:true,color:NAVY,fontSize:6.1,alignment:'center',margin:[1,4,1,3],fillColor:'#f8fafc'},
        ...roomColumns.map(column=>{
          const items=cellMap.get(`${day}:${column.id}:${minute}`)||[]
          if(!items.length)return{text:'',fillColor:'#ffffff',margin:[1,4,1,3]}
          const stack:any[]=[]
          items.forEach((lesson,index)=>{
            const start=minutesFromTime(lesson.baslangic_saati)??minute
            const end=lessonEnd(lesson,start)
            if(index>0)stack.push({canvas:[{type:'line',x1:0,y1:0,x2:80,y2:0,lineWidth:.35,lineColor:LINE_DARK}],margin:[0,2,0,2]})
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
  })

  const lessonHours=sorted.reduce((sum,lesson)=>sum+Number(lesson.ders_sayisi||1),0)
  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())
  const weekLabel=`${fullDate(monday)} – ${fullDate(sunday)}`

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'landscape',
    pageMargins:[20,18,20,24],
    info:{
      title:`BS Eğitim Yönetimi - ${weekLabel} - Haftalık Takvim`,
      author:'BS Eğitim Yönetimi',
      subject:`${weekLabel} haftalık derslik takvimi`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:5.5,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      columns:[
        {text:`BS Eğitim Yönetimi · Haftalık Takvim · Oluşturma: ${generatedAt}`,alignment:'left'},
        {text:`${currentPage} / ${pageCount}`,alignment:'right'},
      ],margin:[20,5,20,0],fontSize:5.1,color:'#8390a4'
    }),
    content:[
      {
        columns:[
          {width:44,image:logoData,fit:[44,44]},
          {width:'*',stack:[
            {text:'BS Eğitim Yönetimi',fontSize:13.2,bold:true,color:NAVY_DARK,margin:[8,3,0,0]},
            {text:'HAFTALIK TAKVİM',fontSize:6.1,bold:true,color:BLUE,characterSpacing:1.1,margin:[8,3,0,0]},
          ]},
          {width:340,stack:[
            {text:weekLabel,fontSize:11.3,bold:true,color:NAVY_DARK,alignment:'right',margin:[0,3,0,0]},
            {text:`${sorted.length} ders · ${lessonHours} ders saati · ${dayGroups.length} aktif gün`,fontSize:6.3,color:MUTED,alignment:'right',margin:[0,4,0,0]},
          ]},
        ],
        columnGap:8,
      },
      {canvas:[{type:'line',x1:0,y1:0,x2:801,y2:0,lineWidth:.7,lineColor:LINE_DARK},{type:'line',x1:0,y1:0,x2:120,y2:0,lineWidth:2.4,lineColor:CYAN}],margin:[0,7,0,8]},
      {
        table:{
          headerRows:1,
          widths:[62,38,...roomColumns.map(()=>'*')],
          body:tableBody,
          dontBreakRows:true,
        },
        layout:{
          hLineWidth:(i:number)=>i<=1?.65:.35,
          vLineWidth:(i:number)=>i===0||i===roomColumns.length+2?.55:.35,
          hLineColor:()=>LINE,
          vLineColor:()=>LINE,
          paddingLeft:()=>1.4,paddingRight:()=>1.4,paddingTop:()=>0,paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      th:{fontSize:5.55,bold:true,color:NAVY,fillColor:SOFT,characterSpacing:.3,margin:[2,4,2,4]},
    },
  }

  await pdfMake.createPdf(docDefinition).download(`BS-Egitim-Haftalik-Takvim-${monday}.pdf`)
  return true
}