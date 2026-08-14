(function(){
  if(window.BSKisiServisi) return;
  async function rpc(ad,args){const {data,error}=await bsSupabase.rpc(ad,args||{});if(error)throw new Error(error.message||'İşlem tamamlanamadı.');return data;}
  async function ogrenciSil(id){const r=await rpc('ogrenci_kaldir_guvenli_v2',{p_ogrenci_id:id});window.BSReferansServisi?.temizle?.();document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu:'ogrenci-kaldir',sonuc:r}}));return r;}
  async function ogretmenSil(id){const r=await rpc('ogretmen_sil_guvenli_v1',{p_ogretmen_id:id});window.BSReferansServisi?.temizle?.();document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu:'ogretmen-sil',sonuc:r}}));return r;}
  async function kullanicilarGetir(){const {data,error}=await bsSupabase.from('kullanici_profilleri').select('auth_user_id,email,ad_soyad,rol,ogretmen_id,telefon,aktif,olusturulma_zamani,guncellenme_zamani').order('ad_soyad');if(error)throw error;return data||[];}
  async function kullaniciGuncelle(g){const r=await rpc('kullanici_profili_guncelle_guvenli_v1',{p_auth_user_id:g.auth_user_id,p_ad_soyad:g.ad_soyad,p_telefon:g.telefon||null,p_aktif:g.aktif!==false});document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu:'kullanici',sonuc:r}}));return r;}
  async function kullaniciSil(id){const r=await rpc('kullanici_profili_sil_guvenli_v1',{p_auth_user_id:id});document.dispatchEvent(new CustomEvent('bs:veri-degisti',{detail:{konu:'kullanici-sil',sonuc:r}}));return r;}
  window.BSKisiServisi={ogrenciSil,ogretmenSil,kullanicilarGetir,kullaniciGuncelle,kullaniciSil};
})();
