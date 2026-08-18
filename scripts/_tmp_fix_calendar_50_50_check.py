from pathlib import Path

path=Path('scripts/check-calendar-ux.mjs')
text=path.read_text(encoding='utf-8')
old="  ['Bu Hafta dengeli responsive genişlik kullanır',programCss.includes('--current-week-width:clamp(90px,12vw,132px)')&&programCss.includes('--current-week-width:90px')],"
new="  ['Takvim butonu sonrası tarih ve Bu Hafta alanı eşit iki sütundur',read('src/program-week-layout.css').includes('grid-template-columns:auto minmax(0,1fr) minmax(0,1fr)')&&read('src/program-week-layout.css').includes('grid-template-columns:26px minmax(0,1fr) 26px')&&read('src/program-week-layout.css').includes('grid-template-columns:80px minmax(0,1fr) minmax(0,1fr)')&&read('src/program-week-layout.css').includes('grid-template-columns:72px minmax(0,1fr) minmax(0,1fr)')],"
if old not in text:
    raise SystemExit('Eski Bu Hafta regresyon kontrolü bulunamadı.')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Takvim 50/50 regresyon kontrolü güncellendi.')
