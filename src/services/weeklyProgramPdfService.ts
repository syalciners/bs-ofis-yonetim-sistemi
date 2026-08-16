import { addDays, fullDate, time } from '../lib/format'
import type { AppData, Ders } from '../lib/types'
import { branchName, roomName, studentName, teacherName } from './metrics'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const NAVY='#072243'
const BLUE='#0875b9'
const CYAN='#16a7d8'
const SILVER='#aeb7c3'
const MUTED='#71809a'
const LINE='#dce3ec'
const SOFT='#f7f9fc'
const BLUE_SOFT='#edf6fc'
const GREEN='#17824f'
const GREEN_SOFT='#eef8f2'
const RED='#b42334'
const RED_SOFT='#fff3f4'

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
  if(value==='Yapıldı')return{text:value,bold:true,color:GREEN,fillColor:GREEN_SOFT,alignment:'center',margin:[2,1.4,2,1.4]}
  if(value==='İptal')return{text:value,bold:true,color:RED,fillColor:RED_SOFT,alignment:'center',margin:[2,1.4,2,1.4]}
  return{text:value,bold:true,color:BLUE,fillColor:BLUE_SOFT,alignment:'center',margin:[2,1.4,2,1.4]}
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
  const dense=sorted.length>28
  const bodyFont=dense?5.8:6.35
  const rowY=dense?1.0:1.35
  const logoUrl=new URL(`${import.meta.env.BASE_URL}bs-egitim-yatay-logo.jpg`,window.location.origin).href
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
      {
        text:[
          {text:dayNames[index].toLocaleUpperCase('tr-TR'),bold:true,color:NAVY},
          {text:`   ${fullDate(date)}   `,color:MUTED},
          {text:`${items.length} ders`,bold:true,color:BLUE},
        ],
        colSpan:6,fillColor:SOFT,fontSize:6.8,margin:[4,2.3,0,2.3]
      },
      {},{},{},{},{}
    ])
    items.forEach((lesson,rowIndex)=>{
      const stripe=rowIndex%2===1?'#fbfcfe':'#ffffff'
      const base={fontSize:bodyFont,fillColor:stripe,margin:[2,rowY,2,rowY]}
      tableBody.push([
        {...base,text:`${time(lesson.baslangic_saati)} – ${time(lesson.bitis_saati)}`,bold:true,color:NAVY,noWrap:true},
        {...base,text:studentName(data,lesson.ogrenci_id),bold:true,color:'#273650'},
        {...base,text:branchName(data,lesson.brans_id)},
        {...base,text:teacherName(data,lesson.ogretmen_id),color:'#40516b'},
        {...base,text:lessonPlace(data,lesson),color:'#5f6f84'},
        {...statusCell(lesson.ders_durumu),fontSize:bodyFont},
      ])
    })
  }

  const brandBlock=logoData
    ?{image:logoData,width:158,margin:[0,0,0,0]}
    :{stack:[
      {text:'BS EĞİTİM',fontSize:15,bold:true,color:BLUE},
      {text:'YÖNETİMİ',fontSize:8.5,color:MUTED,characterSpacing:2},
    ]}

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'portrait',
    pageMargins:[28,24,28,30],
    info:{
      title:`BS Eğitim Yönetimi - ${programLabel} - Haftalık Ders Programı`,
      author:'BS Eğitim Yönetimi',
      subject:`${fullDate(monday)} - ${fullDate(sunday)} haftalık ders programı`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:6.35,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      columns:[
        {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Eğitimi yönet, geleceği şekillendir.'],alignment:'left'},
        {text:`${currentPage} / ${pageCount}`,alignment:'right'},
      ],
      margin:[28,7,28,0],fontSize:5.5,color:'#8a97a8'
    }),
    content:[
      {
        columns:[
          {width:175,stack:[brandBlock]},
          {width:'*',stack:[
            {text:'HAFTALIK PROGRAM',fontSize:6.4,bold:true,color:BLUE,characterSpacing:1.15,alignment:'right',margin:[0,5,0,3]},
            {text:`${fullDate(monday)} — ${fullDate(sunday)}`,fontSize:8.1,bold:true,color:NAVY,alignment:'right'},
            {text:`${sorted.length} ders · ${activeDayCount} aktif gün`,fontSize:6,color:MUTED,alignment:'right',margin:[0,3,0,0]},
          ]},
        ],
        columnGap:12,
      },
      {
        canvas:[
          {type:'line',x1:0,y1:0,x2:80,y2:0,lineWidth:2.2,lineColor:CYAN},
          {type:'line',x1:80,y1:0,x2:539,y2:0,lineWidth:.65,lineColor:SILVER},
        ],
        margin:[0,8,0,10]
      },
      {text:'SEÇİLİ PROGRAM',fontSize:5.8,bold:true,color:MUTED,characterSpacing:1.1,margin:[0,0,0,3]},
      {text:programLabel,fontSize:17,bold:true,color:NAVY,margin:[0,0,0,2]},
      {text:'Haftalık Ders Programı',fontSize:8,color:BLUE,margin:[0,0,0,9]},
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
          hLineWidth:()=>.55,vLineWidth:()=>.55,
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
        fontSize:5.8,
        margin:[1,0,1,6],
      },
      {
        table:{headerRows:1,widths:[58,108,92,108,92,72],body:tableBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i===0||i===1)?0.7:0.35,
          vLineWidth:()=>0,
          hLineColor:()=>LINE,
          paddingLeft:()=>2.4,
          paddingRight:()=>2.4,
          paddingTop:()=>0,
          paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      th:{fontSize:5.15,bold:true,color:'#71809a',fillColor:'#ffffff',characterSpacing:.55,margin:[2,2,2,2]},
      metricLabel:{fontSize:5.1,bold:true,color:'#8390a4',characterSpacing:.55},
      metricValue:{fontSize:10.8,bold:true,color:NAVY,margin:[0,2,0,0]},
    },
  }

  const filename=`BS-Egitim-Yonetimi-${pdfFilePart(programLabel)}-${monday}.pdf`
  await pdfMake.createPdf(docDefinition).download(filename)
  return true
}
