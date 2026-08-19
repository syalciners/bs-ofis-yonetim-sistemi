import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const write = (path, content) => writeFileSync(path, content)
const replaceRequired = (source, find, replacement, label) => {
  if (!source.includes(find)) throw new Error(`Portal durum rengi geçişi bulunamadı: ${label}`)
  return source.replace(find, replacement)
}

const pagePath = 'src/pages/PortalPreviewPage.tsx'
let page = read(pagePath)
page = replaceRequired(
  page,
  '<div className="portal-preview-lesson-heading"><strong>{lesson.brans_adi || \'Ders\'}</strong><span>{lesson.ders_durumu || \'Planlandı\'}</span></div>',
  '<div className="portal-preview-lesson-heading"><strong>{lesson.brans_adi || \'Ders\'}</strong><span className="portal-preview-lesson-status" data-status={lesson.ders_durumu || \'Planlandı\'}>{lesson.ders_durumu || \'Planlandı\'}</span></div>',
  'ders durum etiketi'
)
write(pagePath, page)

const cssPath = 'src/portal-preview.css'
let css = read(cssPath)
const statusCss = `

/* Öğretmen ve öğrenci portalı ders durumları: yönetim ekranlarıyla aynı renk dili. */
.portal-preview-lesson-status{display:inline-flex!important;align-items:center;gap:5px;font-weight:900!important;border:1px solid #dbe6ef!important}
.portal-preview-lesson-status::before{content:'';display:inline-grid;place-items:center;flex:0 0 auto;width:12px;height:12px;border-radius:999px;font-size:9px;font-weight:950;line-height:1}
.portal-preview-lesson-status[data-status="Planlandı"]{background:#eff6ff!important;color:#1d4ed8!important;border-color:#bfdbfe!important}
.portal-preview-lesson-status[data-status="Planlandı"]::before{width:7px;height:7px;background:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.12)}
.portal-preview-lesson-status[data-status="Yapıldı"]{background:#f0fdf4!important;color:#15803d!important;border-color:#bbf7d0!important}
.portal-preview-lesson-status[data-status="Yapıldı"]::before{content:'✓';background:#22a06b;color:#fff;box-shadow:0 0 0 2px rgba(34,160,107,.12)}
.portal-preview-lesson-status[data-status="İptal"],.portal-preview-lesson-status[data-status="Öğretmen İptali"]{background:#fef2f2!important;color:#b91c1c!important;border-color:#fecaca!important}
.portal-preview-lesson-status[data-status="İptal"]::before,.portal-preview-lesson-status[data-status="Öğretmen İptali"]::before{content:'×';background:#dc4c4c;color:#fff;box-shadow:0 0 0 2px rgba(220,76,76,.12)}
`
if (!css.includes('portal-preview-lesson-status[data-status="Yapıldı"]')) css += statusCss
write(cssPath, css)

const checkPath = 'scripts/check-manager-portal-preview.mjs'
let check = read(checkPath)
check = replaceRequired(
  check,
  "  ['Portal routeu headerda Portal Önizlemesi olarak tanımlıdır',header.includes(\"pathname.startsWith('/portal-onizleme')\")&&header.includes(\"'PORTAL ÖNİZLEMESİ'\")],",
  "  ['Portal routeu headerda Portal Önizlemesi olarak tanımlıdır',header.includes(\"pathname.startsWith('/portal-onizleme')\")&&header.includes(\"'PORTAL ÖNİZLEMESİ'\")],\n  ['Öğretmen ve öğrenci portalı ders durumları ortak renk standardını kullanır',preview.includes('className=\"portal-preview-lesson-status\"')&&preview.includes('data-status={lesson.ders_durumu')&&css.includes('portal-preview-lesson-status[data-status=\"Planlandı\"]')&&css.includes('portal-preview-lesson-status[data-status=\"Yapıldı\"]')&&css.includes('portal-preview-lesson-status[data-status=\"İptal\"]')&&css.includes(\"content:'✓'\")&&css.includes(\"content:'×'\")],",
  'portal durum regresyonu'
)
write(checkPath, check)

const workflowPath = '.github/workflows/ci.yml'
let workflow = read(workflowPath)
workflow = workflow.replace("      - name: Portal ders durum renkleri geçişi\n        run: node scripts/migrate-portal-lesson-status-colors.mjs\n", '')
write(workflowPath, workflow)

unlinkSync('scripts/migrate-portal-lesson-status-colors.mjs')
console.log('Portal ders durum renkleri uygulandı ve geçici migrasyon temizlendi.')
