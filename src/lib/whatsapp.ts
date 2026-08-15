const phoneDigits=(value?:string|null)=>String(value||'').replace(/\D/g,'')

export const normalizeTrWhatsappPhone=(value?:string|null)=>{
  const d=phoneDigits(value)
  if(!d)return''
  if(d.startsWith('90')&&d.length>=12)return d
  if(d.startsWith('0')&&d.length===11)return `90${d.slice(1)}`
  if(d.length===10)return `90${d}`
  return d
}

export const maskedPhone=(value?:string|null)=>{
  const d=phoneDigits(value)
  return d?`••• ${d.slice(-4)}`:''
}

export const buildWhatsappUrl=(phone:string,message:string)=>`https://wa.me/${normalizeTrWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`
