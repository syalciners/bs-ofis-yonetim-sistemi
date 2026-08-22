const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

const ROOT='https://raw.githubusercontent.com/syalciners/bs-ofis-yonetim-sistemi/bs-soru-mimari-v2-source/bs-soru-mimari-v23';

async function text(url){
  const r=await fetch(url);
  if(!r.ok) throw new Error(`${url} -> ${r.status}`);
  return await r.text();
}

async function main(){
  const parts=[];
  for(let i=0;i<4;i++) parts.push((await text(`${ROOT}/source2/${i}.txt`)).trim());
  const files=JSON.parse(zlib.gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8'));

  // Keep the working V2.3 source intact; brand is appended as a presentation layer only.
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

  const worker=path.join(process.cwd(),'node_modules','pdfjs-dist','build','pdf.worker.min.mjs');
  if(fs.existsSync(worker)) fs.copyFileSync(worker,path.join(publicDir,'pdf.worker.min.mjs'));

  console.log('BS Soru Mimarı brand layer applied');
}

main().catch(err=>{console.error(err);process.exit(1)});
