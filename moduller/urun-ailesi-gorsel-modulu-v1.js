(function(){
  if(window.BSUrunAilesiGorselModuluV1) return;
  window.BSUrunAilesiGorselModuluV1=true;

  function ikon(tur){
    const ortak='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const yollar={
      program:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M13 14h3M8 17h3"/>',
      ogretmen:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.6-3.6 2.6-5.5 6-5.5 2.1 0 3.7.7 4.7 2"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20c.3-2.4 1.6-3.8 4-3.8 1.1 0 2 .3 2.7.9"/>',
      odev:'<path d="M9 5h6"/><path d="M9 3h6v4H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="m9 13 2 2 4-4"/>',
      gider:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h3"/>',
      odeme:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M7 15h4"/>',
      kasa:'<path d="M4 8h16v11H4z"/><path d="M7 8V5h10v3"/><path d="M8 13h8"/>',
      rapor:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      ayar:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6.2L14.7 3h-4L10.4 6.2A7 7 0 0 0 8.9 7L6.5 6 4.5 9.5 6.5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.4 18l.3 3h4l.3-3a7 7 0 0 0 1.5-.9l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1.2Z"/>'
    };
    return '<svg '+ortak+'>'+(yollar[tur]||yollar.ayar)+'</svg>';
  }

  function stilEkle(){
    if(document.getElementById('bsUrunAilesiGorselStil')) return;
    const s=document.createElement('style');
    s.id='bsUrunAilesiGorselStil';
    s.textContent=`
      /* V269 — Finans Asistanı ile aynı BS ürün ailesi görsel sistemi. */
      :root{--bsu-mavi:#2563eb;--bsu-mavi-acik:#eff6ff;--bsu-yazi:#0f172a;--bsu-ikincil:#64748b;--bsu-kenar:#e2e8f0;--bsu-zemin:#f5f7fb;--bsu-yesil:#16a34a;--bsu-kirmizi:#dc2626;--bsu-golge:0 7px 24px rgba(15,23,42,.05)}

      .alt-nav .nav-buton.aktif{background:var(--bsu-mavi-acik)!important;color:var(--bsu-mavi)!important}
      #gorunum-anasayfa .sayfa-aciklama{color:var(--bsu-ikincil)}
      :is(#gorunum-dersler,#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-menu,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler,#gorunum-ayarlar) .sayfa-baslik{color:var(--bsu-yazi)!important;font-size:27px!important;font-weight:850!important;line-height:1.08!important;letter-spacing:-.025em!important}
      :is(#gorunum-dersler,#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-menu,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler,#gorunum-ayarlar) .sayfa-aciklama{color:var(--bsu-ikincil)!important}
      :is(#gorunum-dersler,#gorunum-ogrenciler,#gorunum-tahsilat) .ana-islem-buton{min-height:44px!important;height:auto!important;padding:0 15px!important;border:1px solid var(--bsu-mavi)!important;border-radius:13px!important;background:var(--bsu-mavi)!important;color:#fff!important;box-shadow:0 7px 18px rgba(37,99,235,.16)!important;font-weight:800!important}

      /* Dersler: eski özel mavi tonlarını ürün ailesi mavisine eşitle. */
      #gorunum-dersler{--bsd-mavi:var(--bsu-mavi)!important;--bsd-mavi-acik:var(--bsu-mavi-acik)!important;--bsd-lacivert:var(--bsu-yazi)!important;--bsd-gri:var(--bsu-ikincil)!important;--bsd-kenar:var(--bsu-kenar)!important}
      #gorunum-dersler .ana-islem-buton,#gorunum-dersler .sekme.aktif,#gorunum-dersler .bsd-gun-ikon{background:var(--bsu-mavi)!important;background-image:none!important;color:#fff!important}
      #gorunum-dersler .sekme.aktif{box-shadow:0 6px 16px rgba(37,99,235,.16)!important}
      #gorunum-dersler .bsders-saat,#gorunum-dersler .bsders-gun-sayi{color:var(--bsu-mavi)!important}
      #gorunum-dersler .bsders-durum{background:var(--bsu-mavi-acik)!important;color:var(--bsu-mavi)!important}
      #gorunum-dersler .bsders-nav.bugun{border-color:#bfdbfe!important;background:var(--bsu-mavi-acik)!important;color:var(--bsu-mavi)!important}

      /* Öğrenciler */
      #gorunum-ogrenciler .kart{border:0!important;background:transparent!important;overflow:visible!important}
      #gorunum-ogrenciler .kart-baslik{padding-left:2px!important;padding-right:2px!important;border:0!important;background:transparent!important}
      #gorunum-ogrenciler .bsogr-listesi{gap:9px!important;padding:0!important}
      #gorunum-ogrenciler .bsogr-list-kart{border:1px solid var(--bsu-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bsu-golge)!important}
      #gorunum-ogrenciler .bsogr-list-rozet{background:#eafaf1!important;color:#0c9144!important}
      #gorunum-ogrenciler .bsogr-list-rozet.pasif{background:#f1f5f9!important;color:#64748b!important}

      /* Tahsilatlar */
      #gorunum-tahsilat .bsfin-filtre,#gorunum-tahsilat .kart{border:1px solid var(--bsu-kenar)!important;border-radius:17px!important;background:#fff!important;box-shadow:var(--bsu-golge)!important}
      #gorunum-tahsilat .bsfin-input,#gorunum-tahsilat .bsfin-ay{border-color:#dfe6f0!important;background:#fbfcfe!important}
      #gorunum-tahsilat .bsfin-chip{border-color:#e2e8f0!important;background:#fff!important;color:#64748b!important}
      #gorunum-tahsilat .bsfin-chip.aktif{border-color:#bfdbfe!important;background:var(--bsu-mavi-acik)!important;color:var(--bsu-mavi)!important}
      #gorunum-tahsilat .bsfin-kpi-kart{border-color:#e5eaf1!important;background:#fff!important}
      #gorunum-tahsilat .bsfin-kpi-kart.vurgu{border-color:#bbf7d0!important;background:#f7fef9!important}
      #gorunum-tahsilat .bsfin-kpi-kart.vurgu strong,#gorunum-tahsilat .bsfin-tutar{color:var(--bsu-yesil)!important}

      /* İkincil yönetim ekranlarında aynı kart yoğunluğu. */
      :is(#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler,#gorunum-ayarlar) :is(.bsp-kart,.bsog-kart,.bsgd-bolum,.bsgd-kart,.bsrp-bolum,.bsrp-kart,.bska-liste,.bska-hesap,.bsod-liste,.bsod-kpi,.bsodev-kart,.bsay-kart){border-color:var(--bsu-kenar)!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important}

      /* Dashboard bugünkü ders satırları ortak Ders Detayı açabildiğini hissettirir. */
      #bugunkuDersListesi [data-bs-ders-id]{cursor:pointer;transition:background .12s ease,transform .12s ease}
      #bugunkuDersListesi [data-bs-ders-id]:active{background:var(--bsu-mavi-acik)!important;transform:scale(.997)}

      /* Menü */
      #gorunum-menu .sayfa-aciklama{color:var(--bsu-ikincil)!important}
      #gorunum-menu .modul-grid{gap:10px!important}
      #gorunum-menu .modul-kart{min-height:126px!important;padding:15px!important;border:1px solid var(--bsu-kenar)!important;border-radius:17px!important;background:#fff!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important}
      #gorunum-menu .bsu-menu-ikon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--bsu-mavi-acik);color:var(--bsu-mavi)}
      #gorunum-menu .bsu-menu-ikon svg{width:19px;height:19px}
      #gorunum-menu .modul-baslik{margin-top:12px!important;color:var(--bsu-yazi)!important;font-size:12.5px!important;font-weight:820!important;line-height:1.2!important}
      #gorunum-menu .modul-aciklama{margin-top:5px!important;color:var(--bsu-ikincil)!important;font-size:10px!important;line-height:1.35!important}

      @media(max-width:700px){
        :is(#gorunum-dersler,#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-menu,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler,#gorunum-ayarlar) .sayfa-baslik{font-size:24px!important}
        #gorunum-dersler .sayfa-baslik-alani{margin-bottom:14px!important}
        #gorunum-menu .modul-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        #gorunum-menu .modul-kart{min-height:116px!important;padding:13px!important;border-radius:15px!important}
        #gorunum-menu .bsu-menu-ikon{width:34px;height:34px;border-radius:10px}
        #gorunum-menu .bsu-menu-ikon svg{width:17px;height:17px}
        #gorunum-menu .modul-baslik{margin-top:10px!important;font-size:11.5px!important}
        #gorunum-menu .modul-aciklama{font-size:9.5px!important}

        /* Öğretmen ödemelerinde mobilde Ödenen ve Kalan bilgisi kaybolmaz. */
        #gorunum-ogretmen-odemeleri .bsod-satir{
          grid-template-columns:minmax(0,1fr) auto auto!important;
          grid-template-areas:"ad hak hak" "ad odeme kalan"!important;
          row-gap:6px!important;
          column-gap:10px!important;
          align-items:center!important;
        }
        #gorunum-ogretmen-odemeleri .bsod-satir>div:first-child{grid-area:ad!important}
        #gorunum-ogretmen-odemeleri .bsod-satir .bsod-rakam:nth-child(2){grid-area:hak!important;display:block!important}
        #gorunum-ogretmen-odemeleri .bsod-satir .bsod-rakam:nth-child(3){grid-area:odeme!important;display:block!important}
        #gorunum-ogretmen-odemeleri .bsod-satir .bsod-rakam:nth-child(4){grid-area:kalan!important;display:block!important}
        #gorunum-ogretmen-odemeleri .bsod-rakam span{font-size:7.5px!important}
        #gorunum-ogretmen-odemeleri .bsod-rakam strong{font-size:10px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function menuIkonlari(){
    const turBul=baslik=>{
      const t=String(baslik||'').trim().toLocaleLowerCase('tr-TR');
      if(t.includes('sabit program')) return 'program';
      if(t.includes('öğretmen ödem')) return 'odeme';
      if(t.includes('öğretmen')) return 'ogretmen';
      if(t.includes('ödev')) return 'odev';
      if(t.includes('gider')) return 'gider';
      if(t.includes('kasa')) return 'kasa';
      if(t.includes('rapor')) return 'rapor';
      return 'ayar';
    };
    document.querySelectorAll('#gorunum-menu .modul-kart').forEach(k=>{
      if(k.querySelector('.bsu-menu-ikon')) return;
      const b=k.querySelector('.modul-baslik')?.textContent||'';
      const el=document.createElement('div');
      el.className='bsu-menu-ikon';
      el.innerHTML=ikon(turBul(b));
      k.insertBefore(el,k.firstChild);
    });
  }

  function metinleriDuzelt(){
    const ana=document.querySelector('#gorunum-anasayfa .sayfa-aciklama');
    if(ana && /Ofisin bugünkü operasyon/i.test(ana.textContent||'')) ana.textContent='Kurumun bugünkü operasyon ve finans özeti.';
    const menu=document.querySelector('#gorunum-menu .sayfa-aciklama');
    if(menu) menu.textContent='Kurumun operasyon, finans ve yönetim modülleri.';
  }

  function baslat(){stilEkle();menuIkonlari();metinleriDuzelt();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  document.addEventListener('bs:veri-degisti',()=>setTimeout(menuIkonlari,20));
})();
