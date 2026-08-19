import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const pagePath='src/pages/DailyCalendarPage.tsx'
let page=readFileSync(pagePath,'utf8')
const before='className="secondary-btn daily-calendar-pdf-btn"'
const after='className="secondary-btn calendar-pdf-btn daily-calendar-pdf-btn"'
if(!page.includes(before))throw new Error('Takvim PDF butonu bulunamadı.')
page=page.replace(before,after)
writeFileSync(pagePath,page)

const workflowPath='.github/workflows/ci.yml'
let workflow=readFileSync(workflowPath,'utf8')
workflow=workflow.replace("      - name: Takvim PDF buton stil geçişi\n        run: node scripts/migrate-daily-pdf-button-style.mjs\n",'')
writeFileSync(workflowPath,workflow)

unlinkSync('scripts/migrate-daily-pdf-button-style.mjs')
console.log('Takvim PDF butonu Liste görünümü PDF stiliyle eşitlendi.')
