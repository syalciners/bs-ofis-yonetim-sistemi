(function(){
  if(window.BSOgrenciServisi) return;

  let referansCache=null;
  let referansPromise=null;

  async function referanslar(yenile=false){
    if(!yenile && referansCache) return referansCache;
    if(!yenile && referansPromise) return referansPromise;

    referansPromise=(async()=>{
      const [o,t,b]=await Promise.all([
        bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar').order('ad_soyad'),
        bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad'),
        bsSupabase.from('branslar').select('brans_id,brans_adi')
      ]);
      const hata=o.error||t.error||b.error;
      if(hata) throw hata;
      referansCache={
        ogrenciler:o.data||[],
        ogretmenMap:new Map((t.data||[]).map(x=>[x.ogretmen_id,x.ad_soyad])),
        bransMap:new Map((b.data||[]).map(x=>[x.brans_id,x.brans_adi]))
      };
      return referansCache;
    })();

    try{return await referansPromise;}
    finally{referansPromise=null;}
  }

  async function ogrenciGetir(ogrenciId){
    const {data,error}=await bsSupabase
      .from('ogrenciler')
      .select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar')
      .eq('ogrenci_id',ogrenciId)
      .single();
    if(error) throw error;
    return data;
  }

  async function ogrenciDetayGetir(ogrenciId){
    const [d,p]=await Promise.all([
      bsSupabase.from('dersler')
        .select('tarih,baslangic_saati,bitis_saati,ogretmen_id,brans_id,ders_durumu,ogrenci_toplam_tutar')
        .eq('ogrenci_id',ogrenciId)
        .order('tarih',{ascending:false})
        .order('baslangic_saati',{ascending:false}),
      bsSupabase.from('tahsilatlar')
        .select('tarih,tutar,odeme_yontemi,aciklama')
        .eq('ogrenci_id',ogrenciId)
        .order('tarih',{ascending:false})
    ]);
    if(d.error) throw d.error;
    if(p.error) throw p.error;
    return {dersler:d.data||[],tahsilatlar:p.data||[]};
  }

  async function ogrenciGuncelle(ogrenciId,payload){
    const {data,error}=await bsSupabase
      .from('ogrenciler')
      .update(payload)
      .eq('ogrenci_id',ogrenciId)
      .select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar')
      .single();
    if(error) throw error;
    if(!data||data.ogrenci_id!==ogrenciId) throw new Error('Öğrenci kaydı doğrulanamadı.');

    if(referansCache){
      const i=referansCache.ogrenciler.findIndex(x=>x.ogrenci_id===ogrenciId);
      if(i>=0) referansCache.ogrenciler[i]=data;
    }
    return data;
  }

  function cacheTemizle(){referansCache=null;referansPromise=null;}

  window.BSOgrenciServisi={
    referanslar,
    ogrenciGetir,
    ogrenciDetayGetir,
    ogrenciGuncelle,
    cacheTemizle
  };
})();