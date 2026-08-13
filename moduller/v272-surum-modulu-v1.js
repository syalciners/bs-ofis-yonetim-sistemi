(function(){
  if(window.BSV272SurumModuluV1)return;window.BSV272SurumModuluV1=true;
  function uygula(){const h=document.getElementById('bsayIcerik');if(!h)return;h.querySelectorAll('.bsay-satir').forEach(s=>{const e=s.querySelector('span'),d=s.querySelector('strong');if(e&&d&&e.textContent.trim()==='Sürüm')d.textContent='V272';});}
  function baslat(){uygula();const h=document.getElementById('bsayIcerik');if(h)new MutationObserver(uygula).observe(h,{childList:true,subtree:true});document.addEventListener('bs:veri-degisti',()=>setTimeout(uygula,30));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();