from pathlib import Path

fixed_path=Path('src/pages/FixedProgramPage.tsx')
fixed=fixed_path.read_text(encoding='utf-8')

old="  const[showPassive,setShowPassive]=useState(false)\n"
assert old in fixed
fixed=fixed.replace(old,'',1)

old="  const programs=useMemo(()=>{if(!data)return[];return data.sabitProgramlar.filter(x=>showPassive||!(x.program_durumu==='Pasif'||x.aktif===false)).sort((a,b)=>dayNames.indexOf(a.haftanin_gunu||'')-dayNames.indexOf(b.haftanin_gunu||'')||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data,showPassive])\n"
new="  const programs=useMemo(()=>{if(!data)return[];return data.sabitProgramlar.filter(x=>!(x.program_durumu==='Pasif'||x.aktif===false)).sort((a,b)=>dayNames.indexOf(a.haftanin_gunu||'')-dayNames.indexOf(b.haftanin_gunu||'')||String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')))},[data])\n"
assert old in fixed
fixed=fixed.replace(old,new,1)

old='''    <section className="fixed-program-view-switch" aria-label="Sabit program görünümü">
      <button type="button" className={viewMode==='calendar'?'active':''} aria-pressed={viewMode==='calendar'} onClick={()=>setViewMode('calendar')}><CalendarDays size={16}/>Takvim</button>
      <button type="button" className={viewMode==='list'?'active':''} aria-pressed={viewMode==='list'} onClick={()=>setViewMode('list')}><List size={16}/>Liste</button>
    </section>

    <section className="fixed-program-toolbar"><div><b>{programs.length} program</b><span>{showPassive?'Aktif ve pasif kayıtlar':'Yalnız aktif kayıtlar'}</span></div><button className="secondary-btn" onClick={()=>setShowPassive(x=>!x)}>{showPassive?'Pasifleri Gizle':'Pasifleri Göster'}</button></section>
'''
new='''    <section className="fixed-program-toolbar fixed-program-summary-toolbar" aria-label="Sabit program özeti ve görünüm">
      <div><b>{programs.length} program</b><span>Yalnız aktif kayıtlar</span></div>
      <button className="calendar-mode-btn fixed-program-view-toggle" type="button" onClick={()=>setViewMode(viewMode==='calendar'?'list':'calendar')} aria-label={viewMode==='calendar'?'Liste görünümüne geç':'Takvim görünümüne geç'}>
        {viewMode==='calendar'?<><List size={16}/>Liste</>:<><CalendarDays size={16}/>Takvim</>}
      </button>
    </section>
'''
assert old in fixed
fixed=fixed.replace(old,new,1)

old='''      {!programs.length&&<div className="calm-empty"><Repeat2/><b>Sabit program bulunamadı.</b><span>Yeni sabit ders ekleyebilir veya pasif kayıtları gösterebilirsiniz.</span></div>}
'''
new='''      {!programs.length&&<div className="calm-empty"><Repeat2/><b>Sabit program bulunamadı.</b><span>Yeni sabit ders ekleyerek başlayabilirsiniz.</span></div>}
'''
assert old in fixed
fixed=fixed.replace(old,new,1)
fixed_path.write_text(fixed,encoding='utf-8')

css_path=Path('src/fixed-program-calendar.css')
css=css_path.read_text(encoding='utf-8')
old='''.fixed-program-view-switch{display:flex;align-items:center;justify-content:center;gap:6px;width:100%}
.fixed-program-view-switch button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:118px;min-height:36px;padding:7px 16px;border:1px solid #d9e0e8;border-radius:11px;background:#eef1f5;color:#667487;font-size:10.5px;font-weight:900;cursor:pointer;box-shadow:0 3px 9px rgba(30,52,82,.035);transition:transform .15s ease,box-shadow .15s ease,background .15s ease,color .15s ease,border-color .15s ease}
.fixed-program-view-switch button.active{border-color:#f08a18;background:linear-gradient(135deg,#f6a51c,#f47a16);color:#fff;box-shadow:0 7px 16px rgba(244,122,22,.22)}
.fixed-program-view-switch button:active{transform:scale(.98)}

'''
assert old in css
css=css.replace(old,'',1)
css='''.fixed-program-summary-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}
.fixed-program-summary-toolbar>div{min-width:0;display:grid;gap:3px}
.fixed-program-summary-toolbar .fixed-program-view-toggle{flex:0 0 auto;width:auto!important;min-width:92px!important;margin-left:auto!important}

'''+css
old='''  .fixed-program-view-switch button{min-width:108px;min-height:34px;padding:6px 12px;font-size:10px}
'''
assert old in css
css=css.replace(old,'''  .fixed-program-summary-toolbar{display:flex!important;align-items:center!important}
  .fixed-program-summary-toolbar .fixed-program-view-toggle{width:auto!important;min-width:88px!important;margin-left:auto!important}
''',1)
css_path.write_text(css,encoding='utf-8')

test_path=Path('scripts/check-smart-scheduling.mjs')
test=test_path.read_text(encoding='utf-8')
anchor="  ['Sabit program Takvim dokunmatik sürükleme 0,55 saniye kullanır',fixed.includes('const LONG_PRESS_MS=550')&&fixed.includes('window.setTimeout(()=>activateProgramDrag')],\n"
assert anchor in test
addition="  ['Sabit program ekranı yalnız aktif kayıtları gösterir',fixed.includes(\"data.sabitProgramlar.filter(x=>!(x.program_durumu==='Pasif'||x.aktif===false))\")&&!fixed.includes('showPassive')&&!fixed.includes('Pasifleri Göster')&&!fixed.includes('Pasifleri Gizle')],\n  ['Sabit program görünümü tek karşı-görünüm düğmesiyle değişir',fixed.includes('fixed-program-view-toggle')&&fixed.includes(\"viewMode==='calendar'?'list':'calendar'\")&&fixed.includes('<List size={16}/>Liste')&&fixed.includes('<CalendarDays size={16}/>Takvim')&&!fixed.includes('fixed-program-view-switch')],\n  ['Sabit program özet satırı görünüm düğmesini sağda tutar',read('src/fixed-program-calendar.css').includes('.fixed-program-summary-toolbar')&&read('src/fixed-program-calendar.css').includes('.fixed-program-view-toggle')],\n"
test=test.replace(anchor,addition+anchor,1)
test_path.write_text(test,encoding='utf-8')
print('Sabit Program görünümü sadeleştirildi.')
