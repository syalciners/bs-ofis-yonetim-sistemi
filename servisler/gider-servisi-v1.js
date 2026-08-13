(function(){
  if(window.BSGiderServisi) return;

  function aySiniri(ym){
    if(window.BSFinansServisi&&BSFinansServisi.aySiniri) return BSFinansServisi.aySiniri(ym);
    const p=String(ym||'').split('-');
    const y=Number(p[0]),m=Number(p[1]);
    if(!y||!m||m<1||m>12) throw new Error('Geçersiz ay.');
    return {bas:`${y}-${String(m).padStart(2,'0')}-01`,sonraki:m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`};
  }

  async function aylikGiderlerGetir(ym){
    if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');
    const s=aySiniri(ym);
    const [hareketSonuc,giderSonuc,kategoriSonuc,hesaplar,ref]=await Promise.all([
      bsSupabase.from('kasa_hareketleri')
        .select('hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,ogretmen_id,iptal_mi,durum,olusturulma_zamani')
        .eq('hareket_turu','Gider')
        .gte('tarih',s.bas)
        .lt('tarih',s.sonraki)
        .order('tarih',{ascending:false})
        .order('olusturulma_zamani',{ascending:false}),
      bsSupabase.from('giderler')
        .select('gider_id,kategori_id,kasa_hareket_id,iptal_mi')
        .gte('tarih',s.bas)
        .lt('tarih',s.sonraki),
      bsSupabase.from('gider_kategorileri').select('kategori_id,kategori_adi,grup,aktif'),
      BSFinansServisi.hesaplariGetir(),
      window.BSReferansServisi?BSReferansServisi.yukle():Promise.resolve(null)
    ]);
    const hata=hareketSonuc.error||giderSonuc.error||kategoriSonuc.error;
    if(hata) throw hata;

    const giderMap=new Map();
    (giderSonuc.data||[]).filter(x=>x.iptal_mi!==true).forEach(x=>{
      giderMap.set(x.gider_id,x);
      if(x.kasa_hareket_id) giderMap.set(x.kasa_hareket_id,x);
    });
    const kategoriMap=new Map((kategoriSonuc.data||[]).map(x=>[x.kategori_id,x]));

    const hareketler=(hareketSonuc.data||[]).filter(x=>x.iptal_mi!==true).map(x=>{
      const gider=giderMap.get(x.kaynak_id)||giderMap.get(x.hareket_id)||null;
      const kategori=gider?kategoriMap.get(gider.kategori_id):null;
      const ogretmenOdeme=String(x.kaynak_turu||'').toLocaleLowerCase('tr-TR').includes('öğretmen');
      const kaynak_etiketi=ogretmenOdeme?'Öğretmen Ödemeleri':(kategori?.kategori_adi||(x.kaynak_turu||'Diğer').trim()||'Diğer');
      return {...x,kategori_id:gider?.kategori_id||null,kategori_adi:kategori?.kategori_adi||null,kategori_grubu:kategori?.grup||null,kaynak_etiketi};
    });

    const toplam=hareketler.reduce((t,x)=>t+(Number(x.tutar)||0),0);
    const ogretmen=hareketler.filter(x=>x.kaynak_etiketi==='Öğretmen Ödemeleri').reduce((t,x)=>t+(Number(x.tutar)||0),0);
    const diger=toplam-ogretmen;

    const kaynaklar={};
    hareketler.forEach(x=>{
      const ad=x.kaynak_etiketi||'Diğer';
      const k=kaynaklar[ad]||(kaynaklar[ad]={adet:0,tutar:0});
      k.adet++;
      k.tutar+=Number(x.tutar)||0;
    });

    return {
      ym,
      sinir:s,
      hareketler,
      toplam,
      ogretmen,
      diger,
      adet:hareketler.length,
      kaynaklar:Object.entries(kaynaklar).map(([ad,v])=>({ad,...v})).sort((a,b)=>b.tutar-a.tutar),
      kategoriMap,
      hesapMap:hesaplar.hesapMap,
      ogretmenMap:ref?ref.ogretmenMap:new Map()
    };
  }

  window.BSGiderServisi={aySiniri,aylikGiderlerGetir};
})();