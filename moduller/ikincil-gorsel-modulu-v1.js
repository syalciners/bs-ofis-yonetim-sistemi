(function(){
  if(window.BSIkincilGorselModuluV1) return;
  window.BSIkincilGorselModuluV1=true;

  function stilEkle(){
    if(document.getElementById('bsIkincilGorselStil')) return;
    const s=document.createElement('style');
    s.id='bsIkincilGorselStil';
    s.textContent=`
      #gorunum-kasa,#gorunum-ogretmen-odemeleri,#gorunum-odevler{--bsi-mavi:#1769f6;--bsi-mavi-acik:#eef5ff;--bsi-lacivert:#0f1b3d;--bsi-gri:#71809a;--bsi-kenar:#e4eaf3;--bsi-golge:0 7px 24px rgba(15,23,42,.05)}
      #gorunum-kasa .sayfa-baslik-alani,#gorunum-ogretmen-odemeleri .sayfa-baslik-alani,#gorunum-odevler .sayfa-baslik-alani{align-items:center!important;margin-bottom:18px!important}
      #gorunum-kasa .sayfa-baslik,#gorunum-ogretmen-odemeleri .sayfa-baslik,#gorunum-odevler .sayfa-baslik{font-size:29px!important;line-height:1.08!important;letter-spacing:-.02em!important;color:var(--bsi-lacivert)!important}
      #gorunum-kasa .sayfa-aciklama,#gorunum-ogretmen-odemeleri .sayfa-aciklama,#gorunum-odevler .sayfa-aciklama{margin-top:7px!important;font-size:13px!important;color:var(--bsi-gri)!important}

      /* Kasa */
      #gorunum-kasa .bska-geri{height:40px!important;border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important;color:#64748b!important}
      #gorunum-kasa .bska-tahsilat{height:42px!important;padding:0 15px!important;border:0!important;border-radius:12px!important;background:linear-gradient(135deg,#2b6ff5,#1762eb)!important;box-shadow:0 7px 17px rgba(37,99,235,.18)!important}
      #gorunum-kasa .bska-toplam{position:relative;overflow:hidden;padding:17px!important;border:1px solid #cfe0ff!important;border-radius:18px!important;background:linear-gradient(135deg,#f7fbff,#edf4ff)!important;box-shadow:0 8px 25px rgba(37,99,235,.07)!important}
      #gorunum-kasa .bska-toplam:after{content:'₺';position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:48px;font-weight:900;color:rgba(23,105,246,.08)}
      #gorunum-kasa .bska-toplam span{font-size:9.5px!important;color:#60708b!important}
      #gorunum-kasa .bska-toplam strong{margin-top:6px!important;font-size:25px!important;color:#102044!important;letter-spacing:-.02em}
      #gorunum-kasa .bska-hesaplar{gap:9px!important;margin-bottom:13px!important}
      #gorunum-kasa .bska-hesap{min-height:88px;padding:12px 13px!important;border-color:var(--bsi-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bsi-golge)!important}
      #gorunum-kasa .bska-hesap span{color:#71809a!important}.bska-hesap strong{font-size:15px!important;color:#101a35!important}
      #gorunum-kasa .bska-chip{height:33px!important;border-color:#e2e8f0!important;background:#fff!important;color:#63738e!important}
      #gorunum-kasa .bska-chip.aktif{border-color:#bcd4ff!important;background:#edf4ff!important;color:#1769f6!important}
      #gorunum-kasa .bska-liste{border-color:var(--bsi-kenar)!important;border-radius:17px!important;box-shadow:var(--bsi-golge)!important}
      #gorunum-kasa .bska-baslik{min-height:47px;padding:10px 13px!important;border-bottom-color:#edf1f6!important;color:#14213f!important}
      #gorunum-kasa .bska-satir{min-height:58px;padding:10px 13px!important;border-bottom-color:#f0f3f7!important}
      #gorunum-kasa .bska-kaynak{color:#101a35!important}.bska-detay{color:#71809a!important}
      #gorunum-kasa .bska-tutar.gelir{color:#0c9144!important}.bska-tutar.gider{color:#c24141!important}

      /* Öğretmen ödemeleri */
      #gorunum-ogretmen-odemeleri .bsod-geri,#gorunum-ogretmen-odemeleri .bsod-donem{height:41px!important;border-color:#e1e7ef!important;border-radius:12px!important;background:#fff!important}
      #gorunum-ogretmen-odemeleri .bsod-donem{font-size:11px!important;color:#334564!important}
      #gorunum-ogretmen-odemeleri .bsod-kpiler{gap:9px!important;margin-bottom:12px!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi{min-height:91px;padding:12px!important;border-color:var(--bsi-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bsi-golge)!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi:nth-child(1){background:linear-gradient(145deg,#fff,#f6f9ff)!important;border-color:#dce9ff!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi:nth-child(2){background:linear-gradient(145deg,#fff,#f4fff8)!important;border-color:#d9f4e4!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi.kalan{background:linear-gradient(145deg,#fff,#fff9f0)!important;border-color:#fde7c6!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi span{font-size:8.8px!important;color:#71809a!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi strong{font-size:16px!important;color:#101a35!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi:nth-child(1) strong{color:#1769f6!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi:nth-child(2) strong{color:#0c9144!important}
      #gorunum-ogretmen-odemeleri .bsod-kpi.kalan strong{color:#c47a16!important}
      #gorunum-ogretmen-odemeleri .bsod-liste{border-color:var(--bsi-kenar)!important;border-radius:17px!important;box-shadow:var(--bsi-golge)!important}
      #gorunum-ogretmen-odemeleri .bsod-baslik{min-height:47px;padding:10px 13px!important;border-bottom-color:#edf1f6!important;color:#14213f!important}
      #gorunum-ogretmen-odemeleri .bsod-satir,#gorunum-ogretmen-odemeleri .bsod-odeme{padding:10px 13px!important;border-bottom-color:#f0f3f7!important}
      #gorunum-ogretmen-odemeleri .bsod-ad,#gorunum-ogretmen-odemeleri .bsod-odemead{color:#101a35!important}
      #gorunum-ogretmen-odemeleri .bsod-alt,#gorunum-ogretmen-odemeleri .bsod-detay,#gorunum-ogretmen-odemeleri .bsod-tarih{color:#71809a!important}
      #gorunum-ogretmen-odemeleri .bsod-rakam.kalan strong{color:#c47a16!important}
      #gorunum-ogretmen-odemeleri .bsod-tutar{color:#1769f6!important}

      /* Ödevler */
      #gorunum-odevler .bsodev-geri{height:40px!important;border-color:#e1e7ef!important;border-radius:11px!important;background:#fff!important;color:#64748b!important}
      #gorunum-odevler .bsodev-arama{height:44px!important;padding-left:40px!important;border-color:var(--bsi-kenar)!important;border-radius:13px!important;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371809a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat 13px center/16px!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important}
      #gorunum-odevler .bsodev-chip{height:33px!important;border-color:#e2e8f0!important;background:#fff!important;color:#63738e!important}
      #gorunum-odevler .bsodev-chip.aktif{border-color:#bcd4ff!important;background:#edf4ff!important;color:#1769f6!important}
      #gorunum-odevler .bsodev-liste{gap:9px!important}
      #gorunum-odevler .bsodev-kart{position:relative;min-height:78px;padding:12px 13px 12px 16px!important;border-color:var(--bsi-kenar)!important;border-radius:15px!important;background:#fff!important;box-shadow:var(--bsi-golge)!important;overflow:hidden}
      #gorunum-odevler .bsodev-kart:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#72a7ff}
      #gorunum-odevler .bsodev-ad{font-size:11px!important;color:#101a35!important}
      #gorunum-odevler .bsodev-konu{font-size:9.8px!important;color:#4f607d!important}
      #gorunum-odevler .bsodev-meta{font-size:8.7px!important;color:#71809a!important}
      #gorunum-odevler .bsodev-rozet{background:#edf4ff!important;color:#1769f6!important}
      #gorunum-odevler .bsodev-rozet.gecikti{background:#fff0f0!important;color:#c24141!important}
      #gorunum-odevler .bsodev-rozet.tamam{background:#eafaf1!important;color:#0c9144!important}
      #gorunum-odevler .bsodev-kart:has(.bsodev-rozet.gecikti):before{background:#ef6a6a}
      #gorunum-odevler .bsodev-kart:has(.bsodev-rozet.tamam):before{background:#24ce6b}
      .bsodev-sheet{background:#f7f9fc!important}
      .bsodev-blok{border-color:#e4eaf3!important;border-radius:14px!important;box-shadow:0 4px 15px rgba(15,23,42,.025)!important}

      @media(max-width:700px){
        #gorunum-kasa .sayfa-baslik-alani,#gorunum-ogretmen-odemeleri .sayfa-baslik-alani,#gorunum-odevler .sayfa-baslik-alani{margin-bottom:15px!important}
        #gorunum-kasa .sayfa-baslik,#gorunum-ogretmen-odemeleri .sayfa-baslik,#gorunum-odevler .sayfa-baslik{font-size:27px!important}
        #gorunum-kasa .sayfa-aciklama,#gorunum-ogretmen-odemeleri .sayfa-aciklama,#gorunum-odevler .sayfa-aciklama{font-size:12px!important}
        #gorunum-kasa .bska-toplam strong{font-size:22px!important}
        #gorunum-ogretmen-odemeleri .bsod-kpiler{grid-template-columns:1fr 1fr!important}
        #gorunum-odevler .bsodev-ust{gap:7px!important}
      }
      @media(max-width:520px){
        #gorunum-kasa .bska-hesaplar{grid-template-columns:1fr 1fr!important}
        #gorunum-kasa .bska-hesap{padding:11px!important}.bska-hesap strong{font-size:13px!important}
        #gorunum-ogretmen-odemeleri .bsod-kpi{min-height:82px!important}.bsod-kpi strong{font-size:14px!important}
        #gorunum-odevler .bsodev-kart{padding:11px 11px 11px 15px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function baslat(){stilEkle();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();