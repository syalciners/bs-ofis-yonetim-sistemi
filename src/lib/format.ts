export const money = (value?: number | null) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value || 0))
export const money2 = (value?: number | null) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(value || 0))
export const shortDate = (iso?: string | null) => iso ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(`${iso}T12:00:00+03:00`)) : '—'
export const compactWeekRange = (start: string, end: string) => {
  const parse = (iso: string) => new Date(`${iso}T12:00:00+03:00`)
  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', timeZone: 'Europe/Istanbul' })
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'Europe/Istanbul' })
  const startDate = parse(start), endDate = parse(end)
  const startMonth = month.format(startDate), endMonth = month.format(endDate)
  return startMonth === endMonth ? `${day.format(startDate)}–${day.format(endDate)} ${startMonth}` : `${day.format(startDate)} ${startMonth}–${day.format(endDate)} ${endMonth}`
}
export const fullDate = (iso?: string | null) => iso ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00+03:00`)) : '—'
export const time = (value?: string | null) => value ? value.slice(0, 5) : '—'
export const formatClockInput = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  if (digits.length === 3 && Number(digits.slice(0, 2)) > 23) return `0${digits[0]}:${digits.slice(1)}`
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const thisMonthKey = () => todayISO().slice(0, 7)
export const firstOfMonth = () => `${thisMonthKey()}-01`
export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00+03:00`)
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export const mondayOf = (iso = todayISO()) => {
  const d = new Date(`${iso}T12:00:00+03:00`)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
export const normalizePhone = (v?: string | null) => {
  let s = String(v || '').replace(/\D/g, '')
  if (!s) return ''
  if (s.startsWith('0')) s = `90${s.slice(1)}`
  if (s.length === 10) s = `90${s}`
  return s
}
