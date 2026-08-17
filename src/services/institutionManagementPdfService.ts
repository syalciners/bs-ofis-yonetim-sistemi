import { fullDate, money } from '../lib/format'

export type InstitutionStatusRow={
  status:string
  count:number
  percent:number
}

export type InstitutionManagementPdfInput={
  periodLabel:string
  reportCode:string
  documentDate:string
  revenue:number
  teacherAccrual:number
  expenses:number
  operationalResult:number
  collections:number
  teacherPaid:number
  netCashMovement:number
  openStudentDebt:number
  teacherDebt:number
  cashBank:number
  completedLessons:number
  statusRows:InstitutionStatusRow[]
  collectionRate:number
  teacherCostRate:number
  operationalMargin:number
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
const SILVER='#aeb9c8'

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

const percent=(value:number)=>`%${new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(Number.isFinite(value)?value:0)}`

const metric=(label:string,value:string,sub:string,accent:string)=>({
  table:{
    widths:[4,'*'],
    body:[[
      {text:'',fillColor:accent,border:[false,false,false,false],margin:[0,0,0,0]},
      {stack:[
        {text:label.toLocaleUpperCase('tr-TR'),fontSize:5.1,bold:true,color:'#7d899c',characterSpacing:.45},
        {text:value,fontSize:10.8,bold:true,color:NAVY,margin:[0,2.4,0,0],noWrap:true},
        {text:sub,fontSize:4.8,color:'#94a0b1',margin:[0,2.4,0,0]},
      ],fillColor:CARD,border:[false,false,false,false],margin:[6,4.4,5,4.4]},
    ]]
  },
  layout:'noBorders',
})

const summaryPanel=(title:string,subtitle:string,result:number,accent:string,rows:Array<[string,number]>)=>({
  table:{
    widths:['*'],
    body:[[
      {stack:[
        {
          columns:[
            {width:'*',stack:[
              {text:title,fontSize:6,bold:true,color:accent,characterSpacing:.6},
              {text:subtitle,fontSize:5.1,color:MUTED,margin:[0,2,0,0]},
            ]},
            {width:112,text:money(result),fontSize:12.2,bold:true,color:accent,alignment:'right',margin:[0,1,0,0]},
          ],
        },
        {canvas:[{type:'line',x1:0,y1:0,x2:242,y2:0,lineWidth:.45,lineColor:LINE}],margin:[0,6,0,4]},
        ...rows.map(([label,value],index)=>({
          columns:[
            {width:'*',text:label,fontSize:5.8,color:MUTED},
            {width:92,text:money(value),fontSize:6.7,bold:true,color:NAVY,alignment:'right'},
          ],
          margin:[0,index?3:0,0,0],
        })),
      ],fillColor:'#ffffff',margin:[8,7,8,7]},
    ]]
  },
  layout:{
    hLineWidth:()=>.55,vLineWidth:()=>.55,hLineColor:()=>LINE,vLineColor:()=>LINE,
    paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
  },
})

const statusColor=(status:string)=>{
  if(status==='Yapıldı')return TEAL
  if(status==='Planlandı')return BLUE
  if(status==='İptal'||status==='Öğretmen İptali')return RED
  if(status==='Öğrenci Gelmedi')return ORANGE
  return SILVER
}

export async function openInstitutionManagementPdf(input:InstitutionManagementPdfInput){
  const[pdfMakeImport,pdfFontsImport]=await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake:any=(pdfMakeImport as any).default??pdfMakeImport
  const pdfFonts:any=(pdfFontsImport as any).default??pdfFontsImport
  pdfMake.addVirtualFileSystem(pdfFonts)

  const logoData=await loadPublicImageAsDataUrl(['bs-egitim-icon-512-v2.png','bs-egitim-icon-192-v2.png'])

  const statusBody:any[]=[[
    {text:'DURUM',style:'th'},
    {text:'ADET',style:'th',alignment:'right'},
    {text:'DAĞILIM',style:'th'},
    {text:'ORAN',style:'th',alignment:'right'},
  ]]
  input.statusRows.forEach((row,index)=>{
    const fill=index%2===0?'#ffffff':'#fbfcfe'
    const width=Math.max(0,Math.min(100,row.percent))*2.05
    statusBody.push([
      {text:row.status,style:'tdStrong',fillColor:fill},
      {text:String(row.count),style:'tdNumStrong',fillColor:fill},
      {canvas:[
        {type:'rect',x:0,y:2,w:205,h:5,r:2.5,color:'#edf1f6'},
        ...(width>0?[{type:'rect',x:0,y:2,w:Math.max(width,row.count?4:0),h:5,r:2.5,color:statusColor(row.status)}]:[]),
      ],fillColor:fill,margin:[1,2,1,0]},
      {text:percent(row.percent),style:'tdNumStrong',fillColor:fill},
    ])
  })

  const note=(label:string,value:number,description:string,accent:string)=>({
    table:{
      widths:['*'],
      body:[[
        {stack:[
          {text:label.toLocaleUpperCase('tr-TR'),fontSize:5,bold:true,color:'#7d899c',characterSpacing:.45},
          {text:percent(value),fontSize:12.2,bold:true,color:accent,margin:[0,3,0,3]},
          {text:description,fontSize:5.15,color:MUTED,lineHeight:1.15},
        ],fillColor:CARD,margin:[7,6,7,6]},
      ]]
    },
    layout:{
      hLineWidth:()=>.5,vLineWidth:()=>.5,hLineColor:()=>LINE,vLineColor:()=>LINE,
      paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
    },
  })

  const docDefinition:any={
    pageSize:'A4',
    pageOrientation:'portrait',
    pageMargins:[28,24,28,30],
    info:{
      title:'BS Eğitim Yönetimi - Kurum Yönetim Raporu',
      author:'BS Eğitim Yönetimi',
      subject:`${input.periodLabel} kurum yönetim raporu`,
      creator:'BS Eğitim Yönetimi',
    },
    defaultStyle:{font:'Roboto',fontSize:6.2,color:'#26354f'},
    footer:(currentPage:number,pageCount:number)=>({
      stack:[
        {canvas:[{type:'line',x1:0,y1:0,x2:539,y2:0,lineWidth:.5,lineColor:LINE}],margin:[28,0,28,5]},
        {columns:[
          {text:[{text:'BS Eğitim Yönetimi',bold:true,color:NAVY},'  ·  Kurum Yönetim Raporu'],alignment:'left'},
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
              {text:'YÖNETİM RAPORU',fontSize:5.5,bold:true,color:BLUE,characterSpacing:1.05,alignment:'right',margin:[0,5,0,3]},
              {text:'Kurum Yönetim Raporu',fontSize:14.2,bold:true,color:NAVY,alignment:'right'},
              {text:'Operasyonel performans, finansal durum ve nakit akışı',fontSize:5.7,color:MUTED,alignment:'right',margin:[0,2,0,3]},
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
            {stack:[{text:'RAPOR KONUSU',style:'metaLabel'},{text:'BS EĞİTİM',style:'metaValue'}],fillColor:SOFT},
            {stack:[{text:'BELGE TARİHİ',style:'metaLabel'},{text:fullDate(input.documentDate),style:'metaValue'}],fillColor:SOFT},
          ]]
        },
        layout:{
          hLineWidth:()=>.45,vLineWidth:()=>.45,hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>6,paddingBottom:()=>6,
        },
        margin:[0,0,0,10],
      },
      {text:[{text:'Yönetim Özeti',bold:true,color:NAVY,fontSize:8.8},{text:`  ${input.periodLabel}`,color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{
          widths:['*','*'],
          body:[[
            {stack:[summaryPanel('OPERASYONEL SONUÇ','Hizmet üretimi ve tahakkuk',input.operationalResult,BLUE,[
              ['Gerçekleşen Ciro',input.revenue],
              ['Öğretmen Hakedişi',input.teacherAccrual],
              ['Genel Gider',input.expenses],
            ])]},
            {stack:[summaryPanel('NAKİT AKIŞI','Gerçek para giriş ve çıkışları',input.netCashMovement,TEAL,[
              ['Tahsilat',input.collections],
              ['Öğretmen Ödemesi',input.teacherPaid],
              ['Genel Gider',input.expenses],
            ])]},
          ]]
        },
        layout:{
          hLineWidth:()=>0,vLineWidth:()=>0,
          paddingLeft:(i:number)=>i===0?0:5,paddingRight:(i:number)=>i===0?5:0,paddingTop:()=>0,paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {
        table:{
          widths:['*','*','*','*'],
          body:[[
            {stack:[metric('Öğrenci Alacağı',money(input.openStudentDebt),'Açık öğrenci bakiyeleri',ORANGE)]},
            {stack:[metric('Öğretmen Borcu',money(input.teacherDebt),'Ödenmemiş hakediş',BLUE)]},
            {stack:[metric('Kasa / Banka',money(input.cashBank),'Güncel hesap bakiyesi',TEAL)]},
            {stack:[metric('Yapılan Ders',String(input.completedLessons),'Seçili dönem toplamı',SILVER)]},
          ]]
        },
        layout:{
          hLineWidth:()=>.45,vLineWidth:()=>.45,hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0,
        },
        margin:[0,0,0,9],
      },
      {text:[{text:'Ders Durumu Dağılımı',bold:true,color:NAVY,fontSize:8.8},{text:'  operasyon kalitesi',color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{headerRows:1,widths:[120,48,275,88],body:statusBody,dontBreakRows:true},
        layout:{
          hLineWidth:(i:number)=>(i<=1?0.6:0.3),vLineWidth:(i:number)=>(i===0||i===4?0.45:0),
          hLineColor:()=>LINE,vLineColor:()=>LINE,
          paddingLeft:()=>3,paddingRight:()=>3,paddingTop:()=>1,paddingBottom:()=>1,
        },
        margin:[0,0,0,9],
      },
      {text:[{text:'Yönetim Notları',bold:true,color:NAVY,fontSize:8.8},{text:'  tek bakışta karar desteği',color:'#8390a3',fontSize:5.8}],margin:[0,0,0,5]},
      {
        table:{
          widths:['*','*','*'],
          body:[[
            {stack:[note('Tahsilat / Ciro',input.collectionRate,'Seçili dönemde tahsilatın gerçekleşen ciroya oranı.',TEAL)]},
            {stack:[note('Hakediş / Ciro',input.teacherCostRate,'Öğretmen hakedişinin gerçekleşen ciroya oranı.',BLUE)]},
            {stack:[note('Operasyonel Marj',input.operationalMargin,'Cirodan hakediş ve genel gider düşüldükten sonraki oran.',ORANGE)]},
          ]]
        },
        layout:{
          hLineWidth:()=>0,vLineWidth:()=>0,
          paddingLeft:(i:number)=>i===0?0:4,paddingRight:(i:number)=>i===2?0:4,paddingTop:()=>0,paddingBottom:()=>0,
        },
      },
    ],
    styles:{
      metaLabel:{fontSize:4.9,bold:true,color:'#8794a8',characterSpacing:.55,margin:[0,0,0,2]},
      metaValue:{fontSize:6.4,bold:true,color:NAVY},
      th:{fontSize:4.8,bold:true,color:'#748197',fillColor:'#f5f7fa',margin:[0,4,0,4]},
      td:{fontSize:5.5,color:'#33445e',margin:[0,3.2,0,3.2]},
      tdStrong:{fontSize:5.5,bold:true,color:'#283a55',margin:[0,3.2,0,3.2]},
      tdNumStrong:{fontSize:5.5,bold:true,color:NAVY,alignment:'right',margin:[0,3.2,0,3.2]},
    },
  }

  pdfMake.createPdf(docDefinition).download(input.filename)
}
