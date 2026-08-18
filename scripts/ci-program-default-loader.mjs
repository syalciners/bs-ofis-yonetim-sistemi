import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const formPath='src/components/forms.tsx'
let source=readFileSync(formPath,'utf8')
const headPattern=/(export function ProgramForm[\s\S]{0,360}?const)\s*\{\s*data\s*,\s*refresh\s*\}\s*=\s*useAppData\(\)\s*;/
const unitsPattern=/const\s*\[\s*units\s*,\s*setUnits\s*\]\s*=\s*useState\(Number\(program\?\.ders_sayisi\s*\|\|\s*1\)\)\s*;/
const alreadyHead=/export function ProgramForm[\s\S]{0,360}?const\s*\{[^}]*\binstitution\b[^}]*\}\s*=\s*useAppData\(\)\s*;/
const alreadyUnits=/program\?\.ders_sayisi\s*\|\|\s*institution\?\.varsayilan_ders_birimi\s*\|\|\s*1/

if(!(alreadyHead.test(source)&&alreadyUnits.test(source))){
  const heads=source.match(new RegExp(headPattern.source,'g'))||[]
  const units=source.match(new RegExp(unitsPattern.source,'g'))||[]
  if(heads.length!==1)throw new Error(`ProgramForm useAppData hedefi tam 1 kez bulunmalı; bulunan: ${heads.length}`)
  if(units.length!==1)throw new Error(`ProgramForm ders birimi hedefi tam 1 kez bulunmalı; bulunan: ${units.length}`)
  source=source.replace(headPattern,'$1{data,refresh,institution}=useAppData();')
  source=source.replace(unitsPattern,'const[units,setUnits]=useState(Number(program?.ders_sayisi||institution?.varsayilan_ders_birimi||1));')
  writeFileSync(formPath,source,'utf8')
  console.log('Sabit Program formu kurum varsayılan ders birimine bağlandı.')
}else{
  console.log('Sabit Program formu kurum varsayılanına zaten bağlı.')
}

for(const path of [
  '.npmrc',
  'scripts/ci-program-default-loader.mjs',
  'scripts/patch-program-form-default.mjs',
  'scripts/patch-program-form-default-v2.mjs',
  '.github/workflows/program-default-migration.yml',
  '.github/workflows/program-default-migration-v2.yml',
  '.github/workflows/program-default-migration-v3.yml',
])rmSync(path,{force:true})
