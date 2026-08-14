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
    const mevcut=await ogrenciGetir(ogrenciId);
    const g={...mevcut,...(payload||{})};
    const {error}=await bsSupabase.rpc('ogrenci_kaydet_guvenli_v2',{
      p_ogrenci_id:ogrenciId,
      p_ad_soyad:g.ad_soyad,
      p_veli_adi:g.veli_adi||null,
      p_veli_telefon:g.veli_telefon||null,
      p_ogrenci_telefon:g.ogrenci_telefon||null,
      p_email:g.email||null,
      p_kayit_tarihi:g.kayit_tarihi||null,
      p_notlar:g.notlar||null,
      p_durum:g.durum||'Aktif'
    });
    if(error) throw new Error(error.message||'Öğrenci kaydedilemedi.');

    const data=await ogrenciGetir(ogrenciId);
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
