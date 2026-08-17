from pathlib import Path

path=Path('scripts/check-calendar-ux.mjs')
text=path.read_text(encoding='utf-8')
old1="  ['Sabit Program başlığının altında ortalanmış Takvim Liste geçişi vardır',fixed.includes('fixed-program-view-switch')&&fixed.includes('<CalendarDays size={16}/>Takvim')&&fixed.includes('<List size={16}/>Liste')&&fixedCss.includes('.fixed-program-view-switch{display:flex;align-items:center;justify-content:center')],\n"
new1="  ['Sabit Program özet satırında tek karşı-görünüm düğmesi vardır',fixed.includes('fixed-program-summary-toolbar')&&fixed.includes('fixed-program-view-toggle')&&fixed.includes(\"viewMode==='calendar'?'list':'calendar'\")&&fixed.includes('<List size={16}/>Liste')&&fixed.includes('<CalendarDays size={16}/>Takvim')&&!fixed.includes('fixed-program-view-switch')],\n"
old2="  ['Sabit Program seçili görünüm turuncu diğer görünüm gridir',fixedCss.includes('.fixed-program-view-switch button{')&&fixedCss.includes('background:#eef1f5')&&fixedCss.includes('.fixed-program-view-switch button.active')&&fixedCss.includes('#f47a16')],\n"
new2="  ['Sabit Program görünüm düğmesi mobilde özet satırının sağında kalır',fixedCss.includes('.fixed-program-summary-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important')&&fixedCss.includes('.fixed-program-summary-toolbar .fixed-program-view-toggle')&&fixedCss.includes('margin-left:auto!important')&&!fixedCss.includes('.fixed-program-view-switch')],\n"
assert old1 in text, 'Birinci eski Takvim UX beklentisi bulunamadı'
assert old2 in text, 'İkinci eski Takvim UX beklentisi bulunamadı'
text=text.replace(old1,new1,1).replace(old2,new2,1)
path.write_text(text,encoding='utf-8')
print('Takvim UX testi yeni Sabit Program görünüm kararına güncellendi.')
