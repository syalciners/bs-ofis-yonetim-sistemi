import { readFileSync, writeFileSync } from 'node:fs'

const path='src/components/forms.tsx'
let source=readFileSync(path,'utf8')

const headPattern=/(export function ProgramForm[\s\S]{0,320}?const)\s*\{\s*data\s*,\s*refresh\s*\}\s*=\s*useAppData\(\)\s*;/
const unitsPattern=/const\s*\[\s*units\s*,\s*setUnits\s*\]\s*=\s*useState\(Number\(program\?\.ders_sayisi\s*\|\|\s*1\)\)\s*;/
const alreadyHead=/export function ProgramForm[\s\S]{0,320}?const\s*\{[^}]*\binstitution\b[^}]*\}\s*=\s*useAppData\(\)\s*;/
const alreadyUnits=/program\?\.ders_sayisi\s*\|\|\s*institution\?\.varsayilan_ders_birimi\s*\|\|\s*1/

if(alreadyHead.test(source)&&alreadyUnits.test(source)){
  console.log('Sabit Program formu kurum varsayılanına zaten bağlı.')
  process.exit(0)
}

const headMatches=source.match(new RegExp(headPattern.source,'g'))||[]
const unitMatches=source.match(new RegExp(unitsPattern.source,'g'))||[]
if(headMatches.length!==1)throw new Error(`ProgramForm useAppData hedefi tam 1 kez bulunmalı; bulunan: ${headMatches.length}`)
if(unitMatches.length!==1)throw new Error(`ProgramForm ders birimi hedefi tam 1 kez bulunmalı; bulunan: ${unitMatches.length}`)

source=source.replace(headPattern,'$1{data,refresh,institution}=useAppData();')
source=source.replace(unitsPattern,'const[units,setUnits]=useState(Number(program?.ders_sayisi||institution?.varsayilan_ders_birimi||1));')
writeFileSync(path,source,'utf8')
console.log('Sabit Program formu kurum varsayılan ders birimine bağlandı.')
