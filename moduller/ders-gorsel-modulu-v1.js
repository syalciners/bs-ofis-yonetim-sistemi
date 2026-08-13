(function(){
  if(window.BSDersGorselModuluV1) return;
  window.BSDersGorselModuluV1=true;

  function svgCalendar(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';}
  function svgUser(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.3 3.3-6.5 8-6.5s7.3 2.2 8 6.5"/></svg>';}
  function svgClock(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';}

  function stilEkle(){
    if(document.getElementById('bsDersGorselStil')) return;
    const s=document.createElement('style');
    s.id='bsDersGorselStil';
    s.textContent=`
      /* V261 — Ders ekranı görsel sistemi */
      #gorunum-dersler{--bsd-mavi:#1769f6;--bsd-mavi-acik:#eef5ff;--bsd-lacivert:#0f1b3d;--bsd-gri:#687792;--bsd-kenar:#e4eaf3}
      #gorunum-dersler .sayfa-baslik-alani{align-items:center;margin-bottom:18px}
      #gorunum-dersler .sayfa-baslik{font-size:30px;line-height:1.08;letter-spacing:-.02em;color:var(--bsd-lacivert)}
      #gorunum-dersler .sayfa-aciklama{margin-top:7px;font-size:13px;color:#71809a}
      #gorunum-dersler .ana-islem-buton{min-height:50px;padding:0 19px;border:0;border-radius:15px;background:linear-gradient(135deg,#2b6ff5,#1762eb);box-shadow:0 9px 22px rgba(37,99,235,.22);font-size:13px;font-weight:800;letter-spacing:.01em}
      #gorunum-dersler .ana-islem-buton:active{transform:translateY(1px);box-shadow:0 5px 14px rgba(37,99,235,.18)}

      #gorunum-dersler .sekme-satiri{display:grid;grid-template-columns:.82fr 1.35fr 1.12fr;gap:5px;padding:5px;margin-bottom:18px;border:1px solid var(--bsd-kenar);border-radius:16px;background:#fff;box-shadow:0 7px 22px rgba(15,23,42,.055)}
      #gorunum-dersler .sekme{min-width:0;height:46px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 10px;border:0!important;border-radius:12px;background:transparent!important;color:#50617f;font-size:12px;font-weight:780;white-space:nowrap;box-shadow:none!important}
      #gorunum-dersler .sekme.aktif{background:linear-gradient(135deg,#2a70f8,#1767f2)!important;color:#fff!important;box-shadow:0 6px 16px rgba(37,99,235,.18)!important}
      #gorunum-dersler .sekme .bsd-tab-ikon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
      #gorunum-dersler .sekme .bsd-tab-ikon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

      #gorunum-dersler .kart{overflow:visible;border:0;background:transparent;border-radius:0}
      #gorunum-dersler #bsDersSekmeIcerik{display:grid;gap:14px}
      #gorunum-dersler .bsders-toolbar{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;padding:15px 16px!important;margin:0!important;border:1px solid var(--bsd-kenar);border-radius:18px;background:#fff;box-shadow:0 7px 24px rgba(15,23,42,.05)}
      #gorunum-dersler .bsders-toolbar-sol{width:100%;display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important}
      #gorunum-dersler .bsders-toolbar-sol:before{content:'';width:31px;height:31px;flex:0 0 31px;border-radius:10px;background:var(--bsd-mavi-acik);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231769f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='3'/%3E%3Cpath d='M8 3v4M16 3v4M3 10h18'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center;background-size:17px}
      #gorunum-dersler .bsders-hafta{font-size:13px!important;font-weight:820!important;letter-spacing:.005em;color:var(--bsd-lacivert)!important}
      #gorunum-dersler .bsders-toolbar-sag{width:100%;display:grid!important;grid-template-columns:1fr 1.08fr 1fr auto;gap:8px!important;align-items:center!important}
      #gorunum-dersler .bsders-nav{height:43px!important;padding:0 12px!important;border:1px solid #dfe6f0!important;border-radius:12px!important;background:#fff!important;color:#334564!important;font-size:11px!important;font-weight:780!important}
      #gorunum-dersler .bsders-nav.bugun{border-color:#bcd4ff!important;background:#f3f7ff!important;color:var(--bsd-mavi)!important;box-shadow:inset 0 0 0 1px rgba(37,99,235,.04)}
      #gorunum-dersler .bsders-sayac{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 11px;border-radius:999px;background:#f3f6fa;color:#60708b!important;font-size:10.5px!important;font-weight:800!important}
      #gorunum-dersler .bsders-select{height:43px!important;border-color:#dfe6f0!important;border-radius:12px!important;background:#fff!important;font-size:12px!important;font-weight:720;color:#273958!important}

      #gorunum-dersler .bsders-takvim{gap:12px!important}
      #gorunum-dersler .bsders-gun{border:1px solid var(--bsd-kenar)!important;border-radius:18px!important;background:#fbfcfe!important;box-shadow:0 6px 22px rgba(15,23,42,.045)!important;overflow:hidden!important}
      #gorunum-dersler .bsders-gun.bugun{border-color:#bed5ff!important;box-shadow:0 7px 24px rgba(37,99,235,.075)!important}
      #gorunum-dersler .bsders-gun-baslik{min-height:51px;padding:9px 13px!important;border-bottom:1px solid #e8edf4!important;background:#fbfcfe!important;color:var(--bsd-lacivert)!important}
      #gorunum-dersler .bsders-gun.bugun .bsders-gun-baslik{background:#f5f8ff!important;color:var(--bsd-lacivert)!important}
      #gorunum-dersler .bsd-gun-ikon{width:31px;height:31px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 31px;margin-right:1px;border-radius:10px;background:linear-gradient(135deg,#2b71f7,#1766ef);color:#fff;box-shadow:0 5px 13px rgba(37,99,235,.18)}
      #gorunum-dersler .bsd-gun-ikon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      #gorunum-dersler .bsders-gun-adi{margin-right:auto;font-size:11px!important;font-weight:850!important;color:var(--bsd-lacivert)!important;text-transform:none!important}
      #gorunum-dersler .bsders-gun-sayi{padding:5px 9px;border-radius:999px;background:#edf4ff;color:var(--bsd-mavi);font-size:9px!important;font-weight:850!important}
      #gorunum-dersler .bsders-gun-sayi:after{content:' ders'}
      #gorunum-dersler .bsders-gun-icerik{gap:8px!important;padding:10px!important}

      #gorunum-dersler .bsders-kart{border:1px solid #e5ebf3!important;border-radius:14px!important;background:#fff!important;box-shadow:0 4px 13px rgba(15,23,42,.035)!important;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
      #gorunum-dersler .bsders-kart:before{width:4px!important;background:#7cb1ff!important}
      #gorunum-dersler .bsders-kart.yapildi:before{background:#24ce6b!important}
      #gorunum-dersler .bsders-kart.iptal:before{background:#ef6a6a!important}
      #gorunum-dersler .bsders-kart:active{transform:scale(.995);background:#fff!important}
      #gorunum-dersler .bsders-saat{color:#1769f6!important;font-weight:850!important}
      #gorunum-dersler .bsders-kart.yapildi .bsders-saat{color:#0e9748!important}
      #gorunum-dersler .bsders-kart.iptal .bsders-saat{color:#c74444!important}
      #gorunum-dersler .bsders-ogrenci{color:#101a35!important;letter-spacing:.005em}
      #gorunum-dersler .bsders-detay{color:#6a7a96!important}
      #gorunum-dersler .bsders-durum{align-items:center;gap:4px;background:#edf4ff!important;color:#1769f6!important}
      #gorunum-dersler .bsders-durum.yapildi{background:#eafaf1!important;color:#0c9144!important}
      #gorunum-dersler .bsders-durum.iptal{background:#fff0f0!important;color:#c24141!important}
      #gorunum-dersler .bsders-durum.yapildi:before{content:'✓';display:inline-grid;place-items:center;width:13px;height:13px;border:1.5px solid currentColor;border-radius:50%;font-size:8px;font-weight:900;line-height:1}

      #gorunum-dersler .bsders-bugun-kart{border:1px solid #e5ebf3!important;border-radius:15px!important;background:#fff!important;box-shadow:0 5px 15px rgba(15,23,42,.035)!important}
      #gorunum-dersler .bsders-bugun-saat{background:#edf4ff!important;color:#1769f6!important;border-radius:11px!important}

      .alt-nav{border-color:#e3e9f1!important;background:rgba(255,255,255,.97)!important;box-shadow:0 14px 38px rgba(15,23,42,.12)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .alt-nav .nav-buton{border-radius:15px!important;color:#667691!important}
      .alt-nav .nav-buton.aktif{background:#edf4ff!important;color:#1769f6!important}
      .alt-nav .nav-buton svg{stroke-width:1.9!important}

      @media(min-width:761px){
        #gorunum-dersler .bsders-kart{padding:9px 9px 9px 11px!important}
        #gorunum-dersler .bsders-saat{font-size:9.3px!important}
        #gorunum-dersler .bsders-ogrenci{font-size:10px!important}
        #gorunum-dersler .bsders-detay{font-size:8.3px!important}
      }

      @media(max-width:760px){
        #gorunum-dersler .sayfa-baslik-alani{margin-bottom:16px}
        #gorunum-dersler .sayfa-baslik{font-size:27px}
        #gorunum-dersler .ana-islem-buton{min-height:48px;padding:0 17px;border-radius:14px;font-size:12px}
        #gorunum-dersler .sekme-satiri{margin-bottom:16px;border-radius:15px}
        #gorunum-dersler .sekme{height:44px;font-size:11px;padding:0 7px;gap:5px}
        #gorunum-dersler .sekme .bsd-tab-ikon,#gorunum-dersler .sekme .bsd-tab-ikon svg{width:16px;height:16px}
        #gorunum-dersler .bsders-toolbar{padding:13px!important;border-radius:17px}
        #gorunum-dersler .bsders-toolbar-sag{grid-template-columns:1fr 1.12fr 1fr auto}
        #gorunum-dersler .bsders-nav{height:42px!important;padding:0 8px!important}
        #gorunum-dersler .bsders-takvim{grid-template-columns:1fr!important;gap:13px!important}
        #gorunum-dersler .bsders-gun{border-radius:17px!important}
        #gorunum-dersler .bsders-gun-icerik{padding:9px!important}
        #gorunum-dersler .bsders-kart{display:grid!important;grid-template-columns:94px minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:12px;row-gap:4px;align-items:center;padding:12px 12px 12px 15px!important;min-height:86px}
        #gorunum-dersler .bsders-saat{grid-column:1;grid-row:1/3;display:flex;align-items:center;gap:7px;align-self:stretch;padding-right:10px;border-right:1px solid #edf1f6;font-size:12px!important;line-height:1.25}
        #gorunum-dersler .bsders-saat:before{content:'';width:29px;height:29px;flex:0 0 29px;border-radius:50%;background:#eafaf1;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230e9748' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center;background-size:17px}
        #gorunum-dersler .bsders-kart.planlandi .bsders-saat:before{background-color:#edf4ff;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231769f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E")}
        #gorunum-dersler .bsders-kart.iptal .bsders-saat:before{background-color:#fff0f0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c24141' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E")}
        #gorunum-dersler .bsders-ogrenci{grid-column:2;grid-row:1;margin:0!important;font-size:13px!important;line-height:1.2}
        #gorunum-dersler .bsders-detay{grid-column:2;grid-row:2;display:flex!important;align-items:center;flex-wrap:wrap;gap:2px 7px!important;margin:0!important;font-size:9px!important;line-height:1.35}
        #gorunum-dersler .bsders-detay span+span:before{content:'•';margin-right:7px;color:#a0acc0}
        #gorunum-dersler .bsders-durum{grid-column:3;grid-row:1/3;align-self:center;justify-self:end;margin:0!important;padding:5px 8px!important;font-size:8.5px!important;white-space:nowrap}
      }

      @media(max-width:520px){
        #gorunum-dersler .sayfa-baslik-alani{align-items:flex-start;gap:10px}
        #gorunum-dersler .sayfa-baslik{font-size:25px}
        #gorunum-dersler .sayfa-aciklama{font-size:11px;line-height:1.35}
        #gorunum-dersler .ana-islem-buton{min-height:46px;padding:0 14px;font-size:11.5px;white-space:nowrap}
        #gorunum-dersler .sekme-satiri{grid-template-columns:.75fr 1.4fr 1.15fr;padding:4px;gap:4px}
        #gorunum-dersler .sekme{height:43px;font-size:10px;padding:0 5px}
        #gorunum-dersler .bsders-toolbar{gap:11px!important;padding:12px!important}
        #gorunum-dersler .bsders-toolbar-sol{gap:8px!important}
        #gorunum-dersler .bsders-toolbar-sol:before{width:29px;height:29px;flex-basis:29px;background-size:16px}
        #gorunum-dersler .bsders-hafta{font-size:12px!important}
        #gorunum-dersler .bsders-toolbar-sag{grid-template-columns:1fr 1.12fr 1fr;gap:6px!important}
        #gorunum-dersler .bsders-sayac{grid-column:1/-1;justify-self:end;min-height:29px;margin-top:1px;font-size:9.5px!important}
        #gorunum-dersler .bsders-nav{height:40px!important;font-size:9.8px!important;padding:0 7px!important}
        #gorunum-dersler .bsders-gun-baslik{min-height:48px;padding:8px 10px!important}
        #gorunum-dersler .bsd-gun-ikon{width:29px;height:29px;flex-basis:29px;border-radius:9px}
        #gorunum-dersler .bsders-gun-adi{font-size:10.5px!important}
        #gorunum-dersler .bsders-kart{grid-template-columns:86px minmax(0,1fr) auto;column-gap:9px;padding:11px 10px 11px 13px!important;min-height:82px}
        #gorunum-dersler .bsders-saat{gap:5px;padding-right:8px;font-size:10.5px!important}
        #gorunum-dersler .bsders-saat:before{width:26px;height:26px;flex-basis:26px;background-size:15px}
        #gorunum-dersler .bsders-ogrenci{font-size:11.5px!important}
        #gorunum-dersler .bsders-detay{font-size:8.2px!important;gap:1px 5px!important}
        #gorunum-dersler .bsders-detay span+span:before{margin-right:5px}
        #gorunum-dersler .bsders-durum{padding:4px 6px!important;font-size:7.8px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function tablariSüsle(){
    const butonlar=document.querySelectorAll('#gorunum-dersler .sekme-satiri .sekme');
    const ikonlar=[svgCalendar(),svgUser(),svgCalendar()];
    butonlar.forEach((b,i)=>{
      if(b.querySelector('.bsd-tab-ikon')) return;
      const span=document.createElement('span');
      span.className='bsd-tab-ikon';
      span.innerHTML=ikonlar[i]||svgCalendar();
      b.insertBefore(span,b.firstChild);
    });
  }

  function gunBasliklariniSüsle(kok=document){
    kok.querySelectorAll?.('#gorunum-dersler .bsders-gun-baslik').forEach(h=>{
      if(h.querySelector('.bsd-gun-ikon')) return;
      const ikon=document.createElement('span');
      ikon.className='bsd-gun-ikon';
      ikon.innerHTML=svgCalendar();
      h.insertBefore(ikon,h.firstChild);
    });
  }

  function uygula(kok=document){
    tablariSüsle();
    gunBasliklariniSüsle(kok);
  }

  function baslat(){
    stilEkle();
    uygula(document);
    const hedef=document.getElementById('gorunum-dersler')||document.body;
    const mo=new MutationObserver(kayitlar=>{
      let gerekli=false;
      kayitlar.forEach(k=>k.addedNodes.forEach(n=>{if(n.nodeType===1) gerekli=true;}));
      if(gerekli) requestAnimationFrame(()=>uygula(hedef));
    });
    mo.observe(hedef,{childList:true,subtree:true});
    document.addEventListener('bs:veri-degisti',()=>setTimeout(()=>uygula(hedef),0));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSDersGorselModuluV1={uygula};
})();
