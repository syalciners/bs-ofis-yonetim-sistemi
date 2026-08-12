(function(){
  if(window.BSOgretmenServisi) return;

  function aySiniri(){
    if(typeof aySinirlari==='function') return aySinirlari();
    const bugun=istanbulBugunISO();
    const yil=Number(bugun.slice(0,4)),ay=Number(bugun.slice(5,7));
    const sonrakiAy=ay===12?1:ay+1,sonrakiYil=ay===12?yil+1:yil;
    return {baslangic:`${yil}-${String(ay).padStart(2,'0')}-01`,sonraki:`${sonrakiYil}-${String(sonrakiAy).padStart(2,'0')}-01`,yilAy:`${yil}-${String(ay).padStart(2,'0')}`};
  }

  async function aylikOzetGetir(){
    if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');
    const sinir=aySiniri();
    const [ref,dersSonuc]=await Promise.all([
      BSReferansServisi.yukle(),
      bsSupabase.from('dersler')
        .select('ders_id,tarih,ogretmen_id,ders_sayisi,ogretmen_toplam_hakedis,ders_durumu')
        .eq('ders_durumu','Yapıldı')
        .gte('tarih',sinir.baslangic)
        .lt('tarih',sinir.sonraki)
    ]);
    if(dersSonuc.error) throw dersSonuc.error;

    const harita=new Map();
    (dersSonuc.data||[]).forEach(d=>{
      if(!d.ogretmen_id) return;
      const x=harita.get(d.ogretmen_id)||{kayit_sayisi:0,ders_birimi:0,hakedis:0};
      x.kayit_sayisi++;
      x.ders_birimi+=Number(d.ders_sayisi)||0;
      x.hakedis+=Number(d.ogretmen_toplam_hakedis)||0;
      harita.set(d.ogretmen_id,x);
    });

    const ogretmenler=(ref.ogretmenler||[])
      .filter(x=>x.durum!=='Pasif')
      .map(x=>({
        ...x,
        ...(harita.get(x.ogretmen_id)||{kayit_sayisi:0,ders_birimi:0,hakedis:0})
      }));
    return {sinir,ogretmenler,referanslar:ref};
  }

  async function detayGetir(ogretmenId){
    if(!ogretmenId) throw new Error('Öğretmen seçilmedi.');
    const sinir=aySiniri();
    const h=window.BSDersProgramServisi?BSDersProgramServisi.haftaSiniri():null;
    const sorgular=[
      bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad,branslar,telefon,email,durum,notlar,rol').eq('ogretmen_id',ogretmenId).single(),
      bsSupabase.from('dersler')
        .select('ders_id,tarih,baslangic_saati,bitis_saati,ogrenci_id,brans_id,derslik_id,ders_sayisi,ogretmen_toplam_hakedis,ders_durumu')
        .eq('ogretmen_id',ogretmenId)
        .eq('ders_durumu','Yapıldı')
        .gte('tarih',sinir.baslangic)
        .lt('tarih',sinir.sonraki)
        .order('tarih',{ascending:false})
        .order('baslangic_saati',{ascending:false}),
      BSReferansServisi.yukle()
    ];
    if(h){
      sorgular.push(BSDersProgramServisi.dersleriGetir(h.bas,h.sonraki,ogretmenId));
    }
    const sonuc=await Promise.all(sorgular);
    const profilSonuc=sonuc[0],dersSonuc=sonuc[1],ref=sonuc[2],haftaDersleri=h?(sonuc[3]||[]):[];
    if(profilSonuc.error) throw profilSonuc.error;
    if(dersSonuc.error) throw dersSonuc.error;

    const yapilan=dersSonuc.data||[];
    const ozet=yapilan.reduce((a,d)=>{
      a.kayit_sayisi++;
      a.ders_birimi+=Number(d.ders_sayisi)||0;
      a.hakedis+=Number(d.ogretmen_toplam_hakedis)||0;
      return a;
    },{kayit_sayisi:0,ders_birimi:0,hakedis:0});

    return {profil:profilSonuc.data,yapilan,ozet,hafta:h,haftaDersleri,referanslar:ref};
  }

  window.BSOgretmenServisi={aylikOzetGetir,detayGetir};
})();
