(function(){
  const V='218';

  function stilEkle(){
    const style=document.createElement('style');
    style.textContent=`
      .v208-kpi-alt{margin-top:8px;color:var(--ikincil);font-size:9.5px;line-height:1.35;font-weight:650}
      .v208-kpi-alt strong{color:var(--yazi);font-weight:750}
      @media(max-width:640px){.v208-kpi-alt{margin-top:7px;font-size:8.5px;line-height:1.3}}
    `;
    document.head.appendChild(style);
  }

  function kartBilgiEkle(kart,metin){
    if(!kart) return;
    let alt=kart.querySelector('.v208-kpi-alt');
    if(!alt){
      alt=document.createElement('div');
      alt.className='v208-kpi-alt';
      kart.appendChild(alt);
    }
    alt.innerHTML=metin;
  }

  async function kasaKpisiniYukle(){
    const kart=document.querySelector('.kpi-grid .kpi-kart:nth-child(4)');
    const deger=kart&&kart.querySelector('.kpi-deger');
    if(!deger) return;
    deger.textContent='…';
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');

    const ozet=await BSFinansServisi.kasaOzetiGetir();
    deger.textContent=paraYaz(ozet.toplam);
    kartBilgiEkle(kart,ozet.hesaplar.map(x=>`<strong>${htmlKacir(x.ad)}</strong> ${htmlKacir(paraYaz(x.bakiye))}`).join(' • '));
  }

  async function borcKpisiniYukle(){
    const kart=document.querySelector('.kpi-grid .kpi-kart:nth-child(5)');
    const deger=kart&&kart.querySelector('.kpi-deger');
    if(!deger) return;
    deger.textContent='…';
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');

    const ozet=await BSFinansServisi.borcOzetiGetir();
    deger.textContent=String(ozet.sayi);
    kartBilgiEkle(kart,`Toplam açık bakiye <strong>${htmlKacir(paraYaz(ozet.toplamKalan))}</strong>`);
  }

  async function finansKpilariniYukle(){
    try{
      await Promise.all([kasaKpisiniYukle(),borcKpisiniYukle()]);
    }catch(err){
      console.error('V218 finans KPI:',err);
      const k4=document.querySelector('.kpi-grid .kpi-kart:nth-child(4) .kpi-deger');
      const k5=document.querySelector('.kpi-grid .kpi-kart:nth-child(5) .kpi-deger');
      if(k4) k4.textContent='!';
      if(k5) k5.textContent='!';
    }
  }

  function baslat(){
    stilEkle();
    let deneme=0;
    const timer=setInterval(async()=>{
      deneme++;
      try{
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){
          clearInterval(timer);
          await finansKpilariniYukle();
        }else if(deneme>40){clearInterval(timer);}
      }catch(e){if(deneme>40) clearInterval(timer);}
    },250);
  }

  baslat();
})();
