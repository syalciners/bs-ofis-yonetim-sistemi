(function(){
  if(window.BSOperasyonGorselModuluV1) return;
  window.BSOperasyonGorselModuluV1=true;

  const KAPSAM='#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar';

  function stilEkle(){
    if(document.getElementById('bsOperasyonGorselStil')) return;
    const s=document.createElement('style');
    s.id='bsOperasyonGorselStil';
    s.textContent=`
      /* V263 — Ders ekranındaki görsel dilin operasyon modüllerine yayılması */
      ${KAPSAM}{--bso-mavi:#1769f6;--bso-mavi-acik:#eef5ff;--bso-lacivert:#0f1b3d;--bso-gri:#6b7a94;--bso-kenar:#e4eaf3;--bso-golge:0 7px 24px rgba(15,23,42,.05)}
      ${KAPSAM} .sayfa-baslik-alani{align-items:center!important;margin-bottom:18px!important}
      ${KAPSAM} .sayfa-baslik{font-size:29px!important;line-height:1.08!important;letter-spacing:-.02em!important;color:var(--bso-lacivert)!important}
      ${KAPSAM} .sayfa-aciklama{margin-top:7px!important;font-size:13px!important;line-height:1.45!important;color:#71809a!important}
      ${KAPSAM} .ana-islem-buton{min-height:48px!important;padding:0 18px!important;border:0!important;border-radius:14px!important;background:linear-gradient(135deg,#2b6ff5,#1762eb)!important;color:#fff!important;box-shadow:0 9px 22px rgba(37,99,235,.20)!important;font-size:12px!important;font-weight:820!important}
      ${KAPSAM} .ana-islem-buton:active{transform:translateY(1px)}

      /* Öğrenciler */
      #gorunum-ogrenciler .kart{overflow:visible!important;border:0!important;background:transparent!important}
      #gorunum-ogrenciler input[type="search"]{height:46px!important;padding:0 14px 0 42px!important;border:1px solid var(--bso-kenar)!important;border-radius:14px!important;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371809a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat 14px center/17px!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important;font-size:12px!important;outline:none!important}
      #gorunum-ogrenciler input[type="search"]:focus{border-color:#bcd4ff!important;box-shadow:0 0 0 3px rgba(37,99,235,.08)!important}
      #gorunum-ogrenciler .kart-baslik{min-height:50px!important;padding:0 4px 8px!important;border:0!important;background:transparent!important}
      #gorunum-ogrenciler .kart-baslik h2{font-size:12px!important;color:#50617f!important}
      #gorunum-ogrenciler .bsogr-listesi{gap:9px!important;padding:0!important}
      #gorunum-ogrenciler .bsogr-list-kart{position:relative;grid-template-columns:46px minmax(0,1fr) auto!important;gap:12px!important;min-height:72px;padding:11px 13px!important;border:1px solid var(--bso-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:0 5px 17px rgba(15,23,42,.035)!important;cursor:pointer!important;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}
      #gorunum-ogrenciler .bsogr-list-kart:before{content:attr(data-bs-avatar);width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#eaf2ff,#f4f8ff);color:#1769f6;font-size:12px;font-weight:900;letter-spacing:.02em;border:1px solid #dce9ff}
      #gorunum-ogrenciler .bsogr-list-kart:active{transform:scale(.995);border-color:#c9dcff}
      #gorunum-ogrenciler .bsogr-list-ad{font-size:12px!important;color:#101a35!important}
      #gorunum-ogrenciler .bsogr-list-detay{margin-top:4px!important;font-size:9.4px!important;line-height:1.4!important;color:#71809a!important}
      #gorunum-ogrenciler .bsogr-list-rozet{padding:6px 9px!important;background:#eafaf1!important;color:#0c9144!important;font-size:8.5px!important}
      #gorunum-ogrenciler .bsogr-list-rozet.pasif{background:#f2f4f7!important;color:#71809a!important}
      #gorunum-ogrenciler .bsogr-list-sayac{display:inline-flex;align-items:center;min-height:29px;padding:0 9px;border-radius:999px;background:#f3f6fa;color:#60708b!important;font-size:9px!important}

      /* Tahsilat */
      #gorunum-tahsilat .kart{overflow:hidden!important;border:1px solid var(--bso-kenar)!important;border-radius:18px!important;background:#fff!important;box-shadow:var(--bso-golge)!important}
      #gorunum-tahsilat .bsfin-filtre{padding:12px!important;margin-bottom:12px!important;border:1px solid var(--bso-kenar)!important;border-radius:17px!important;background:#fff!important;box-shadow:var(--bso-golge)!important}
      #gorunum-tahsilat .bsfin-input,#gorunum-tahsilat .bsfin-ay{height:43px!important;border-color:#dfe6f0!important;border-radius:12px!important;background:#fbfcfe!important;font-size:11px!important}
      #gorunum-tahsilat .bsfin-chip{height:33px!important;border-color:#e2e8f0!important;background:#fff!important;color:#63738e!important;font-size:9px!important}
      #gorunum-tahsilat .bsfin-chip.aktif{border-color:#bcd4ff!important;background:#edf4ff!important;color:#1769f6!important}
      #gorunum-tahsilat .bsfin-kpi{gap:8px!important;padding:11px!important;border-bottom:1px solid #edf1f6!important;background:#fbfcfe!important}
      #gorunum-tahsilat .bsfin-kpi-kart{min-height:82px;padding:11px 12px!important;border-color:#e6ebf3!important;border-radius:13px!important;background:#fff!important}
      #gorunum-tahsilat .bsfin-kpi-kart span{font-size:8.8px!important;color:#71809a!important}
      #gorunum-tahsilat .bsfin-kpi-kart strong{margin-top:7px!important;font-size:17px!important;color:#101a35!important}
      #gorunum-tahsilat .bsfin-kpi-kart.vurgu{border-color:#c7f0d8!important;background:linear-gradient(145deg,#fbfffc,#f3fcf7)!important}
      #gorunum-tahsilat .bsfin-kpi-kart.vurgu strong{color:#0c9144!important}
      #gorunum-tahsilat .bsfin-baslik-satir{padding:11px 13px!important;border-bottom-color:#edf1f6!important}
      #gorunum-tahsilat .bsfin-liste{gap:0!important}
      #gorunum-tahsilat .bsfin-satir{min-height:64px;padding:10px 13px!important;border-bottom-color:#f0f3f7!important}
      #gorunum-tahsilat .bsfin-tarih{background:#edf4ff!important;color:#1769f6!important;border-radius:10px!important}
      #gorunum-tahsilat .bsfin-ad{font-size:10.8px!important;color:#101a35!important}
      #gorunum-tahsilat .bsfin-detay{color:#71809a!important}
      #gorunum-tahsilat .bsfin-tutar{color:#0c9144!important;font-size:11.5px!important}

      /* Sabit program */
      #gorunum-sabitprogram .bssp-ust{margin-bottom:10px!important}
      #gorunum-sabitprogram .bssp-geri{border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important;color:#64748b!important}
      #gorunum-sabitprogram .bssp-olustur{height:40px!important;padding:0 14px!important;border:0!important;border-radius:11px!important;background:linear-gradient(135deg,#2b6ff5,#1762eb)!important;box-shadow:0 7px 17px rgba(37,99,235,.18)!important}
      #gorunum-sabitprogram .bssp-arama{height:45px!important;padding-left:42px!important;border-color:var(--bso-kenar)!important;border-radius:14px!important;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371809a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat 14px center/17px!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important}
      #gorunum-sabitprogram .bssp-ozet{padding:0 2px!important;margin:10px 0!important;color:#71809a!important}
      #gorunum-sabitprogram .bssp-gunler{gap:12px!important}
      #gorunum-sabitprogram .bssp-gun{border-color:var(--bso-kenar)!important;border-radius:17px!important;background:#fbfcfe!important;box-shadow:var(--bso-golge)!important}
      #gorunum-sabitprogram .bssp-gun-baslik{min-height:48px;padding:9px 13px!important;border-bottom-color:#e8edf4!important;background:#fbfcfe!important;color:#14213f!important}
      #gorunum-sabitprogram .bssp-gun-baslik span:first-child{font-weight:850!important}
      #gorunum-sabitprogram .bssp-gun-baslik span:last-child{padding:5px 9px;border-radius:999px;background:#edf4ff;color:#1769f6;font-size:8.5px}
      #gorunum-sabitprogram .bssp-satir{min-height:70px;margin:8px 9px 0!important;padding:10px 11px!important;border:1px solid #e7ecf3!important;border-radius:13px!important;background:#fff!important}
      #gorunum-sabitprogram .bssp-satir:last-child{margin-bottom:9px!important;border-bottom:1px solid #e7ecf3!important}
      #gorunum-sabitprogram .bssp-saat{background:#edf4ff!important;color:#1769f6!important;border-radius:10px!important}
      #gorunum-sabitprogram .bssp-ad{font-size:10.8px!important;color:#101a35!important}
      #gorunum-sabitprogram .bssp-detay{color:#71809a!important}
      #gorunum-sabitprogram .bssp-rozet{background:#f4f6f9!important;color:#60708b!important}
      #gorunum-sabitprogram .bssp-rozet.tekrar{background:#edf4ff!important;color:#1769f6!important}

      /* Öğretmenler */
      #gorunum-ogretmenler .bsog-geri{border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important}
      #gorunum-ogretmenler .bsog-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
      #gorunum-ogretmenler .bsog-kart{position:relative;min-height:142px;padding:15px!important;border-color:var(--bso-kenar)!important;border-radius:17px!important;background:#fff!important;box-shadow:var(--bso-golge)!important;overflow:hidden}
      #gorunum-ogretmenler .bsog-kart:before{content:attr(data-bs-avatar);width:40px;height:40px;display:grid;place-items:center;margin-bottom:11px;border-radius:13px;background:linear-gradient(145deg,#eaf2ff,#f5f8ff);border:1px solid #dce9ff;color:#1769f6;font-size:11px;font-weight:900}
      #gorunum-ogretmenler .bsog-kart:after{content:'';position:absolute;right:-28px;top:-31px;width:82px;height:82px;border-radius:50%;background:rgba(37,99,235,.045)}
      #gorunum-ogretmenler .bsog-ad{font-size:12px!important;color:#101a35!important}
      #gorunum-ogretmenler .bsog-rol{color:#71809a!important}
      #gorunum-ogretmenler .bsog-kpiler{gap:7px!important;margin-top:12px!important}
      #gorunum-ogretmenler .bsog-kpi{padding:9px!important;border:1px solid #edf1f6!important;border-radius:11px!important;background:#fbfcfe!important}
      #gorunum-ogretmenler .bsog-kpi span{font-size:8px!important;color:#71809a!important}
      #gorunum-ogretmenler .bsog-kpi strong{font-size:12px!important;color:#101a35!important}
      #gorunum-ogretmenler .bsog-kpi:first-child strong{color:#1769f6!important}
      #gorunum-ogretmenler .bsog-sheet{background:#f7f9fc!important}
      #gorunum-ogretmenler .bsog-bolum{border-color:#e4eaf3!important;box-shadow:0 4px 15px rgba(15,23,42,.03)!important}

      /* Giderler */
      #gorunum-giderler .bsgd-geri,#gorunum-giderler .bsgd-ay{height:40px!important;border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important}
      #gorunum-giderler .bsgd-kpi{gap:9px!important;margin-bottom:12px!important}
      #gorunum-giderler .bsgd-kart{min-height:92px;padding:13px!important;border-color:var(--bso-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bso-golge)!important}
      #gorunum-giderler .bsgd-kart:first-child{background:linear-gradient(145deg,#fff,#fff7f7)!important;border-color:#fee2e2!important}
      #gorunum-giderler .bsgd-kart span{color:#71809a!important}
      #gorunum-giderler .bsgd-kart strong{font-size:17px!important;color:#101a35!important}
      #gorunum-giderler .bsgd-kart:first-child strong{color:#c24141!important}
      #gorunum-giderler .bsgd-chip{border-color:#e2e8f0!important;background:#fff!important;color:#63738e!important}
      #gorunum-giderler .bsgd-chip.aktif{border-color:#fecaca!important;background:#fff1f1!important;color:#c24141!important}
      #gorunum-giderler .bsgd-grid{gap:11px!important}
      #gorunum-giderler .bsgd-bolum{border-color:var(--bso-kenar)!important;border-radius:17px!important;box-shadow:var(--bso-golge)!important}
      #gorunum-giderler .bsgd-baslik{min-height:47px;padding:10px 13px!important;border-bottom-color:#edf1f6!important;color:#14213f!important}
      #gorunum-giderler .bsgd-satir{padding:10px 13px!important;border-bottom-color:#f0f3f7!important}
      #gorunum-giderler .bsgd-ad{color:#101a35!important}.bsgd-detay{color:#71809a!important}
      #gorunum-giderler .bsgd-tutar{color:#c24141!important}
      #gorunum-giderler .bsgd-bilgi{border-color:#dce9ff!important;border-radius:13px!important;background:#f4f8ff!important;color:#60708b!important}

      /* Raporlar */
      #gorunum-raporlar .bsrp-geri,#gorunum-raporlar .bsrp-ay{height:40px!important;border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important}
      #gorunum-raporlar .bsrp-kpi{gap:9px!important;margin-bottom:12px!important}
      #gorunum-raporlar .bsrp-kart{min-height:94px;padding:13px!important;border-color:var(--bso-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bso-golge)!important}
      #gorunum-raporlar .bsrp-kart:nth-child(1){background:linear-gradient(145deg,#fff,#f4fff8)!important;border-color:#d9f4e4!important}
      #gorunum-raporlar .bsrp-kart:nth-child(2){background:linear-gradient(145deg,#fff,#f5f9ff)!important;border-color:#dce9ff!important}
      #gorunum-raporlar .bsrp-kart span{color:#71809a!important}
      #gorunum-raporlar .bsrp-kart strong{font-size:17px!important;color:#101a35!important}
      #gorunum-raporlar .bsrp-kart:nth-child(1) strong{color:#0c9144!important}
      #gorunum-raporlar .bsrp-kart:nth-child(2) strong{color:#1769f6!important}
      #gorunum-raporlar .bsrp-bolum{border-color:var(--bso-kenar)!important;border-radius:17px!important;box-shadow:var(--bso-golge)!important}
      #gorunum-raporlar .bsrp-baslik{min-height:47px;padding:10px 13px!important;border-bottom-color:#edf1f6!important;color:#14213f!important}
      #gorunum-raporlar .bsrp-chip{border-color:#e5eaf1!important;background:#f7f9fc!important;color:#60708b!important}
      #gorunum-raporlar .bsrp-chip strong{color:#14213f!important}
      #gorunum-raporlar .bsrp-satir{padding:10px 13px!important;border-bottom-color:#f0f3f7!important}
      #gorunum-raporlar .bsrp-ad{color:#101a35!important}.bsrp-detay{color:#71809a!important}
      #gorunum-raporlar .bsrp-tutar{color:#1769f6!important}

      @media(max-width:900px){#gorunum-ogretmenler .bsog-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:700px){
        ${KAPSAM} .sayfa-baslik-alani{margin-bottom:15px!important}
        ${KAPSAM} .sayfa-baslik{font-size:27px!important}
        ${KAPSAM} .sayfa-aciklama{font-size:12px!important}
        ${KAPSAM} .ana-islem-buton{min-height:46px!important;padding:0 15px!important;font-size:11.5px!important}
        #gorunum-ogrenciler .bsogr-list-kart{grid-template-columns:42px minmax(0,1fr) auto!important;padding:10px 11px!important}
        #gorunum-ogrenciler .bsogr-list-kart:before{width:38px;height:38px;border-radius:12px;font-size:10.5px}
        #gorunum-tahsilat .bsfin-filtre{padding:10px!important}
        #gorunum-sabitprogram .bssp-gunler{gap:10px!important}
        #gorunum-ogretmenler .bsog-grid{grid-template-columns:1fr!important}
        #gorunum-ogretmenler .bsog-kart{display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:11px;min-height:0;padding:12px!important}
        #gorunum-ogretmenler .bsog-kart:before{grid-row:1/4;margin:0;width:40px;height:40px}
        #gorunum-ogretmenler .bsog-kpiler{grid-column:1/-1;margin-top:10px!important}
        #gorunum-giderler .bsgd-grid,#gorunum-raporlar .bsrp-grid{grid-template-columns:1fr!important}
      }
      @media(max-width:520px){
        ${KAPSAM} .sayfa-baslik-alani{gap:10px!important}
        ${KAPSAM} .sayfa-baslik{font-size:25px!important}
        #gorunum-ogrenciler .bsogr-list-kart{grid-template-columns:38px minmax(0,1fr) auto!important;gap:9px!important}
        #gorunum-ogrenciler .bsogr-list-kart:before{width:35px;height:35px;border-radius:11px}
        #gorunum-ogrenciler .bsogr-list-detay{display:grid!important;gap:2px!important}
        #gorunum-tahsilat .bsfin-kpi{grid-template-columns:1fr 1fr!important}
        #gorunum-tahsilat .bsfin-kpi-kart strong{font-size:15px!important}
        #gorunum-sabitprogram .bssp-satir{margin:7px 7px 0!important;padding-right:92px!important}
        #gorunum-giderler .bsgd-kpi,#gorunum-raporlar .bsrp-kpi{grid-template-columns:1fr 1fr!important}
      }
    `;
    document.head.appendChild(s);
  }

  function basHarfler(ad){
    const p=String(ad||'').trim().split(/\s+/).filter(Boolean);
    if(!p.length) return '•';
    const ilk=p[0][0]||'';
    const son=p.length>1?(p[p.length-1][0]||''):'';
    return (ilk+son).toLocaleUpperCase('tr-TR');
  }

  function avatarla(){
    document.querySelectorAll('#gorunum-ogrenciler .bsogr-list-kart').forEach(k=>{
      if(k.dataset.bsAvatar) return;
      k.dataset.bsAvatar=basHarfler(k.querySelector('.bsogr-list-ad')?.textContent);
    });
    document.querySelectorAll('#gorunum-ogretmenler .bsog-kart').forEach(k=>{
      if(k.dataset.bsAvatar) return;
      k.dataset.bsAvatar=basHarfler(k.querySelector('.bsog-ad')?.textContent);
    });
  }

  function baslat(){
    stilEkle();
    avatarla();
    const mo=new MutationObserver(()=>requestAnimationFrame(avatarla));
    mo.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('bs:veri-degisti',()=>setTimeout(avatarla,40));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();