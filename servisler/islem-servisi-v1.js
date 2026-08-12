(function(){
  if(window.BSIslemServisi) return;

  function id8(){
    try{return crypto.randomUUID().replaceAll('-','').slice(0,8);}catch(e){return (Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(-8);}
  }

  async function rpc(ad,args){
    const {data,error}=await bsSupabase.rpc(ad,args||{});
    if(error) throw new Error(error.message||'İşlem tamamlanamadı.');
    return data;
  }

  function cacheTemizle(){
    try{window.BSFinansServisi&&BSFinansServisi.cacheTemizle&&BSFinansServisi.cacheTemizle();}catch(e){}
    try{window.BSReferansServisi&&BSReferansServisi.temizle&&BSReferansServisi.temizle();}catch(e){}
    try{window.BSOgretmenOdemeServisi&&BSOgretmenOdemeServisi.cacheTemizle&&BSOgretmenOdemeServisi.cacheTemizle();}catch(e){}
  }

  function degisti(konu,sonuc){
    cacheTemizle();
    document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu,sonuc}}));
  }

  async function ogrenciEkle(g){
    g.ogrenci_id=g.ogrenci_id||id8();
    const sonuc=await rpc('ogrenci_ekle_guvenli_v1',{
      p_ogrenci_id:g.ogrenci_id,
      p_ad_soyad:g.ad_soyad,
      p_veli_adi:g.veli_adi||null,
      p_veli_telefon:g.veli_telefon||null,
      p_ogrenci_telefon:g.ogrenci_telefon||null,
      p_email:g.email||null,
      p_kayit_tarihi:g.kayit_tarihi||istanbulBugunISO(),
      p_notlar:g.notlar||null
    });
    degisti('ogrenci',sonuc);return sonuc;
  }

  async function dersKaydet(g){
    g.ders_id=g.ders_id||id8();
    const sonuc=await rpc('ders_kaydet_guvenli_v1',{
      p_ders_id:g.ders_id,
      p_tarih:g.tarih,
      p_ogrenci_id:g.ogrenci_id,
      p_ogretmen_id:g.ogretmen_id,
      p_brans_id:g.brans_id,
      p_derslik_id:g.derslik_id,
      p_baslangic_saati:g.baslangic_saati,
      p_ders_sayisi:Number(g.ders_sayisi||1),
      p_aciklama:g.aciklama||null,
      p_program_id:g.program_id||null,
      p_ogrenci_birim_ucreti:g.ogrenci_birim_ucreti==null?null:Number(g.ogrenci_birim_ucreti),
      p_ogretmen_birim_hakedisi:g.ogretmen_birim_hakedisi==null?null:Number(g.ogretmen_birim_hakedisi)
    });
    degisti('ders',sonuc);return sonuc;
  }

  async function dersDurumuGuncelle(dersId,yeniDurum,aciklama){
    const sonuc=await rpc('ders_durumu_guncelle_guvenli_v1',{p_ders_id:dersId,p_yeni_durum:yeniDurum,p_aciklama:aciklama||null});
    degisti('ders',sonuc);return sonuc;
  }

  async function haftalikDersleriOlustur(){
    if(!window.BSDersProgramServisi) throw new Error('Ders program servisi yüklenmedi.');
    const h=BSDersProgramServisi.haftaSiniri();
    const sonuc=await rpc('haftalik_dersleri_olustur_guvenli_v1',{p_hafta_baslangici:h.bas});
    degisti('ders',sonuc);return sonuc;
  }

  async function tahsilatKaydet(g){
    g.tahsilat_id=g.tahsilat_id||id8();g.hareket_id=g.hareket_id||id8();
    const sonuc=await rpc('tahsilat_kaydet_guvenli_v1',{
      p_tahsilat_id:g.tahsilat_id,
      p_hareket_id:g.hareket_id,
      p_tarih:g.tarih,
      p_ogrenci_id:g.ogrenci_id,
      p_tutar:Number(g.tutar),
      p_odeme_yontemi:g.odeme_yontemi,
      p_aciklama:g.aciklama||null
    });
    degisti('finans',sonuc);return sonuc;
  }

  async function giderKaydet(g){
    g.gider_id=g.gider_id||id8();g.hareket_id=g.hareket_id||id8();
    const sonuc=await rpc('gider_kaydet_guvenli_v1',{
      p_gider_id:g.gider_id,
      p_hareket_id:g.hareket_id,
      p_tarih:g.tarih,
      p_kategori_id:g.kategori_id,
      p_tutar:Number(g.tutar),
      p_odeme_yontemi:g.odeme_yontemi,
      p_aciklama:g.aciklama||null,
      p_hesap_id:g.hesap_id||null
    });
    degisti('finans',sonuc);return sonuc;
  }

  async function ogretmenOdemeKaydet(g){
    g.odeme_id=g.odeme_id||id8();g.hareket_id=g.hareket_id||id8();
    const sonuc=await rpc('ogretmen_odeme_kaydet_guvenli_v1',{
      p_odeme_id:g.odeme_id,
      p_hareket_id:g.hareket_id,
      p_tarih:g.tarih,
      p_hakedis_donemi_id:g.hakedis_donemi_id,
      p_ogretmen_id:g.ogretmen_id,
      p_tutar:Number(g.tutar),
      p_odeme_yontemi:g.odeme_yontemi,
      p_aciklama:g.aciklama||null,
      p_hesap_id:g.hesap_id||null
    });
    degisti('finans',sonuc);return sonuc;
  }

  async function giderReferanslariGetir(){
    const [k,h]=await Promise.all([
      bsSupabase.from('gider_kategorileri').select('kategori_id,kategori_adi,grup,aktif,sira_no').order('sira_no',{ascending:true}),
      window.BSFinansServisi?BSFinansServisi.hesaplariGetir():bsSupabase.from('kasa_hesaplari').select('hesap_id,hesap_adi,hesap_turu,aktif')
    ]);
    if(k.error) throw k.error;
    if(h&&h.error) throw h.error;
    const hesaplar=h&&h.hesaplar?h.hesaplar:(h.data||[]);
    return {kategoriler:(k.data||[]).filter(x=>x.aktif!==false),hesaplar:hesaplar.filter(x=>x.aktif!==false)};
  }

  window.BSIslemServisi={id8,rpc,ogrenciEkle,dersKaydet,dersDurumuGuncelle,haftalikDersleriOlustur,tahsilatKaydet,giderKaydet,ogretmenOdemeKaydet,giderReferanslariGetir,cacheTemizle};
})();