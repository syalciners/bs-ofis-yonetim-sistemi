(function(){
  if(window.BSOgrenciServisi) return;

  async function referanslar(yenile=false){
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');
    return BSReferansServisi.yukle(yenile);
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
        .select('tarih,baslangic_saati,bitis_saati,ogretmen_id,brans_id,ders_durumu,ders_sayisi,ogrenci_toplam_tutar')
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
    if(window.BSReferansServisi) BSReferansServisi.ogrenciGuncelle(data);
    document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu:'ogrenci',kayit:data}}));
    return data;
  }

  function cacheTemizle(){
    if(window.BSReferansServisi) BSReferansServisi.temizle();
  }

  window.BSOgrenciServisi={
    referanslar,
    ogrenciGetir,
    ogrenciDetayGetir,
    ogrenciGuncelle,
    cacheTemizle
  };
})();
