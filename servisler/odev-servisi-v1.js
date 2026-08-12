(function(){
  if(window.BSOdevServisi) return;

  async function listeGetir(){
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yuklenmedi.');
    const [ref,sonuc]=await Promise.all([
      BSReferansServisi.yukle(),
      bsSupabase.from('odevler')
        .select('odev_id,ogrenci_id,ogretmen_id,ders_id,konu,odev_basligi,odev_aciklamasi,verilis_tarihi,son_teslim_tarihi,durum,oncelik,ogretmen_notu,puan,tamamlanma_tarihi,odev_dosya_linki,odev_fotograf_linki')
        .order('son_teslim_tarihi',{ascending:true,nullsFirst:false})
    ]);
    if(sonuc.error) throw sonuc.error;
    return {kayitlar:sonuc.data||[],referanslar:ref};
  }

  async function detayGetir(odevId){
    if(!odevId) throw new Error('Odev kimligi eksik.');
    const [ref,sonuc]=await Promise.all([
      BSReferansServisi.yukle(),
      bsSupabase.from('odevler')
        .select('odev_id,ogrenci_id,ogretmen_id,ders_id,konu,odev_basligi,odev_aciklamasi,verilis_tarihi,son_teslim_tarihi,durum,oncelik,ogretmen_notu,puan,tamamlanma_tarihi,odev_dosya_linki,odev_fotograf_linki')
        .eq('odev_id',odevId).single()
    ]);
    if(sonuc.error) throw sonuc.error;
    return {kayit:sonuc.data,referanslar:ref};
  }

  window.BSOdevServisi={listeGetir,detayGetir};
})();