import { addDays, fullDate, time } from '../lib/format'
import type { AppData, Ders } from '../lib/types'
import { branchName, roomName, studentName, teacherName } from './metrics'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
const NAVY='#0a2852'
const NAVY_DARK='#071b36'
const BLUE='#0d7ff2'
const CYAN='#20a8df'
const MUTED='#71809a'
const LINE='#dbe4ef'
const LINE_DARK='#c8d5e5'
const SOFT='#f6f9fd'
const BLUE_SOFT='#eef6ff'
const CARD='#fbfdff'
const GREEN='#15915a'
const GREEN_SOFT='#edf9f2'
const RED='#d33147'
const RED_SOFT='#fff1f3'

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

const loadPublicImageAsDataUrl=async(fileNames:string[])=>{
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

const statusCell=(status?:string|null)=>{
  const value=status||'Planlandı'
  if(value==='Yapıldı')return{text:value,bold:true,color:GREEN,fillColor:GREEN_SOFT,alignment:'center',margin:[2,2.2,2,2.2]}
  if(value==='İptal')return{text:value,bold:true,color:RED,fillColor:RED_SOFT,alignment:'center',margin:[2,2.2,2,2.2]}
  return{text:value,bold:true,color:BLUE,fillColor:BLUE_SOFT,alignment:'center',margin:[2,2.2,2,2.2]}
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
  const bodyFont=dense?5.8:6.65
  const rowY=dense?1.25:2.55

  // PDF, public klasöründeki mevcut BS Eğitim ikon ailesini kullanır.
  // Logo yüklenemezse logosuz belge üretmek yerine işlem durdurulur.
  const logoData=await loadPublicImageAsDataUrl(['bs-egitim-icon-512-v2.png','bs-egitim-icon-192-v2.png'])

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
        columns:[
          {width:'auto',canvas:[{type:'rect',x:0,y:1.2,w:3.2,h:8.6,r:1.4,color:BLUE}],margin:[0,0,6,0]},
          {width:'auto',text:dayNames[index].toLocaleUpperCase('tr-TR'),bold:true,color:NAVY,fontSize:7.25},
          {width:'auto',text:fullDate(date),color:MUTED,fontSize:6.5,margin:[7,.3,0,0]},
          {width:'*',text:`${items.length} ders`,bold:true,color:BLUE,fontSize:6.6,alignment:'right',margin:[0,.2,1,0]},
        ],
        colSpan:6,fillColor:SOFT,margin:[4,3.2,4,3.2]
      },
      {},{},{},{},{}
    ])
    items.forEach((lesson,rowIndex)=>{
      const stripe=rowIndex%2===1?'#fbfdff':'#ffffff'
      const base={fontSize:bodyFont,fillColor:stripe,margin:[2,rowY,2,rowY]}
      tableBody.push([
        {...base,text:`${time(lesson.baslangic_saati)} – ${time(lesson.bitis_saati)}`,bold:true,color:NAVY,noWrap:true},
        {...base,text:studentName(data,lesson.ogrenci_id),bold:true,color:'#233753'},
        {...base,text:branchName(data,lesson.brans_id),color:'#344967'},
        {...base,text:teacherName(data,lesson.ogretmen_id),color:'#334a68'},
        {...base,text:lessonPlace(data,lesson),color:'#617087'},
        {...statusCell(lesson.ders_durumu),fontSize:bodyFont},
      ])
    })
  }

  const metricCell=(label:string,value:number,accent:string)=>({
    table:{
      widths:[4,'*'],
      body:[[
        {text:'',fillColor:accent,border:[false,false,false,false],margin:[0,0,0,0]},
        {stack:[
          {text:label,fontSize:5.1,bold:true,color:'#7a8799',characterSpacing:.55},
          {text:String(value),fontSize:13.2,bold:true,color:NAVY_DARK,margin:[0,2,0,0]},
        ],fillColor:CARD,border:[false,false,false,false],margin:[7,4.6,5,4.6]},
      ]]
    },
    layout:'noBorders',
  })

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'portrait',
    pageMargins:[28,24,28,31],
    info:{
      title:`BS Eğitim Yönetimi - ${programLabel} - Haftalık Ders Programı`,
      author:'BS Eğitim Yönetimi',
      subject:`${fullDate(monday)} - ${fullDate(sunday)} haftalık ders programı`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:6.4,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      stack:[
        {canvas:[{type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.55,lineColor:LINE_DARK}],margin:[28,0,28,5]},
        {columns:[
          {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Haftalık Ders Programı'],alignment:'left'},
          {text:`${currentPage} / ${pageCount}`,alignment:'right'},
        ],margin:[28,0,28,0],fontSize:5.4,color:'#8390a4'}
      ]
    }),
    content:[
      {
        columns:[
          {
            width:255,
            columns:[
              {width:58,image:logoData,fit:[58,58],margin:[0,0,0,0]},
              {width:'*',stack:[
                {text:'BS EĞİTİM',fontSize:15.5,bold:true,color:NAVY_DARK,characterSpacing:.35,margin:[0,8,0,0]},
                {text:'YÖNETİMİ',fontSize:7.5,color:MUTED,characterSpacing:2.3,margin:[0,2,0,0]},
              ],margin:[10,0,0,0]},
            ],
          },
          {
            width:'*',
            stack:[
              {text:'HAFTALIK DERS PROGRAMI',fontSize:6.5,bold:true,color:BLUE,characterSpacing:1.15,alignment:'right',margin:[0,4,0,4]},
              {text:`${fullDate(monday)} — ${fullDate(sunday)}`,fontSize:8.8,bold:true,color:NAVY_DARK,alignment:'right'},
              {text:`${sorted.length} ders  ·  ${activeDayCount} aktif gün`,fontSize:6.1,color:MUTED,alignment:'right',margin:[0,4,0,0]},
            ]
          },
        ],
        columnGap:12,
      },
      {
        canvas:[
          {type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.7,lineColor:LINE_DARK},
          {type:'line',x1:0,y1:0,x2:92,y2:0,lineWidth:2.4,lineColor:CYAN},
        ],
        margin:[0,9,0,11]
      },
      {text:'SEÇİLİ PROGRAM',fontSize:5.6,bold:true,color:BLUE,characterSpacing:1.15,margin:[0,0,0,4]},
      {text:programLabel,fontSize:18.5,bold:true,color:NAVY_DARK,margin:[0,0,0,1]},
      {text:'Haftalık Ders Programı',fontSize:8.2,color:BLUE,margin:[0,2,0,10]},
      {
        table:{
          widths:['*','*','*','*'],
          body:[[
            {stack:[metricCell('TOPLAM DERS',sorted.length,BLUE)],fillColor:CARD,margin:[0,0,0,0]},
            {stack:[metricCell('AKTİF GÜN',activeDayCount,CYAN)],fillColor:CARD,margin:[0,0,0,0]},
            {stack:[metricCell('ÖĞRENCİ',studentCount,'#6584ff')],fillColor:CARD,margin:[0,0,0,0]},
            {stack:[metricCell('ÖĞRETMEN',teacherCount,'#6f7f9b')],fillColor:CARD,margin:[0,0,0,0]},
          ]]
        },
        layout:{
          hLineWidth:()=>.55,vLineWidth:()=>.55,
          hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
        },
        margin:[0,0,0,7],
      },
      {
        columns:[
          {width:'auto',text:[{text:'● ',color:BLUE},{text:`Planlandı ${plannedCount}`,color:'#586a83'}],margin:[0,0,14,0]},
          {width:'auto',text:[{text:'● ',color:GREEN},{text:`Yapıldı ${doneCount}`,color:'#586a83'}],margin:[0,0,14,0]},
          {width:'auto',text:[{text:'● ',color:RED},{text:`İptal ${cancelledCount}`,color:'#586a83'}]},
          {width:'*',text:`Oluşturma: ${generatedAt}`,alignment:'right',color:'#8794a7'},
        ],
        fontSize:5.9,
        margin:[1,0,1,7],
      },
      {
        table:{headerRows:1,widths:[60,108,92,108,91,68],body:tableBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i===0||i===1)?0.7:0.35,
          vLineWidth:(i:number)=>(i===0||i===6)?0.55:0,
          hLineColor:()=>LINE,
          vLineColor:()=>LINE_DARK,
          paddingLeft:()=>2.6,
          paddingRight:()=>2.6,
          paddingTop:()=>0,
          paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      th:{fontSize:5.25,bold:true,color:'#697a92',fillColor:'#f9fbfe',characterSpacing:.55,margin:[2,3.1,2,3.1]},
    },
  }

  const filename=`BS-Egitim-Yonetimi-${pdfFilePart(programLabel)}-${monday}.pdf`
  await pdfMake.createPdf(docDefinition).download(filename)
  return true
}
