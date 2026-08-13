(function(){
  if(window.BSUrunStandardiModuluV1) return;
  window.BSUrunStandardiModuluV1=true;

  const HATALI_KAPSAM='#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler';

  function ikon(tur){
    const ortak='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const yollar={
      program:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M13 14h3M8 17h3"/>',
      ogretmen:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.6-3.6 2.6-5.5 6-5.5 2.1 0 3.7.7 4.7 2"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20c.3-2.4 1.6-3.8 4-3.8 1.1 0 2 .3 2.7.9"/>',
      odev:'<path d="M9 5h6"/><path d="M9 3h6v4H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="m9 13 2 2 4-4"/>',
      gider:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h3"/><path d="M15 15h3M16.5 13.5v3"/>',
      odeme:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M7 15h4"/>',
      kasa:'<path d="M4 8h16v11H4z"/><path d="M7 8V5h10v3"/><path d="M8 13h8"/><circle cx="12" cy="13" r="2"/>',
      rapor:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      ayar:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1H10.4a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4v-3.2a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1h3.2a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4v3.2a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1Z"/>'
    };
    return '<svg '+ortak+'>'+ (yollar[tur]||yollar.ayar) +'</svg>';
  }

  function stilEkle(){
    if(document.getElementById('bsUrunStandardiStil')) return;
    const s=document.createElement('style');
    s.id='bsUrunStandardiStil';
    s.textContent=`
      :root{
        --bs-urun-mavi:#2563eb;
        --bs-urun-mavi-koyu:#1d4ed8;
        --bs-urun-mavi-acik:#eff6ff;
        --bs-urun-zemin:#f5f7fb;
        --bs-urun-kart:#ffffff;
        --bs-urun-yazi:#0f172a;
        --bs-urun-ikincil:#64748b;
        --bs-urun-kenar:#e2e8f0;
        --bs-urun-golge:0 7px 24px rgba(15,23,42,.05);
      }

      html,body,#uygulama{background:var(--bs-urun-zemin)!important;color:var(--bs-urun-yazi)!important}
      .icerik{min-width:0}
      .gorunum,.gorunum.aktif{min-width:0;max-width:100%}

      /* V263 kapsam seçicisi nedeniyle tüm görünümün buton gibi boyanmasını geri al. */
      ${HATALI_KAPSAM}{
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        background-image:none!important;
        color:var(--bs-urun-yazi)!important;
        box-shadow:none!important;
        font-size:inherit!important;
        font-weight:inherit!important;
        line-height:normal!important;
        letter-spacing:normal!important;
        text-align:initial!important;
        align-items:initial!important;
      }

      /* Operasyon sayfalarında başlık ve ana eylem aynı ürün standardında. */
      :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler) .sayfa-baslik-alani{
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:12px!important;
        margin-bottom:16px!important;
      }
      :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler) .sayfa-baslik{
        color:var(--bs-urun-yazi)!important;
        font-size:27px!important;
        font-weight:850!important;
        line-height:1.08!important;
        letter-spacing:-.02em!important;
      }
      :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler) .sayfa-aciklama{
        margin-top:6px!important;
        color:var(--bs-urun-ikincil)!important;
        font-size:12px!important;
        line-height:1.4!important;
      }
      :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar) .ana-islem-buton{
        min-height:44px!important;
        height:auto!important;
        padding:0 15px!important;
        border:1px solid var(--bs-urun-mavi)!important;
        border-radius:13px!important;
        background:var(--bs-urun-mavi)!important;
        color:#fff!important;
        box-shadow:0 7px 18px rgba(37,99,235,.16)!important;
        font-size:11.5px!important;
        font-weight:800!important;
      }

      /* Öğrenci ve tahsilat ekranları nötr zemin üzerinde okunur kart yapısında kalır. */
      #gorunum-ogrenciler .kart,
      #gorunum-tahsilat .kart,
      #gorunum-tahsilat .bsfin-filtre{
        color:var(--bs-urun-yazi)!important;
      }
      #gorunum-ogrenciler .bsogr-list-kart,
      #gorunum-tahsilat .kart,
      #gorunum-tahsilat .bsfin-filtre{
        border-color:var(--bs-urun-kenar)!important;
        box-shadow:var(--bs-urun-golge)!important;
      }

      /* Menü: teknik liste değil, anlaşılır ürün modülleri. */
      #gorunum-menu .modul-grid{gap:10px!important}
      #gorunum-menu .modul-kart{
        position:relative;
        min-height:126px!important;
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        padding:15px!important;
        border:1px solid var(--bs-urun-kenar)!important;
        border-radius:17px!important;
        background:#fff!important;
        box-shadow:0 5px 18px rgba(15,23,42,.035)!important;
        transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;
      }
      #gorunum-menu .modul-kart:active{transform:scale(.99);border-color:#bfd4ff!important;box-shadow:0 3px 12px rgba(37,99,235,.07)!important}
      #gorunum-menu .bs-urun-menu-ikon{
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:var(--bs-urun-mavi-acik);
        color:var(--bs-urun-mavi);
      }
      #gorunum-menu .bs-urun-menu-ikon svg{width:19px;height:19px}
      #gorunum-menu .modul-baslik{margin-top:13px!important;color:var(--bs-urun-yazi)!important;font-size:12.5px!important;font-weight:820!important;line-height:1.2!important}
      #gorunum-menu .modul-aciklama{margin-top:5px!important;color:var(--bs-urun-ikincil)!important;font-size:10px!important;line-height:1.35!important}

      /* Finans Asistanındaki okunabilirlik standardı: mobil formlarda iOS zoom yok. */
      @media(max-width:700px){
        input,select,textarea{font-size:16px!important}
        .icerik{width:calc(100% - 22px)!important}
        :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar,#gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler) .sayfa-baslik{font-size:25px!important}
        :is(#gorunum-ogrenciler,#gorunum-tahsilat,#gorunum-sabitprogram,#gorunum-ogretmenler,#gorunum-giderler,#gorunum-raporlar) .ana-islem-buton{min-height:44px!important;padding:0 13px!important;font-size:11px!important}
        #gorunum-menu .modul-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        #gorunum-menu .modul-kart{min-height:116px!important;padding:13px!important;border-radius:15px!important}
        #gorunum-menu .bs-urun-menu-ikon{width:34px;height:34px;border-radius:10px}
        #gorunum-menu .bs-urun-menu-ikon svg{width:17px;height:17px}
        #gorunum-menu .modul-baslik{margin-top:11px!important;font-size:11.5px!important}
        #gorunum-menu .modul-aciklama{font-size:9.5px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function kurumDiliniUygula(){
    const anaAciklama=document.querySelector('#gorunum-anasayfa .sayfa-aciklama');
    if(anaAciklama && /Ofisin bugünkü operasyon/i.test(anaAciklama.textContent||'')){
      anaAciklama.textContent='Kurumun bugünkü operasyon ve finans özeti.';
    }
    const menuAciklama=document.querySelector('#gorunum-menu .sayfa-aciklama');
    if(menuAciklama) menuAciklama.textContent='Kurumun operasyon, finans ve yönetim modülleri.';
  }

  function menuIkonlariniUygula(){
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
      if(k.querySelector('.bs-urun-menu-ikon')) return;
      const baslik=k.querySelector('.modul-baslik')?.textContent||'';
      const kutu=document.createElement('div');
      kutu.className='bs-urun-menu-ikon';
      kutu.innerHTML=ikon(turBul(baslik));
      k.insertBefore(kutu,k.firstChild);
    });
  }

  let raf=0;
  function yenile(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      kurumDiliniUygula();
      menuIkonlariniUygula();
    });
  }

  function baslat(){
    stilEkle();
    yenile();
    const menu=document.getElementById('gorunum-menu');
    if(menu && window.MutationObserver){
      const mo=new MutationObserver(yenile);
      mo.observe(menu,{childList:true,subtree:true});
    }
    document.addEventListener('bs:veri-degisti',yenile);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
