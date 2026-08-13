(function(){
  if(window.BSReferansServisi) return;

  let cache=null;
  let yuklemePromise=null;

  function norm(v){return String(v||'').trim().toLocaleLowerCase('tr-TR');}
  function ogretmenBransAdlari(ogretmen){
    return String(ogretmen&&ogretmen.branslar||'').split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
  }

  function sonucHazirla(o,t,b,l){
    const ogrenciler=o||[],ogretmenler=t||[],branslar=b||[],derslikler=l||[];
    const ogretmenKayitMap=new Map(ogretmenler.map(x=>[x.ogretmen_id,x]));
    return {
      ogrenciler,
      ogretmenler,
      branslar,
      derslikler,
      ogrenciMap:new Map(ogrenciler.map(x=>[x.ogrenci_id,x.ad_soyad])),
      ogretmenMap:new Map(ogretmenler.map(x=>[x.ogretmen_id,x.ad_soyad])),
      ogretmenKayitMap,
      bransMap:new Map(branslar.map(x=>[x.brans_id,x.brans_adi])),
      derslikMap:new Map(derslikler.map(x=>[x.derslik_id,x])),
      ogretmenBranslariGetir(ogretmenId){
        const o=ogretmenKayitMap.get(ogretmenId),izinli=new Set(ogretmenBransAdlari(o).map(norm));
        return branslar.filter(x=>x.aktif!==false&&izinli.has(norm(x.brans_adi)));
      },
      ogretmenBransiVerebilirMi(ogretmenId,bransId){
        return this.ogretmenBranslariGetir(ogretmenId).some(x=>x.brans_id===bransId);
      }
    };
  }

  async function yukle(yenile=false){
    if(!yenile&&cache) return cache;
    if(!yenile&&yuklemePromise) return yuklemePromise;

    yuklemePromise=(async()=>{
      const [o,t,b,l]=await Promise.all([
        bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar').order('ad_soyad'),
        bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad,branslar,durum').order('ad_soyad'),
        bsSupabase.from('branslar').select('brans_id,brans_adi,aktif'),
        bsSupabase.from('derslikler').select('derslik_id,mekan_adi,kapasite,aktif')
      ]);
      const hata=o.error||t.error||b.error||l.error;
      if(hata) throw hata;
      cache=sonucHazirla(o.data||[],t.data||[],b.data||[],l.data||[]);
      return cache;
    })();

    try{return await yuklemePromise;}
    finally{yuklemePromise=null;}
  }

  function ogrenciGuncelle(kayit){
    if(!cache||!kayit||!kayit.ogrenci_id) return;
    const i=cache.ogrenciler.findIndex(x=>x.ogrenci_id===kayit.ogrenci_id);
    if(i>=0) cache.ogrenciler[i]=kayit;
    else cache.ogrenciler.push(kayit);
    cache.ogrenciler.sort((a,b)=>String(a.ad_soyad||'').localeCompare(String(b.ad_soyad||''),'tr'));
    cache.ogrenciMap=new Map(cache.ogrenciler.map(x=>[x.ogrenci_id,x.ad_soyad]));
  }

  function temizle(){cache=null;yuklemePromise=null;}

  window.BSReferansServisi={yukle,ogrenciGuncelle,temizle};
})();