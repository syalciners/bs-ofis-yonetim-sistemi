(function(){
  if(window.BSFinansServisi) return;

  let hesapCache=null;
  let hesapPromise=null;

  function aySiniri(ym){
    const p=String(ym||'').split('-');
    const y=Number(p[0]),m=Number(p[1]);
    if(!y||!m||m<1||m>12) throw new Error('Geçersiz ay.');
    const sonraki=m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`;
    return {bas:`${y}-${String(m).padStart(2,'0')}-01`,sonraki};
  }

  async function hesaplariGetir(yenile=false){
    if(!yenile&&hesapCache) return hesapCache;
    if(!yenile&&hesapPromise) return hesapPromise;
    hesapPromise=(async()=>{
      const {data,error}=await bsSupabase.from('kasa_hesaplari').select('hesap_id,hesap_adi,hesap_turu,banka_adi,acilis_bakiyesi,aktif');
      if(error) throw error;
      const hesaplar=data||[];
      hesapCache={hesaplar,hesapMap:new Map(hesaplar.map(x=>[x.hesap_id,x.hesap_adi]))};
      return hesapCache;
    })();
    try{return await hesapPromise;}finally{hesapPromise=null;}
  }

  async function kasaOzetiGetir(){
    const [h,m]=await Promise.all([
      hesaplariGetir(),
      bsSupabase.from('kasa_hareketleri').select('hesap_id,hareket_turu,tutar,iptal_mi')
    ]);
    if(m.error) throw m.error;
    const hareketler=m.data||[];
    const bakiyeListesi=h.hesaplar.filter(x=>x.aktif!==false).map(hesap=>{
      const bakiye=hareketler
        .filter(x=>x.hesap_id===hesap.hesap_id&&x.iptal_mi!==true)
        .reduce((toplam,x)=>{
          const tutar=Number(x.tutar)||0;
          if(x.hareket_turu==='Gelir') return toplam+tutar;
          if(x.hareket_turu==='Gider') return toplam-tutar;
          return toplam;
        },Number(hesap.acilis_bakiyesi)||0);
      return {hesap_id:hesap.hesap_id,ad:hesap.hesap_adi||hesap.hesap_id,tur:hesap.hesap_turu||'',banka:hesap.banka_adi||'',bakiye};
    });
    return {toplam:bakiyeListesi.reduce((t,x)=>t+x.bakiye,0),hesaplar:bakiyeListesi};
  }

  async function kasaDetayGetir(limit=50){
    const [ozet,hareketSonuc,ref]=await Promise.all([
      kasaOzetiGetir(),
      bsSupabase.from('kasa_hareketleri')
        .select('hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,ogrenci_id,ogretmen_id,iptal_mi,durum,olusturulma_zamani')
        .order('tarih',{ascending:false})
        .order('olusturulma_zamani',{ascending:false})
        .limit(Math.max(10,Math.min(200,Number(limit)||50))),
      window.BSReferansServisi?BSReferansServisi.yukle():Promise.resolve(null)
    ]);
    if(hareketSonuc.error) throw hareketSonuc.error;
    const hareketler=(hareketSonuc.data||[]).filter(x=>x.iptal_mi!==true);
    return {
      ...ozet,
      hareketler,
      ogrenciMap:ref?ref.ogrenciMap:new Map(),
      ogretmenMap:ref?ref.ogretmenMap:new Map()
    };
  }

  async function borcOzetiGetir(){
    const [r,d,p]=await Promise.all([
      window.BSReferansServisi?BSReferansServisi.yukle():bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad'),
      bsSupabase.from('dersler').select('ogrenci_id,ogrenci_toplam_tutar').eq('ders_durumu','Yapıldı'),
      bsSupabase.from('tahsilatlar').select('ogrenci_id,tutar')
    ]);
    if(d.error) throw d.error;
    if(p.error) throw p.error;
    const ogrenciler=window.BSReferansServisi?r.ogrenciler:(r.data||[]);
    if(!window.BSReferansServisi&&r.error) throw r.error;

    const borc=new Map(),odeme=new Map();
    (d.data||[]).forEach(x=>borc.set(x.ogrenci_id,(borc.get(x.ogrenci_id)||0)+(Number(x.ogrenci_toplam_tutar)||0)));
    (p.data||[]).forEach(x=>odeme.set(x.ogrenci_id,(odeme.get(x.ogrenci_id)||0)+(Number(x.tutar)||0)));

    const bakiyeler=ogrenciler.map(o=>({
      ogrenci_id:o.ogrenci_id,
      ad_soyad:o.ad_soyad||'',
      kalan:(borc.get(o.ogrenci_id)||0)-(odeme.get(o.ogrenci_id)||0)
    }));
    const borclular=bakiyeler.filter(x=>x.kalan>0.009);
    return {sayi:borclular.length,toplamKalan:borclular.reduce((t,x)=>t+x.kalan,0),bakiyeler};
  }

  async function tahsilatReferanslariGetir(){
    const [r,h]=await Promise.all([
      window.BSReferansServisi?BSReferansServisi.yukle():bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad'),
      hesaplariGetir()
    ]);
    if(!window.BSReferansServisi&&r.error) throw r.error;
    const ogrenciler=window.BSReferansServisi?r.ogrenciler:(r.data||[]);
    return {
      ogrenciMap:new Map(ogrenciler.map(x=>[x.ogrenci_id,x.ad_soyad])),
      hesapMap:h.hesapMap
    };
  }

  async function tahsilatlariAyGetir(ym){
    const s=aySiniri(ym);
    const {data,error}=await bsSupabase.from('tahsilatlar')
      .select('tahsilat_id,tarih,ogrenci_id,tutar,odeme_yontemi,aciklama,hesap_id')
      .gte('tarih',s.bas).lt('tarih',s.sonraki).order('tarih',{ascending:false});
    if(error) throw error;
    const kayitlar=data||[];
    const toplam=kayitlar.reduce((t,x)=>t+(Number(x.tutar)||0),0);
    const havale=kayitlar.filter(x=>String(x.odeme_yontemi||'').toLocaleLowerCase('tr-TR').includes('havale')).reduce((t,x)=>t+(Number(x.tutar)||0),0);
    const nakit=kayitlar.filter(x=>String(x.odeme_yontemi||'').toLocaleLowerCase('tr-TR').includes('nakit')).reduce((t,x)=>t+(Number(x.tutar)||0),0);
    return {kayitlar,toplam,havale,nakit};
  }

  function cacheTemizle(){hesapCache=null;hesapPromise=null;}

  window.BSFinansServisi={
    aySiniri,
    hesaplariGetir,
    kasaOzetiGetir,
    kasaDetayGetir,
    borcOzetiGetir,
    tahsilatReferanslariGetir,
    tahsilatlariAyGetir,
    cacheTemizle
  };
})();