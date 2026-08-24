export type DemoPersonaKind = 'student' | 'teacher' | 'manager'
export type DemoGender = 'female' | 'male'

function hashText(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeName(name: string) {
  return name.trim().toLocaleUpperCase('tr-TR')
}

function firstName(name: string) {
  return normalizeName(name).split(/\s+/)[0] || ''
}

const FEMALE_NAMES = new Set([
  'AYŞE','FATMA','EMİNE','HATİCE','ZEYNEP','ELİF','MERVE','ESRA','ECE','DEFNE','SELİN','SELEN','SEDA','SEVİM','SEVGİ','SEVDA','SİMGE','SİBEL','SILA','SUDE','SENA','SİNEM','İREM','İPEK','İLAYDA','İLKNUR','İCLAL','AZRA','ASYA','ADA','ALEYNA','ALARA','CEREN','CEYDA','CANSU','DİLARA','DERİN','DURU','EDA','ECE','ESİN','ESMA','EZGİ','GAMZE','GİZEM','GÖKÇE','GÜL','GÜLŞAH','HİLAL','KÜBRA','MELİSA','MELİKE','MİRA','MİNA','NEHİR','NİSA','NUR','NURAY','NURCAN','NURGÜL','ÖZGE','ÖZLEM','PELİN','PINAR','RABİA','ŞEYMA','TUĞÇE','YAĞMUR','YAREN','YASEMİN','BERRA','BEYZA','BAŞAK','BURCU','BÜŞRA','DAMLA','DİDEM','FİGEN','FÜSUN','HANDE','JALE','LEYLA','LİNA','NAZ','NAZLI','NİLAY','ŞEVVAL','ECE SU','ELA'
])

const MALE_NAMES = new Set([
  'MEHMET','MUSTAFA','AHMET','ALİ','HÜSEYİN','HASAN','İBRAHİM','İSMAİL','EMİR','EMRE','ARDA','KAAN','KEREM','MERT','CAN','ASIR','YİĞİT','EYMEN','ÖMER','BURAK','BATU','BATUHAN','BERK','BERKE','BERKAY','BARAN','BARIŞ','BORA','BUĞRA','CEM','CENK','CİHAN','ÇAĞATAY','DOĞUKAN','DOĞAN','EFE','EKİN','ENES','ERAY','EREN','ERHAN','ERSİN','FURKAN','GÖKHAN','HAKAN','HALİL','KADİR','KORAY','LEVENT','MURAT','ONUR','OĞUZ','OĞUZHAN','OKAN','ORHAN','RAMAZAN','SERKAN','SERCAN','SÜLEYMAN','TOLGA','TUNA','UTKU','UĞUR','VOLKAN','YUSUF','YUNUS','ZAFER','ALPER','ALPEREN','ANKA','AYKUT','AYTAÇ','BAHADIR','BARIŞ','BERAT','BİLAL','CEMAL','CENAP','DEMİR','DORUK','ERDEM','FERHAT','GÖRKEM','İLKER','KAĞAN','KIVANÇ','METE','MİRZA','SALİH','SEMİH','TARIK','TAYLAN','UMUT'
])

export function inferDemoGender(name: string): DemoGender | null {
  const normalized = normalizeName(name)
  if (normalized === 'DENİZ ARMAN') return 'male'
  if (normalized === 'SELİN AKSOY') return 'female'
  const first = firstName(name)
  if (FEMALE_NAMES.has(first)) return 'female'
  if (MALE_NAMES.has(first)) return 'male'
  return null
}

const TEACHER_POOLS: Record<DemoGender, readonly string[]> = {
  female: [
    '/demo-photos/p02.webp',
    '/demo-photos/p04.webp',
    '/demo-photos/teacher-f3.webp',
    '/demo-photos/p01.webp',
  ],
  male: [
    '/demo-photos/p03.webp',
    '/demo-photos/p05.webp',
    '/demo-photos/teacher-m3.webp',
    '/demo-photos/p00.webp',
  ],
}

const STUDENT_POOLS: Record<DemoGender, readonly string[]> = {
  female: ['/demo-photos/p07.webp','/demo-photos/p09.webp','/demo-photos/p11.webp'],
  male: ['/demo-photos/p06.webp','/demo-photos/p08.webp','/demo-photos/p10.webp'],
}

const teacherAssignments = new Map<string, string | null>()
const usedTeacherPhotos: Record<DemoGender, Set<string>> = {
  female: new Set<string>(),
  male: new Set<string>(),
}

function uniqueTeacherPhoto(id: string, name: string) {
  if (teacherAssignments.has(id)) return teacherAssignments.get(id) ?? null
  const gender = inferDemoGender(name)
  if (!gender) {
    teacherAssignments.set(id, null)
    return null
  }
  const pool = TEACHER_POOLS[gender]
  const start = hashText(`${id}|${normalizeName(name)}|teacher`) % pool.length
  for (let offset = 0; offset < pool.length; offset += 1) {
    const photo = pool[(start + offset) % pool.length]
    if (!usedTeacherPhotos[gender].has(photo)) {
      usedTeacherPhotos[gender].add(photo)
      teacherAssignments.set(id, photo)
      return photo
    }
  }
  teacherAssignments.set(id, null)
  return null
}

export function demoPersonaPhoto(id: string, name: string, kind: DemoPersonaKind) {
  const normalized = normalizeName(name)

  if (kind === 'manager') {
    if (normalized === 'DENİZ ARMAN') return '/demo-photos/p00.webp'
    if (normalized === 'SELİN AKSOY') return '/demo-photos/p01.webp'
    return null
  }

  if (kind === 'teacher') return uniqueTeacherPhoto(id, name)

  const gender = inferDemoGender(name)
  if (!gender) return null
  const pool = STUDENT_POOLS[gender]
  return pool[hashText(`${id}|${normalized}|student`) % pool.length]
}
