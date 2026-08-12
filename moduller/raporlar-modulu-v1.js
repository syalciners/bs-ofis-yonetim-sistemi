(function(){
  if(window.BSRaporlarModuluV1) return;
  window.BSRaporlarModuluV1=true;

  let aktifAy='';

  function stilEkle(){
    if(document.getElementById('bsRaporlarStil')) return;
    const s=document.createElement('style');
    s.id='bsRaporlarStil';
    s.textContent=`
      .bsrp-ust{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:11px}
      .bsrp-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:780;cursor:pointer}
      .bsrp-ay{height:38px;padding:0 11px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--yazi);font-size:11px;font-weight:700}
      .bsrp-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}
      .bsrp-kart{padding:13px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.bsrp-kart span{display:block;font-size:9px;color:var(--ikincil)}.bsrp-kart strong{display:block;margin-top:6px;font-size:18px;line-height:1.05;color:var(--yazi)}.bsrp-kart small{display:block;margin-top:4px;font-size:8.5px;color:var(--ikincil)}
      .bsrp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bsrp-bolum{border:1px solid var(--kenar);border-radius:15px;background:#fff;overflow:hidden}.bsrp-baslik{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800}.bsrp-satir{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bsrp-satir:last-child{border-bottom:none}.bsrp-ad{font-size:10.5px;font-weight:760;color:var(--yazi)}.bsrp-detay{margin-top:3px;font-size:9px;color:var(--ikincil)}.bsrp-tutar{font-size:10.5px;font-weight:850;white-space:nowrap}
      .bsrp-durumlar{display:flex;flex-wrap:wrap;gap:6px;padding:12px 13px}.bsrp-chip{padding:7px 9px;border-radius:999px;background:#f8fafc;border:1px solid var(--kenar);font-size:9px;color:var(--ikincil);font-weight:750}.bsrp-chip strong{color:var(--yazi);margin-left:3px}
      .bsrp-bos{padding:20px 13px;text-align:center;font-size:10px;color:var(--ikincil)}
      @media(max-width:900px){.bsrp-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.bsrp-ust{align-items:stretch}.bsrp-geri,.bsrp-ay{flex:1}.bsrp-grid{grid-template-columns:1fr}.bsrp-kpi{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bsrp-kart{padding:11px}.bsrp-kart strong{font-size:16px}}
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
    if(document.getElementById('gorunum-raporlar')) return;
    const main=document.querySelector('main.icerik');
    if(!main) return;
    const sec=document.createElement('section');
    sec.className='gorunum';
    sec.id='gorunum-raporlar';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Raporlar</div><div class="sayfa-aciklama">Dönem bazında operasyon ve finans özeti.</div></div></div><div class="bsrp-ust"><button id="bsrpGeri" class="bsrp-geri" type="button">← Menü</button><input id="bsrpAy" class="bsrp-ay" type="month"></div><div id="bsrpIcerik"><div class="ders-yukleniyor">Rapor hazırlanıyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsrpGeri').addEventListener('click',()=>gorunumeGit('menu'));
    const ay=document.getElementById('bsrpAy');
    ay.value=buAy();aktifAy=ay.value;
    ay.addEventListener('change',()=>{aktifAy=ay.value||buAy();yukle();});
  }

  function ogretmenHTML(o){
    return `<div class="bsrp-satir"><div><div class="bsrp-ad">${htmlKacir(o.ad_soyad)}</div><div class="bsrp-detay">${htmlKacir(Number(o.ders_birimi||0).toLocaleString('tr-TR'))} ders birimi • ${htmlKacir(o.kayit)} kayıt</div></div><div class="bsrp-tutar">${htmlKacir(paraYaz(o.hakedis))}</div></div>`;
  }

  function yontemHTML(y){
    return `<div class="bsrp-satir"><div><div class="bsrp-ad">${htmlKacir(y.ad)}</div><div class="bsrp-detay">${htmlKacir(y.adet)} tahsilat</div></div><div class="bsrp-tutar">${htmlKacir(paraYaz(y.tutar))}</div></div>`;
  }

  function render(v){
    const hedef=document.getElementById('bsrpIcerik');
    if(!hedef) return;
    const durumlar=Object.entries(v.durumlar||{}).sort((a,b)=>b[1]-a[1]);
    hedef.innerHTML=`<div class="bsrp-kpi"><div class="bsrp-kart"><span>Tahsilat</span><strong>${htmlKacir(paraYaz(v.tahsilat))}</strong><small>${htmlKacir(v.tahsilatAdet)} kayıt</small></div><div class="bsrp-kart"><span>Gerçekleşen Ciro</span><strong>${htmlKacir(paraYaz(v.ciro))}</strong><small>Yapıldı durumundaki dersler</small></div><div class="bsrp-kart"><span>Öğretmen Hakedişi</span><strong>${htmlKacir(paraYaz(v.hakedis))}</strong><small>${htmlKacir(Number(v.dersBirimi||0).toLocaleString('tr-TR'))} ders birimi</small></div><div class="bsrp-kart"><span>Yapılan Ders</span><strong>${htmlKacir(v.yapilanKayit)}</strong><small>${htmlKacir(v.toplamDersKaydi)} toplam ders kaydı</small></div></div><div class="bsrp-bolum" style="margin-bottom:10px"><div class="bsrp-baslik"><span>Ders Durumları</span><span>${htmlKacir(ayAdi(v.ym))}</span></div><div class="bsrp-durumlar">${durumlar.length?durumlar.map(([ad,sayi])=>`<span class="bsrp-chip">${htmlKacir(ad)} <strong>${htmlKacir(sayi)}</strong></span>`).join(''):'<span class="bsrp-bos">Bu dönemde ders kaydı yok.</span>'}</div></div><div class="bsrp-grid"><section class="bsrp-bolum"><div class="bsrp-baslik"><span>Öğretmen Hakedişleri</span><span>${htmlKacir(v.ogretmenler.length)} öğretmen</span></div>${v.ogretmenler.length?v.ogretmenler.map(ogretmenHTML).join(''):'<div class="bsrp-bos">Bu dönemde gerçekleşmiş hakediş yok.</div>'}</section><section class="bsrp-bolum"><div class="bsrp-baslik"><span>Tahsilat Dağılımı</span><span>${htmlKacir(v.tahsilatAdet)} kayıt</span></div>${v.yontemler.length?v.yontemler.map(yontemHTML).join(''):'<div class="bsrp-bos">Bu dönemde tahsilat yok.</div>'}</section></div>`;
  }

  async function yukle(){
    const hedef=document.getElementById('bsrpIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Rapor hazırlanıyor…</div>';
    try{
      if(!window.BSRaporServisi) throw new Error('Rapor servisi yüklenmedi.');
      const v=await BSRaporServisi.aylikOzetGetir(aktifAy||buAy());
      render(v);
    }catch(err){
      console.error('Raporlar:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Rapor hazırlanamadı</div><div class="bos-durum-aciklama">Bağlantı veya veri erişimi kontrol edilmeli.</div></div>';
    }
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');
      if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik||baslik.textContent.trim()!=='Raporlar') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('raporlar');
      const ay=document.getElementById('bsrpAy');
      if(ay&&!ay.value) ay.value=buAy();
      aktifAy=(ay&&ay.value)||buAy();
      yukle();
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSRaporlarModuluV1={yukle};
})();