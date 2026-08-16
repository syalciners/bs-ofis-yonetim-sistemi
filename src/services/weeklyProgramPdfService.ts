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

const lessonSort=(a:Ders,b:Ders)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||teacherName({} as AppData,a.ogretmen_id).localeCompare(teacherName({} as AppData,b.ogretmen_id),'tr-TR')

const statusClass=(status?:string|null)=>status==='İptal'?'cancelled':status==='Yapıldı'?'done':'planned'

export function buildWeeklyProgramPdfHtml(data:AppData,lessons:Ders[],monday:string,sunday:string){
  const sorted=[...lessons].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||''))||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''))||String(a.ogretmen_id||'').localeCompare(String(b.ogretmen_id||'')))
  const generatedAt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}).format(new Date())
  const daySections=Array.from({length:7},(_,index)=>{
    const date=addDays(monday,index)
    const items=sorted.filter(x=>x.tarih===date)
    if(!items.length)return''
    const rows=items.map(lesson=>`<tr class="${statusClass(lesson.ders_durumu)}">
      <td class="time">${escapeHtml(time(lesson.baslangic_saati))}-${escapeHtml(time(lesson.bitis_saati))}</td>
      <td>${escapeHtml(studentName(data,lesson.ogrenci_id))}</td>
      <td>${escapeHtml(branchName(data,lesson.brans_id))}</td>
      <td>${escapeHtml(teacherName(data,lesson.ogretmen_id))}</td>
      <td>${escapeHtml(lessonPlace(data,lesson))}</td>
      <td><span class="status">${escapeHtml(lesson.ders_durumu||'Planlandı')}</span></td>
    </tr>`).join('')
    return`<section class="day-section">
      <div class="day-title"><strong>${dayNames[index]} · ${escapeHtml(fullDate(date))}</strong><span>${items.length} ders</span></div>
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
  *{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef2f7;color:#17233d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}body{padding:18px}.toolbar{max-width:1180px;margin:0 auto 12px;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}.toolbar .print{background:#2563eb;color:#fff}.toolbar .close{background:#fff;color:#334155;border:1px solid #d9e1ec}.document{max-width:1180px;margin:0 auto;background:#fff;border:1px solid #dde5ef;border-radius:16px;padding:22px;box-shadow:0 12px 32px rgba(15,23,42,.08)}.doc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:14px;border-bottom:2px solid #2563eb}.brand{display:grid;gap:3px}.brand small{font-size:11px;font-weight:900;letter-spacing:.1em;color:#2563eb}.brand h1{font-size:24px;margin:0}.meta{text-align:right;display:grid;gap:4px;font-size:12px;color:#64748b}.meta b{color:#17233d;font-size:13px}.summary{display:flex;gap:22px;flex-wrap:wrap;padding:11px 0 4px;font-size:12px;color:#64748b}.summary b{color:#17233d}.day-section{margin-top:16px}.day-title{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 10px;background:#f1f5fb;border-left:4px solid #2563eb;border-radius:7px 7px 0 0}.day-title strong{font-size:13px}.day-title span{font-size:11px;color:#64748b;font-weight:700}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #dfe6ef;padding:7px 8px;text-align:left;vertical-align:middle;font-size:10.5px;line-height:1.25;overflow-wrap:anywhere}th{background:#f8fafc;color:#526177;text-transform:uppercase;letter-spacing:.03em;font-size:9px}th:nth-child(1),td:nth-child(1){width:12%}th:nth-child(2),td:nth-child(2){width:19%}th:nth-child(3),td:nth-child(3){width:17%}th:nth-child(4),td:nth-child(4){width:19%}th:nth-child(5),td:nth-child(5){width:19%}th:nth-child(6),td:nth-child(6){width:14%}.time{font-weight:850;white-space:nowrap}.status{display:inline-block;padding:3px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:9px}.done .status{background:#ecfdf5;color:#047857}.cancelled{color:#9f1239;background:#fff7f8}.cancelled .status{background:#fff1f2;color:#be123c}.footer{margin-top:14px;padding-top:9px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:16px;font-size:9px;color:#8190a5}
  @page{size:A4 landscape;margin:8mm}
  @media print{html,body{background:#fff!important}body{padding:0}.toolbar{display:none!important}.document{max-width:none;margin:0;border:0;border-radius:0;padding:0;box-shadow:none}.day-section{break-inside:auto}.day-title{break-after:avoid}thead{display:table-header-group}tr{break-inside:avoid}.footer{display:none}}
</style>
</head>
<body>
<div class="toolbar"><button class="close" onclick="window.close()">Kapat</button><button class="print" onclick="window.print()">Yazdır / PDF Kaydet</button></div>
<main class="document">
  <header class="doc-head"><div class="brand"><small>BS OFİS EĞİTİM YÖNETİMİ</small><h1>Haftalık Ders Programı</h1></div><div class="meta"><b>${escapeHtml(fullDate(monday))} - ${escapeHtml(fullDate(sunday))}</b><span>Tüm öğretmen ve öğrenciler</span></div></header>
  <div class="summary"><span><b>${sorted.length}</b> toplam ders</span><span>Oluşturulma: <b>${escapeHtml(generatedAt)}</b></span></div>
  ${daySections||'<p>Bu haftada ders bulunmuyor.</p>'}
  <footer class="footer"><span>BS Ofis Eğitim Yönetimi</span><span>${escapeHtml(fullDate(monday))} - ${escapeHtml(fullDate(sunday))}</span></footer>
</main>
<script>window.setTimeout(function(){window.focus();window.print()},250)</script>
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
