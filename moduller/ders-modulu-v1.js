(function(){
  if(window.BSDersModuluV1) return;
  window.BSDersModuluV1=true;

  let ref=null;

  function stilEkle(){
    if(document.getElementById('bsDersModulStil')) return;
    const s=document.createElement('style');
    s.id='bsDersModulStil';
    s.textContent=`
      .bsders-panel{display:grid;gap:10px}
      .bsders-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap}
      .bsders-select{min-width:220px;height:42px;padding:0 12px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi)}
      .bsders-hafta{font-size:11px;color:var(--ikincil);font-weight:700}
      .bsders-gun{background:#fff;border:1px solid var(--kenar);border-radius:14px;overflow:hidden}
      .bsders-gun-baslik{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800;color:var(--ikincil)}
      .bsders-gun-baslik.bugun{background:var(--mavi-acik);color:var(--mavi)}
      .bsders-gun .ders-satir:last-child{border-bottom:none}
      .bsders-sayac{font-size:11px;color:var(--ikincil);font-weight:700}
      @media(max-width:640px){.bsders-toolbar{align-items:stretch}.bsders-select{width:100%;min-width:0}.bsders-gun-baslik{padding:9px 11px}}
    `;
    document.head.appendChild(s);
  }

  function gunEtiketi(iso){
    return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso+'T12:00:00+03:00'));
  }

  function dersHTML(d){
    const ogr=ref.ogrenciMap.get(d.ogrenci_id)||'Öğrenci';
    const ogrt=ref.ogretmenMap.get(d.ogretmen_id)||'Öğretmen';
    const br=ref.bransMap.get(d.brans_id)||'Branş';
    const loc=ref.derslikMap.get(d.derslik_id);
    const yer=(loc&&loc.mekan_adi)||d.ders_yeri||'Yer';
    return `<div class="ders-satir"><div class="ders-saat">${htmlKacir(saatKisalt(d.baslangic_saati))}<br>${htmlKacir(saatKisalt(d.bitis_saati))}</div><div><div class="ders-ogrenci">${htmlKacir(ogr)}</div><div class="ders-detay"><span>${htmlKacir(ogrt)}</span><span>${htmlKacir(br)}</span><span>${htmlKacir(yer)}</span></div></div><div class="durum-rozet ${durumSinifi(d.ders_durumu)}">${htmlKacir(d.ders_durumu||'—')}</div></div>`;
  }

  function grupListe(container,dersler,bas,gunSayisi){
    const bugun=istanbulBugunISO();
    const gunler=[];
    for(let i=0;i<gunSayisi;i++) gunler.push(BSDersProgramServisi.tarihEkle(bas,i));
    container.innerHTML='<div class="bsders-panel">'+gunler.map(iso=>{
      const sat=dersler.filter(x=>String(x.tarih).slice(0,10)===iso);
      return `<section class="bsders-gun"><div class="bsders-gun-baslik ${iso===bugun?'bugun':''}"><span>${htmlKacir(gunEtiketi(iso))}</span><span>${sat.length} ders</span></div>${sat.length?sat.map(dersHTML).join(''):'<div class="bos-durum" style="min-height:76px">Ders yok</div>'}</section>`;
    }).join('')+'</div>';
  }

  async function sekmeYukle(tur){
    const hedef=document.getElementById('bsDersSekmeIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Dersler yükleniyor…</div>';
    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders program servisi yüklenmedi.');
      ref=await BSDersProgramServisi.referanslar();
      if(tur==='bugun'){
        const bugun=istanbulBugunISO();
        const ds=await BSDersProgramServisi.dersleriGetir(bugun,BSDersProgramServisi.tarihEkle(bugun,1));
        hedef.innerHTML=ds.length?'<div class="ders-listesi">'+ds.map(dersHTML).join('')+'</div>':'<div class="bos-durum"><div class="bos-durum-baslik">Bugün ders yok</div></div>';
        return;
      }

      const h=BSDersProgramServisi.haftaSiniri();
      if(tur==='ogretmen'){
        const aktif=(ref.ogretmenler||[]).filter(x=>x.durum!=='Pasif');
        hedef.innerHTML=`<div class="bsders-toolbar"><select id="bsDersOgretmenSec" class="bsders-select"><option value="">Öğretmen seçin</option>${aktif.map(x=>`<option value="${htmlKacir(x.ogretmen_id)}">${htmlKacir(x.ad_soyad)}</option>`).join('')}</select><span class="bsders-hafta">${htmlKacir(tarihKisa(h.bas))} – ${htmlKacir(tarihKisa(h.son))}</span></div><div id="bsDersOgretmenListe"><div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık program görünür.</div></div>`;
        document.getElementById('bsDersOgretmenSec').addEventListener('change',async e=>{
          const alt=document.getElementById('bsDersOgretmenListe');
          if(!e.target.value){alt.innerHTML='<div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık program görünür.</div>';return;}
          alt.innerHTML='<div class="ders-yukleniyor">Program yükleniyor…</div>';
          try{const ds=await BSDersProgramServisi.dersleriGetir(h.bas,h.sonraki,e.target.value);grupListe(alt,ds,h.bas,7);}catch(err){console.error('Öğretmen takvimi:',err);alt.innerHTML='<div class="bos-durum">Program yüklenemedi.</div>';}
        });
        return;
      }

      const ds=await BSDersProgramServisi.dersleriGetir(h.bas,h.sonraki);
      hedef.innerHTML=`<div class="bsders-toolbar"><span class="bsders-hafta">Bu Hafta • ${htmlKacir(tarihKisa(h.bas))} – ${htmlKacir(tarihKisa(h.son))}</span><span class="bsders-sayac">${ds.length} ders</span></div><div id="bsDersGenelTakvim"></div>`;
      grupListe(document.getElementById('bsDersGenelTakvim'),ds,h.bas,7);
    }catch(err){
      console.error('Ders modülü:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Dersler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';
    }
  }

  function arayuzuHazirla(){
    const bolum=document.getElementById('gorunum-dersler');
    if(!bolum) return false;
    stilEkle();
    const sekmeler=bolum.querySelectorAll('.sekme');
    const turler=['bugun','ogretmen','genel'];
    sekmeler.forEach((b,i)=>{
      b.dataset.bsDers=turler[i]||'bugun';
      b.addEventListener('click',()=>{
        sekmeler.forEach(x=>x.classList.remove('aktif'));
        b.classList.add('aktif');
        sekmeYukle(b.dataset.bsDers);
      });
    });
    const kart=bolum.querySelector('.kart');
    if(kart) kart.innerHTML='<div id="bsDersSekmeIcerik"><div class="ders-yukleniyor">Dersler yükleniyor…</div></div>';
    return true;
  }

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
})();
