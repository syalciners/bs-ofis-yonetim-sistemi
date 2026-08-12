(function(){
  if(window.BSFinansModuluV1) return;

  let tahsilatKayitlari=[];
  let ogrenciMap=new Map();
  let hesapMap=new Map();
  let tahsilatFiltre='Tümü';

  function stilEkle(){
    if(document.getElementById('bsFinansModulStil')) return;
    const style=document.createElement('style');
    style.id='bsFinansModulStil';
    style.textContent=`
      .bsfin-kpi-alt{margin-top:8px;color:var(--ikincil);font-size:9.5px;line-height:1.35;font-weight:650}
      .bsfin-kpi-alt strong{color:var(--yazi);font-weight:750}
      .bsfin-filtre{display:grid;grid-template-columns:180px minmax(220px,1fr) auto;gap:10px;align-items:center;margin-bottom:12px}
      .bsfin-input,.bsfin-ay{height:42px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi);padding:0 12px;outline:none}
      .bsfin-input:focus,.bsfin-ay:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
      .bsfin-chipler{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .bsfin-chip{height:34px;padding:0 11px;border:1px solid var(--kenar);border-radius:999px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:780;cursor:pointer}
      .bsfin-chip.aktif{border-color:#bfdbfe;background:var(--mavi-acik);color:var(--mavi)}
      .bsfin-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:12px;border-bottom:1px solid var(--kenar);background:#f8fafc}
      .bsfin-kpi-kart{padding:12px 13px;border:1px solid var(--kenar);border-radius:13px;background:#fff}
      .bsfin-kpi-kart span{display:block;font-size:9.5px;font-weight:720;color:var(--ikincil)}
      .bsfin-kpi-kart strong{display:block;margin-top:7px;font-size:18px;line-height:1.05;font-weight:850;color:var(--yazi)}
      .bsfin-kpi-kart.vurgu strong{color:var(--yesil)}
      .bsfin-baslik-satir{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--kenar)}
      .bsfin-baslik-satir strong{font-size:12px}.bsfin-sayac{font-size:10px;color:var(--ikincil);font-weight:700}
      .bsfin-liste{display:grid}.bsfin-satir{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 14px;border-bottom:1px solid #f1f5f9}.bsfin-satir:last-child{border-bottom:none}
      .bsfin-tarih{padding:7px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);font-size:9px;line-height:1.25;text-align:center;font-weight:820}
      .bsfin-ad{font-size:11px;font-weight:820;color:var(--yazi)}.bsfin-detay{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:4px;color:var(--ikincil);font-size:9px;line-height:1.35}.bsfin-tutar{font-size:12px;font-weight:850;color:var(--yesil);white-space:nowrap}
      .bsfin-bos{min-height:180px;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--ikincil);font-size:10.5px}
      @media(max-width:760px){.bsfin-filtre{grid-template-columns:1fr 1fr}.bsfin-chipler{grid-column:1/-1;justify-content:flex-start}.bsfin-kpi{grid-template-columns:repeat(2,minmax(0,1fr));padding:9px;gap:7px}.bsfin-kpi-kart{padding:10px}.bsfin-kpi-kart strong{font-size:16px}}
      @media(max-width:640px){.bsfin-kpi-alt{margin-top:7px;font-size:8.5px;line-height:1.3}}
      @media(max-width:520px){.bsfin-filtre{grid-template-columns:1fr}.bsfin-chipler{grid-column:auto}.bsfin-ay,.bsfin-input{width:100%;height:40px}.bsfin-satir{grid-template-columns:54px minmax(0,1fr) auto;padding:10px 11px;gap:9px}.bsfin-tarih{font-size:8.5px}.bsfin-ad{font-size:10.5px}.bsfin-detay{font-size:8.5px}.bsfin-tutar{font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function kpiAltYaz(kart,metin){
    if(!kart) return;
    let alt=kart.querySelector('.bsfin-kpi-alt');
    if(!alt){alt=document.createElement('div');alt.className='bsfin-kpi-alt';kart.appendChild(alt);}
    alt.innerHTML=metin;
  }

  async function anaSayfaKpilariniYukle(){
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');
    const kasaKart=document.querySelector('.kpi-grid .kpi-kart:nth-child(4)');
    const borcKart=document.querySelector('.kpi-grid .kpi-kart:nth-child(5)');
    const kasaDeger=kasaKart&&kasaKart.querySelector('.kpi-deger');
    const borcDeger=borcKart&&borcKart.querySelector('.kpi-deger');
    if(kasaDeger) kasaDeger.textContent='…';
    if(borcDeger) borcDeger.textContent='…';
    try{
      const [kasa,borc]=await Promise.all([BSFinansServisi.kasaOzetiGetir(),BSFinansServisi.borcOzetiGetir()]);
      if(kasaDeger) kasaDeger.textContent=paraYaz(kasa.toplam);
      kpiAltYaz(kasaKart,kasa.hesaplar.map(x=>`<strong>${htmlKacir(x.ad)}</strong> ${htmlKacir(paraYaz(x.bakiye))}`).join(' • '));
      if(borcDeger) borcDeger.textContent=String(borc.sayi);
      kpiAltYaz(borcKart,`Toplam açık bakiye <strong>${htmlKacir(paraYaz(borc.toplamKalan))}</strong>`);
    }catch(err){
      console.error('Finans KPI:',err);
      if(kasaDeger) kasaDeger.textContent='!';
      if(borcDeger) borcDeger.textContent='!';
    }
  }

  function tarihEtiket(iso){
    try{return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short'}).format(new Date(String(iso).slice(0,10)+'T12:00:00+03:00'));}
    catch(e){return String(iso||'').slice(0,10);}
  }

  function tahsilatArayuzunuHazirla(){
    const bolum=document.getElementById('gorunum-tahsilat');
    if(!bolum) return false;
    const kart=bolum.querySelector('.kart');
    if(!kart) return false;

    document.getElementById('bsFinansFiltre')?.remove();
    const toolbar=document.createElement('div');
    toolbar.id='bsFinansFiltre';toolbar.className='bsfin-filtre';
    toolbar.innerHTML=`<input id="bsFinansAy" class="bsfin-ay" type="month" aria-label="Ay seç"><input id="bsFinansAra" class="bsfin-input" type="search" placeholder="Öğrenci veya ödeme yöntemi ara…" aria-label="Tahsilat ara"><div class="bsfin-chipler"><button class="bsfin-chip aktif" data-bsfin-filtre="Tümü" type="button">Tümü</button><button class="bsfin-chip" data-bsfin-filtre="Havale/EFT" type="button">Havale/EFT</button><button class="bsfin-chip" data-bsfin-filtre="Nakit" type="button">Nakit</button></div>`;
    kart.parentNode.insertBefore(toolbar,kart);
    kart.innerHTML=`<div id="bsFinansKpi" class="bsfin-kpi"><div class="bsfin-kpi-kart vurgu"><span>Toplam Tahsilat</span><strong>…</strong></div><div class="bsfin-kpi-kart"><span>Kayıt</span><strong>…</strong></div><div class="bsfin-kpi-kart"><span>Havale/EFT</span><strong>…</strong></div><div class="bsfin-kpi-kart"><span>Nakit</span><strong>…</strong></div></div><div class="bsfin-baslik-satir"><strong>Tahsilat Geçmişi</strong><span id="bsFinansSayac" class="bsfin-sayac"></span></div><div id="bsFinansListe" class="bsfin-bos">Tahsilatlar yükleniyor…</div>`;

    const ay=document.getElementById('bsFinansAy');
    ay.value=istanbulBugunISO().slice(0,7);
    ay.addEventListener('change',tahsilatlariYukle);
    document.getElementById('bsFinansAra').addEventListener('input',tahsilatListesiniCiz);
    toolbar.querySelectorAll('[data-bsfin-filtre]').forEach(b=>b.addEventListener('click',()=>{
      tahsilatFiltre=b.dataset.bsfinFiltre;
      toolbar.querySelectorAll('[data-bsfin-filtre]').forEach(x=>x.classList.toggle('aktif',x===b));
      tahsilatListesiniCiz();
    }));
    return true;
  }

  async function tahsilatReferanslariniYukle(){
    const r=await BSFinansServisi.tahsilatReferanslariGetir();
    ogrenciMap=r.ogrenciMap;
    hesapMap=r.hesapMap;
  }

  async function tahsilatlariYukle(){
    const liste=document.getElementById('bsFinansListe');
    if(!liste) return;
    liste.className='bsfin-bos';liste.textContent='Tahsilatlar yükleniyor…';
    try{
      if(!ogrenciMap.size||!hesapMap.size) await tahsilatReferanslariniYukle();
      const ym=document.getElementById('bsFinansAy').value||istanbulBugunISO().slice(0,7);
      const sonuc=await BSFinansServisi.tahsilatlariAyGetir(ym);
      tahsilatKayitlari=sonuc.kayitlar;
      const kartlar=document.querySelectorAll('#bsFinansKpi .bsfin-kpi-kart strong');
      if(kartlar[0]) kartlar[0].textContent=paraYaz(sonuc.toplam);
      if(kartlar[1]) kartlar[1].textContent=String(tahsilatKayitlari.length);
      if(kartlar[2]) kartlar[2].textContent=paraYaz(sonuc.havale);
      if(kartlar[3]) kartlar[3].textContent=paraYaz(sonuc.nakit);
      tahsilatListesiniCiz();
    }catch(err){
      console.error('Tahsilatlar:',err);
      liste.className='bsfin-bos';liste.textContent='Tahsilatlar yüklenemedi. Bağlantı veya erişim yetkisi kontrol edilmeli.';
    }
  }

  function tahsilatListesiniCiz(){
    const hedef=document.getElementById('bsFinansListe');
    if(!hedef) return;
    const q=(document.getElementById('bsFinansAra')?.value||'').trim().toLocaleLowerCase('tr-TR');
    const secilen=tahsilatKayitlari.filter(x=>{
      const yontem=String(x.odeme_yontemi||'');
      if(tahsilatFiltre!=='Tümü'&&!yontem.toLocaleLowerCase('tr-TR').includes(tahsilatFiltre.toLocaleLowerCase('tr-TR').split('/')[0])) return false;
      if(!q) return true;
      return [ogrenciMap.get(x.ogrenci_id)||'',yontem,x.aciklama||'',hesapMap.get(x.hesap_id)||''].join(' ').toLocaleLowerCase('tr-TR').includes(q);
    });
    const sayac=document.getElementById('bsFinansSayac');
    if(sayac) sayac.textContent=secilen.length+' kayıt';
    if(!secilen.length){hedef.className='bsfin-bos';hedef.textContent='Seçili filtrede tahsilat bulunmuyor.';return;}
    hedef.className='bsfin-liste';
    hedef.innerHTML=secilen.map(x=>`<div class="bsfin-satir"><div class="bsfin-tarih">${htmlKacir(tarihEtiket(x.tarih))}</div><div><div class="bsfin-ad">${htmlKacir(ogrenciMap.get(x.ogrenci_id)||'Öğrenci')}</div><div class="bsfin-detay"><span>${htmlKacir(x.odeme_yontemi||'Tahsilat')}</span>${x.hesap_id?`<span>${htmlKacir(hesapMap.get(x.hesap_id)||x.hesap_id)}</span>`:''}${x.aciklama?`<span>${htmlKacir(x.aciklama)}</span>`:''}</div></div><div class="bsfin-tutar">${htmlKacir(paraYaz(x.tutar||0))}</div></div>`).join('');
  }

  async function baslat(){
    stilEkle();
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');
    tahsilatArayuzunuHazirla();
    await Promise.all([anaSayfaKpilariniYukle(),tahsilatReferanslariniYukle().then(tahsilatlariYukle)]);
  }

  let deneme=0;
  const timer=setInterval(async()=>{
    deneme++;
    try{
      if(typeof bsSupabase!=='undefined'){
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){clearInterval(timer);await baslat();}
      }
      if(deneme>40) clearInterval(timer);
    }catch(e){console.error('Finans modülü başlatma:',e);if(deneme>40) clearInterval(timer);}
  },250);

  window.BSFinansModuluV1={anaSayfaKpilariniYukle,tahsilatlariYukle};
})();
