import { readFileSync, writeFileSync } from 'node:fs'

const path='src/components/forms.tsx'
let source=readFileSync(path,'utf8')

const oldHead="export function ProgramForm({program,onDone,onCancel}:{program?:SabitProgram;onDone:()=>void;onCancel:()=>void}){const{data,refresh}=useAppData();const{toast}=useToast();"
const newHead="export function ProgramForm({program,onDone,onCancel}:{program?:SabitProgram;onDone:()=>void;onCancel:()=>void}){const{data,refresh,institution}=useAppData();const{toast}=useToast();"
const oldUnits="const[units,setUnits]=useState(Number(program?.ders_sayisi||1));"
const newUnits="const[units,setUnits]=useState(Number(program?.ders_sayisi||institution?.varsayilan_ders_birimi||1));"

if(source.includes(newHead)&&source.includes(newUnits)){
  console.log('Sabit Program formu kurum varsayılanına zaten bağlı.')
  process.exit(0)
}
if(!source.includes(oldHead))throw new Error('ProgramForm beklenen useAppData satırı bulunamadı; otomatik kaynak migrasyonu durduruldu.')
if(!source.includes(oldUnits))throw new Error('ProgramForm beklenen ders birimi varsayılanı bulunamadı; otomatik kaynak migrasyonu durduruldu.')

source=source.replace(oldHead,newHead).replace(oldUnits,newUnits)
writeFileSync(path,source,'utf8')
console.log('Sabit Program formu kurum varsayılan ders birimine bağlandı.')
