import fs from 'node:fs'

const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8')
const css = fs.readFileSync('src/report-corporate.css', 'utf8')
const studentPdf = fs.readFileSync('src/services/studentAccountPdfService.ts', 'utf8')

const checks = [
  ['Öğrenci ve dönem filtresi aynı satırda', reports.includes("type === 'ogrenci'") && reports.includes('studentRangePreset') && reports.includes('report-filter-row no-print')],
  ['Öğretmen ve hakediş dönemi aynı satırda', reports.includes("type === 'ogretmen'") && reports.includes('teacherPeriod') && reports.includes('Hakediş Dönemi')],
  ['Öğrenci özel tarih aralığı', reports.includes("studentRangePreset === 'custom'") && reports.includes('studentCustomStart') && reports.includes('studentCustomEnd')],
  ['Kurum dönem ve özel tarih aralığı', reports.includes('institutionRangePreset') && reports.includes("institutionRangePreset === 'custom'")],
  ['Öğrenci devir bakiyesi hesaplanıyor', reports.includes('openingBalance') && reports.includes('Önceki Dönemden Devir')],
  ['Öğrenci dönem sonu bakiyesi hesaplanıyor', reports.includes('periodEndBalance') && reports.includes('Ödenecek Bakiye') && reports.includes('Peşin Bakiye')],
  ['Öğrenci ders adedi kayıt sayısı yerine ders_sayisi toplamıdır', reports.includes('const lessonUnits = periodLessons.reduce((sum, x) => sum + Number(x.ders_sayisi || 1), 0)') && reports.includes('<small>{lessonUnits} ders</small>')],
  ['Öğrenci ekstresi gerçek PDF motorunu kullanır', reports.includes('openStudentAccountPdf') && studentPdf.includes("import('pdfmake/build/pdfmake')") && studentPdf.includes('.download(filename)')],
  ['Öğrenci PDF tablosunda Tahsilat sütunu korunur', studentPdf.includes("{text:'TAHSİLAT',style:'th',alignment:'right'}") && studentPdf.includes('widths:[68,205,74,74,74]')],
  ['Öğrenci PDF tarayıcı footerı yerine kontrollü footer kullanır', studentPdf.includes("BS Eğitim Yönetimi',bold:true,color:NAVY") && studentPdf.includes('currentPage') && !studentPdf.includes('window.print')],
  ['Öğrenci PDF mevcut BS Eğitim public logo ailesini kullanır', studentPdf.includes("bs-egitim-icon-512-v2.png") && studentPdf.includes("bs-egitim-icon-192-v2.png")],
  ['Öğretmen detayında branş ve birim hakediş var', reports.includes('Birim Hakediş') && reports.includes('Hakediş Tutarı') && reports.includes('branchName(data, x.brans_id)')],
  ['Kurum operasyon ve nakit ayrımı var', reports.includes('OPERASYONEL SONUÇ') && reports.includes('NAKİT AKIŞI') && reports.includes('operationalResult') && reports.includes('netCashMovement')],
  ['Kurum finansal durum KPI alanları var', reports.includes('Öğrenci Alacağı') && reports.includes('Öğretmen Borcu') && reports.includes('Kasa / Banka')],
  ['Mevcut BS Eğitim public logo ailesi kullanılıyor', reports.includes('bs-egitim-icon-512-v2.png')],
  ['Premium A4 dikey baskı korunuyor', css.includes('@page{size:A4 portrait') && css.includes('.report-brand-lockup') && css.includes('.report-dual-summary')],
  ['Mobilde filtreler kontrollü olarak tek kolona düşüyor', css.includes('@media(max-width:650px)') && css.includes('.report-page .report-filter-row,.report-date-row{grid-template-columns:1fr}')],
]

let failed = false
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed = true
}

if (failed) process.exit(1)
console.log('\nRaporlar premium UX regresyon kontrolleri geçti.')
