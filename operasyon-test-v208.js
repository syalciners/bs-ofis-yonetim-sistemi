(function(){
  const V='208';

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

    const [hesapSonuc,hareketSonuc]=await Promise.all([
      bsSupabase.from('kasa_hesaplari').select('hesap_id,hesap_adi,acilis_bakiyesi,aktif'),
      bsSupabase.from('kasa_hareketleri').select('hesap_id,hareket_turu,tutar,iptal_mi')
    ]);
    if(hesapSonuc.error) throw hesapSonuc.error;
    if(hareketSonuc.error) throw hareketSonuc.error;

    const hareketler=hareketSonuc.data||[];
    const hesaplar=(hesapSonuc.data||[]).filter(x=>x.aktif!==false);
    const bakiyeListesi=hesaplar.map(h=>{
      const net=hareketler
        .filter(m=>m.hesap_id===h.hesap_id && m.iptal_mi!==true)
        .reduce((t,m)=>{
          const tutar=Number(m.tutar)||0;
          if(m.hareket_turu==='Gelir') return t+tutar;
          if(m.hareket_turu==='Gider') return t-tutar;
          return t;
        },Number(h.acilis_bakiyesi)||0);
      return {ad:h.hesap_adi||h.hesap_id,bakiye:net};
    });

    const toplam=bakiyeListesi.reduce((t,x)=>t+x.bakiye,0);
    deger.textContent=paraYaz(toplam);
    kartBilgiEkle(kart,bakiyeListesi.map(x=>`<strong>${htmlKacir(x.ad)}</strong> ${htmlKacir(paraYaz(x.bakiye))}`).join(' • '));
  }

  async function borcKpisiniYukle(){
    const kart=document.querySelector('.kpi-grid .kpi-kart:nth-child(5)');
    const deger=kart&&kart.querySelector('.kpi-deger');
    if(!deger) return;
    deger.textContent='…';

    const [ogrenciSonuc,dersSonuc,tahsilatSonuc]=await Promise.all([
      bsSupabase.from('ogrenciler').select('ogrenci_id'),
      bsSupabase.from('dersler').select('ogrenci_id,ogrenci_toplam_tutar,ders_durumu').eq('ders_durumu','Yapıldı'),
      bsSupabase.from('tahsilatlar').select('ogrenci_id,tutar')
    ]);
    if(ogrenciSonuc.error) throw ogrenciSonuc.error;
    if(dersSonuc.error) throw dersSonuc.error;
    if(tahsilatSonuc.error) throw tahsilatSonuc.error;

    const borc=new Map();
    const odeme=new Map();
    (dersSonuc.data||[]).forEach(x=>borc.set(x.ogrenci_id,(borc.get(x.ogrenci_id)||0)+(Number(x.ogrenci_toplam_tutar)||0)));
    (tahsilatSonuc.data||[]).forEach(x=>odeme.set(x.ogrenci_id,(odeme.get(x.ogrenci_id)||0)+(Number(x.tutar)||0)));

    let sayi=0;
    let toplamKalan=0;
    (ogrenciSonuc.data||[]).forEach(o=>{
      const kalan=(borc.get(o.ogrenci_id)||0)-(odeme.get(o.ogrenci_id)||0);
      if(kalan>0.009){sayi++;toplamKalan+=kalan;}
    });

    deger.textContent=String(sayi);
    kartBilgiEkle(kart,`Toplam açık bakiye <strong>${htmlKacir(paraYaz(toplamKalan))}</strong>`);
  }

  async function finansKpilariniYukle(){
    try{
      await Promise.all([kasaKpisiniYukle(),borcKpisiniYukle()]);
    }catch(err){
      console.error('V208 finans KPI:',err);
      const k4=document.querySelector('.kpi-grid .kpi-kart:nth-child(4) .kpi-deger');
      const k5=document.querySelector('.kpi-grid .kpi-kart:nth-child(5) .kpi-deger');
      if(k4) k4.textContent='!';
      if(k5) k5.textContent='!';
    }
  }

  function baslatV208(){
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

  baslatV208();
})();
