(function(){
  if(window.BSModalUXModuluV1) return;
  window.BSModalUXModuluV1=true;

  function stilEkle(){
    if(document.getElementById('bsModalUXStil')) return;
    const s=document.createElement('style');
    s.id='bsModalUXStil';
    s.textContent=`
      /* V267 — Modal katmanı uygulama kabuğunun daima üzerinde kalır. */
      body > [class*="-modal"]{
        z-index:2000!important;
      }

      /* Tüm bottom-sheet/modal içerikleri yalnız dikey kayar. */
      [class*="-sheet"]{
        overflow-x:hidden!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch;
      }

      /* Sheet'in ilk başlık satırı içerik kayarken görünür kalır. */
      [class*="-sheet"] > [class*="-ust"]{
        position:sticky!important;
        top:-1px!important;
        z-index:80!important;
        margin-top:-1px!important;
        padding-top:1px!important;
        padding-bottom:10px!important;
        background:rgba(248,250,252,.96)!important;
        border-bottom:1px solid rgba(226,232,240,.88)!important;
        backdrop-filter:blur(14px)!important;
        -webkit-backdrop-filter:blur(14px)!important;
      }

      /* Zaten altbar kullanan formlar ortak görünüm ve sabit davranış kazanır. */
      [class*="-sheet"] form > [class*="-altbar"]{
        position:sticky!important;
        bottom:-1px!important;
        z-index:75!important;
        padding-top:12px!important;
        padding-bottom:max(2px,env(safe-area-inset-bottom))!important;
        background:linear-gradient(to top,#f8fafc 82%,rgba(248,250,252,0))!important;
      }

      /* Öğrenci gibi form-buton kullanan düzenleme ekranlarının alt işlemleri de görünür kalır. */
      [class*="-sheet"] form > [class*="-form-buton"]{
        position:sticky!important;
        bottom:-1px!important;
        z-index:75!important;
        padding-top:12px!important;
        padding-bottom:max(4px,env(safe-area-inset-bottom))!important;
        background:linear-gradient(to top,#f8fafc 82%,rgba(248,250,252,0))!important;
      }

      /* Altbar kullanmayan tek ana submit düğmeleri de altta erişilebilir kalır. */
      [class*="-sheet"] form > button[type="submit"][class*="-kaydet"],
      [class*="-sheet"] form > button[type="submit"][class*="-devam"]{
        position:sticky!important;
        bottom:-1px!important;
        z-index:75!important;
        min-height:46px!important;
        box-shadow:0 -10px 24px -18px rgba(15,23,42,.5),0 8px 18px -14px rgba(37,99,235,.45)!important;
      }

      @media(max-width:700px){
        body > [class*="-modal"]{
          inset:0!important;
        }
        [class*="-sheet"]{
          width:100%!important;
          max-width:100vw!important;
          min-width:0!important;
          box-sizing:border-box!important;
        }
        [class*="-sheet"] *{
          max-width:100%;
          min-width:0;
          box-sizing:border-box;
        }
        [class*="-sheet"] input,
        [class*="-sheet"] select,
        [class*="-sheet"] textarea{
          font-size:16px!important;
        }
        [class*="-sheet"] form > button[type="submit"][class*="-kaydet"],
        [class*="-sheet"] form > button[type="submit"][class*="-devam"]{
          width:100%!important;
          min-height:48px!important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function baslat(){ stilEkle(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
