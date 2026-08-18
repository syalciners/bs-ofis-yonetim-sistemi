from pathlib import Path

p=Path('src/program-share.css')
text=p.read_text(encoding='utf-8')
replacements=[
(".calendar-week-toolbar-balanced{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0}",
 ".calendar-week-toolbar-balanced{--program-week-center-width:clamp(90px,12vw,132px);display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0}"),
(".calendar-week-toolbar-balanced .calendar-week-range-long{min-width:0;min-height:36px;justify-content:center;padding:0 8px;text-align:center;font-size:10px;letter-spacing:-.015em}",
 ".calendar-week-toolbar-balanced .calendar-week-range-long{width:var(--program-week-center-width);min-width:var(--program-week-center-width);min-height:36px;justify-self:center;justify-content:center;padding:0 8px;text-align:center;font-size:10px;letter-spacing:-.015em}"),
(".calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:clamp(90px,12vw,132px);grid-template-columns:26px var(--current-week-width) 26px;gap:2px;padding:3px}",
 ".calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:var(--program-week-center-width);grid-template-columns:26px var(--current-week-width) 26px;gap:2px;padding:3px}"),
("  .calendar-week-toolbar-balanced{grid-template-columns:80px minmax(0,1fr) auto;gap:5px}",
 "  .calendar-week-toolbar-balanced{--program-week-center-width:90px;grid-template-columns:80px minmax(0,1fr) auto;gap:5px}"),
("  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:90px;grid-template-columns:24px var(--current-week-width) 24px;gap:2px;padding:3px}",
 "  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:var(--program-week-center-width);grid-template-columns:24px var(--current-week-width) 24px;gap:2px;padding:3px}"),
("  .calendar-week-toolbar-balanced{grid-template-columns:72px minmax(0,1fr) auto;gap:4px}",
 "  .calendar-week-toolbar-balanced{--program-week-center-width:82px;grid-template-columns:72px minmax(0,1fr) auto;gap:4px}"),
("  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:82px;grid-template-columns:22px var(--current-week-width) 22px}",
 "  .calendar-week-toolbar-balanced .calendar-week-nav-compact{--current-week-width:var(--program-week-center-width);grid-template-columns:22px var(--current-week-width) 22px}"),
]
for old,new in replacements:
    if old not in text:
        raise SystemExit(f'Beklenen CSS bulunamadı: {old}')
    text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

css=p.read_text(encoding='utf-8')
assert 'width:var(--program-week-center-width)' in css
assert '--current-week-width:var(--program-week-center-width)' in css
assert '--program-week-center-width:90px' in css
assert '--program-week-center-width:82px' in css
print('Program tarih aralığı ve Bu Hafta genişliği eşitlendi.')
