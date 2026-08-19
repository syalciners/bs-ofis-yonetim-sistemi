import type { Derslik } from './types'

// Takvim başlıkları derslik adından türetilir; ID yalnız mevcut operasyonel sütun sırasını korur.
const LEGACY_ROOM_ORDER=['LOC-002','LOC-001','LOC-003','LOC-005','LOC-004'] as const
const legacyOrder=new Map<string,number>(LEGACY_ROOM_ORDER.map((id,index)=>[id,index]))

const normalize=(value:string)=>value.trim().replace(/\s+/g,' ')

export function calendarRoomLabel(room:Derslik){
  const full=normalize(room.mekan_adi||room.derslik_id)
  const type=normalize(String(room.mekan_turu||'')).toLocaleLowerCase('tr-TR')
  if(type==='salon'&&full.toLocaleLowerCase('tr-TR')==='çalışma salonu')return 'Salon'
  let short=full.replace(/\s+(derslik|dersliği|ders|salonu|salon)$/iu,'').trim()
  if(!short)short=full
  if(type==='ev'){
    const compact=short.replace(/\s+/g,'')
    return compact.slice(0,3).toLocaleUpperCase('tr-TR')||full
  }
  if(short.length<=12)return short
  const words=short.split(/\s+/).filter(Boolean)
  if(words.length>1){
    const acronym=words.map(word=>Array.from(word)[0]||'').join('').slice(0,4).toLocaleUpperCase('tr-TR')
    if(acronym)return acronym
  }
  return short.slice(0,8)
}

const compareRooms=(a:Derslik,b:Derslik)=>{
  const aOrder=legacyOrder.get(a.derslik_id)??Number.MAX_SAFE_INTEGER
  const bOrder=legacyOrder.get(b.derslik_id)??Number.MAX_SAFE_INTEGER
  if(aOrder!==bOrder)return aOrder-bOrder
  return normalize(a.mekan_adi).localeCompare(normalize(b.mekan_adi),'tr')
}

export function calendarRoomColumns(rooms:Derslik[],referencedRoomIds:Array<string|null|undefined>=[]){
  const referenced=new Set(referencedRoomIds.filter((id):id is string=>Boolean(id)))
  const included=rooms.filter(room=>room.aktif!==false||referenced.has(room.derslik_id)).slice().sort(compareRooms)
  const known=new Set(included.map(room=>room.derslik_id))
  const columns=included.map(room=>({id:room.derslik_id,label:calendarRoomLabel(room),room}))
  const missing=[...referenced].filter(id=>!known.has(id)).sort().map(id=>({id,label:'Derslik',room:undefined as Derslik|undefined}))
  return [...columns,...missing]
}
