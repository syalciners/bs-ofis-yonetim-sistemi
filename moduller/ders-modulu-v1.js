(function(){
  if(window.BSDersModuluV1&&window.BSDersModuluV1.yukle) return;

  let ref=null;
  let aktifSekme='bugun';
  let haftaOfset=0;
  let aktifOgretmenId='';

  function stilEkle(){
    if(document.getElementById('bsDersModulStil')) return;
    const s=document.createElement('style');
    s.id='bsDersModulStil';
    s.textContent=`
      .bsders-toolbar{display:flex;gap:9px;align-items:center;justify-content:space-between;margin-bottom:11px;flex-wrap:wrap}
      .bsders-toolbar-sol,.bsders-toolbar-sag{display:flex;gap:7px;align-items:center;flex-wrap:wrap;min-width:0}
      .bsders-select{min-width:210px;height:40px;padding:0 11px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--yazi);font:inherit;font-size:11px}
      .bsders-hafta{font-size:10.5px;color:var(--ikincil);font-weight:760;white-space:nowrap}
      .bsders-sayac{font-size:10px;color:var(--ikincil);font-weight:750;white-space:nowrap}
      .bsders-nav{height:38px;min-width:38px;padding:0 10px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font:inherit;font-size:10px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .bsders-nav.bugun{border-color:#bfdbfe;background:#eff6ff;color:#2563eb}
      .bsders-takvim{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:start}
      .bsders-gun{min-width:0;background:#fff;border:1px solid var(--kenar);border-radius:14px;overflow:hidden}
      .bsders-gun.bugun{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(37,99,235,.05)}
      .bsders-gun-baslik{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px 10px;border-bottom:1px solid var(--kenar);background:#fafcff;color:var(--ikincil)}
      .bsders-gun.bugun .bsders-gun-baslik{background:var(--mavi-acik);color:var(--mavi)}
      .bsders-gun-adi{font-size:9.5px;font-weight:850;text-transform:capitalize;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bsders-gun-sayi{font-size:8px;font-weight:800;white-space:nowrap}
      .bsders-gun-icerik{display:grid;gap:6px;padding:7px;min-height:82px}
      .bsders-kart{position:relative;padding:8px 8px 8px 10px;border:1px solid #e8edf4;border-radius:10px;background:#fff;cursor:pointer;touch-action:manipulation;overflow:hidden;-webkit-tap-highlight-color:transparent}
      .bsders-kart:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#93c5fd}
      .bsders-kart.yapildi:before{background:#86efac}.bsders-kart.iptal:before{background:#fca5a5}
      .bsders-kart:active{background:#f8fafc}
      .bsders-saat{font-size:9px;font-weight:850;color:#2563eb;letter-spacing:.01em}
      .bsders-kart.yapildi .bsders-saat{color:#15803d}.bsders-kart.iptal .bsders-saat{color:#b91c1c}
      .bsders-ogrenci{margin-top:4px;font-size:10px;font-weight:850;color:var(--yazi);line-height:1.25;overflow-wrap:anywhere}
      .bsders-detay{display:grid;gap:2px;margin-top:5px;font-size:8.2px;line-height:1.3;color:var(--ikincil)}
      .bsders-durum{display:inline-flex;margin-top:6px;padding:4px 6px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:7.5px;font-weight:850}
      .bsders-durum.yapildi{background:#f0fdf4;color:#15803d}.bsders-durum.iptal{background:#fef2f2;color:#b91c1c}
      .bsders-bos{display:flex;align-items:center;justify-content:center;min-height:66px;color:#94a3b8;font-size:9px;text-align:center}
      .bsders-bugun-liste{display:grid;gap:8px}
      .bsders-bugun-kart{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--kenar);border-radius:13px;background:#fff;cursor:pointer;touch-action:manipulation}
      .bsders-bugun-saat{padding:8px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:9px;font-weight:850;line-height:1.35}
      .bsders-bugun-ad{font-size:11px;font-weight:850;color:var(--yazi)}.bsders-bugun-detay{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:4px;font-size:8.5px;color:var(--ikincil)}
      @media(max-width:1050px){.bsders-takvim{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:760px){.bsders-takvim{grid-template-columns:repeat(2,minmax(0,1fr))}.bsders-select{width:100%;min-width:0}.bsders-toolbar-sol{width:100%}}
      @media(max-width:520px){.bsders-toolbar{align-items:stretch}.bsders-toolbar-sol,.bsders-toolbar-sag{width:100%}.bsders-toolbar-sag{justify-content:space-between}.bsders-takvim{grid-template-columns:1fr}.bsders-gun-icerik{min-height:0}.bsders-bugun-kart{grid-template-columns:58px minmax(0,1fr)}.bsders-bugun-kart .durum-rozet{grid-column:2;justify-self:start}}
    `;
    document.head.appendChild(s);
  }

  function haftaSiniriOfset(ofset){
    const h=BSDersProgramServisi.haftaSiniri();
    const bas=BSDersProgramServisi.tarihEkle(h.bas,Number(ofset||0)*7);
    return {bas,son:BSDersProgramServisi.tarihEkle(bas,6),sonraki:BSDersProgramServisi.tarihEkle(bas,7)};
  }

  function gunEtiketi(iso){
    return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso+'T12:00:00+03:00'));
  }

  function durumClass(d){return d==='Yapıldı'?'yapildi':d==='İptal'?'iptal':'planlandi';}

  function dersBilgisi(d){
    const ogr=ref.ogrenciMap.get(d.ogrenci_id)||'Öğrenci';
    const ogt=ref.ogretmenMap.get(d.ogretmen_id)||'Öğretmen';
    const br=ref.bransMap.get(d.brans_id)||'Branş';
    const loc=ref.derslikMap.get(d.derslik_id);
    const yer=(loc&&loc.mekan_adi)||d.ders_yeri||'Yer';
    return {ogr,ogt,br,yer};
  }

  function takvimDersHTML(d,ogretmenGizle){
    const x=dersBilgisi(d),c=durumClass(d.ders_durumu);
    return `<article class="bsders-kart ${c}" data-bs-ders-id="${htmlKacir(d.ders_id||'')}"><div class="bsders-saat">${htmlKacir(saatKisalt(d.baslangic_saati))}–${htmlKacir(saatKisalt(d.bitis_saati))}</div><div class="bsders-ogrenci">${htmlKacir(x.ogr)}</div><div class="bsders-detay">${ogretmenGizle?'':`<span>${htmlKacir(x.ogt)}</span>`}<span>${htmlKacir(x.br)}</span><span>${htmlKacir(x.yer)}</span></div><span class="bsders-durum ${c}">${htmlKacir(d.ders_durumu||'Planlandı')}</span></article>`;
  }

  function bugunDersHTML(d){
    const x=dersBilgisi(d);
    return `<article class="bsders-bugun-kart" data-bs-ders-id="${htmlKacir(d.ders_id||'')}"><div class="bsders-bugun-saat">${htmlKacir(saatKisalt(d.baslangic_saati))}<br>${htmlKacir(saatKisalt(d.bitis_saati))}</div><div><div class="bsders-bugun-ad">${htmlKacir(x.ogr)}</div><div class="bsders-bugun-detay"><span>${htmlKacir(x.ogt)}</span><span>${htmlKacir(x.br)}</span><span>${htmlKacir(x.yer)}</span></div></div><div class="durum-rozet ${durumSinifi(d.ders_durumu)}">${htmlKacir(d.ders_durumu||'—')}</div></article>`;
  }

  function takvimRender(container,dersler,h,ogretmenGizle=false){
    const bugun=istanbulBugunISO();
    const gunler=Array.from({length:7},(_,i)=>BSDersProgramServisi.tarihEkle(h.bas,i));
    container.innerHTML=`<div class="bsders-takvim">${gunler.map(iso=>{
      const sat=dersler.filter(x=>String(x.tarih).slice(0,10)===iso).sort((a,b)=>String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||'')));
      return `<section class="bsders-gun ${iso===bugun?'bugun':''}"><div class="bsders-gun-baslik"><span class="bsders-gun-adi">${htmlKacir(gunEtiketi(iso))}</span><span class="bsders-gun-sayi">${sat.length}</span></div><div class="bsders-gun-icerik">${sat.length?sat.map(d=>takvimDersHTML(d,ogretmenGizle)).join(''):'<div class="bsders-bos">Ders yok</div>'}</div></section>`;
    }).join('')}</div>`;
  }

  function haftaToolbar(h,toplam,ekSol=''){
    return `<div class="bsders-toolbar"><div class="bsders-toolbar-sol">${ekSol}<span class="bsders-hafta">${htmlKacir(tarihKisa(h.bas))} – ${htmlKacir(tarihKisa(h.son))}</span></div><div class="bsders-toolbar-sag"><button class="bsders-nav" type="button" data-bs-hafta="-1">‹ Önceki</button><button class="bsders-nav bugun" type="button" data-bs-hafta="0">Bu Hafta</button><button class="bsders-nav" type="button" data-bs-hafta="1">Sonraki ›</button><span class="bsders-sayac">${Number(toplam||0)} ders</span></div></div>`;
  }

  function navBagla(){
    document.querySelectorAll('[data-bs-hafta]').forEach(b=>b.addEventListener('click',()=>{
      const yon=Number(b.dataset.bsHafta);
      haftaOfset=yon===0?0:haftaOfset+yon;
      sekmeYukle(aktifSekme);
    }));
  }

  async function sekmeYukle(tur){
    aktifSekme=tur||aktifSekme;
    const hedef=document.getElementById('bsDersSekmeIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Dersler yükleniyor…</div>';
    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders program servisi yüklenmedi.');
      ref=await BSDersProgramServisi.referanslar();

      if(aktifSekme==='bugun'){
        const bugun=istanbulBugunISO();
        const ds=await BSDersProgramServisi.dersleriGetir(bugun,BSDersProgramServisi.tarihEkle(bugun,1));
        hedef.innerHTML=ds.length?`<div class="bsders-toolbar"><div class="bsders-toolbar-sol"><span class="bsders-hafta">Bugün • ${htmlKacir(tarihKisa(bugun))}</span></div><span class="bsders-sayac">${ds.length} ders</span></div><div class="bsders-bugun-liste">${ds.map(bugunDersHTML).join('')}</div>`:'<div class="bos-durum"><div class="bos-durum-baslik">Bugün ders yok</div></div>';
        return;
      }

      const h=haftaSiniriOfset(haftaOfset);
      if(aktifSekme==='ogretmen'){
        const aktif=(ref.ogretmenler||[]).filter(x=>x.durum!=='Pasif');
        const sec=`<select id="bsDersOgretmenSec" class="bsders-select"><option value="">Öğretmen seçin</option>${aktif.map(x=>`<option value="${htmlKacir(x.ogretmen_id)}" ${x.ogretmen_id===aktifOgretmenId?'selected':''}>${htmlKacir(x.ad_soyad)}</option>`).join('')}</select>`;
        hedef.innerHTML=haftaToolbar(h,0,sec)+`<div id="bsDersOgretmenListe"><div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık takvim görünür.</div></div>`;
        navBagla();
        const select=document.getElementById('bsDersOgretmenSec');
        select.addEventListener('change',async e=>{aktifOgretmenId=e.target.value||'';await ogretmenTakvimiYukle(h);});
        if(aktifOgretmenId) await ogretmenTakvimiYukle(h);
        return;
      }

      const ds=await BSDersProgramServisi.dersleriGetir(h.bas,h.sonraki);
      hedef.innerHTML=haftaToolbar(h,ds.length)+`<div id="bsDersGenelTakvim"></div>`;
      navBagla();
      takvimRender(document.getElementById('bsDersGenelTakvim'),ds,h,false);
    }catch(err){
      console.error('Ders modülü:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Dersler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';
    }
  }

  async function ogretmenTakvimiYukle(h){
    const alt=document.getElementById('bsDersOgretmenListe');
    if(!alt)return;
    if(!aktifOgretmenId){alt.innerHTML='<div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık takvim görünür.</div>';return;}
    alt.innerHTML='<div class="ders-yukleniyor">Takvim yükleniyor…</div>';
    try{
      const ds=await BSDersProgramServisi.dersleriGetir(h.bas,h.sonraki,aktifOgretmenId);
      const sayac=document.querySelector('#bsDersSekmeIcerik .bsders-sayac');if(sayac)sayac.textContent=`${ds.length} ders`;
      takvimRender(alt,ds,h,true);
    }catch(err){console.error('Öğretmen takvimi:',err);alt.innerHTML='<div class="bos-durum">Takvim yüklenemedi.</div>';}
  }

  function arayuzuHazirla(){
    const bolum=document.getElementById('gorunum-dersler');
    if(!bolum) return false;
    stilEkle();
    const sekmeler=[...bolum.querySelectorAll('.sekme')];
    const turler=['bugun','ogretmen','genel'];
    const adlar=['Bugün','Öğretmen Takvimi','Haftalık Takvim'];
    sekmeler.forEach((b,i)=>{
      b.dataset.bsDers=turler[i]||'bugun';
      if(adlar[i])b.textContent=adlar[i];
      b.addEventListener('click',()=>{
        sekmeler.forEach(x=>x.classList.remove('aktif'));
        b.classList.add('aktif');
        aktifSekme=b.dataset.bsDers;
        if(aktifSekme==='bugun')haftaOfset=0;
        sekmeYukle(aktifSekme);
      });
    });
    const kart=bolum.querySelector('.kart');
    if(kart) kart.innerHTML='<div id="bsDersSekmeIcerik"><div class="ders-yukleniyor">Dersler yükleniyor…</div></div>';
    return true;
  }

  async function yukle(){return sekmeYukle(aktifSekme);}

  function baslat(){
    if(!arayuzuHazirla()) return;
    let deneme=0;
    const timer=setInterval(async()=>{
      deneme++;
      try{
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){clearInterval(timer);await sekmeYukle('bugun');}
        else if(deneme>40) clearInterval(timer);
      }catch(e){if(deneme>40) clearInterval(timer);}
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSDersModuluV1={yukle,sekmeYukle};
})();