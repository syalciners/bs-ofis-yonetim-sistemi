(function(){
  if(window.BSV269StabilizasyonModuluV1) return;
  window.BSV269StabilizasyonModuluV1=true;

  const SURUM='V270';

  function ayarlarSurumunuDuzelt(){
    const hedef=document.getElementById('bsayIcerik');
    if(!hedef) return;
    hedef.querySelectorAll('.bsay-satir').forEach(s=>{
      const etiket=s.querySelector('span');
      const deger=s.querySelector('strong');
      if(etiket&&deger&&etiket.textContent.trim()==='Sürüm') deger.textContent=SURUM;
    });
  }

  function ayarlarGozlemle(){
    const hedef=document.getElementById('bsayIcerik');
    if(!hedef||hedef.dataset.bsV269Gozlem==='1') return;
    hedef.dataset.bsV269Gozlem='1';
    new MutationObserver(ayarlarSurumunuDuzelt).observe(hedef,{childList:true,subtree:true});
    ayarlarSurumunuDuzelt();
  }

  function ogrenciKartindanId(e){
    const kart=e.target.closest&&e.target.closest('.v207-ogrenci-kart');
    return kart&&kart.dataset?kart.dataset.ogrenciId||'':'';
  }

  function whatsappNo(v){
    let s=String(v||'').replace(/\D/g,'');
    if(!s)return'';
    if(s.startsWith('0090'))s=s.slice(2);
    if(s.startsWith('0'))s='90'+s.slice(1);else if(s.length===10)s='90'+s;
    return s;
  }

  function veliKisayollariEkle(profil){
    if(!profil||profil.ogrenci_telefon||!profil.veli_telefon) return true;
    const alan=document.querySelector('#bsOgrenciDetayModal .bsk-ogrenci-aksiyonlar');
    if(!alan) return false;
    if(alan.querySelector('[data-v269-veli-hizli]')) return true;
    const veliButon=alan.querySelector('#bskVeliAc');
    const ara=document.createElement('a');
    ara.className='bsk-aksiyon';ara.dataset.v269VeliHizli='1';ara.href='tel:'+profil.veli_telefon;ara.textContent='Veli Ara';
    const wa=document.createElement('a');
    wa.className='bsk-aksiyon wa';wa.dataset.v269VeliHizli='1';wa.href='https://wa.me/'+whatsappNo(profil.veli_telefon);wa.target='_blank';wa.rel='noopener';wa.textContent='Veli WhatsApp';
    alan.insertBefore(ara,veliButon||null);alan.insertBefore(wa,veliButon||null);
    return true;
  }

  async function ogrenciDetaySemantiginiDuzelt(ogrenciId){
    if(!ogrenciId||!window.BSOgrenciServisi||!window.BSReferansServisi) return;
    try{
      const [sonuc,ref,profil]=await Promise.all([
        BSOgrenciServisi.ogrenciDetayGetir(ogrenciId),
        BSReferansServisi.yukle(),
        BSOgrenciServisi.ogrenciGetir(ogrenciId)
      ]);
      const dersler=sonuc.dersler||[];
      const yapilan=dersler.filter(x=>x.ders_durumu==='Yapıldı');
      const dersBirimi=yapilan.reduce((t,x)=>t+(Number(x.ders_sayisi)||1),0);
      const bugun=istanbulBugunISO();
      const sonraki=dersler
        .filter(x=>x.ders_durumu==='Planlandı'&&String(x.tarih||'').slice(0,10)>=bugun)
        .sort((a,b)=>(String(a.tarih||'')+String(a.baslangic_saati||'')).localeCompare(String(b.tarih||'')+String(b.baslangic_saati||'')))[0]||null;

      let deneme=0;
      const uygula=()=>{
        deneme++;
        const modal=document.getElementById('bsOgrenciDetayModal');
        const icerik=document.getElementById('bsOgrenciIcerik');
        if(!modal||!modal.classList.contains('acik')||!icerik){if(deneme<30)setTimeout(uygula,60);return;}
        const ilkKpi=icerik.querySelector('.bsogr-kpi > div:first-child');
        if(!ilkKpi){if(deneme<30)setTimeout(uygula,60);return;}
        const etiket=ilkKpi.querySelector('span'),deger=ilkKpi.querySelector('strong');
        if(etiket) etiket.textContent='Ders Birimi';
        if(deger) deger.textContent=Number(dersBirimi||0).toLocaleString('tr-TR');

        let kart=icerik.querySelector('.bsogr-sonraki');
        if(!sonraki){if(kart)kart.remove();}
        else{
          if(!kart){kart=document.createElement('div');kart.className='bsogr-sonraki';icerik.insertBefore(kart,icerik.firstChild);}
          const ogretmen=ref.ogretmenMap.get(sonraki.ogretmen_id)||'Öğretmen';
          const brans=ref.bransMap.get(sonraki.brans_id)||'Branş';
          kart.innerHTML='<small>Sıradaki Ders</small><strong>'+htmlKacir(tarihKisa(sonraki.tarih))+' • '+htmlKacir(saatKisalt(sonraki.baslangic_saati))+'–'+htmlKacir(saatKisalt(sonraki.bitis_saati))+'</strong><div>'+htmlKacir(ogretmen)+' • '+htmlKacir(brans)+'</div>';
        }

        let iletisimDeneme=0;
        const iletisim=()=>{iletisimDeneme++;if(!veliKisayollariEkle(profil)&&iletisimDeneme<20)setTimeout(iletisim,60);};
        iletisim();
      };
      uygula();
    }catch(e){console.warn('V270 öğrenci detay doğrulama:',e);}
  }

  function profilMenuKullaniciButonunuDuzelt(){
    const b=document.getElementById('bskKullanicilarAc');
    if(b) b.setAttribute('aria-label','Kullanıcıları yönet');
  }

  function baslat(){
    ayarlarGozlemle();
    profilMenuKullaniciButonunuDuzelt();
    document.addEventListener('click',e=>{
      const id=ogrenciKartindanId(e);
      if(id) ogrenciDetaySemantiginiDuzelt(id);
      if(e.target.closest&&e.target.closest('.modul-kart')) setTimeout(ayarlarGozlemle,30);
    },true);
    document.addEventListener('bs:veri-degisti',()=>setTimeout(()=>{ayarlarGozlemle();ayarlarSurumunuDuzelt();},30));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
