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

export function buildWeeklyProgramPdfHtml(data:AppData,lessons:Ders[],monday:string,sunday:string,programLabel='Tüm Program'){
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.ogretmen_id||'').localeCompare(String(b.ogretmen_id||'')))
  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())
  const activeDayCount=new Set(sorted.map(x=>x.tarih).filter(Boolean)).size
  const studentCount=new Set(sorted.map(x=>x.ogrenci_id).filter(Boolean)).size
  const teacherCount=new Set(sorted.map(x=>x.ogretmen_id).filter(Boolean)).size
  const plannedCount=sorted.filter(x=>(x.ders_durumu||'Planlandı')==='Planlandı').length
  const doneCount=sorted.filter(x=>x.ders_durumu==='Yapıldı').length
  const cancelledCount=sorted.filter(x=>x.ders_durumu==='İptal').length
  const logoUrl=new URL(`${import.meta.env.BASE_URL}bs-egitim-icon-192-v2.png`,window.location.origin).href

  const daySections=Array.from({length:7},(_,index)=>{
    const date=addDays(monday,index)
    const items=sorted.filter(x=>x.tarih===date)
    if(!items.length)return''
    const rows=items.map(lesson=>`<tr class="${statusClass(lesson.ders_durumu)}">
      <td class="time">${escapeHtml(time(lesson.baslangic_saati))}<span>${escapeHtml(time(lesson.bitis_saati))}</span></td>
      <td class="student">${escapeHtml(studentName(data,lesson.ogrenci_id))}</td>
      <td>${escapeHtml(branchName(data,lesson.brans_id))}</td>
      <td class="teacher">${escapeHtml(teacherName(data,lesson.ogretmen_id))}</td>
      <td class="place">${escapeHtml(lessonPlace(data,lesson))}</td>
      <td><span class="status">${escapeHtml(lesson.ders_durumu||'Planlandı')}</span></td>
    </tr>`).join('')
    return`<section class="day-section">
      <div class="day-title">
        <div class="day-number">${String(index+1).padStart(2,'0')}</div>
        <div class="day-copy"><strong>${dayNames[index]}</strong><span>${escapeHtml(fullDate(date))}</span></div>
        <span class="day-count">${items.length} ders</span>
      </div>
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
<meta name="color-scheme" content="light only"/>
<title>BS Eğitim Yönetimi Haftalık Ders Programı ${escapeHtml(fullDate(monday))}</title>
<style>
  :root{--navy:#14213d;--navy2:#0e3265;--blue:#2563eb;--teal:#2f9c95;--ink:#17233d;--muted:#71809a;--line:#dfe6f1;--soft:#f6f8fc;--blueSoft:#eaf1ff;--tealSoft:#e7f8f5;--green:#22a45a;--greenSoft:#eaf8ef;--red:#dc3545;--redSoft:#fff0f0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;background:#edf2f8;color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
  body{padding:18px}
  .toolbar{max-width:1120px;margin:0 auto 12px;display:flex;justify-content:flex-end;gap:8px}
  .toolbar button{min-height:38px;border-radius:11px;padding:0 14px;font-size:11px;font-weight:800;cursor:pointer}
  .toolbar .print{border:1px solid var(--blue);background:var(--blue);color:#fff;box-shadow:0 8px 20px rgba(37,99,235,.18)}
  .toolbar .close{border:1px solid #d7e0ec;background:#fff;color:#384965}
  .document{max-width:1120px;margin:0 auto;background:#fff;border:1px solid #d9e2ee;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px rgba(20,33,61,.11)}
  .hero{position:relative;padding:18px 22px 20px;color:#fff;background:linear-gradient(122deg,var(--navy) 0%,var(--navy2) 44%,#1f5fd3 78%,var(--teal) 126%);overflow:hidden}
  .hero:after{content:"";position:absolute;right:-80px;top:-120px;width:310px;height:310px;border:1px solid rgba(255,255,255,.12);border-radius:50%}
  .hero:before{content:"";position:absolute;right:54px;bottom:-68px;width:190px;height:190px;border:26px solid rgba(255,255,255,.035);border-radius:50%}
  .hero-top,.hero-main{position:relative;z-index:1}
  .hero-top{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.17)}
  .brand-lockup{display:flex;align-items:center;gap:11px;min-width:0}
  .brand-mark{width:44px;height:44px;flex:0 0 auto;border-radius:13px;padding:3px;background:#fff;box-shadow:0 8px 24px rgba(5,17,40,.2)}
  .brand-mark img{display:block;width:100%;height:100%;object-fit:cover;border-radius:10px}
  .brand-copy{display:grid;gap:2px}
  .brand-copy strong{font-size:12px;letter-spacing:.09em}
  .brand-copy span{font-size:8px;color:rgba(255,255,255,.69);letter-spacing:.08em;text-transform:uppercase}
  .doc-type{text-align:right;display:grid;gap:3px}
  .doc-type strong{font-size:8px;letter-spacing:.16em;text-transform:uppercase}
  .doc-type span{font-size:7.5px;color:rgba(255,255,255,.67)}
  .hero-main{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:28px;align-items:end;padding-top:17px}
  .hero-kicker{display:block;margin-bottom:6px;font-size:7.5px;font-weight:900;letter-spacing:.16em;color:#9ddbd6;text-transform:uppercase}
  .hero h1{margin:0;max-width:650px;font-size:24px;line-height:1.04;letter-spacing:-.035em;overflow-wrap:anywhere}
  .hero-title{margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.75)}
  .period-card{justify-self:end;width:100%;max-width:350px;padding:10px 12px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.07);backdrop-filter:blur(8px)}
  .period-card span{display:block;font-size:7px;font-weight:900;letter-spacing:.14em;color:#a8d9ff;text-transform:uppercase}
  .period-card b{display:block;margin-top:4px;font-size:11.5px}
  .period-card small{display:block;margin-top:4px;font-size:7.5px;color:rgba(255,255,255,.62)}
  .content{padding:14px 18px 16px}
  .summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
  .summary-item{min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:#fff}
  .summary-item span{display:block;font-size:6.7px;font-weight:900;letter-spacing:.11em;color:#8390a4;text-transform:uppercase}
  .summary-item b{display:block;margin-top:3px;font-size:13px;line-height:1;color:var(--navy)}
  .status-strip{display:flex;align-items:center;gap:14px;margin:8px 1px 0;color:#697893;font-size:7.5px}
  .status-strip>span{display:inline-flex;align-items:center;gap:5px;font-weight:750}
  .status-strip i{width:6px;height:6px;border-radius:50%;display:block}
  .status-strip .planned i{background:var(--blue)}
  .status-strip .done i{background:var(--green)}
  .status-strip .cancelled i{background:var(--red)}
  .day-section{margin-top:10px;border:1px solid #dce5f0;border-radius:12px;overflow:hidden;background:#fff;break-inside:avoid-page;page-break-inside:avoid}
  .day-title{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:9px;padding:7px 9px;background:linear-gradient(90deg,#f6f9fe 0%,#fbfcfe 100%);border-bottom:1px solid #dde6f1}
  .day-title:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--blue),var(--teal))}
  .day-number{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:#fff;border:1px solid #dce6f5;color:#5a6c86;font-size:7px;font-weight:900}
  .day-copy{display:flex;align-items:baseline;gap:7px;min-width:0}
  .day-copy strong{font-size:10.5px;color:var(--navy)}
  .day-copy span{font-size:7.2px;color:#7b899f}
  .day-count{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:var(--blueSoft);color:#2459b8;font-size:7px;font-weight:850;white-space:nowrap}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  th,td{text-align:left;vertical-align:middle;border-bottom:1px solid #e8edf4;padding:5px 7px;font-size:8.7px;line-height:1.2;overflow-wrap:anywhere}
  th{background:#fff;color:#7a8799;text-transform:uppercase;letter-spacing:.075em;font-size:6.6px;font-weight:900;padding-top:5px;padding-bottom:5px}
  tbody tr:nth-child(even){background:#fbfcfe}
  tbody tr:last-child td{border-bottom:0}
  tbody tr.cancelled{background:#fff9fa;color:#7c5660}
  th:nth-child(1),td:nth-child(1){width:13%}
  th:nth-child(2),td:nth-child(2){width:20%}
  th:nth-child(3),td:nth-child(3){width:17%}
  th:nth-child(4),td:nth-child(4){width:20%}
  th:nth-child(5),td:nth-child(5){width:17%}
  th:nth-child(6),td:nth-child(6){width:13%}
  .time{font-weight:900;color:var(--navy);white-space:nowrap}
  .time span{margin-left:3px;color:#7a889c;font-weight:700}
  .time span:before{content:"–";margin-right:3px;color:#9aa7b8}
  .student{font-weight:850;color:#22324e}
  .teacher{color:#3f506b}
  .place{color:#64748b}
  .status{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:999px;background:var(--blueSoft);color:#1d5ed0;font-size:7px;font-weight:850;white-space:nowrap}
  .status:before{content:"";width:5px;height:5px;border-radius:50%;background:#3b82f6}
  .done .status{background:var(--greenSoft);color:#0b7a4d}
  .done .status:before{background:var(--green)}
  .cancelled .status{background:var(--redSoft);color:#b42334}
  .cancelled .status:before{background:var(--red)}
  .empty{margin-top:10px;padding:34px;text-align:center;border:1px dashed #cad6e5;border-radius:12px;background:#fafcff;color:#71809a;font-size:10px}
  .print-footer{margin-top:10px;padding:8px 2px 0;border-top:1px solid #e3e9f1;display:flex;align-items:center;justify-content:space-between;gap:14px;color:#8794a7;font-size:6.8px}
  .print-footer b{color:#50617a}
  @page{size:A4 landscape;margin:0}
  @media print{
    html,body{background:#fff!important}
    body{padding:8mm 9mm 12mm}
    .toolbar{display:none!important}
    .document{max-width:none;margin:0;border:0;border-radius:0;overflow:visible;box-shadow:none}
    .hero{border-radius:0}
    .content{padding:10px 0 0}
    .hero,.summary,.status-strip{break-inside:avoid;page-break-inside:avoid}
    .day-section{break-inside:auto;page-break-inside:auto;margin-top:7px}
    .day-title{break-after:avoid;page-break-after:avoid}
    thead{display:table-header-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    .print-footer{position:fixed;left:9mm;right:9mm;bottom:4mm;margin:0;padding-top:4px;background:#fff}
  }
</style>
</head>
<body>
<div class="toolbar"><button class="close" onclick="window.close()">Kapat</button><button class="print" onclick="window.print()">Yazdır / PDF Kaydet</button></div>
<main class="document">
  <header class="hero">
    <div class="hero-top">
      <div class="brand-lockup">
        <div class="brand-mark"><img src="${escapeHtml(logoUrl)}" alt="BS Eğitim Yönetimi" onerror="this.parentElement.style.display='none'"/></div>
        <div class="brand-copy"><strong>BS EĞİTİM YÖNETİMİ</strong><span>Kurumsal Eğitim Operasyonları</span></div>
      </div>
      <div class="doc-type"><strong>Haftalık Program</strong><span>Resmî sistem çıktısı</span></div>
    </div>
    <div class="hero-main">
      <div><span class="hero-kicker">Seçili Program</span><h1>${escapeHtml(programLabel)}</h1><p class="hero-title">Haftalık Ders Programı</p></div>
      <div class="period-card"><span>Program Dönemi</span><b>${escapeHtml(fullDate(monday))} — ${escapeHtml(fullDate(sunday))}</b><small>${escapeHtml(generatedAt)} tarihinde oluşturuldu</small></div>
    </div>
  </header>
  <div class="content">
    <section class="summary">
      <div class="summary-item"><span>Toplam Ders</span><b>${sorted.length}</b></div>
      <div class="summary-item"><span>Aktif Gün</span><b>${activeDayCount}</b></div>
      <div class="summary-item"><span>Öğrenci</span><b>${studentCount}</b></div>
      <div class="summary-item"><span>Öğretmen</span><b>${teacherCount}</b></div>
    </section>
    <div class="status-strip"><span class="planned"><i></i>Planlandı ${plannedCount}</span><span class="done"><i></i>Yapıldı ${doneCount}</span><span class="cancelled"><i></i>İptal ${cancelledCount}</span></div>
    ${daySections||'<div class="empty">Bu haftada ders bulunmuyor.</div>'}
    <footer class="print-footer"><span><b>BS Eğitim Yönetimi</b> · Haftalık program belgesi</span><span>${escapeHtml(generatedAt)}</span></footer>
  </div>
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

export function openWeeklyProgramPdf(data:AppData,lessons:Ders[],monday:string,sunday:string,programLabel='Tüm Program'){
  const popup=window.open('','_blank')
  if(!popup)return false
  popup.document.open()
  popup.document.write(buildWeeklyProgramPdfHtml(data,lessons,monday,sunday,programLabel))
  popup.document.close()
  return true
}
