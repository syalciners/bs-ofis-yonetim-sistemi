(function(){
  if(window.BSSabitKabukModuluV1) return;
  window.BSSabitKabukModuluV1=true;

  function stilEkle(){
    if(document.getElementById('bsSabitKabukStil')) return;
    const s=document.createElement('style');
    s.id='bsSabitKabukStil';
    s.textContent=`
      :root{--bs-sabit-ust-bosluk:74px}
      html{scroll-padding-top:var(--bs-sabit-ust-bosluk)}
      #uygulama{padding-top:var(--bs-sabit-ust-bosluk)!important}
      .ust-bar{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        width:100%!important;
        z-index:500!important;
        margin:0!important;
      }
      .alt-nav{
        position:fixed!important;
        z-index:500!important;
      }
      .sayfa-baslik-alani{
        position:static!important;
        top:auto!important;
      }
      @media(max-width:700px){
        html,body,#uygulama,.icerik,.gorunum{max-width:100%;overflow-x:hidden!important}
        body{touch-action:pan-y}
      }
    `;
    document.head.appendChild(s);
  }

  function olc(){
    const bar=document.querySelector('.ust-bar');
    if(!bar) return;
    const r=bar.getBoundingClientRect();
    if(r.height>0){
      document.documentElement.style.setProperty('--bs-sabit-ust-bosluk',Math.ceil(r.height)+'px');
    }
  }

  let raf=0;
  function olcPlanla(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      olc();
      requestAnimationFrame(olc);
    });
  }

  function baslat(){
    stilEkle();
    olcPlanla();

    const bar=document.querySelector('.ust-bar');
    if(bar && window.ResizeObserver){
      const ro=new ResizeObserver(olcPlanla);
      ro.observe(bar);
    }

    const uygulama=document.getElementById('uygulama');
    if(uygulama && window.MutationObserver){
      const mo=new MutationObserver(olcPlanla);
      mo.observe(uygulama,{attributes:true,attributeFilter:['style','class']});
    }

    window.addEventListener('load',olcPlanla,{once:true});
    window.addEventListener('resize',olcPlanla,{passive:true});
    window.addEventListener('orientationchange',olcPlanla,{passive:true});
    window.visualViewport?.addEventListener('resize',olcPlanla,{passive:true});
    document.fonts?.ready?.then(olcPlanla).catch(()=>{});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
