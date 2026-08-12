(function(){
  if(window.BSHaftalikDersModuluV1) return;

  let sonOnizleme=null;

  function stilEkle(){
    if(document.getElementById('bsHaftalikDersStil')) return;
    const s=document.createElement('style');s.id='bsHaftalikDersStil';
    s.textContent=`
      .bshft-modal{position:fixed;inset:0;z-index:600;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.38);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}.bshft-modal.acik{display:flex}
      .bshft-panel{width:min(720px,100%);max-height:88dvh;overflow:auto;background:#f8fafc;border-radius:24px 24px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(15,23,42,.18)}.bshft-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.bshft-baslik{font-size:20px;font-weight:820;color:var(--yazi)}.bshft-alt{margin-top:5px;font-size:11px;line-height:1.45;color:var(--ikincil)}.bshft-kapat{width:38px;height:38px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:22px;line-height:1;cursor:pointer}
      .bshft-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.bshft-kart{padding:13px 12px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.bshft-kart span{display:block;color:var(--ikincil);font-size:9.5px;font-weight:700}.bshft-kart strong{display:block;margin-top:8px;color:var(--yazi);font-size:22px;line-height:1;font-weight:850}
      .bshft-liste{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:#fff}.bshft-liste-baslik{padding:12px 14px;border-bottom:1px solid var(--kenar);font-size:12px;font-weight:800}.bshft-satir{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #f1f5f9}.bshft-satir:last-child{border-bottom:none}.bshft-saat{padding:8px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:10px;font-weight:800}.bshft-ad{font-size:11px;font-weight:800;color:var(--yazi)}.bshft-detay{margin-top:4px;display:flex;flex-wrap:wrap;gap:3px 8px;color:var(--ikincil);font-size:9px}.bshft-rozet{padding:6px 8px;border-radius:999px;background:var(--yesil-acik);color:var(--yesil);font-size:8.5px;font-weight:800;white-space:nowrap}
      .bshft-uyari{margin-top:12px;padding:11px 12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:10px;line-height:1.5}.bshft-bos{padding:24px;text-align:center;color:var(--ikincil);font-size:11px}.bshft-altbar{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:10px;background:linear-gradient(to top,#f8fafc 85%,rgba(248,250,252,0))}.bshft-olustur{height:46px;padding:0 18px;border:1px solid var(--mavi);border-radius:12px;background:var(--mavi);color:#fff;font-size:11px;font-weight:820;cursor:pointer}.bshft-olustur[disabled]{opacity:.55}.bshft-basari{padding:18px;border:1px solid #bbf7d0;border-radius:14px;background:#f0fdf4;color:#166534;font-size:11px;line-height:1.55}.bshft-basari strong{display:block;font-size:15px;margin-bottom:5px}
      @media(max-width:640px){.bshft-panel{padding:15px 12px calc(18px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0}.bshft-baslik{font-size:18px}.bshft-kpi{grid-template-columns:repeat(2,1fr)}.bshft-kart{padding:11px}.bshft-kart strong{font-size:20px}.bshft-satir{padding:10px 11px;grid-template-columns:52px minmax(0,1fr) auto}.bshft-liste-baslik{padding:11px}.bshft-olustur{width:100%}}
    `;document.head.appendChild(s);
  }

  function modalHazirla(){
    if(document.getElementById('bsHaftalikDersModal')) return;
    const el=document.createElement('div');el.id='bsHaftalikDersModal';el.className='bshft-modal';
    el.innerHTML=`<div class="bshft-panel"><div class="bshft-ust"><div><div class="bshft-baslik">Haftalık Dersleri Oluştur</div><div id="bsHaftalikDersHafta" class="bshft-alt">Program kontrol ediliyor…</div></div><button id="bsHaftalikDersKapat" class="bshft-kapat" type="button">×</button></div><div id="bsHaftalikDersIcerik"><div class="bshft-bos">Kontrol ediliyor…</div></div></div>`;
    document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target===el) el.classList.remove('acik');});document.getElementById('bsHaftalikDersKapat').addEventListener('click',()=>el.classList.remove('acik'));
  }

  async function onizleme(){
    const modal=document.getElementById('bsHaftalikDersModal'),icerik=document.getElementById('bsHaftalikDersIcerik');modal.classList.add('acik');icerik.innerHTML='<div class="bshft-bos">Sabit program ve mevcut dersler kontrol ediliyor…</div>';
    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders/program servisi yüklenmedi.');sonOnizleme=await BSDersProgramServisi.haftalikOnizleme();const sonuc=sonOnizleme,h=sonuc.hafta,ref=sonuc.referanslar;document.getElementById('bsHaftalikDersHafta').textContent=tarihKisa(h.bas)+' – '+tarihKisa(h.son)+' • güvenli ön kontrol';const hazir=sonuc.adaylar.filter(x=>!x.cakisma);
      icerik.innerHTML=`<div class="bshft-kpi"><div class="bshft-kart"><span>Aktif Program</span><strong>${sonuc.aktifProgram}</strong></div><div class="bshft-kart"><span>Oluşturulacak</span><strong>${sonuc.olusacak}</strong></div><div class="bshft-kart"><span>Zaten Var</span><strong>${sonuc.zaten}</strong></div><div class="bshft-kart"><span>Çakışma</span><strong>${sonuc.cakisma}</strong></div></div><div class="bshft-liste"><div class="bshft-liste-baslik">Oluşturulacak Dersler</div>${hazir.length?hazir.map(x=>`<div class="bshft-satir"><div class="bshft-saat">${htmlKacir(BSDersProgramServisi.saatYaz(x.bas))}<br>${htmlKacir(BSDersProgramServisi.saatYaz(x.bit))}</div><div><div class="bshft-ad">${htmlKacir(ref.ogrenciMap.get(x.p.ogrenci_id)||'Öğrenci')}</div><div class="bshft-detay"><span>${htmlKacir(tarihKisa(x.tarih))}</span><span>${htmlKacir(ref.ogretmenMap.get(x.p.ogretmen_id)||'Öğretmen')}</span><span>${htmlKacir(ref.bransMap.get(x.p.brans_id)||'Branş')}</span><span>${htmlKacir((ref.derslikMap.get(x.p.derslik_id)||{}).mekan_adi||'Yer')}</span></div></div><span class="bshft-rozet">Hazır</span></div>`).join(''):'<div class="bshft-bos">Bu hafta oluşturulacak yeni ders yok.</div>'}</div><div class="bshft-uyari">${sonuc.cakisma?`<strong>${sonuc.cakisma} çakışma var.</strong> Çakışan kayıtlar atlanır; uygun dersler oluşturulur.`:'Kontrol tamamlandı. Program + tarih bazında zaten var olan dersler tekrar oluşturulmaz.'}</div>${sonuc.olusacak>0?`<div class="bshft-altbar"><button id="bshftOlustur" class="bshft-olustur" type="button">${sonuc.olusacak} Dersi Oluştur</button></div>`:''}`;
      document.getElementById('bshftOlustur')?.addEventListener('click',gercekOlustur);
    }catch(err){console.error('Haftalık ders önizleme:',err);document.getElementById('bsHaftalikDersHafta').textContent='Kontrol tamamlanamadı';icerik.innerHTML=`<div class="bshft-bos">${htmlKacir(err.message||'Haftalık program kontrol edilemedi.')}</div>`;}
  }

  async function gercekOlustur(){
    const b=document.getElementById('bshftOlustur'),icerik=document.getElementById('bsHaftalikDersIcerik');if(!b||!sonOnizleme||!window.BSIslemServisi) return;b.disabled=true;b.textContent='Oluşturuluyor…';
    try{
      const r=await BSIslemServisi.haftalikDersleriOlustur();document.getElementById('bsHaftalikDersHafta').textContent=tarihKisa(sonOnizleme.hafta.bas)+' – '+tarihKisa(sonOnizleme.hafta.son)+' • tamamlandı';icerik.innerHTML=`<div class="bshft-basari"><strong>${htmlKacir(r.olusturulan||0)} ders oluşturuldu</strong>${htmlKacir(r.zaten_mevcut||0)} ders zaten vardı${r.cakisma?`, ${htmlKacir(r.cakisma)} çakışma atlandı`:''}${r.hatali?`, ${htmlKacir(r.hatali)} hatalı program atlandı`:''}.</div>`;
      try{window.BSDersModuluV1&&BSDersModuluV1.yukle&&BSDersModuluV1.yukle();}catch(x){}
    }catch(err){console.error('Haftalık ders üretimi:',err);b.disabled=false;b.textContent='Tekrar Dene';const u=document.createElement('div');u.className='bshft-uyari';u.style.borderColor='#fecaca';u.style.background='#fef2f2';u.style.color='#991b1b';u.textContent=err.message||'Dersler oluşturulamadı.';icerik.appendChild(u);}
  }

  function butonuBagla(){const buton=[...document.querySelectorAll('.hizli-buton')].find(b=>b.textContent.includes('Haftalık Dersleri Oluştur'));if(!buton||buton.dataset.bsHaftalikBagli==='1') return;buton.dataset.bsHaftalikBagli='1';buton.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();onizleme();},true);}
  function baslat(){stilEkle();modalHazirla();butonuBagla();const gozlemci=new MutationObserver(butonuBagla);gozlemci.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();window.BSHaftalikDersModuluV1={onizleme};
})();