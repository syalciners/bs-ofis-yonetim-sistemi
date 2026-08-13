(function(){
  if(window.BSV269StabilizasyonModuluV1) return;
  window.BSV269StabilizasyonModuluV1=true;

  const SURUM='V269';

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

  async function ogrenciDetaySemantiginiDuzelt(ogrenciId){
    if(!ogrenciId||!window.BSOgrenciServisi||!window.BSReferansServisi) return;
    try{
      const [sonuc,ref]=await Promise.all([
        BSOgrenciServisi.ogrenciDetayGetir(ogrenciId),
        BSReferansServisi.yukle()
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
        if(!sonraki){if(kart)kart.remove();return;}
        if(!kart){kart=document.createElement('div');kart.className='bsogr-sonraki';icerik.insertBefore(kart,icerik.firstChild);}
        const ogretmen=ref.ogretmenMap.get(sonraki.ogretmen_id)||'Öğretmen';
        const brans=ref.bransMap.get(sonraki.brans_id)||'Branş';
        kart.innerHTML='<small>Sıradaki Ders</small><strong>'+htmlKacir(tarihKisa(sonraki.tarih))+' • '+htmlKacir(saatKisalt(sonraki.baslangic_saati))+'–'+htmlKacir(saatKisalt(sonraki.bitis_saati))+'</strong><div>'+htmlKacir(ogretmen)+' • '+htmlKacir(brans)+'</div>';
      };
      uygula();
    }catch(e){console.warn('V269 öğrenci detay doğrulama:',e);}
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
