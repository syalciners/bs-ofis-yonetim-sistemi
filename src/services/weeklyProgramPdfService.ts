import { addDays, fullDate, time } from '../lib/format'
import type { AppData, Ders } from '../lib/types'
import { branchName, roomName, studentName, teacherName } from './metrics'

const dayNames=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']

const escapeHtml=(value:unknown)=>String(value??'')
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;')

const lessonPlace=(data:AppData,lesson:Ders)=>{
  const online=Boolean(lesson.zoom_katilim_baglantisi)||String(lesson.ders_yeri||'').toLocaleLowerCase('tr-TR').includes('online')||String(lesson.ders_turu||'').toLocaleLowerCase('tr-TR').includes('online')
  return online?'Online':roomName(data,lesson.derslik_id)
}

const statusClass=(status?:string|null)=>status==='İptal'?'cancelled':status==='Yapıldı'?'done':'planned'

export function buildWeeklyProgramPdfHtml(data:AppData,lessons:Ders[],monday:string,sunday:string){
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.ogretmen_id||'').localeCompare(String(b.ogretmen_id||'')))
  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())
  const activeDayCount=new Set(sorted.map(x=>x.tarih).filter(Boolean)).size
  const studentCount=new Set(sorted.map(x=>x.ogrenci_id).filter(Boolean)).size
  const teacherCount=new Set(sorted.map(x=>x.ogretmen_id).filter(Boolean)).size
  const logoUrl=new URL(`${import.meta.env.BASE_URL}bs-egitim-icon-192-v2.png`,window.location.origin).href
  const daySections=Array.from({length:7},(_,index)=>{
    const date=addDays(monday,index)
    const items=sorted.filter(x=>x.tarih===date)
    if(!items.length)return''
    const rows=items.map(lesson=>`<tr class="${statusClass(lesson.ders_durumu)}">
      <td class="time">${escapeHtml(time(lesson.baslangic_saati))}-${escapeHtml(time(lesson.bitis_saati))}</td>
      <td class="student">${escapeHtml(studentName(data,lesson.ogrenci_id))}</td>
      <td>${escapeHtml(branchName(data,lesson.brans_id))}</td>
      <td class="teacher">${escapeHtml(teacherName(data,lesson.ogretmen_id))}</td>
      <td class="place">${escapeHtml(lessonPlace(data,lesson))}</td>
      <td><span class="status">${escapeHtml(lesson.ders_durumu||'Planlandı')}</span></td>
    </tr>`).join('')
    return`<section class="day-section">
      <div class="day-title"><div class="day-copy"><strong>${dayNames[index]}</strong><span>${escapeHtml(fullDate(date))}</span></div><span class="day-count">${items.length} ders</span></div>
      <table>
        <thead><tr><th>Saat</th><th>Öğrenci</th><th>Branş</th><th>Öğretmen</th><th>Derslik</th><th>Durum</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
  }).join('')

  return`<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BS Ofis Haftalık Ders Programı ${escapeHtml(fullDate(monday))}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:#eef2f7;color:#17233d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}body{padding:16px}.toolbar{max-width:900px;margin:0 auto 12px;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:0;border-radius:10px;padding:10px 14px;font-weight:850;cursor:pointer}.toolbar .print{background:#2563eb;color:#fff;box-shadow:0 7px 18px rgba(37,99,235,.18)}.toolbar .close{background:#fff;color:#334155;border:1px solid #d9e1ec}.document{max-width:900px;margin:0 auto;background:#fff;border:1px solid #dfe6ef;border-radius:18px;padding:22px;box-shadow:0 12px 34px rgba(23,35,61,.09)}.doc-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:start;padding-bottom:11px;border-bottom:1px solid #dbe5f3;position:relative}.doc-head:after{content:"";position:absolute;left:0;bottom:-1px;width:92px;height:3px;background:#2563eb;border-radius:999px}.brand-lockup{display:flex;gap:10px;align-items:center;min-width:0}.brand-mark{position:relative;width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,#173f82,#2563eb);display:grid;place-items:center;color:#fff;font-size:13px;font-weight:950;letter-spacing:-.04em;overflow:hidden;box-shadow:0 7px 18px rgba(37,99,235,.18);flex:0 0 auto}.brand-mark img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.brand-copy{display:grid;gap:2px;min-width:0}.brand-copy small{font-size:8px;letter-spacing:.16em;font-weight:900;color:#2563eb}.brand-copy h1{font-size:19px;line-height:1.04;margin:0;letter-spacing:-.03em}.brand-copy span{font-size:8px;color:#7a889e}.period{text-align:right;display:grid;gap:3px}.period small{font-size:7px;letter-spacing:.11em;font-weight:900;color:#8290a4;text-transform:uppercase}.period b{font-size:12px;white-space:nowrap}.period span{font-size:8px;color:#71809a}.summary{display:flex;align-items:center;margin:9px 0 1px;padding:7px 9px;border:1px solid #e1e8f2;background:#fbfcfe;border-radius:9px}.summary-item{flex:1;display:flex;align-items:baseline;gap:5px;padding:0 9px;border-right:1px solid #e4eaf2;white-space:nowrap}.summary-item:first-child{padding-left:0}.summary-item:last-child{border-right:0;padding-right:0}.summary-item span{font-size:7px;text-transform:uppercase;letter-spacing:.07em;color:#8a97aa;font-weight:900}.summary-item b{font-size:10.5px}.day-section{margin-top:9px;border:1px solid #dfe6ef;border-radius:11px;overflow:hidden;break-inside:avoid-page;page-break-inside:avoid}.day-title{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 9px;background:#f5f8fc;border-bottom:1px solid #dfe6ef}.day-copy{display:flex;align-items:baseline;gap:6px}.day-copy strong{font-size:11px}.day-copy span{font-size:7.5px;color:#7e8da3}.day-count{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:#eaf1ff;color:#2459b8;font-weight:850;font-size:7.5px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;vertical-align:middle;border-bottom:1px solid #e7edf5;padding:5px 7px;font-size:9px;line-height:1.2;overflow-wrap:anywhere}tr:last-child td{border-bottom:0}th{background:#fff;color:#728097;text-transform:uppercase;letter-spacing:.07em;font-size:7px;font-weight:900;padding-top:4.5px;padding-bottom:4.5px}tbody tr:nth-child(even){background:#fbfcfe}th:nth-child(1),td:nth-child(1){width:14%}th:nth-child(2),td:nth-child(2){width:19%}th:nth-child(3),td:nth-child(3){width:17%}th:nth-child(4),td:nth-child(4){width:20%}th:nth-child(5),td:nth-child(5){width:17%}th:nth-child(6),td:nth-child(6){width:13%}.time{font-weight:900;white-space:nowrap}.student{font-weight:800}.teacher{color:#33445f}.place{color:#66768d}.status{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:999px;background:#edf4ff;color:#1d5ed0;font-weight:850;font-size:7.5px;white-space:nowrap}.status:before{content:"";width:5px;height:5px;border-radius:50%;background:#3b82f6}.done .status{background:#ecfdf3;color:#0b7a4d}.done .status:before{background:#22a45a}.cancelled{color:#8c5362}.cancelled .status{background:#fff1f2;color:#be123c}.cancelled .status:before{background:#e11d48}.empty{padding:28px;text-align:center;color:#71809a;font-size:11px}.print-footer{margin-top:10px;padding-top:7px;border-top:1px solid #e5eaf1;display:flex;justify-content:space-between;gap:10px;color:#8996a8;font-size:7px}.print-footer b{color:#526178}
  @page{size:A4 portrait;margin:0}
  @media print{html,body{background:#fff!important}body{padding:9mm 9mm 10mm}.toolbar{display:none!important}.document{max-width:none;margin:0;border:0;border-radius:0;padding:0;box-shadow:none}.day-section{break-inside:avoid-page;page-break-inside:avoid}.day-title{break-after:avoid;page-break-after:avoid}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.print-footer{position:fixed;left:9mm;right:9mm;bottom:4mm;margin:0;padding-top:4px;background:#fff}}
</style>
</head>
<body>
<div class="toolbar"><button class="close" onclick="window.close()">Kapat</button><button class="print" onclick="window.print()">Yazdır / PDF Kaydet</button></div>
<main class="document">
  <header class="doc-head">
    <div class="brand-lockup"><div class="brand-mark"><span>BS</span><img src="${escapeHtml(logoUrl)}" alt="" onerror="this.style.display='none'"/></div><div class="brand-copy"><small>BS OFİS EĞİTİM YÖNETİMİ</small><h1>Haftalık Ders Programı</h1><span>Kurumsal program özeti</span></div></div>
    <div class="period"><small>Program Dönemi</small><b>${escapeHtml(fullDate(monday))} - ${escapeHtml(fullDate(sunday))}</b><span>Tüm öğretmen ve öğrenciler</span></div>
  </header>
  <div class="summary"><div class="summary-item"><span>Toplam Ders</span><b>${sorted.length}</b></div><div class="summary-item"><span>Aktif Gün</span><b>${activeDayCount}</b></div><div class="summary-item"><span>Öğrenci</span><b>${studentCount}</b></div><div class="summary-item"><span>Öğretmen</span><b>${teacherCount}</b></div></div>
  ${daySections||'<div class="empty">Bu haftada ders bulunmuyor.</div>'}
  <footer class="print-footer"><span><b>BS Ofis Eğitim Yönetimi</b> · Sistem tarafından oluşturulmuştur.</span><span>${escapeHtml(generatedAt)}</span></footer>
</main>
<script>
(function(){
  var images=Array.prototype.slice.call(document.images||[])
  var waiting=images.map(function(img){return img.complete?Promise.resolve():new Promise(function(resolve){img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})})
  Promise.all(waiting).then(function(){window.setTimeout(function(){window.focus();window.print()},180)})
})()
</script>
</body>
</html>`
}

export function openWeeklyProgramPdf(data:AppData,lessons:Ders[],monday:string,sunday:string){
  const popup=window.open('','_blank')
  if(!popup)return false
  popup.document.open()
  popup.document.write(buildWeeklyProgramPdfHtml(data,lessons,monday,sunday))
  popup.document.close()
  return true
}
