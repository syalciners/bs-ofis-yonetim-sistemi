(function(){
  if(window.BSKucukSecimModuluV1)return;
  window.BSKucukSecimModuluV1=true;

  const MAX_SECENEK=5;

  function stilEkle(){
    if(document.getElementById('bsKucukSecimStil'))return;
    const s=document.createElement('style');
    s.id='bsKucukSecimStil';
    s.textContent=`
      .bsks-wrap{position:relative;width:100%;min-width:0}
      .bsks-select{position:absolute!important;left:0;bottom:0;width:1px!important;height:1px!important;min-width:1px!important;max-width:1px!important;padding:0!important;margin:0!important;opacity:0!important;pointer-events:none!important;border:0!important}
      .bsks-grup{display:flex;flex-wrap:wrap;gap:7px;width:100%;min-width:0}
      .bsks-btn{min-height:38px;min-width:46px;max-width:100%;padding:7px 12px;border:1px solid var(--kenar,#dbe3ef);border-radius:10px;background:#fff;color:var(--ikincil,#64748b);font:inherit;font-size:10.5px;font-weight:780;line-height:1.2;text-align:center;cursor:pointer;touch-action:manipulation;transition:border-color .12s ease,background .12s ease,color .12s ease,box-shadow .12s ease}
      .bsks-btn:hover{border-color:#93c5fd}
      .bsks-btn.secili{border-color:var(--mavi,#2563eb);background:var(--mavi-acik,#eff6ff);color:var(--mavi,#2563eb);box-shadow:0 0 0 2px rgba(37,99,235,.06)}
      .bsks-btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
      .bsks-btn[disabled]{opacity:.45;cursor:not-allowed}
      @media(max-width:640px){.bsks-grup{gap:6px}.bsks-btn{min-height:40px;padding:7px 11px;font-size:10.5px;flex:0 1 auto}}
    `;
    document.head.appendChild(s);
  }

  function gercekSecenekler(select){
    return [...select.options].filter(o=>String(o.value||'').trim()!==''&&!o.disabled);
  }

  function uygunMu(select){
    if(!select||select.tagName!=='SELECT')return false;
    if(select.dataset.bsKucukSecim==='off')return false;
    if(select.multiple||select.size>1)return false;
    const n=gercekSecenekler(select).length;
    return n>=1&&n<=MAX_SECENEK;
  }

  function secimiYansit(select,grup){
    if(!grup)return;
    grup.querySelectorAll('.bsks-btn').forEach(b=>{
      const secili=String(b.dataset.value)===String(select.value);
      b.classList.toggle('secili',secili);
      b.setAttribute('aria-pressed',secili?'true':'false');
    });
  }

  function render(select){
    if(!uygunMu(select)){
      geriAl(select);
      return;
    }

    let wrap=select.parentElement&&select.parentElement.classList.contains('bsks-wrap')?select.parentElement:null;
    let grup=wrap&&wrap.querySelector('.bsks-grup');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='bsks-wrap';
      select.parentNode.insertBefore(wrap,select);
      wrap.appendChild(select);
      select.classList.add('bsks-select');
      select.dataset.bsKucukSecim='on';
      grup=document.createElement('div');
      grup.className='bsks-grup';
      grup.setAttribute('role','group');
      const label=select.closest('.bspg-alan,.bsdo-alan,.bsdu-alan,.bstg-alan,.bsogd-alan,.bsgd-alan,.bsoi-alan')?.querySelector('label');
      if(label)grup.setAttribute('aria-label',label.textContent.trim());
      wrap.appendChild(grup);
      select.addEventListener('change',()=>secimiYansit(select,grup));
    }

    const secenekler=gercekSecenekler(select);
    const imza=secenekler.map(o=>o.value+'|'+o.textContent+'|'+o.disabled).join('¦');
    if(grup.dataset.imza===imza){secimiYansit(select,grup);return;}
    grup.dataset.imza=imza;
    grup.innerHTML='';

    secenekler.forEach(o=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='bsks-btn';
      b.dataset.value=o.value;
      b.textContent=(o.textContent||o.value).trim();
      b.disabled=select.disabled||o.disabled;
      b.addEventListener('click',()=>{
        if(select.disabled||b.disabled)return;
        if(String(select.value)!==String(o.value)){
          select.value=o.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }else secimiYansit(select,grup);
      });
      grup.appendChild(b);
    });
    secimiYansit(select,grup);
  }

  function geriAl(select){
    if(!select||select.dataset.bsKucukSecim!=='on')return;
    const wrap=select.parentElement;
    if(!wrap||!wrap.classList.contains('bsks-wrap'))return;
    wrap.parentNode.insertBefore(select,wrap);
    select.classList.remove('bsks-select');
    select.dataset.bsKucukSecim='';
    wrap.remove();
  }

  function tara(kok){
    const alan=kok&&kok.querySelectorAll?kok:document;
    if(alan.matches&&alan.matches('select'))render(alan);
    alan.querySelectorAll&&alan.querySelectorAll('select').forEach(render);
  }

  function tumunuYenile(){document.querySelectorAll('select').forEach(render);}

  function baslat(){
    stilEkle();
    tara(document);
    const gozlemci=new MutationObserver(kayitlar=>{
      let gerekli=false;
      kayitlar.forEach(k=>{
        if(k.type==='childList'){
          if(k.target&&k.target.tagName==='SELECT')gerekli=true;
          k.addedNodes.forEach(n=>{if(n.nodeType===1){tara(n);gerekli=true;}});
        }
        if(k.type==='attributes'&&k.target&&k.target.tagName==='SELECT')gerekli=true;
      });
      if(gerekli)requestAnimationFrame(tumunuYenile);
    });
    gozlemci.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    document.addEventListener('bs:veri-degisti',()=>setTimeout(tumunuYenile,50));
    document.addEventListener('change',e=>{if(e.target&&e.target.tagName==='SELECT')setTimeout(()=>render(e.target),0);},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
  window.BSKucukSecimModuluV1={yenile:tumunuYenile};
})();