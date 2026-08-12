(function(){
  if(window.BSOgretmenOdemeServisi) return;

  let donemCache=null;

  async function donemleriGetir(yenile=false){
    if(!yenile&&donemCache) return donemCache;
    const {data,error}=await bsSupabase.from('hakedis_donemleri')
      .select('hakedis_donemi_id,donem_adi,baslangic_tarihi,bitis_tarihi,aktif')
      .order('baslangic_tarihi',{ascending:false});
    if(error) throw error;
    donemCache=(data||[]).filter(x=>x.aktif!==false);
    return donemCache;
  }

  function varsayilanDonem(donemler){
    const bugun=istanbulBugunISO();
    return (donemler||[]).find(x=>x.baslangic_tarihi<=bugun&&x.bitis_tarihi>=bugun)
      ||(donemler||[]).find(x=>x.baslangic_tarihi<=bugun)
      ||(donemler||[])[0]
      ||null;
  }

  async function donemOzetiGetir(donemId){
    const donemler=await donemleriGetir();
    const donem=donemler.find(x=>x.hakedis_donemi_id===donemId)||varsayilanDonem(donemler);
    if(!donem) throw new Error('Hakediş dönemi bulunamadı.');
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');

    const [ref,dersSonuc,odemeSonuc,hesapSonuc]=await Promise.all([
      BSReferansServisi.yukle(),
      bsSupabase.from('dersler')
        .select('ders_id,tarih,ogretmen_id,ders_sayisi,ogretmen_toplam_hakedis,ders_durumu')
        .eq('ders_durumu','Yapıldı')
        .gte('tarih',donem.baslangic_tarihi)
        .lte('tarih',donem.bitis_tarihi),
      bsSupabase.from('ogretmen_odemeleri')
        .select('ogretmen_odeme_id,tarih,hakedis_donemi_id,ogretmen_id,tutar,odeme_yontemi,aciklama,hesap_id,iptal_mi')
        .eq('hakedis_donemi_id',donem.hakedis_donemi_id)
        .order('tarih',{ascending:false}),
      window.BSFinansServisi?BSFinansServisi.hesaplariGetir():Promise.resolve({hesapMap:new Map()})
    ]);
    if(dersSonuc.error) throw dersSonuc.error;
    if(odemeSonuc.error) throw odemeSonuc.error;

    const dersHarita=new Map();
    (dersSonuc.data||[]).forEach(d=>{
      if(!d.ogretmen_id) return;
      const x=dersHarita.get(d.ogretmen_id)||{ders_kaydi:0,ders_birimi:0,hakedis:0};
      x.ders_kaydi++;
      x.ders_birimi+=Number(d.ders_sayisi)||0;
      x.hakedis+=Number(d.ogretmen_toplam_hakedis)||0;
      dersHarita.set(d.ogretmen_id,x);
    });

    const aktifOdemeler=(odemeSonuc.data||[]).filter(x=>x.iptal_mi!==true);
    const odemeHarita=new Map();
    aktifOdemeler.forEach(o=>{
      const x=odemeHarita.get(o.ogretmen_id)||{odeme:0,odeme_adet:0};
      x.odeme+=Number(o.tutar)||0;
      x.odeme_adet++;
      odemeHarita.set(o.ogretmen_id,x);
    });

    const ogretmenler=(ref.ogretmenler||[])
      .filter(x=>x.durum!=='Pasif')
      .map(o=>{
        const d=dersHarita.get(o.ogretmen_id)||{ders_kaydi:0,ders_birimi:0,hakedis:0};
        const p=odemeHarita.get(o.ogretmen_id)||{odeme:0,odeme_adet:0};
        return {...o,...d,...p,kalan:d.hakedis-p.odeme};
      })
      .sort((a,b)=>(a.ad_soyad||'').localeCompare(b.ad_soyad||'','tr'));

    const toplam=ogretmenler.reduce((a,o)=>{
      a.hakedis+=o.hakedis;a.odeme+=o.odeme;a.kalan+=o.kalan;a.ders_birimi+=o.ders_birimi;return a;
    },{hakedis:0,odeme:0,kalan:0,ders_birimi:0});

    return {
      donem,donemler,ogretmenler,toplam,
      odemeler:aktifOdemeler,
      hesapMap:hesapSonuc&&hesapSonuc.hesapMap?hesapSonuc.hesapMap:new Map(),
      ogretmenMap:ref.ogretmenMap
    };
  }

  function cacheTemizle(){donemCache=null;}
  window.BSOgretmenOdemeServisi={donemleriGetir,varsayilanDonem,donemOzetiGetir,cacheTemizle};
})();
