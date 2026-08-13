(function(){
  if(window.BSMobilUXModuluV1) return;
  window.BSMobilUXModuluV1=true;

  function stilEkle(){
    if(document.getElementById('bsMobilUXStil')) return;
    const s=document.createElement('style');
    s.id='bsMobilUXStil';
    s.textContent=`
      @media(max-width:700px){
        html,body{width:100%;max-width:100%;overflow-x:hidden!important;overscroll-behavior-x:none}
        body{touch-action:pan-y}
        main,.icerik,.gorunum,.kart{max-width:100%;min-width:0;box-sizing:border-box}
        input,select,textarea{font-size:16px!important;max-width:100%;min-width:0;box-sizing:border-box}
        [class*="-modal"]{max-width:100vw;overflow:hidden!important;overscroll-behavior:none;touch-action:pan-y}
        [class*="-sheet"]{width:100%!important;max-width:100vw!important;min-width:0!important;box-sizing:border-box;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain;touch-action:pan-y}
        [class*="-sheet"] *{box-sizing:border-box;min-width:0}
        [class*="-sheet"] input,[class*="-sheet"] select,[class*="-sheet"] textarea{width:100%;max-width:100%;min-width:0}
        [class*="-grid"],[class*="-ust"],[class*="-altbar"],[class*="-ozet"],[class*="-alan"]{max-width:100%;min-width:0}
        [class*="-alan"]>*,[class*="-grid"]>*{max-width:100%;min-width:0}
        button,a{max-width:100%;touch-action:manipulation}
        .bsdo-ozet-baslik,.bsdo-ozet-alt,.bsdo-ipucu,.bstg-alt,.bspg-baslik,.bsogy-baslik,.bsoi-baslik{overflow-wrap:anywhere;word-break:normal}
      }
    `;
    document.head.appendChild(s);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',stilEkle); else stilEkle();
})();