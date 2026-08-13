(function(){
  if(window.BSSabitKabukModuluV1) return;
  window.BSSabitKabukModuluV1=true;

  let ustBar=null;
  let uygulama=null;
  let kaynakSonrasi=null;

  function stilEkle(){
    if(document.getElementById('bsSabitKabukStil')) return;
    const s=document.createElement('style');
    s.id='bsSabitKabukStil';
    s.textContent=`
      :root{--bs-sabit-ust-bosluk:74px}
      html{scroll-padding-top:var(--bs-sabit-ust-bosluk)}
      html,body{max-width:100%;overflow-x:hidden!important}
      #uygulama{padding-top:var(--bs-sabit-ust-bosluk)!important}
      body > .ust-bar{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        width:100%!important;
        max-width:none!important;
        z-index:1200!important;
        margin:0!important;
        transform:none!important;
        will-change:auto!important;
      }
      .alt-nav{
        position:fixed!important;
        z-index:1100!important;
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

  function uygulamaGorunurMu(){
    if(!uygulama) return false;
    const cs=getComputedStyle(uygulama);
    return cs.display!=='none' && cs.visibility!=='hidden';
  }

  function gorunurluguEsitle(){
    if(!ustBar) return;
    ustBar.style.display=uygulamaGorunurMu()?'flex':'none';
  }

  function bodySeviyesineTasi(){
    if(!ustBar || ustBar.parentElement===document.body) return;
    kaynakSonrasi=ustBar.nextSibling;
    document.body.appendChild(ustBar);
  }

  function olc(){
    if(!ustBar || ustBar.style.display==='none') return;
    const r=ustBar.getBoundingClientRect();
    if(r.height>0){
      document.documentElement.style.setProperty('--bs-sabit-ust-bosluk',Math.ceil(r.height)+'px');
    }
  }

  let raf=0;
  function olcPlanla(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      gorunurluguEsitle();
      olc();
      requestAnimationFrame(()=>{
        gorunurluguEsitle();
        olc();
      });
    });
  }

  function baslat(){
    stilEkle();
    uygulama=document.getElementById('uygulama');
    ustBar=document.querySelector('#uygulama > .ust-bar')||document.querySelector('body > .ust-bar')||document.querySelector('.ust-bar');
    if(!uygulama || !ustBar) return;

    bodySeviyesineTasi();
    olcPlanla();

    if(window.ResizeObserver){
      const ro=new ResizeObserver(olcPlanla);
      ro.observe(ustBar);
    }

    if(window.MutationObserver){
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
