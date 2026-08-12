(function(){
  const V='207';
  const durum={ogrenciler:[],ogretmenler:[],branslar:[],derslikler:[]};

  function stilEkle(){
    const style=document.createElement('style');
    style.textContent=`
      .v207-panel{display:grid;gap:10px}
      .v207-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap}
      .v207-select{min-width:220px;height:42px;padding:0 12px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi)}
      .v207-haflab{font-size:11px;color:var(--ikincil);font-weight:700}
      .v207-gun{background:#fff;border:1px solid var(--kenar);border-radius:14px;overflow:hidden}
      .v207-gun-baslik{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800;color:var(--ikincil)}
      .v207-gun-baslik.bugun{background:var(--mavi-acik);color:var(--mavi)}
      .v207-gun .ders-satir:last-child{border-bottom:none}
      .v207-ogrenci-listesi{display:grid;gap:8px;padding:10px}
      .v207-ogrenci-kart{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 14px;border:1px solid var(--kenar);border-radius:13px;background:#fff}
      .v207-ogrenci-ad{font-size:13px;font-weight:800;color:var(--yazi)}
      .v207-ogrenci-detay{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.4}
      .v207-rozet{padding:6px 9px;border-radius:999px;background:var(--yesil-acik);color:var(--yesil);font-size:9px;font-weight:800;white-space:nowrap}
      .v207-sayac{font-size:11px;color:var(--ikincil);font-weight:700}
      @media(max-width:640px){
        .v207-toolbar{align-items:stretch}
        .v207-select{width:100%;min-width:0}
        .v207-gun-baslik{padding:9px 11px}
        .v207-ogrenci-listesi{padding:7px}
        .v207-ogrenci-kart{padding:11px 12px}
        .v207-ogrenci-ad{font-size:11px}
        .v207-ogrenci-detay{font-size:9px;gap:3px 8px}
      }
    `;
    document.head.appendChild(style);
  }

  function tarihEkle(iso,gun){
    const d=new Date(iso+'T12:00:00+03:00');
    d.setDate(d.getDate()+gun);
    return d.toISOString().slice(0,10);
  }

  function haftaSiniri(){
    const bugun=istanbulBugunISO();
    const d=new Date(bugun+'T12:00:00+03:00');
    const gun=d.getDay();
    const fark=gun===0?-6:1-gun;
    const bas=tarihEkle(bugun,fark);
    return {bas,sonraki:tarihEkle(bas,7)};
  }

  function gunEtiketi(iso){
    return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso+'T12:00:00+03:00'));
  }

  function maps(){
    return {
      ogrenci:new Map(durum.ogrenciler.map(x=>[x.ogrenci_id,x.ad_soyad])),
      ogretmen:new Map(durum.ogretmenler.map(x=>[x.ogretmen_id,x.ad_soyad])),
      brans:new Map(durum.branslar.map(x=>[x.brans_id,x.brans_adi])),
      derslik:new Map(durum.derslikler.map(x=>[x.derslik_id,x.mekan_adi]))
    };
  }

  function dersHTML(d,m){
    const ogr=m.ogrenci.get(d.ogrenci_id)||'Öğrenci';
    const ogrt=m.ogretmen.get(d.ogretmen_id)||'Öğretmen';
    const br=m.brans.get(d.brans_id)||'Branş';
    const yer=m.derslik.get(d.derslik_id)||d.ders_yeri||'Yer';
    return `<div class="ders-satir">
      <div class="ders-saat">${htmlKacir(saatKisalt(d.baslangic_saati))}<br>${htmlKacir(saatKisalt(d.bitis_saati))}</div>
      <div><div class="ders-ogrenci">${htmlKacir(ogr)}</div><div class="ders-detay"><span>${htmlKacir(ogrt)}</span><span>${htmlKacir(br)}</span><span>${htmlKacir(yer)}</span></div></div>
      <div class="durum-rozet ${durumSinifi(d.ders_durumu)}">${htmlKacir(d.ders_durumu||'—')}</div>
    </div>`;
  }

  async function referanslariGetir(){
    if(durum.ogrenciler.length) return;
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');
    const r=await BSReferansServisi.yukle();
    durum.ogrenciler=r.ogrenciler||[];
    durum.ogretmenler=r.ogretmenler||[];
    durum.branslar=r.branslar||[];
    durum.derslikler=r.derslikler||[];
  }

  async function dersleriGetir(bas,sonraki,ogretmenId){
    if(!window.BSDersProgramServisi) throw new Error('Ders/program servisi yüklenmedi.');
    return BSDersProgramServisi.dersleriGetir(bas,sonraki,ogretmenId);
  }

  function grupListe(container,dersler,bas,gunSayisi){
    const m=maps();
    const bugun=istanbulBugunISO();
    const gunler=[];
    for(let i=0;i<gunSayisi;i++) gunler.push(tarihEkle(bas,i));
    container.innerHTML='<div class="v207-panel">'+gunler.map(iso=>{
      const sat=dersler.filter(x=>String(x.tarih).slice(0,10)===iso);
      return `<section class="v207-gun"><div class="v207-gun-baslik ${iso===bugun?'bugun':''}"><span>${htmlKacir(gunEtiketi(iso))}</span><span>${sat.length} ders</span></div>${sat.length?sat.map(d=>dersHTML(d,m)).join(''):'<div class="bos-durum" style="min-height:76px">Ders yok</div>'}</section>`;
    }).join('')+'</div>';
  }

  async function dersSekmesiYukle(tur){
    const hedef=document.getElementById('derslerSekmeIcerikV207');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Dersler yükleniyor…</div>';
    try{
      await referanslariGetir();
      if(tur==='bugun'){
        const bugun=istanbulBugunISO();
        const ds=await dersleriGetir(bugun,tarihEkle(bugun,1));
        hedef.innerHTML=ds.length?'<div class="ders-listesi">'+ds.map(d=>dersHTML(d,maps())).join('')+'</div>':'<div class="bos-durum"><div class="bos-durum-baslik">Bugün ders yok</div></div>';
      }else if(tur==='ogretmen'){
        const h=haftaSiniri();
        const aktif=durum.ogretmenler.filter(x=>x.durum!=='Pasif');
        hedef.innerHTML=`<div class="v207-toolbar"><select id="v207OgretmenSec" class="v207-select"><option value="">Öğretmen seçin</option>${aktif.map(x=>`<option value="${htmlKacir(x.ogretmen_id)}">${htmlKacir(x.ad_soyad)}</option>`).join('')}</select><span class="v207-haflab">${htmlKacir(tarihKisa(h.bas))} – ${htmlKacir(tarihKisa(tarihEkle(h.sonraki,-1)))}</span></div><div id="v207OgretmenDersleri"><div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık program görünür.</div></div>`;
        document.getElementById('v207OgretmenSec').addEventListener('change',async e=>{
          const alt=document.getElementById('v207OgretmenDersleri');
          if(!e.target.value){alt.innerHTML='<div class="bos-durum" style="min-height:130px">Öğretmen seçildiğinde haftalık program görünür.</div>';return;}
          alt.innerHTML='<div class="ders-yukleniyor">Program yükleniyor…</div>';
          const ds=await dersleriGetir(h.bas,h.sonraki,e.target.value);
          grupListe(alt,ds,h.bas,7);
        });
      }else{
        const h=haftaSiniri();
        const ds=await dersleriGetir(h.bas,h.sonraki);
        hedef.innerHTML=`<div class="v207-toolbar"><span class="v207-haflab">Bu Hafta • ${htmlKacir(tarihKisa(h.bas))} – ${htmlKacir(tarihKisa(tarihEkle(h.sonraki,-1)))}</span><span class="v207-sayac">${ds.length} ders</span></div><div id="v207GenelTakvim"></div>`;
        grupListe(document.getElementById('v207GenelTakvim'),ds,h.bas,7);
      }
    }catch(err){
      console.error('V207 ders ekranı:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Dersler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';
    }
  }

  function ogrencileriListele(kayitlar){
    const hedef=document.getElementById('ogrenciListesiV207');
    const sayac=document.getElementById('ogrenciSayacV207');
    if(!hedef) return;
    if(sayac) sayac.textContent=kayitlar.length+' öğrenci';
    hedef.className='v207-ogrenci-listesi';
    hedef.innerHTML=kayitlar.map(o=>{
      const tel=o.ogrenci_telefon||o.veli_telefon||'';
      const alt=[o.veli_adi?('Veli: '+o.veli_adi):'',tel,o.email||''].filter(Boolean);
      return `<article class="v207-ogrenci-kart"><div><div class="v207-ogrenci-ad">${htmlKacir(o.ad_soyad)}</div><div class="v207-ogrenci-detay">${alt.map(x=>`<span>${htmlKacir(x)}</span>`).join('')}</div></div><span class="v207-rozet">${htmlKacir(o.durum||'Aktif')}</span></article>`;
    }).join('');
  }

  async function ogrencileriYukle(){
    const hedef=document.getElementById('ogrenciListesiV207');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Öğrenciler yükleniyor…</div>';
    try{
      await referanslariGetir();
      ogrencileriListele(durum.ogrenciler);
    }catch(err){
      console.error('V207 öğrenciler:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Öğrenciler yüklenemedi</div></div>';
    }
  }

  function arayuzuHazirla(){
    stilEkle();
    const dersBolum=document.getElementById('gorunum-dersler');
    if(dersBolum){
      const sekmeler=dersBolum.querySelectorAll('.sekme');
      const turler=['bugun','ogretmen','genel'];
      sekmeler.forEach((b,i)=>{b.dataset.v207=turler[i]; b.addEventListener('click',()=>{sekmeler.forEach(x=>x.classList.remove('aktif'));b.classList.add('aktif');dersSekmesiYukle(b.dataset.v207);});});
      const kart=dersBolum.querySelector('.kart');
      if(kart) kart.innerHTML='<div id="derslerSekmeIcerikV207"><div class="ders-yukleniyor">Dersler yükleniyor…</div></div>';
    }

    const ogrBolum=document.getElementById('gorunum-ogrenciler');
    if(ogrBolum){
      const input=ogrBolum.querySelector('input[type="search"]');
      if(input){input.id='ogrenciAramaV207'; input.addEventListener('input',()=>{const q=input.value.trim().toLocaleLowerCase('tr-TR');const f=durum.ogrenciler.filter(o=>[o.ad_soyad,o.veli_adi,o.email,o.veli_telefon,o.ogrenci_telefon].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q)));ogrencileriListele(f);});}
      const kart=ogrBolum.querySelector('.kart');
      if(kart) kart.innerHTML='<div class="kart-baslik"><h2>Öğrenci Listesi</h2><span id="ogrenciSayacV207" class="v207-sayac"></span></div><div id="ogrenciListesiV207"><div class="ders-yukleniyor">Öğrenciler yükleniyor…</div></div>';
    }
  }

  async function baslatV207(){
    arayuzuHazirla();
    let deneme=0;
    const timer=setInterval(async()=>{
      deneme++;
      try{
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){
          clearInterval(timer);
          await Promise.all([referanslariGetir(),dersSekmesiYukle('bugun'),ogrencileriYukle()]);
        }else if(deneme>30){clearInterval(timer);}
      }catch(e){if(deneme>30)clearInterval(timer);}
    },250);
  }

  baslatV207();
})();
