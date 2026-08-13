(function(){
  if(window.BSSaatGirisModuluV1)return;
  window.BSSaatGirisModuluV1=true;

  const SAAT_DESEN='(?:[01]\\d|2[0-3]):[0-5]\\d';

  function rakamlar(v){return String(v||'').replace(/\D/g,'').slice(0,4);}

  function yazarkenBicimle(v){
    const d=rakamlar(v);
    if(!d)return '';
    if(d.length<=2)return d;
    if(d.length===3){
      const ilkIki=Number(d.slice(0,2));
      return ilkIki<=23?d.slice(0,2)+':'+d.slice(2):'0'+d.slice(0,1)+':'+d.slice(1);
    }
    return d.slice(0,2)+':'+d.slice(2,4);
  }

  function tamamla(v){
    const ham=String(v||'').trim();
    if(!ham)return '';
    const iki=ham.match(/^(\d{1,2}):(\d{1,2})$/);
    let h,m;
    if(iki){h=Number(iki[1]);m=Number(iki[2]);}
    else{
      const d=rakamlar(ham);
      if(d.length<=2){h=Number(d);m=0;}
      else if(d.length===3){const ilkIki=Number(d.slice(0,2));if(ilkIki<=23){h=ilkIki;m=Number(d.slice(2));}else{h=Number(d.slice(0,1));m=Number(d.slice(1));}}
      else if(d.length===4){h=Number(d.slice(0,2));m=Number(d.slice(2));}
      else return ham;
    }
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return ham;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  }

  function dogrula(el){
    const v=String(el.value||'').trim();
    if(!v){el.setCustomValidity(el.required?'Saat girin.':'');return !el.required;}
    const ok=new RegExp('^'+SAAT_DESEN+'$').test(v);
    el.setCustomValidity(ok?'':'Saati 24 saat biçiminde girin. Örnek: 09:30');
    return ok;
  }

  function donustur(el){
    if(!el||el.dataset.bsSaatKlavye==='1')return;
    const eski=el.value;
    try{el.type='text';}catch(e){}
    el.dataset.bsSaatKlavye='1';
    el.inputMode='numeric';
    el.autocomplete='off';
    el.placeholder=el.placeholder||'SS:DD';
    el.maxLength=5;
    el.pattern=SAAT_DESEN;
    el.title='Saati 24 saat biçiminde girin. Örnek: 09:30';
    if(eski)el.value=tamamla(eski);
    el.addEventListener('input',()=>{
      const bas=el.selectionStart;
      const once=el.value;
      el.value=yazarkenBicimle(once);
      el.setCustomValidity('');
      try{if(bas!=null)el.setSelectionRange(el.value.length,el.value.length);}catch(e){}
    });
    el.addEventListener('blur',()=>{el.value=tamamla(el.value);dogrula(el);});
    el.addEventListener('change',()=>{el.value=tamamla(el.value);dogrula(el);});
  }

  function tara(kok){
    const alan=kok&&kok.querySelectorAll?kok:document;
    alan.querySelectorAll('input[type="time"],input[data-bs-saat-klavye="0"]').forEach(donustur);
  }

  function baslat(){
    tara(document);
    const gozlemci=new MutationObserver(kayitlar=>{
      kayitlar.forEach(k=>k.addedNodes.forEach(n=>{
        if(n.nodeType!==1)return;
        if(n.matches&&n.matches('input[type="time"]'))donustur(n);
        tara(n);
      }));
    });
    gozlemci.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();