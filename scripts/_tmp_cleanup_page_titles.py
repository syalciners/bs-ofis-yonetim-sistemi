from pathlib import Path
import re

changed=[]
for p in sorted(Path('src/pages').glob('*.tsx')):
    text=p.read_text(encoding='utf-8')
    original=text
    def clean_title_block(m):
        block=m.group(0)
        return re.sub(r'<p>.*?</p>', '', block, flags=re.S)
    text=re.sub(r'<section className="page-title-row">.*?</section>', clean_title_block, text, flags=re.S)
    if text != original:
        p.write_text(text,encoding='utf-8')
        changed.append(str(p))

styles=Path('src/styles.css')
css=styles.read_text(encoding='utf-8')
old='.page-stack{display:grid;gap:16px;padding:16px 0 26px}'
new='.page-stack{display:grid;gap:16px;padding:6px 0 26px}'
if old not in css:
    raise SystemExit('Beklenen page-stack üst boşluk kuralı bulunamadı')
styles.write_text(css.replace(old,new,1),encoding='utf-8')

print('Başlık açıklaması kaldırılan sayfalar:')
for x in changed:
    print('-',x)
print('Toplam:',len(changed))
