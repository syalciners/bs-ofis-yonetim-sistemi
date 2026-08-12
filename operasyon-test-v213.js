(function(){
  const V='213';
  const APPSHEET_APP='BSOfisYönetimSistemi_kopya-91618572';
  const APPSHEET_VIEW='Students_Form';

  function stilEkle(){
    if(document.getElementById('v213Stil')) return;
    const s=document.createElement('style');
    s.id='v213Stil';
    s.textContent=`
      .v213-aksiyonlar{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .v213-duzenle{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .v213-duzenle:active{transform:scale(.98);background:#dbeafe}
      .v213-duzenle svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      @media(max-width:700px){.v213-duzenle{height:38px;padding:0 11px;font-size:10px}.v211-kapat{width:38px;height:38px}}
    `;
    document.head.appendChild(s);
  }

  function modalButonunuHazirla(){
    const modal=document.getElementById('v211Modal');
    const ust=modal&&modal.querySelector('.v211-ust');
    const kapat=document.getElementById('v211Kapat');
    if(!modal||!ust||!kapat||document.getElementById('v213Duzenle')) return false;

    const aks=document.createElement('div');
    aks.className='v213-aksiyonlar';
    const b=document.createElement('button');
    b.id='v213Duzenle';
    b.type='button';
    b.className='v213-duzenle';
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg><span>Düzenle</span>';
    b.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      const id=modal.dataset.ogrenciId||'';
      if(!id){
        if(typeof toast==='function') toast('Öğrenci kaydı belirlenemedi.');
        return;
      }
      const url='https://www.appsheet.com/start/'+encodeURIComponent(APPSHEET_APP)+'#view='+encodeURIComponent(APPSHEET_VIEW)+'&row='+encodeURIComponent(id);
      window.location.href=url;
    });

    ust.removeChild(kapat);
    aks.appendChild(b);
    aks.appendChild(kapat);
    ust.appendChild(aks);
    return true;
  }

  function aktifOgrenciyiYakala(){
    document.addEventListener('click',function(e){
      const kart=e.target.closest&&e.target.closest('.v207-ogrenci-kart');
      if(!kart) return;
      const id=kart.dataset.ogrenciId||'';
      const modal=document.getElementById('v211Modal');
      if(modal&&id) modal.dataset.ogrenciId=id;
    },true);
  }

  function baslat(){
    stilEkle();
    aktifOgrenciyiYakala();
    let n=0;
    const t=setInterval(function(){
      n++;
      if(modalButonunuHazirla()||n>60) clearInterval(t);
    },200);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
