(function(){
  if(window.BSDersProgramServisi) return;

  const GUN_OFFSET={Pazartesi:0,'Salı':1,'Çarşamba':2,'Perşembe':3,Cuma:4,Cumartesi:5,Pazar:6};
  const GUN_ADI=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const HARIC_DURUMLAR=['İptal','Ertelendi','Öğretmen İptali'];

  function tarihEkle(iso,gun){const d=new Date(iso+'T12:00:00+03:00');d.setDate(d.getDate()+gun);return d.toISOString().slice(0,10);}
  function haftaSiniri(){const bugun=istanbulBugunISO(),d=new Date(bugun+'T12:00:00+03:00'),g=d.getDay(),fark=g===0?-6:1-g,bas=tarihEkle(bugun,fark);return {bas,son:tarihEkle(bas,6),sonraki:tarihEkle(bas,7)};}
  function dakika(s){const p=String(s||'00:00').split(':');return Number(p[0]||0)*60+Number(p[1]||0);}
  function saatYaz(dk){dk=Math.round(dk);const h=Math.floor(dk/60)%24,m=dk%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  function gunAdi(iso){const d=new Date(String(iso)+'T12:00:00+03:00');return GUN_ADI[d.getDay()]||'';}
  function cakisir(a1,a2,b1,b2){return a1<b2&&b1<a2;}
  async function referanslar(yenile=false){if(!window.BSReferansServisi) throw new Error('Ortak referans servisi yüklenmedi.');return BSReferansServisi.yukle(yenile);}

  async function dersleriGetir(bas,sonraki,ogretmenId){
    let q=bsSupabase.from('dersler').select('ders_id,program_id,tarih,baslangic_saati,bitis_saati,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_yeri,ders_durumu').gte('tarih',bas).lt('tarih',sonraki).order('tarih').order('baslangic_saati');if(ogretmenId) q=q.eq('ogretmen_id',ogretmenId);const {data,error}=await q;if(error) throw error;return data||[];
  }

  async function dersDetayGetir(dersId){if(!dersId) throw new Error('Ders kimliği eksik.');const {data,error}=await bsSupabase.from('dersler').select('ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu,aciklama,baslangic_saati,bitis_saati,ders_turu,ders_yeri,zoom_toplanti_id,zoom_katilim_baglantisi,zoom_sifre,zoom_islem_durumu').eq('ders_id',dersId).single();if(error) throw error;return data;}

  async function sabitProgramlariGetir(){
    const [programSonuc,ref]=await Promise.all([bsSupabase.from('sabit_ders_programi').select('program_id,ogrenci_id,ogretmen_id,brans_id,derslik_id,haftanin_gunu,baslangic_saati,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,baslangic_tarihi,bitis_tarihi,program_durumu,aciklama').eq('program_durumu','Aktif'),referanslar()]);if(programSonuc.error) throw programSonuc.error;
    const programlar=(programSonuc.data||[]).sort((a,b)=>{const ga=GUN_OFFSET[a.haftanin_gunu]??99,gb=GUN_OFFSET[b.haftanin_gunu]??99;if(ga!==gb) return ga-gb;return String(a.baslangic_saati||'').localeCompare(String(b.baslangic_saati||''));});return {programlar,referanslar:ref,gunSirasi:Object.keys(GUN_OFFSET)};
  }

  async function ogrenciProgramVarsayilaniGetir(ogrenciId,tarih){
    if(!ogrenciId||!tarih) return {eslesenler:[],programlar:[],varsayilan:null,ortakVarsayilan:null};
    const {data,error}=await bsSupabase.from('sabit_ders_programi').select('program_id,ogrenci_id,ogretmen_id,brans_id,derslik_id,haftanin_gunu,baslangic_saati,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,baslangic_tarihi,bitis_tarihi,program_durumu').eq('ogrenci_id',ogrenciId).eq('program_durumu','Aktif');if(error) throw error;
    const programlar=(data||[]).filter(p=>(!p.baslangic_tarihi||tarih>=p.baslangic_tarihi)&&(!p.bitis_tarihi||tarih<=p.bitis_tarihi));
    const gun=gunAdi(tarih),eslesenler=programlar.filter(p=>p.haftanin_gunu===gun),varsayilan=eslesenler.length===1?eslesenler[0]:null;
    let ortakVarsayilan=null;
    if(!varsayilan&&programlar.length){
      const ilk=programlar[0];
      const ayni=programlar.every(p=>p.ogretmen_id===ilk.ogretmen_id&&p.brans_id===ilk.brans_id&&p.derslik_id===ilk.derslik_id&&Number(p.ders_sayisi||1)===Number(ilk.ders_sayisi||1)&&Number(p.ogrenci_birim_ucreti||0)===Number(ilk.ogrenci_birim_ucreti||0)&&Number(p.ogretmen_birim_hakedisi||0)===Number(ilk.ogretmen_birim_hakedisi||0));
      if(ayni) ortakVarsayilan={...ilk,baslangic_saati:null};
    }
    return {eslesenler,programlar,varsayilan,ortakVarsayilan};
  }

  async function manuelDersOnKontrol(girdi){
    const tarih=String(girdi&&girdi.tarih||'').slice(0,10),baslangic=String(girdi&&girdi.baslangic_saati||'').slice(0,5),dersSayisi=Number(girdi&&girdi.ders_sayisi)||0,ogrenciId=girdi&&girdi.ogrenci_id,ogretmenId=girdi&&girdi.ogretmen_id,bransId=girdi&&girdi.brans_id,derslikId=girdi&&girdi.derslik_id;
    if(!tarih||!baslangic||!ogrenciId||!ogretmenId||!bransId||!derslikId) throw new Error('Ders bilgileri eksik.');if(![1,2,3,4].includes(dersSayisi)) throw new Error('Ders sayısı 1–4 arasında olmalı.');const bas=dakika(baslangic),bit=bas+dersSayisi*60;if(bas<0||bas>=1440||bit>1440) throw new Error('Ders saati gün sınırını aşıyor.');
    const [dersler,ref]=await Promise.all([dersleriGetir(tarih,tarihEkle(tarih,1)),referanslar()]);const aktif=dersler.filter(d=>!HARIC_DURUMLAR.includes(d.ders_durumu)),cakisan=aktif.filter(d=>cakisir(bas,bit,dakika(d.baslangic_saati),dakika(d.bitis_saati))),nedenler=[];
    cakisan.forEach(d=>{const ortak=[];if(d.ogrenci_id===ogrenciId) ortak.push('Öğrenci');if(d.ogretmen_id===ogretmenId) ortak.push('Öğretmen');if(!ortak.length) return;nedenler.push({tur:ortak.join(' + '),ders_id:d.ders_id,saat:`${String(d.baslangic_saati||'').slice(0,5)}–${String(d.bitis_saati||'').slice(0,5)}`,ogrenci:ref.ogrenciMap.get(d.ogrenci_id)||'Öğrenci',ogretmen:ref.ogretmenMap.get(d.ogretmen_id)||'Öğretmen'});});
    const derslik=ref.derslikMap.get(derslikId),kapasite=Math.max(1,Number(derslik&&derslik.kapasite)||1),derslikEszamanli=cakisan.filter(d=>d.derslik_id===derslikId).length;if(derslikEszamanli>=kapasite) nedenler.push({tur:'Derslik Kapasitesi',ders_id:null,saat:`${baslangic}–${saatYaz(bit)}`,ogrenci:'',ogretmen:'',aciklama:`${derslik&&derslik.mekan_adi?derslik.mekan_adi:'Derslik'} kapasitesi ${kapasite}; aynı anda ${derslikEszamanli} ders var.`});
    return {uygun:nedenler.length===0,nedenler,tarih,baslangicSaati:baslangic,bitisSaati:saatYaz(bit),dersSayisi,referanslar:ref,derslikKapasitesi:kapasite,derslikEszamanli};
  }

  async function haftalikOnizleme(){
    const h=haftaSiniri();const [pSonuc,dersler,ref]=await Promise.all([bsSupabase.from('sabit_ders_programi').select('program_id,ogrenci_id,ogretmen_id,brans_id,derslik_id,haftanin_gunu,baslangic_saati,ders_sayisi,baslangic_tarihi,bitis_tarihi,program_durumu'),dersleriGetir(h.bas,h.sonraki),referanslar()]);if(pSonuc.error) throw pSonuc.error;
    const programlar=(pSonuc.data||[]).filter(p=>p.program_durumu==='Aktif'&&(!p.baslangic_tarihi||p.baslangic_tarihi<=h.son)&&(!p.bitis_tarihi||p.bitis_tarihi>=h.bas)),adaylar=[];let zaten=0;
    programlar.forEach(p=>{const off=GUN_OFFSET[p.haftanin_gunu];if(off===undefined) return;const tarih=tarihEkle(h.bas,off);if((p.baslangic_tarihi&&tarih<p.baslangic_tarihi)||(p.bitis_tarihi&&tarih>p.bitis_tarihi)) return;if(dersler.some(d=>d.program_id===p.program_id&&String(d.tarih).slice(0,10)===tarih)){zaten++;return;}const bas=dakika(p.baslangic_saati),bit=bas+(Number(p.ders_sayisi)||1)*60,aktifDers=dersler.filter(d=>String(d.tarih).slice(0,10)===tarih&&!HARIC_DURUMLAR.includes(d.ders_durumu)),kisiCakisma=aktifDers.some(d=>cakisir(bas,bit,dakika(d.baslangic_saati),dakika(d.bitis_saati))&&(d.ogretmen_id===p.ogretmen_id||d.ogrenci_id===p.ogrenci_id)),loc=ref.derslikMap.get(p.derslik_id),kapasite=Math.max(1,Number(loc&&loc.kapasite)||1),eszamanli=aktifDers.filter(d=>d.derslik_id===p.derslik_id&&cakisir(bas,bit,dakika(d.baslangic_saati),dakika(d.bitis_saati))).length;adaylar.push({p,tarih,bas,bit,cakisma:kisiCakisma||eszamanli>=kapasite});});
    const cakisma=adaylar.filter(x=>x.cakisma).length;return {hafta:h,referanslar:ref,programlar,adaylar,aktifProgram:programlar.length,zaten,cakisma,olusacak:adaylar.length-cakisma};
  }

  window.BSDersProgramServisi={tarihEkle,haftaSiniri,saatYaz,gunAdi,referanslar,dersleriGetir,dersDetayGetir,sabitProgramlariGetir,ogrenciProgramVarsayilaniGetir,manuelDersOnKontrol,haftalikOnizleme};
})();