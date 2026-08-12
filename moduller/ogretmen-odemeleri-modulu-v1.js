(function(){
  if(window.BSOgretmenOdemeleriModuluV1) return;
  window.BSOgretmenOdemeleriModuluV1=true;

  let veri=null;
  let seciliDonem=null;

  function stilEkle(){
    if(document.getElementById('bsOdemStil')) return;
    const s=document.createElement('style');s.id='bsOdemStil';
    s.textContent=`
      .bsod-ust{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;margin-bottom:11px}.bsod-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:780;cursor:pointer}.bsod-donem{height:40px;min-width:210px;padding:0 11px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi);font-size:10.5px;font-weight:700}
      .bsod-kpiler{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.bsod-kpi{padding:12px;border:1px solid var(--kenar);border-radius:13px;background:#fff}.bsod-kpi span{display:block;font-size:8.5px;color:var(--ikincil)}.bsod-kpi strong{display:block;margin-top:5px;font-size:16px;color:var(--yazi)}.bsod-kpi.kalan strong{color:#1d4ed8}
      .bsod-liste{border:1px solid var(--kenar);border-radius:15px;background:#fff;overflow:hidden;margin-bottom:11px}.bsod-baslik{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800}.bsod-satir{display:grid;grid-template-columns:minmax(0,1fr) 100px 100px 100px;gap:9px;align-items:center;padding:11px 13px;border-bottom:1px solid #f1f5f9}.bsod-satir:last-child{border-bottom:none}.bsod-ad{font-size:10.5px;font-weight:800}.bsod-alt{margin-top:3px;font-size:8.8px;color:var(--ikincil)}.bsod-rakam{text-align:right}.bsod-rakam span{display:block;font-size:8px;color:var(--ikincil)}.bsod-rakam strong{display:block;margin-top:2px;font-size:10.5px}.bsod-rakam.kalan strong{color:#1d4ed8}
      .bsod-odeme{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bsod-odeme:last-child{border-bottom:none}.bsod-tarih{font-size:9px;color:var(--ikincil)}.bsod-odemead{font-size:10px;font-weight:760}.bsod-detay{margin-top:3px;font-size:8.7px;color:var(--ikincil)}.bsod-tutar{font-size:10.5px;font-weight:850;white-space:nowrap}
      @media(max-width:700px){.bsod-ust{align-items:stretch}.bsod-geri,.bsod-donem{width:100%}.bsod-kpiler{grid-template-columns:repeat(2,minmax(0,1fr))}.bsod-satir{grid-template-columns:minmax(0,1fr) 92px;padding-right:12px}.bsod-satir .bsod-rakam:nth-child(3),.bsod-satir .bsod-rakam:nth-child(4){display:none}.bsod-odeme{grid-template-columns:58px minmax(0,1fr) auto}}
    `;
    document.head.appendChild(s);
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-ogretmen-odemeleri')) return;
    const main=document.querySelector('main.icerik');if(!main) return;
    const sec=document.createElement('section');sec.className='gorunum';sec.id='gorunum-ogretmen-odemeleri';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Öğretmen Ödemeleri</div><div class="sayfa-aciklama">Hakediş, ödeme ve kalan tutar tek ekranda.</div></div></div><div class="bsod-ust"><button id="bsodGeri" class="bsod-geri" type="button">← Menü</button><select id="bsodDonem" class="bsod-donem"></select></div><div id="bsodIcerik"><div class="ders-yukleniyor">Ödemeler yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsodGeri').addEventListener('click',()=>gorunumeGit('menu'));
    document.getElementById('bsodDonem').addEventListener('change',e=>{seciliDonem=e.target.value;yukle(seciliDonem);});
  }

  function ogretmenSatir(o){
    const alt=`${Number(o.ders_birimi||0).toLocaleString('tr-TR')} ders birimi${o.odeme_adet?` • ${o.odeme_adet} ödeme`:''}`;
    return `<div class="bsod-satir"><div><div class="bsod-ad">${htmlKacir(o.ad_soyad||'Öğretmen')}</div><div class="bsod-alt">${htmlKacir(alt)}</div></div><div class="bsod-rakam"><span>Hakediş</span><strong>${htmlKacir(paraYaz(o.hakedis))}</strong></div><div class="bsod-rakam"><span>Ödenen</span><strong>${htmlKacir(paraYaz(o.odeme))}</strong></div><div class="bsod-rakam kalan"><span>Kalan</span><strong>${htmlKacir(paraYaz(o.kalan))}</strong></div></div>`;
  }

  function odemeSatir(o){
    const ad=veri.ogretmenMap.get(o.ogretmen_id)||'Öğretmen';
    const hesap=veri.hesapMap.get(o.hesap_id)||'';
    const detay=[o.odeme_yontemi,hesap,o.aciklama].filter(Boolean).join(' • ');
    return `<div class="bsod-odeme"><div class="bsod-tarih">${htmlKacir(tarihKisa(o.tarih))}</div><div><div class="bsod-odemead">${htmlKacir(ad)}</div>${detay?`<div class="bsod-detay">${htmlKacir(detay)}</div>`:''}</div><div class="bsod-tutar">${htmlKacir(paraYaz(o.tutar))}</div></div>`;
  }

  function render(){
    const hedef=document.getElementById('bsodIcerik');if(!hedef||!veri) return;
    const t=veri.toplam;
    hedef.innerHTML=`<div class="bsod-kpiler"><div class="bsod-kpi"><span>Toplam Hakediş</span><strong>${htmlKacir(paraYaz(t.hakedis))}</strong></div><div class="bsod-kpi"><span>Ödenen</span><strong>${htmlKacir(paraYaz(t.odeme))}</strong></div><div class="bsod-kpi kalan"><span>Kalan</span><strong>${htmlKacir(paraYaz(t.kalan))}</strong></div><div class="bsod-kpi"><span>Ders Birimi</span><strong>${htmlKacir(Number(t.ders_birimi||0).toLocaleString('tr-TR'))}</strong></div></div><div class="bsod-liste"><div class="bsod-baslik"><span>Öğretmen Bazında</span><span>${veri.ogretmenler.length} öğretmen</span></div>${veri.ogretmenler.length?veri.ogretmenler.map(ogretmenSatir).join(''):'<div class="bos-durum">Kayıt bulunamadı.</div>'}</div><div class="bsod-liste"><div class="bsod-baslik"><span>Bu Dönem Ödemeleri</span><span>${veri.odemeler.length} kayıt</span></div>${veri.odemeler.length?veri.odemeler.map(odemeSatir).join(''):'<div class="bos-durum">Bu hakediş dönemi için ödeme kaydı yok.</div>'}</div>`;
  }

  async function yukle(donemId){
    const hedef=document.getElementById('bsodIcerik');if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Hakediş ve ödemeler hesaplanıyor…</div>';
    try{
      if(!window.BSOgretmenOdemeServisi) throw new Error('Öğretmen ödeme servisi yüklenmedi.');
      const donemler=await BSOgretmenOdemeServisi.donemleriGetir();
      const vars=donemId?donemler.find(x=>x.hakedis_donemi_id===donemId):BSOgretmenOdemeServisi.varsayilanDonem(donemler);
      if(!vars) throw new Error('Hakediş dönemi bulunamadı.');
      seciliDonem=vars.hakedis_donemi_id;
      const sec=document.getElementById('bsodDonem');
      const bugun=istanbulBugunISO();
      const gorunen=donemler.filter(x=>x.baslangic_tarihi<=bugun).slice(0,18);
      sec.innerHTML=gorunen.map(x=>`<option value="${htmlKacir(x.hakedis_donemi_id)}" ${x.hakedis_donemi_id===seciliDonem?'selected':''}>${htmlKacir(x.donem_adi)}</option>`).join('');
      veri=await BSOgretmenOdemeServisi.donemOzetiGetir(seciliDonem);
      render();
    }catch(err){console.error('Öğretmen ödemeleri:',err);hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Ödemeler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';}
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');if(!baslik||baslik.textContent.trim()!=='Öğretmen Ödemeleri') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('ogretmen-odemeleri');yukle();
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSOgretmenOdemeleriModuluV1={yukle};
})();
