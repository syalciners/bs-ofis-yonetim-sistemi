from pathlib import Path
import re

changed=[]
pattern=re.compile(r'<section className="[^"]*page-title-row[^"]*">.*?</section>',re.S)
for p in sorted(Path('src/pages').glob('*.tsx')):
    text=p.read_text(encoding='utf-8')
    original=text
    def clean(m):
        return re.sub(r'<p>.*?</p>','',m.group(0),flags=re.S)
    text=pattern.sub(clean,text)
    if text!=original:
        p.write_text(text,encoding='utf-8')
        changed.append(str(p))
print('Ek başlık açıklaması kaldırılan sayfalar:')
for x in changed: print('-',x)
print('Toplam:',len(changed))
