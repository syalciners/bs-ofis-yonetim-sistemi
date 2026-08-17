from pathlib import Path

path=Path('scripts/check-calendar-ux.mjs')
text=path.read_text(encoding='utf-8')
old="  ['Sabit Program görünüm düğmesi mobilde özet satırının sağında kalır',fixedCss.includes('.fixed-program-summary-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important')&&fixedCss.includes('.fixed-program-summary-toolbar .fixed-program-view-toggle')&&fixedCss.includes('margin-left:auto!important')&&!fixedCss.includes('.fixed-program-view-switch')],\n"
new="  ['Sabit Program özet kartı mobilde kompakt yatay düzende kalır',fixedCss.includes('.fixed-program-summary-toolbar{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important')&&fixedCss.includes('min-height:78px!important')&&fixedCss.includes('.fixed-program-summary-toolbar>div{justify-items:start!important;text-align:left!important}')&&fixedCss.includes('.fixed-program-summary-toolbar .fixed-program-view-toggle')&&fixedCss.includes('margin-left:auto!important')&&!fixedCss.includes('.fixed-program-view-switch')],\n"
assert old in text, 'Eski Sabit Program mobil özet testi bulunamadı'
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Sabit Program kompakt özet regresyon testi güncellendi.')
