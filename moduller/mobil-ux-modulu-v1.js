(function(){
  if(window.BSMobilUXModuluV1) return;
  window.BSMobilUXModuluV1=true;

  function stilEkle(){
    if(document.getElementById('bsMobilUXStil')) return;
    const s=document.createElement('style');
    s.id='bsMobilUXStil';
    s.textContent=`
      @media(max-width:700px){
        html,body{max-width:100%;overflow-x:hidden}
        input,select,textarea{font-size:16px!important;max-width:100%;box-sizing:border-box}
        .bsdo-modal{overflow:hidden;overscroll-behavior:none;touch-action:pan-y}
        .bsdo-sheet{width:100%!important;max-width:100vw!important;box-sizing:border-box;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain;touch-action:pan-y}
        .bsdo-sheet *{box-sizing:border-box}
        .bsdo-hizli,.bsdo-detay-grid,.bsdo-alan,.bsdo-alan>*,.bsdo-ozet,.bsdo-ozet>div{min-width:0;max-width:100%}
        .bsdo-alan input,.bsdo-alan select{width:100%;min-width:0;max-width:100%}
        .bsdo-ozet-baslik,.bsdo-ozet-alt,.bsdo-ipucu{overflow-wrap:anywhere;word-break:normal}
      }
    `;
    document.head.appendChild(s);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',stilEkle); else stilEkle();
})();