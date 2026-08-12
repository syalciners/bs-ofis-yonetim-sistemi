(function(){
  if(window.BSRaporServisi) return;

  function aySiniri(ym){
    if(window.BSFinansServisi&&BSFinansServisi.aySiniri) return BSFinansServisi.aySiniri(ym);
    const p=String(ym||'').split('-');
    const y=Number(p[0]),m=Number(p[1]);
    if(!y||!m||m<1||m>12) throw new Error('Geçersiz ay.');
    return {bas:`${y}-${String(m).padStart(2,'0')}-01`,sonraki:m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`};
  }

  async function aylikOzetGetir(ym){
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');
    const s=aySiniri(ym);

    const [ref,tahsilatSonuc,dersSonuc]=await Promise.all([
      BSReferansServisi.yukle(),
      BSFinansServisi.tahsilatlariAyGetir(ym),
      bsSupabase.from('dersler')
        .select('ders_id,tarih,ogrenci_id,ogretmen_id,ders_sayisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu')
        .gte('tarih',s.bas)
        .lt('tarih',s.sonraki)
    ]);
    if(dersSonuc.error) throw dersSonuc.error;

    const dersler=dersSonuc.data||[];
    const yapilan=dersler.filter(x=>x.ders_durumu==='Yapıldı');
    const ciro=yapilan.reduce((t,x)=>t+(Number(x.ogrenci_toplam_tutar)||0),0);
    const hakedis=yapilan.reduce((t,x)=>t+(Number(x.ogretmen_toplam_hakedis)||0),0);
    const dersBirimi=yapilan.reduce((t,x)=>t+(Number(x.ders_sayisi)||0),0);

    const durumlar={};
    dersler.forEach(x=>{const d=x.ders_durumu||'Belirsiz';durumlar[d]=(durumlar[d]||0)+1;});

    const ogretmenHarita=new Map();
    yapilan.forEach(x=>{
      if(!x.ogretmen_id) return;
      const o=ogretmenHarita.get(x.ogretmen_id)||{ogretmen_id:x.ogretmen_id,kayit:0,ders_birimi:0,hakedis:0};
      o.kayit++;
      o.ders_birimi+=Number(x.ders_sayisi)||0;
      o.hakedis+=Number(x.ogretmen_toplam_hakedis)||0;
      ogretmenHarita.set(x.ogretmen_id,o);
    });
    const ogretmenler=[...ogretmenHarita.values()].map(x=>({
      ...x,
      ad_soyad:ref.ogretmenMap.get(x.ogretmen_id)||'Öğretmen'
    })).sort((a,b)=>b.hakedis-a.hakedis||String(a.ad_soyad).localeCompare(String(b.ad_soyad),'tr'));

    const yontemler={};
    (tahsilatSonuc.kayitlar||[]).forEach(x=>{
      const ad=(x.odeme_yontemi||'Diğer').trim()||'Diğer';
      const y=yontemler[ad]||(yontemler[ad]={adet:0,tutar:0});
      y.adet++;
      y.tutar+=Number(x.tutar)||0;
    });

    return {
      ym,
      sinir:s,
      tahsilat:tahsilatSonuc.toplam||0,
      tahsilatAdet:(tahsilatSonuc.kayitlar||[]).length,
      ciro,
      hakedis,
      dersBirimi,
      yapilanKayit:yapilan.length,
      toplamDersKaydi:dersler.length,
      durumlar,
      ogretmenler,
      yontemler:Object.entries(yontemler).map(([ad,v])=>({ad,...v})).sort((a,b)=>b.tutar-a.tutar),
      referanslar:ref
    };
  }

  window.BSRaporServisi={aySiniri,aylikOzetGetir};
})();