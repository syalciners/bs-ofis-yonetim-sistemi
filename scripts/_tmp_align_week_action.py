from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: beklenen 1 eşleşme, bulunan {count}")
    return text.replace(old, new, 1)

page_path = Path('src/pages/DailyCalendarPage.tsx')
text = page_path.read_text(encoding='utf-8')

text = replace_once(
    text,
    "type TwoWeekCreationStatus={monday:string;selected:WeekCreationStatus;next:WeekCreationStatus}",
    "type WeekStatusState={monday:string;status:WeekCreationStatus}",
    'Hafta durum tipi',
)
text = replace_once(
    text,
    "const allWeeksAreReady=(status:TwoWeekCreationStatus)=>status.selected.calisti&&status.next.calisti\n",
    "",
    'İki haftalık hazır kontrolü',
)
text = replace_once(
    text,
    "const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<TwoWeekCreationStatus|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)",
    "const[weekBusy,setWeekBusy]=useState(false);const[weekStatusBusy,setWeekStatusBusy]=useState(true);const[weekStatus,setWeekStatus]=useState<WeekStatusState|null>(null);const[weekReview,setWeekReview]=useState<WeekPlanningReview|null>(null)",
    'Hafta durum state',
)
text = replace_once(
    text,
    "const readWeekStatus=useCallback(async():Promise<TwoWeekCreationStatus>=>{const[selectedStatus,nextStatus]=await Promise.all([getWeekCreationStatus(monday),getWeekCreationStatus(addDays(monday,7))]);return{monday,selected:selectedStatus,next:nextStatus}},[monday])",
    "const readWeekStatus=useCallback(async():Promise<WeekStatusState>=>({monday,status:await getWeekCreationStatus(monday)}),[monday])",
    'Seçili hafta durum okuma',
)
old_status = """  const activeWeekStatus=weekStatus?.monday===monday?weekStatus:null
  const allWeeksReady=activeWeekStatus?allWeeksAreReady(activeWeekStatus):false
  const selectedWeekReady=Boolean(activeWeekStatus?.selected.calisti);const nextWeekReady=Boolean(activeWeekStatus?.next.calisti)
  const weekActionText=isPastWeek?'Geçmiş Hafta':weekBusy||weekStatusBusy?'Kontrol ediliyor…':allWeeksReady?'Haftalar Hazır':isCurrentWeek&&!selectedWeekReady?'Eksik Dersleri Tamamla':selectedWeekReady&&!nextWeekReady?'Sonraki Haftayı Hazırla':!selectedWeekReady&&nextWeekReady?'Haftayı Oluştur':activeWeekStatus?'İki Haftayı Hazırla':'Haftayı Oluştur'
  const confirmWeekCreation=(status:TwoWeekCreationStatus)=>{const ranges=[!status.selected.calisti?`${shortDate(monday)} – ${shortDate(addDays(monday,6))}`:null,!status.next.calisti?`${shortDate(addDays(monday,7))} – ${shortDate(addDays(monday,13))}`:null].filter((x):x is string=>Boolean(x));if(!ranges.length)return false;const scope=ranges.length===1?`${ranges[0]} haftasının`:`${ranges.join(' ve ')} haftalarının`;const currentSafety=isCurrentWeek?'\n\nİçinde bulunduğumuz haftada yalnız şu andan sonraki eksik dersler eklenir; geçmiş dersler değiştirilmez.':'';return window.confirm(`${scope} eksik dersleri oluşturulsun mu?\n\nMevcut dersler korunur; yalnız eksik dersler eklenir.${currentSafety}`)}
  const createWeekNow=async()=>{setWeekBusy(true);try{if(isPastWeek){toast('Geçmiş haftalar otomatik olarak hazırlanamaz.');return}const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){setWeekReview(null);toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);toast(r?.olusturulan!==undefined?`${r.olusturulan} eksik ders oluşturuldu. Haftalar güncel.`:'Haftalar güncellendi.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
  const prepareWeek=async()=>{setWeekBusy(true);try{if(isPastWeek){toast('Geçmiş haftalar otomatik olarak hazırlanamaz.');return}const status=await readWeekStatus();setWeekStatus(status);if(allWeeksAreReady(status)){toast('Seçilen hafta ve sonraki hafta zaten hazır.');return}const review=await reviewWeekPlanning(monday);if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}if(!confirmWeekCreation(status))return;const r:any=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());toast(r?.olusturulan!==undefined?`${r.olusturulan} eksik ders oluşturuldu. Haftalar güncel.`:'Haftalar güncellendi.')}catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}}
"""
new_status = """  const activeWeekStatus=weekStatus?.monday===monday?weekStatus.status:null
  const weekReady=Boolean(activeWeekStatus?.calisti)
  const weekActionText=isPastWeek?'Geçmiş Hafta':weekBusy||weekStatusBusy?'Kontrol ediliyor…':weekReady?'Hafta Hazır':'Haftayı Hazırla'
  const confirmWeekCreation=()=>{
    const currentSafety=isCurrentWeek?'\n\nBugünden önceki veya saati geçmiş dersler değiştirilmez.':''
    return window.confirm(`${shortDate(monday)} – ${shortDate(addDays(monday,6))} haftası hazırlansın mı?\n\nTüm aktif sabit programlar işlenir. Daha önce oluşturulmamış dersler eklenir; sabit programda günü, saati, dersliği veya temel bilgileri değişmiş henüz sonuçlanmamış dersler güncellenir. Yapıldı, İptal ve tek seferlik değişiklikler korunur.${currentSafety}`)
  }
  const resultToast=(r:{olusturulan?:number;guncellenen?:number})=>{
    const created=Number(r.olusturulan||0),updated=Number(r.guncellenen||0)
    if(created===0&&updated===0){toast('Hafta zaten güncel. Yeni ders oluşturulmadı veya güncellenmedi.');return}
    toast(`${created} ders oluşturuldu, ${updated} ders güncellendi. Hafta hazır.`)
  }
  const createWeekNow=async()=>{
    setWeekBusy(true)
    try{
      if(isPastWeek){toast('Geçmiş haftalar hazırlanamaz.');return}
      const status=await readWeekStatus();setWeekStatus(status)
      if(status.status.calisti){setWeekReview(null);toast('Seçilen hafta zaten hazır.');return}
      if(!confirmWeekCreation())return
      const r=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());setWeekReview(null);resultToast(r)
    }catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}
  }
  const prepareWeek=async()=>{
    setWeekBusy(true)
    try{
      if(isPastWeek){toast('Geçmiş haftalar hazırlanamaz.');return}
      const status=await readWeekStatus();setWeekStatus(status)
      if(status.status.calisti){toast('Seçilen hafta zaten hazır.');return}
      const review=await reviewWeekPlanning(monday)
      if(!review.uygun){setWeekReview(review);toast(`${review.sorun_sayisi} ders için çakışma bulundu. Önerileri hazırladım.`,'error');return}
      if(!confirmWeekCreation())return
      const r=await createWeek(monday);await refresh();setWeekStatus(await readWeekStatus());resultToast(r)
    }catch(e:any){toast(e.message||String(e),'error')}finally{setWeekBusy(false)}
  }
"""
text = replace_once(text, old_status, new_status, 'Hafta aksiyon mantığı')
text = replace_once(
    text,
    "disabled={isPastWeek||weekBusy||weekStatusBusy||allWeeksReady}",
    "disabled={isPastWeek||weekBusy||weekStatusBusy||weekReady}",
    'Hafta aksiyon disabled koşulu',
)
text = replace_once(
    text,
    "subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,13))} · iki hafta birlikte kontrol edilir`}",
    "subtitle={`${shortDate(monday)} – ${shortDate(addDays(monday,6))} · seçilen hafta kontrol edilir`}",
    'Haftalık kontrol Sheet açıklaması',
)
page_path.write_text(text, encoding='utf-8')

check_path = Path('scripts/check-calendar-ux.mjs')
check = check_path.read_text(encoding='utf-8')
anchor = """  ['Günlük Takvimde eski büyük oklu hafta kartı ve açıklama kaldırılmıştır',!dailyCalendar.includes('daily-week-nav')&&!dailyCalendar.includes('weekTitle(')&&!dailyCalendar.includes('ChevronLeft')&&!dailyCalendar.includes('ChevronRight')&&!dailyCalendar.includes('Günü seç, boş derslik ve saate dokunarak ders ekle.')&&(dailyCalendar.match(/calendar-mode-btn/g)||[]).length===1],
"""
extra = anchor + """  ['Günlük Takvim Haftayı Hazırla yalnız seçilen haftanın durumunu kontrol eder',dailyCalendar.includes('getWeekCreationStatus(monday)')&&!dailyCalendar.includes('getWeekCreationStatus(addDays(monday,7))')&&!dailyCalendar.includes('TwoWeekCreationStatus')&&!dailyCalendar.includes('allWeeksAreReady')],
  ['Günlük Takvim hafta aksiyonu Program ile aynı seçili hafta etiketlerini kullanır',dailyCalendar.includes("weekReady?'Hafta Hazır':'Haftayı Hazırla'")&&!dailyCalendar.includes('Haftalar Hazır')&&!dailyCalendar.includes('Sonraki Haftayı Hazırla')&&!dailyCalendar.includes('İki Haftayı Hazırla')],
  ['Günlük Takvim seçili hafta hazırlama onayı güvenli V6 davranışını açıklar',dailyCalendar.includes('Tüm aktif sabit programlar işlenir.')&&dailyCalendar.includes('Daha önce oluşturulmamış dersler eklenir')&&dailyCalendar.includes('Yapıldı, İptal ve tek seferlik değişiklikler korunur.')&&dailyCalendar.includes('Bugünden önceki veya saati geçmiş dersler değiştirilmez.')],
  ['Günlük Takvim haftalık kontrol paneli yalnız seçilen hafta aralığını gösterir',dailyCalendar.includes("addDays(monday,6))} · seçilen hafta kontrol edilir")&&!dailyCalendar.includes('iki hafta birlikte kontrol edilir')],
"""
check = replace_once(check, anchor, extra, 'Günlük hafta aksiyonu regresyon kontrolleri')
check_path.write_text(check, encoding='utf-8')

print('Günlük Program hafta aksiyonu seçili haftaya eşitlendi.')
