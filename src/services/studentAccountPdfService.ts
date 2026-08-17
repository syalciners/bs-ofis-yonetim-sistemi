import { fullDate, money } from '../lib/format'

export type StudentAccountPdfMovement={
  date:string
  label:string
  debit:number
  credit:number
  balance:number
}

export type StudentAccountPdfInput={
  studentName:string
  guardianName?:string|null
  periodLabel:string
  reportCode:string
  documentDate:string
  openingDate?:string
  openingBalance:number
  totalAccrual:number
  totalPaid:number
  periodEndBalance:number
  lessonUnits:number
  paymentCount:number
  movements:StudentAccountPdfMovement[]
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

const balanceInfo=(value:number)=>value>0
  ?{label:'Ödenecek Bakiye',color:ORANGE}
  :value<0
    ?{label:'Peşin Bakiye',color:GREEN}
    :{label:'Bakiye Kapalı',color:NAVY}

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

export async function openStudentAccountPdf(input:StudentAccountPdfInput){
  if(!input.studentName)throw new Error('PDF oluşturmak için öğrenci seçin.')

  const[pdfMakeImport,pdfFontsImport]=await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport
  const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport
  pdfMake.addVirtualFileSystem(pdfFonts)

  const logoData=await loadPublicImageAsDataUrl(['bs-egitim-icon-512-v2.png','bs-egitim-icon-192-v2.png'])
  const balance=balanceInfo(input.periodEndBalance)
  const opening=balanceInfo(input.openingBalance)

  const body:any[]=[[
    {text:'TARİH',style:'th'},
    {text:'İŞLEM',style:'th'},
    {text:'BORÇ',style:'th',alignment:'right'},
    {text:'TAHSİLAT',style:'th',alignment:'right'},
    {text:'BAKİYE',style:'th',alignment:'right'},
  ]]

  if(input.openingDate){
    body.push([
      {text:fullDate(input.openingDate),style:'td'},
      {text:'Önceki Dönemden Devir',style:'tdStrong'},
      {text:input.openingBalance>0?money(input.openingBalance):'—',style:'tdNum'},
      {text:input.openingBalance<0?money(Math.abs(input.openingBalance)):'—',style:'tdNum'},
      {text:money(input.openingBalance),style:'tdNumStrong',color:opening.color},
    ])
  }

  input.movements.forEach((movement,index)=>{
    const fill=index%2===0?'#ffffff':'#fbfcfe'
    body.push([
      {text:fullDate(movement.date),style:'td',fillColor:fill},
      {text:movement.label,style:'tdStrong',fillColor:fill},
      {text:movement.debit?money(movement.debit):'—',style:'tdNum',fillColor:fill},
      {text:movement.credit?money(movement.credit):'—',style:'tdNum',fillColor:fill},
      {text:money(movement.balance),style:'tdNumStrong',fillColor:fill,color:balanceInfo(movement.balance).color},
    ])
  })

  if(!input.movements.length){
    body.push([{text:'Seçili dönemde hesap hareketi bulunmuyor.',colSpan:5,alignment:'center',color:MUTED,fontSize:6.2,margin:[0,8,0,8]}, {},{},{},{}])
  }

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'portrait',
    pageMargins:[28,24,28,30],
    info:{
      title:`BS Eğitim Yönetimi - ${input.studentName} - Öğrenci Hesap Ekstresi`,
      author:'BS Eğitim Yönetimi',
      subject:`${input.periodLabel} öğrenci hesap ekstresi`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:6.2,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      stack:[
        {canvas:[{type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.5,lineColor:LINE}],margin:[28,0,28,5]},
        {columns:[
          {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Öğrenci Hesap Ekstresi'],alignment:'left'},
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
              {text:'ÖĞRENCİ RAPORU',fontSize:5.5,bold:true,color:BLUE,characterSpacing:1.05,alignment:'right',margin:[0,5,0,3]},
              {text:'Öğrenci Hesap Ekstresi',fontSize:14.2,bold:true,color:NAVY,alignment:'right'},
              {text:'Ders tahakkukları, tahsilatlar ve dönemsel bakiye özeti',fontSize:5.7,color:MUTED,alignment:'right',margin:[0,2,0,3]},
              {text:input.periodLabel,fontSize:6.7,bold:true,color:'#34445e',alignment:'right'},
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
            {stack:[{text:'RAPOR KONUSU',style:'metaLabel'},{text:input.studentName.toLocaleUpperCase('tr-TR'),style:'metaValue'}],fillColor:SOFT},
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
          widths:[34,'*',115],
          body:[[ 
            {text:'Ö',bold:true,fontSize:10,color:BLUE,alignment:'center',fillColor:'#eef4ff',margin:[0,7,0,7]},
            {stack:[
              {text:input.studentName,fontSize:10.4,bold:true,color:NAVY},
              {text:`Veli: ${input.guardianName||'—'}  ·  Rapor dönemi: ${input.periodLabel}`,fontSize:5.6,color:MUTED,margin:[0,3,0,0]},
            ],margin:[7,4,0,4]},
            {stack:[
              {text:'HESAP DURUMU',fontSize:4.9,bold:true,color:'#8794a8',characterSpacing:.55,alignment:'right'},
              {text:balance.label,fontSize:7.4,bold:true,color:balance.color,alignment:'right',margin:[0,3,0,0]},
            ],margin:[0,5,3,5]},
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
            {stack:[metric('Devir Bakiyesi',money(input.openingBalance),input.openingDate?`${fullDate(input.openingDate)} öncesinden`:'Tüm dönem başlangıcı','#aeb8c6')]},
            {stack:[metric('Dönem Ders Borcu',money(input.totalAccrual),`${input.lessonUnits} ders birimi`,BLUE)]},
            {stack:[metric('Dönem Tahsilatı',money(input.totalPaid),`${input.paymentCount} ödeme`,TEAL)]},
            {stack:[metric(balance.label,money(Math.abs(input.periodEndBalance)),'Dönem sonu hesap durumu',ORANGE)]},
          ]]
        },
        layout:{
          hLineWidth:()=>.45,vLineWidth:()=>.45,hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {text:[{text:'Hesap Hareketleri',bold:true,color:NAVY,fontSize:8.8},{text:'  kronolojik ekstre',color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{headerRows:1,widths:[68,205,74,74,74],body,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i<=1?0.6:0.3),
          vLineWidth:(i:number)=>(i===0||i===5?0.45:0),
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
          widths:['*',120],
          body:[[ 
            {stack:[
              {text:'DÖNEM ÖZETİ',fontSize:5.2,bold:true,color:'#7d899c',characterSpacing:.55},
              {text:'Seçili dönemin ders tahakkukları, tahsilatları ve devir bakiyesi birlikte hesaplanmıştır.',fontSize:5.5,color:'#596982',margin:[0,4,0,0]},
            ],fillColor:SOFT,margin:[8,6,8,6]},
            {stack:[
              {text:balance.label,fontSize:5.2,bold:true,color:'#7d899c',alignment:'right'},
              {text:money(Math.abs(input.periodEndBalance)),fontSize:11.5,bold:true,color:balance.color,alignment:'right',margin:[0,3,0,0]},
            ],fillColor:SOFT,margin:[8,6,8,6]},
          ]]
        },
        layout:{hLineWidth:()=>.45,vLineWidth:()=>0,hLineColor:()=>LINE},
      },
    ],
    styles:{
      metaLabel:{fontSize:4.8,bold:true,color:'#8794a8',characterSpacing:.55},
      metaValue:{fontSize:6.4,bold:true,color:NAVY,margin:[0,3,0,0]},
      th:{fontSize:5.1,bold:true,color:'#6f7d91',fillColor:'#f8fafc',characterSpacing:.35,margin:[2,3.1,2,3.1]},
      td:{fontSize:5.8,color:'#34445e',margin:[2,2.4,2,2.4]},
      tdStrong:{fontSize:5.8,bold:true,color:'#253650',margin:[2,2.4,2,2.4]},
      tdNum:{fontSize:5.8,color:'#34445e',alignment:'right',margin:[2,2.4,2,2.4]},
      tdNumStrong:{fontSize:5.8,bold:true,alignment:'right',margin:[2,2.4,2,2.4]},
    },
  }

  const filename=input.filename.toLowerCase().endsWith('.pdf')?input.filename:`${input.filename}.pdf`
  await pdfMake.createPdf(docDefinition).download(filename)
  return true
}
