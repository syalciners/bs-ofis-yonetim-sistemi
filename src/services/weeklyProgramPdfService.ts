import { addDays, fullDate, time } from '../lib/format'
import type { AppData, Ders } from '../lib/types'
import { branchName, roomName, studentName, teacherName } from './metrics'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const NAVY='#14213d'
const BLUE='#2563eb'
const MUTED='#71809a'
const LINE='#dfe6f1'
const SOFT='#f7f9fc'
const BLUE_SOFT='#eaf1ff'
const GREEN='#17824f'
const GREEN_SOFT='#eaf8ef'
const RED='#b42334'
const RED_SOFT='#fff0f0'

const lessonPlace=(data:AppData,lesson:Ders)=>{
  const online=Boolean(lesson.zoom_katilim_baglantisi)||String(lesson.ders_yeri||'').toLocaleLowerCase('tr-TR').includes('online')||String(lesson.ders_turu||'').toLocaleLowerCase('tr-TR').includes('online')
  return online?'Online':roomName(data,lesson.derslik_id)
}

const pdfFilePart=(value:string)=>value
  .toLocaleLowerCase('tr-TR')
  .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')
  .slice(0,56)||'program'

const imageAsDataUrl=async(url:string)=>{
  try{
    const response=await fetch(url,{cache:'force-cache'})
    if(!response.ok)return null
    const blob=await response.blob()
    return await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader()
      reader.onload=()=>resolve(String(reader.result||''))
      reader.onerror=()=>reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }catch{return null}
}

const statusCell=(status?:string|null)=>{
  const value=status||'Planlandı'
  if(value==='Yapıldı')return{text:value,bold:true,color:GREEN,fillColor:GREEN_SOFT,alignment:'center',margin:[2,1.5,2,1.5]}
  if(value==='İptal')return{text:value,bold:true,color:RED,fillColor:RED_SOFT,alignment:'center',margin:[2,1.5,2,1.5]}
  return{text:value,bold:true,color:BLUE,fillColor:BLUE_SOFT,alignment:'center',margin:[2,1.5,2,1.5]}
}

export async function openWeeklyProgramPdf(data:AppData,lessons:Ders[],monday:string,sunday:string,programLabel='Tüm Program'){
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.ogretmen_id||'').localeCompare(String(b.ogretmen_id||'')))
  if(!sorted.length)throw new Error('Seçili programda PDF oluşturulacak ders yok.')

  const[pdfMakeImport,pdfFontsImport]=await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport
  const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport
  pdfMake.addVirtualFileSystem(pdfFonts)

  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())
  const activeDayCount=new Set(sorted.map(x=>x.tarih).filter(Boolean)).size
  const studentCount=new Set(sorted.map(x=>x.ogrenci_id).filter(Boolean)).size
  const teacherCount=new Set(sorted.map(x=>x.ogretmen_id).filter(Boolean)).size
  const plannedCount=sorted.filter(x=>(x.ders_durumu||'Planlandı')==='Planlandı').length
  const doneCount=sorted.filter(x=>x.ders_durumu==='Yapıldı').length
  const cancelledCount=sorted.filter(x=>x.ders_durumu==='İptal').length
  const dense=sorted.length>24
  const bodyFont=dense?6.2:6.8
  const rowY=dense?1.35:1.7
  const logoUrl=new URL(`${import.meta.env.BASE_URL}bs-egitim-icon-192-v2.png`,window.location.origin).href
  const logoData=await imageAsDataUrl(logoUrl)

  const tableBody:any[]=[[
    {text:'SAAT',style:'th'},
    {text:'ÖĞRENCİ',style:'th'},
    {text:'BRANŞ',style:'th'},
    {text:'ÖĞRETMEN',style:'th'},
    {text:'DERSLİK',style:'th'},
    {text:'DURUM',style:'th',alignment:'center'},
  ]]

  for(let index=0;index<7;index++){
    const date=addDays(monday,index)
    const items=sorted.filter(x=>x.tarih===date)
    if(!items.length)continue
    tableBody.push([
      {text:`${dayNames[index]}  ·  ${fullDate(date)}  ·  ${items.length} ders`,colSpan:6,bold:true,color:NAVY,fillColor:SOFT,fontSize:7.6,margin:[4,2.5,0,2.5]},
      {},{},{},{},{}
    ])
    items.forEach((lesson,rowIndex)=>{
      const stripe=rowIndex%2===1?'#fbfcfe':'#ffffff'
      const base={fontSize:bodyFont,fillColor:stripe,margin:[2,rowY,2,rowY]}
      tableBody.push([
        {...base,text:`${time(lesson.baslangic_saati)} – ${time(lesson.bitis_saati)}`,bold:true,color:NAVY,noWrap:true},
        {...base,text:studentName(data,lesson.ogrenci_id),bold:true,color:'#273650'},
        {...base,text:branchName(data,lesson.brans_id)},
        {...base,text:teacherName(data,lesson.ogretmen_id),color:'#44546d'},
        {...base,text:lessonPlace(data,lesson),color:'#5f6f84'},
        {...statusCell(lesson.ders_durumu),fontSize:bodyFont},
      ])
    })
  }

  const logoBlock=logoData
    ?{image:logoData,width:34,height:34,margin:[0,0,9,0]}
    :{text:'BS',width:34,alignment:'center',bold:true,fontSize:15,color:'#fff',background:NAVY,margin:[0,7,9,7]}

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'landscape',
    pageMargins:[22,18,22,22],
    info:{
      title:`BS Eğitim Yönetimi - ${programLabel} - Haftalık Ders Programı`,
      author:'BS Eğitim Yönetimi',
      subject:`${fullDate(monday)} - ${fullDate(sunday)} haftalık ders programı`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:7,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      columns:[
        {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Haftalık program belgesi'],alignment:'left'},
        {text:`${generatedAt}  ·  ${currentPage} / ${pageCount}`,alignment:'right'},
      ],
      margin:[22,5,22,0],fontSize:5.8,color:'#8794a7'
    }),
    content:[
      {
        columns:[
          {width:43,stack:[logoBlock]},
          {width:'*',stack:[
            {text:'BS EĞİTİM YÖNETİMİ',fontSize:8.4,bold:true,color:NAVY,characterSpacing:.8,margin:[0,1,0,2]},
            {text:'Haftalık Ders Programı',fontSize:18,bold:true,color:NAVY,margin:[0,0,0,2]},
            {text:programLabel,fontSize:10.5,bold:true,color:BLUE},
          ]},
          {width:250,stack:[
            {text:'PROGRAM DÖNEMİ',fontSize:6.2,bold:true,color:MUTED,characterSpacing:.7,alignment:'right'},
            {text:`${fullDate(monday)} — ${fullDate(sunday)}`,fontSize:9.2,bold:true,color:NAVY,alignment:'right',margin:[0,3,0,2]},
            {text:'Seçili takvim programı',fontSize:6.5,color:MUTED,alignment:'right'},
          ],margin:[0,3,0,0]},
        ],
        columnGap:4,
      },
      {canvas:[{type:'line',x1:0,y1:0,x2:795,y2:0,lineWidth:1.2,lineColor:BLUE}],margin:[0,8,0,8]},
      {
        table:{
          widths:['*','*','*','*'],
          body:[[
            {stack:[{text:'TOPLAM DERS',style:'metricLabel'},{text:String(sorted.length),style:'metricValue'}],margin:[6,4,6,4]},
            {stack:[{text:'AKTİF GÜN',style:'metricLabel'},{text:String(activeDayCount),style:'metricValue'}],margin:[6,4,6,4]},
            {stack:[{text:'ÖĞRENCİ',style:'metricLabel'},{text:String(studentCount),style:'metricValue'}],margin:[6,4,6,4]},
            {stack:[{text:'ÖĞRETMEN',style:'metricLabel'},{text:String(teacherCount),style:'metricValue'}],margin:[6,4,6,4]},
          ]]
        },
        layout:{
          hLineWidth:()=>.5,vLineWidth:()=>.5,
          hLineColor:()=>LINE,vLineColor:()=>LINE,
        },
        margin:[0,0,0,5],
      },
      {
        columns:[
          {text:[{text:'● ',color:BLUE},{text:`Planlandı ${plannedCount}`,color:'#66768d'}]},
          {text:[{text:'● ',color:GREEN},{text:`Yapıldı ${doneCount}`,color:'#66768d'}]},
          {text:[{text:'● ',color:RED},{text:`İptal ${cancelledCount}`,color:'#66768d'}]},
          {text:`Oluşturma: ${generatedAt}`,alignment:'right',color:'#8794a7'},
        ],
        fontSize:6.2,
        margin:[1,0,1,5],
      },
      {
        table:{headerRows:1,widths:[82,162,132,162,132,108],body:tableBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i===0||i===1)?0.7:0.35,
          vLineWidth:()=>0,
          hLineColor:()=>LINE,
          paddingLeft:()=>3,
          paddingRight:()=>3,
          paddingTop:()=>0,
          paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      th:{fontSize:5.8,bold:true,color:'#71809a',fillColor:'#ffffff',characterSpacing:.65,margin:[2,2.2,2,2.2]},
      metricLabel:{fontSize:5.6,bold:true,color:'#8390a4',characterSpacing:.65},
      metricValue:{fontSize:11.5,bold:true,color:NAVY,margin:[0,2,0,0]},
    },
  }

  const filename=`BS-Egitim-Yonetimi-${pdfFilePart(programLabel)}-${monday}.pdf`
  await pdfMake.createPdf(docDefinition).download(filename)
  return true
}
