(function(){
  if(window.BSGiderlerModuluV1) return;
  window.BSGiderlerModuluV1=true;

  let aktifAy='';
  let filtre='Tümü';
  let veri=null;

  function stilEkle(){
    if(document.getElementById('bsGiderlerStil')) return;
    const s=document.createElement('style');
    s.id='bsGiderlerStil';
    s.textContent=`
      .bsgd-ust{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:11px}
      .bsgd-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:780;cursor:pointer}
      .bsgd-ay{height:38px;padding:0 11px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--yazi);font-size:11px;font-weight:700}
      .bsgd-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:11px}
      .bsgd-kart{padding:13px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.bsgd-kart span{display:block;font-size:9px;color:var(--ikincil)}.bsgd-kart strong{display:block;margin-top:6px;font-size:18px;color:var(--yazi)}.bsgd-kart small{display:block;margin-top:4px;font-size:8.5px;color:var(--ikincil)}
      .bsgd-filtre{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}.bsgd-chip{height:34px;padding:0 11px;border:1px solid var(--kenar);border-radius:999px;background:#fff;color:var(--ikincil);font-size:9.5px;font-weight:760;cursor:pointer}.bsgd-chip.aktif{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
      .bsgd-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px}.bsgd-bolum{border:1px solid var(--kenar);border-radius:15px;background:#fff;overflow:hidden}.bsgd-baslik{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800}
      .bsgd-satir{display:grid;grid-template-columns:68px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bsgd-satir:last-child{border-bottom:none}.bsgd-tarih{font-size:9.5px;color:var(--ikincil)}.bsgd-ad{font-size:10.5px;font-weight:760;color:var(--yazi)}.bsgd-detay{margin-top:3px;font-size:9px;color:var(--ikincil)}.bsgd-tutar{font-size:10.5px;font-weight:850;color:#b91c1c;white-space:nowrap}
      .bsgd-kaynak{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bsgd-kaynak:last-child{border-bottom:none}.bsgd-kaynak-ad{font-size:10.5px;font-weight:760}.bsgd-kaynak-detay{margin-top:3px;font-size:9px;color:var(--ikincil)}.bsgd-kaynak-tutar{font-size:10.5px;font-weight:850}
      .bsgd-bilgi{margin-top:10px;padding:10px 12px;border:1px solid #dbeafe;border-radius:12px;background:#eff6ff;color:#475569;font-size:9.5px;line-height:1.45}
      @media(max-width:760px){.bsgd-grid{grid-template-columns:1fr}.bsgd-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}.bsgd-satir{grid-template-columns:58px minmax(0,1fr);position:relative;padding-right:90px}.bsgd-tutar{position:absolute;right:12px;top:12px}}
      @media(max-width:520px){.bsgd-ust{align-items:stretch}.bsgd-geri,.bsgd-ay{flex:1}.bsgd-kpi{grid-template-columns:1fr 1fr}.bsgd-kart:first-child{grid-column:span 2}.bsgd-kart{padding:11px}.bsgd-kart strong{font-size:16px}}
    `;
    document.head.appendChild(s);
  }

  function buAy(){return istanbulBugunISO().slice(0,7);}
  function ayAdi(ym){
    const p=String(ym||'').split('-');
    if(p.length!==2) return ym;
    return new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(`${p[0]}-${p[1]}-15T12:00:00+03:00`));
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-giderler')) return;
    const main=document.querySelector('main.icerik');
    if(!main) return;
    const sec=document.createElement('section');
    sec.className='gorunum';sec.id='gorunum-giderler';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Giderler</div><div class="sayfa-aciklama">Kasa çıkışlarının dönem bazında görünümü.</div></div></div><div class="bsgd-ust"><button id="bsgdGeri" class="bsgd-geri" type="button">← Menü</button><input id="bsgdAy" class="bsgd-ay" type="month"></div><div id="bsgdIcerik"><div class="ders-yukleniyor">Giderler yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsgdGeri').addEventListener('click',()=>gorunumeGit('menu'));
    const ay=document.getElementById('bsgdAy');
    ay.value=buAy();aktifAy=ay.value;
    ay.addEventListener('change',()=>{aktifAy=ay.value||buAy();filtre='Tümü';yukle();});
  }

  function filtrelenmis(){
    if(!veri) return [];
    if(filtre==='Öğretmen') return veri.hareketler.filter(x=>String(x.kaynak_turu||'').toLocaleLowerCase('tr-TR').includes('öğretmen'));
    if(filtre==='Diğer') return veri.hareketler.filter(x=>!String(x.kaynak_turu||'').toLocaleLowerCase('tr-TR').includes('öğretmen'));
    return veri.hareketler;
  }

  function hareketHTML(h){
    const ogretmen=h.ogretmen_id?(veri.ogretmenMap.get(h.ogretmen_id)||''):'';
    const hesap=veri.hesapMap.get(h.hesap_id)||'Hesap';
    const ad=[h.kaynak_turu||'Gider',ogretmen].filter(Boolean).join(' • ');
    const detay=[hesap,h.aciklama].filter(Boolean).join(' • ');
    return `<div class="bsgd-satir"><div class="bsgd-tarih">${htmlKacir(tarihKisa(h.tarih))}</div><div><div class="bsgd-ad">${htmlKacir(ad)}</div>${detay?`<div class="bsgd-detay">${htmlKacir(detay)}</div>`:''}</div><div class="bsgd-tutar">−${htmlKacir(paraYaz(h.tutar))}</div></div>`;
  }

  function kaynakHTML(x){
    return `<div class="bsgd-kaynak"><div><div class="bsgd-kaynak-ad">${htmlKacir(x.ad)}</div><div class="bsgd-kaynak-detay">${htmlKacir(x.adet)} kayıt</div></div><div class="bsgd-kaynak-tutar">${htmlKacir(paraYaz(x.tutar))}</div></div>`;
  }

  function render(){
    const hedef=document.getElementById('bsgdIcerik');
    if(!hedef||!veri) return;
    const liste=filtrelenmis();
    hedef.innerHTML=`<div class="bsgd-kpi"><div class="bsgd-kart"><span>Toplam Gider</span><strong>${htmlKacir(paraYaz(veri.toplam))}</strong><small>${htmlKacir(veri.adet)} kasa çıkışı</small></div><div class="bsgd-kart"><span>Öğretmen Ödemeleri</span><strong>${htmlKacir(paraYaz(veri.ogretmen))}</strong><small>Bu dönemde</small></div><div class="bsgd-kart"><span>Diğer Giderler</span><strong>${htmlKacir(paraYaz(veri.diger))}</strong><small>Bu dönemde</small></div></div><div class="bsgd-filtre">${['Tümü','Öğretmen','Diğer'].map(x=>`<button type="button" class="bsgd-chip ${filtre===x?'aktif':''}" data-bsgd-filtre="${x}">${x}</button>`).join('')}</div><div class="bsgd-grid"><section class="bsgd-bolum"><div class="bsgd-baslik"><span>Gider Hareketleri</span><span>${htmlKacir(liste.length)} kayıt</span></div>${liste.length?liste.map(hareketHTML).join(''):'<div class="bos-durum">Bu filtrede gider bulunamadı.</div>'}</section><section class="bsgd-bolum"><div class="bsgd-baslik"><span>Gider Dağılımı</span><span>${htmlKacir(ayAdi(veri.ym))}</span></div>${veri.kaynaklar.length?veri.kaynaklar.map(kaynakHTML).join(''):'<div class="bos-durum">Bu dönemde gider bulunamadı.</div>'}</section></div><div class="bsgd-bilgi">Bu ekran kasa hareketlerindeki gerçek gider çıkışlarını gösterir. Öğretmen ödemeleri ayrıca kendi modülünde detaylı olarak izlenmeye devam eder.</div>`;
    hedef.querySelectorAll('[data-bsgd-filtre]').forEach(b=>b.addEventListener('click',()=>{filtre=b.dataset.bsgdFiltre;render();}));
  }

  async function yukle(){
    const hedef=document.getElementById('bsgdIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Giderler yükleniyor…</div>';
    try{
      if(!window.BSGiderServisi) throw new Error('Gider servisi yüklenmedi.');
      veri=await BSGiderServisi.aylikGiderlerGetir(aktifAy||buAy());
      render();
    }catch(err){
      console.error('Giderler:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Giderler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya veri erişimi kontrol edilmeli.</div></div>';
    }
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');
      if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik||baslik.textContent.trim()!=='Giderler') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('giderler');
      const ay=document.getElementById('bsgdAy');
      if(ay&&!ay.value) ay.value=buAy();
      aktifAy=(ay&&ay.value)||buAy();
      filtre='Tümü';
      yukle();
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSGiderlerModuluV1={yukle};
})();