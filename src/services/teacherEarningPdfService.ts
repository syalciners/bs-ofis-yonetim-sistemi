import { fullDate, money } from '../lib/format'

export type TeacherEarningPdfLesson={
  date:string
  studentName:string
  branchName:string
  lessonCount:number
  unitEarning:number
  totalEarning:number
}

export type TeacherEarningPdfPayment={
  date:string
  method:string
  description:string
  amount:number
}

export type TeacherEarningPdfInput={
  teacherName:string
  branches?:string|null
  periodName:string
  periodStart:string
  periodEnd:string
  reportCode:string
  documentDate:string
  lessonUnits:number
  totalEarned:number
  totalPaid:number
  remaining:number
  paymentStatus:'Ödendi'|'Kısmi Ödendi'|'Ödenmedi'
  lessons:TeacherEarningPdfLesson[]
  payments:TeacherEarningPdfPayment[]
  filename:string
}

const NAVY='#0b1f3a'
const BLUE='#246bfd'
const TEAL='#22b8a7'
const MUTED='#71809a'
const LINE='#dfe6f1'
const SOFT='#f7f9fc'
const CARD='#fbfdff'
const ORANGE='#d87725'
const GREEN='#16865a'
const RED='#c84242'

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

const statusInfo=(status:TeacherEarningPdfInput['paymentStatus'])=>status==='Ödendi'
  ?{color:GREEN,fill:'#eaf7f0'}
  :status==='Kısmi Ödendi'
    ?{color:ORANGE,fill:'#fff5ea'}
    :{color:RED,fill:'#fff1f1'}

const metric=(label:string,value:string,sub:string,accent:string)=>({
  table:{
    widths:[4,'*'],
    body:[[
      {text:'',fillColor:accent,border:[false,false,false,false],margin:[0,0,0,0]},
      {stack:[
        {text:label.toLocaleUpperCase('tr-TR'),fontSize:5.1,bold:true,color:'#7d899c',characterSpacing:.45},
        {text:value,fontSize:11.2,bold:true,color:NAVY,margin:[0,2.4,0,0],noWrap:true},
        {text:sub,fontSize:4.8,color:'#94a0b1',margin:[0,2.4,0,0]},
      ],fillColor:CARD,border:[false,false,false,false],margin:[6,4.4,5,4.4]},
    ]]
  },
  layout:'noBorders',
})

export async function openTeacherEarningPdf(input:TeacherEarningPdfInput){
  if(!input.teacherName)throw new Error('PDF oluşturmak için öğretmen seçin.')
  if(!input.periodName)throw new Error('PDF oluşturmak için hakediş dönemi seçin.')

  const[pdfMakeImport,pdfFontsImport]=await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport
  const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport
  pdfMake.addVirtualFileSystem(pdfFonts)

  const logoData=await loadPublicImageAsDataUrl(['bs-egitim-icon-512-v2.png','bs-egitim-icon-192-v2.png'])
  const status=statusInfo(input.paymentStatus)

  const lessonBody:any[]=[[
    {text:'TARİH',style:'th'},
    {text:'ÖĞRENCİ',style:'th'},
    {text:'BRANŞ',style:'th'},
    {text:'DERS',style:'th',alignment:'right'},
    {text:'BİRİM HAKEDİŞ',style:'th',alignment:'right'},
    {text:'HAKEDİŞ TUTARI',style:'th',alignment:'right'},
  ]]

  input.lessons.forEach((lesson,index)=>{
    const fill=index%2===0?'#ffffff':'#fbfcfe'
    lessonBody.push([
      {text:fullDate(lesson.date),style:'td',fillColor:fill},
      {text:lesson.studentName,style:'tdStrong',fillColor:fill},
      {text:lesson.branchName,style:'td',fillColor:fill},
      {text:String(lesson.lessonCount),style:'tdNum',fillColor:fill},
      {text:money(lesson.unitEarning),style:'tdNum',fillColor:fill},
      {text:money(lesson.totalEarning),style:'tdNumStrong',fillColor:fill},
    ])
  })

  if(!input.lessons.length){
    lessonBody.push([{text:'Bu dönemde yapılmış ders yok.',colSpan:6,alignment:'center',color:MUTED,fontSize:6.2,margin:[0,8,0,8]}, {},{},{},{},{}])
  }

  const paymentBody:any[]=[[
    {text:'TARİH',style:'th'},
    {text:'YÖNTEM',style:'th'},
    {text:'AÇIKLAMA',style:'th'},
    {text:'TUTAR',style:'th',alignment:'right'},
  ]]

  input.payments.forEach((payment,index)=>{
    const fill=index%2===0?'#ffffff':'#fbfcfe'
    paymentBody.push([
      {text:fullDate(payment.date),style:'td',fillColor:fill},
      {text:payment.method||'—',style:'td',fillColor:fill},
      {text:payment.description||'—',style:'tdStrong',fillColor:fill},
      {text:money(payment.amount),style:'tdNumStrong',fillColor:fill},
    ])
  })

  if(!input.payments.length){
    paymentBody.push([{text:'Bu dönemde ödeme kaydı yok.',colSpan:4,alignment:'center',color:MUTED,fontSize:6.2,margin:[0,8,0,8]}, {},{},{}])
  }

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'portrait',
    pageMargins:[28,24,28,30],
    info:{
      title:`BS Eğitim Yönetimi - ${input.teacherName} - Öğretmen Hakediş Raporu`,
      author:'BS Eğitim Yönetimi',
      subject:`${input.periodName} öğretmen hakediş raporu`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:6.2,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      stack:[
        {canvas:[{type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.5,lineColor:LINE}],margin:[28,0,28,5]},
        {columns:[
          {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Öğretmen Hakediş Raporu'],alignment:'left'},
          {text:`${currentPage} / ${pageCount}`,alignment:'right'},
        ],margin:[28,0,28,0],fontSize:5.2,color:'#8390a4'},
      ],
    }),
    content:[
      {
        columns:[
          {
            width:245,
            columns:[
              {width:54,image:logoData,fit:[54,54]},
              {width:'*',stack:[
                {text:'BS Eğitim Yönetimi',fontSize:13.6,bold:true,color:NAVY,margin:[9,9,0,0]},
                {text:'Kurumsal eğitim operasyonları',fontSize:5.7,bold:true,color:MUTED,characterSpacing:.75,margin:[9,2,0,0]},
              ]},
            ],
          },
          {
            width:'*',
            stack:[
              {text:'ÖĞRETMEN RAPORU',fontSize:5.5,bold:true,color:BLUE,characterSpacing:1.05,alignment:'right',margin:[0,5,0,3]},
              {text:'Öğretmen Hakediş Raporu',fontSize:14.2,bold:true,color:NAVY,alignment:'right'},
              {text:'Dönem dersleri, hakediş tahakkuku ve ödeme mutabakatı',fontSize:5.7,color:MUTED,alignment:'right',margin:[0,2,0,3]},
              {text:input.periodName,fontSize:6.7,bold:true,color:'#34445e',alignment:'right'},
            ],
          },
        ],
        columnGap:14,
      },
      {
        canvas:[
          {type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.65,lineColor:'#c9d2df'},
          {type:'line',x1:0,y1:0,x2:76,y2:0,lineWidth:2.2,lineColor:BLUE},
          {type:'line',x1:76,y1:0,x2:99,y2:0,lineWidth:2.2,lineColor:TEAL},
        ],
        margin:[0,8,0,10],
      },
      {
        table:{
          widths:[150,220,169],
          body:[[
            {stack:[{text:'RAPOR KODU',style:'metaLabel'},{text:input.reportCode,style:'metaValue'}],fillColor:SOFT},
            {stack:[{text:'RAPOR KONUSU',style:'metaLabel'},{text:input.teacherName.toLocaleUpperCase('tr-TR'),style:'metaValue'}],fillColor:SOFT},
            {stack:[{text:'BELGE TARİHİ',style:'metaLabel'},{text:fullDate(input.documentDate),style:'metaValue'}],fillColor:SOFT},
          ]]
        },
        layout:{
          hLineWidth:()=>.45,vLineWidth:()=>.45,hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>6,paddingBottom:()=>6,
        },
        margin:[0,0,0,10],
      },
      {
        table:{
          widths:[34,'*',118],
          body:[[
            {text:'Ö',bold:true,fontSize:10,color:TEAL,alignment:'center',fillColor:'#edfaf7',margin:[0,7,0,7]},
            {stack:[
              {text:input.teacherName,fontSize:10.4,bold:true,color:NAVY},
              {text:`Branş: ${input.branches||'—'}  ·  ${fullDate(input.periodStart)} — ${fullDate(input.periodEnd)}`,fontSize:5.6,color:MUTED,margin:[0,3,0,0]},
            ],margin:[7,4,0,4]},
            {stack:[
              {text:'DÖNEM DURUMU',fontSize:4.9,bold:true,color:'#8794a8',characterSpacing:.55,alignment:'center'},
              {text:input.paymentStatus,fontSize:7.2,bold:true,color:status.color,alignment:'center',margin:[0,3,0,0]},
            ],fillColor:status.fill,margin:[2,5,2,5]},
          ]]
        },
        layout:{
          hLineWidth:()=>.55,vLineWidth:()=>0,hLineColor:()=>LINE,
          paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>2,paddingBottom:()=>2,
        },
        margin:[0,0,0,9],
      },
      {
        table:{
          widths:['*','*','*','*'],
          body:[[
            {stack:[metric('Yapılan Ders',String(input.lessonUnits),'Dönem toplamı',BLUE)]},
            {stack:[metric('Dönem Hakedişi',money(input.totalEarned),'Tahakkuk',TEAL)]},
            {stack:[metric('Dönem Ödemesi',money(input.totalPaid),'Gerçek ödeme',GREEN)]},
            {stack:[metric('Kalan Hakediş',money(input.remaining),'Ödenecek',ORANGE)]},
          ]]
        },
        layout:{
          hLineWidth:()=>.45,vLineWidth:()=>.45,hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {text:[{text:'Dönem Dersleri',bold:true,color:NAVY,fontSize:8.8},{text:'  hakediş detayı',color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{headerRows:1,widths:[58,120,88,48,105,112],body:lessonBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i<=1?0.6:0.3),
          vLineWidth:(i:number)=>(i===0||i===6?0.45:0),
          hLineColor:()=>LINE,
          vLineColor:()=>LINE,
          paddingLeft:()=>2,
          paddingRight:()=>2,
          paddingTop:()=>0,
          paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {text:[{text:'Dönem Ödemeleri',bold:true,color:NAVY,fontSize:8.8},{text:'  ödeme hareketleri',color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{headerRows:1,widths:[78,90,260,103],body:paymentBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i<=1?0.6:0.3),
          vLineWidth:(i:number)=>(i===0||i===4?0.45:0),
          hLineColor:()=>LINE,
          vLineColor:()=>LINE,
          paddingLeft:()=>2,
          paddingRight:()=>2,
          paddingTop:()=>0,
          paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {
        table:{
          widths:['*','*',150],
          body:[[
            {stack:[{text:'DÖNEM HAKEDİŞİ',fontSize:5.1,bold:true,color:'#7d899c'},{text:money(input.totalEarned),fontSize:8.4,bold:true,color:NAVY,margin:[0,3,0,0]}],fillColor:SOFT,margin:[8,6,8,6]},
            {stack:[{text:'DÖNEM ÖDEMESİ',fontSize:5.1,bold:true,color:'#7d899c'},{text:money(input.totalPaid),fontSize:8.4,bold:true,color:GREEN,margin:[0,3,0,0]}],fillColor:SOFT,margin:[8,6,8,6]},
            {stack:[{text:'KALAN HAKEDİŞ',fontSize:5.1,bold:true,color:'#7d899c',alignment:'right'},{text:money(input.remaining),fontSize:11.5,bold:true,color:input.remaining>0?ORANGE:GREEN,alignment:'right',margin:[0,3,0,0]}],fillColor:SOFT,margin:[8,6,8,6]},
          ]]
        },
        layout:{hLineWidth:()=>.45,vLineWidth:()=>0,hLineColor:()=>LINE},
      },
    ],
    styles:{
      metaLabel:{fontSize:4.8,bold:true,color:'#8794a8',characterSpacing:.55},
      metaValue:{fontSize:6.4,bold:true,color:NAVY,margin:[0,3,0,0]},
      th:{fontSize:4.9,bold:true,color:'#6f7d91',fillColor:'#f8fafc',characterSpacing:.25,margin:[2,3.1,2,3.1]},
      td:{fontSize:5.6,color:'#34445e',margin:[2,2.35,2,2.35]},
      tdStrong:{fontSize:5.6,bold:true,color:'#253650',margin:[2,2.35,2,2.35]},
      tdNum:{fontSize:5.6,color:'#34445e',alignment:'right',margin:[2,2.35,2,2.35]},
      tdNumStrong:{fontSize:5.6,bold:true,alignment:'right',margin:[2,2.35,2,2.35]},
    },
  }

  const filename=input.filename.toLowerCase().endsWith('.pdf')?input.filename:`${input.filename}.pdf`
  await pdfMake.createPdf(docDefinition).download(filename)
  return true
}
