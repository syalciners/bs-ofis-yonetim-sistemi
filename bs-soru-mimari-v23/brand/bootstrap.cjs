const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

const ROOT='https://raw.githubusercontent.com/syalciners/bs-ofis-yonetim-sistemi/bs-soru-mimari-v2-source/bs-soru-mimari-v23';

async function text(url){
  const r=await fetch(url);
  if(!r.ok) throw new Error(`${url} -> ${r.status}`);
  return await r.text();
}

function applyV231(files){
  let p=String(files['app/page.tsx']);
  const rep=(a,b,n)=>{
    if(p.includes(a)){p=p.replace(a,b);console.log('PATCH',n,'OK')}
    else console.log('PATCH',n,'SKIP');
  };

  rep(`type CropEditor = {\n  rect:{x:number;y:number;w:number;h:number};\n  sourceNumber?:number;\n  autoDetected:boolean;\n  mask?:{x:number;y:number;w:number;h:number};\n  answer:string;\n};`,`type CropEditor = {\n  rect:{x:number;y:number;w:number;h:number};\n  sourceNumber?:number;\n  autoDetected:boolean;\n  maskAbs?:{x:number;y:number;w:number;h:number};\n  answer:string;\n};`,'mask-type');

  rep(`const bottom=Math.min(H*.935,next?next.y-Math.max(next.fontH*1.35,H*.012):H*.925);`,`const bottom=Math.min(H*.925,next?next.y-Math.max(next.fontH*2.4,H*.022):H*.905);`,'safe-bottom');

  rep(`setCropEditor({rect:{x:box.x,y:box.y,w:box.w,h:box.h},sourceNumber:box.sourceNumber,autoDetected:true,mask:box.mask,answer:""});`,`const maskAbs=box.mask?{x:box.x+box.mask.x*box.w,y:box.y+box.mask.y*box.h,w:box.mask.w*box.w,h:box.mask.h*box.h}:undefined;\n    setCropEditor({rect:{x:box.x,y:box.y,w:box.w,h:box.h},sourceNumber:box.sourceNumber,autoDetected:true,maskAbs,answer:""});`,'mask-abs');

  rep(`const sel:Selection={id:crypto.randomUUID(),page:pageNo,x:r.x,y:r.y,w:r.w,h:r.h,sourceNumber:cropEditor.sourceNumber,autoDetected:cropEditor.autoDetected,mask:cropEditor.mask,answer:cropEditor.answer};`,`let mask:Selection["mask"]=undefined;\n    if(cropEditor.maskAbs){const m=cropEditor.maskAbs;const ix=Math.max(r.x,m.x),iy=Math.max(r.y,m.y),ir=Math.min(r.x+r.w,m.x+m.w),ib=Math.min(r.y+r.h,m.y+m.h);if(ir>ix&&ib>iy)mask={x:(ix-r.x)/r.w,y:(iy-r.y)/r.h,w:(ir-ix)/r.w,h:(ib-iy)/r.h};}\n    const sel:Selection={id:crypto.randomUUID(),page:pageNo,x:r.x,y:r.y,w:r.w,h:r.h,sourceNumber:cropEditor.sourceNumber,autoDetected:cropEditor.autoDetected,mask,answer:cropEditor.answer};`,'mask-confirm');

  rep(`let col=cols===1?0:(i%2);\n      if(!fits(col,m.total)&&cols===2&&fits(1-col,m.total)) col=1-col;\n      if(!fits(col,m.total)) {state=createPage();col=cols===1?0:(i%2);}`,`let col=cols===1?0:(state.ys[0]>=state.ys[1]?0:1);\n      if(!fits(col,m.total)&&cols===2&&fits(1-col,m.total)) col=1-col;\n      if(!fits(col,m.total)){state=createPage();col=0;}`,'masonry');

  files['app/page.tsx']=p;
  return files;
}

function applyBrandMetadata(files){
  let layout=String(files['app/layout.tsx']||'');
  if(!layout) return files;

  if(layout.includes('export const metadata: Metadata = {') && !layout.includes('manifest: "/manifest.webmanifest"')){
    layout=layout.replace(
      'export const metadata: Metadata = {',
      'export const metadata: Metadata = {\n  applicationName: "BS Soru Mimarı",\n  manifest: "/manifest.webmanifest",\n  icons: { icon: "/bs-soru-mimari-mark.svg", shortcut: "/bs-soru-mimari-mark.svg" },'
    );
    console.log('PATCH brand-metadata OK');
  }
  files['app/layout.tsx']=layout;
  return files;
}

async function main(){
  const parts=[];
  for(let i=0;i<4;i++) parts.push((await text(`${ROOT}/source2/${i}.txt`)).trim());
  let files=JSON.parse(zlib.gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8'));

  // Restore the currently approved functional V2.3.1 behavior first.
  files=applyV231(files);
  files=applyBrandMetadata(files);

  // Brand is appended strictly as a presentation layer.
  const brandCss=await text(`${ROOT}/brand/brand-overrides.css`);
  files['app/globals.css']=String(files['app/globals.css']).replace(/\\\\n/g,'\n')+'\n\n'+brandCss;

  for(const [name,data] of Object.entries(files)){
    const out=path.join(process.cwd(),name);
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,data);
  }

  const publicDir=path.join(process.cwd(),'public');
  fs.mkdirSync(publicDir,{recursive:true});
  fs.writeFileSync(path.join(publicDir,'bs-soru-mimari-mark.svg'),await text(`${ROOT}/brand/bs-soru-mimari-mark.svg`));
  fs.writeFileSync(path.join(publicDir,'manifest.webmanifest'),JSON.stringify({
    name:'BS Soru Mimarı',
    short_name:'Soru Mimarı',
    description:'PDF belgelerinden soru seçip profesyonel test oluşturma uygulaması',
    start_url:'/',
    display:'standalone',
    background_color:'#F5F6FA',
    theme_color:'#0F1530',
    icons:[{src:'/bs-soru-mimari-mark.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]
  },null,2));

  const worker=path.join(process.cwd(),'node_modules','pdfjs-dist','build','pdf.worker.min.mjs');
  if(fs.existsSync(worker)) fs.copyFileSync(worker,path.join(publicDir,'pdf.worker.min.mjs'));

  console.log('BS Soru Mimarı V2.3.2 brand layer applied on V2.3.1');
}

main().catch(err=>{console.error(err);process.exit(1)});
