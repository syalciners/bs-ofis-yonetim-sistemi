(function(){
  if(window.BSKurumProfiliModuluV1) return;
  window.BSKurumProfiliModuluV1=true;

  const PROFILLER={
    muzik:{
      anahtar:'muzik',
      urunAdi:'BS Müzik Kursu Yönetimi',
      kurumEtiketi:'Müzik Kursu',
      markaAlt:'Müzik Kursu • Yönetim Paneli',
      terimler:{
        'Öğretmen Ödemeleri':'Eğitmen Ödemeleri',
        'Öğretmen Takvimi':'Eğitmen Takvimi',
        'Öğretmenler':'Eğitmenler',
        'Öğretmen':'Eğitmen',
        'öğretmen':'eğitmen',
        'Branş':'Enstrüman / Alan',
        'branş':'enstrüman / alan',
        'Derslik':'Stüdyo / Oda',
        'derslik':'stüdyo / oda',
        'Ofisin':'Kursun',
        'ofisin':'kursun'
      },
      gizliModuller:[]
    },
    dans:{
      anahtar:'dans',
      urunAdi:'BS Dans Kursu Yönetimi',
      kurumEtiketi:'Dans Kursu',
      markaAlt:'Dans Kursu • Yönetim Paneli',
      terimler:{
        'Öğretmen Ödemeleri':'Eğitmen Ödemeleri',
        'Öğretmen Takvimi':'Eğitmen Takvimi',
        'Öğretmenler':'Eğitmenler',
        'Öğretmen':'Eğitmen',
        'öğretmen':'eğitmen',
        'Öğrenciler':'Katılımcılar',
        'Öğrenci':'Katılımcı',
        'öğrenci':'katılımcı',
        'Branş':'Dans Türü',
        'branş':'dans türü',
        'Derslik':'Stüdyo',
        'derslik':'stüdyo',
        'Ofisin':'Kursun',
        'ofisin':'kursun'
      },
      gizliModuller:['Ödevler']
    }
  };

  const parametre=new URLSearchParams(window.location.search);
  const istenen=(parametre.get('profil')||'muzik').toLocaleLowerCase('tr-TR');
  const profil=PROFILLER[istenen]||PROFILLER.muzik;

  window.BSKurumProfiliV1={
    aktifProfil:profil.anahtar,
    profil:profil,
    profiller:PROFILLER
  };

  const METIN_SECICILERI=[
    '.giris-baslik',
    '.giris-aciklama',
    '.giris-alt',
    '.sayfa-baslik',
    '.sayfa-aciklama',
    '.kpi-baslik',
    '.hizli-baslik',
    '.hizli-alt',
    '.kart-baslik h2',
    '.metin-buton',
    '.sekme',
    '.ana-islem-buton',
    '.modul-baslik',
    '.modul-aciklama',
    '.nav-buton span:not([style])',
    '.bos-durum-baslik',
    '.bos-durum-aciklama',
    '.toast'
  ].join(',');

  function metniDonustur(metin){
    let sonuc=String(metin||'');
    Object.entries(profil.terimler)
      .sort((a,b)=>b[0].length-a[0].length)
      .forEach(([kaynak,hedef])=>{
        sonuc=sonuc.split(kaynak).join(hedef);
      });
    return sonuc;
  }

  function markaUygula(){
    document.title=profil.urunAdi+' • Aday V1';

    const girisBaslik=document.querySelector('.giris-baslik');
    if(girisBaslik && girisBaslik.textContent!==profil.urunAdi){
      girisBaslik.textContent=profil.urunAdi;
    }

    const markaBaslik=document.querySelector('.marka-baslik');
    if(markaBaslik && markaBaslik.textContent!==profil.urunAdi){
      markaBaslik.textContent=profil.urunAdi;
    }

    const markaAlt=document.querySelector('.marka-alt');
    if(markaAlt && markaAlt.textContent!==profil.markaAlt){
      markaAlt.textContent=profil.markaAlt;
    }

    const girisAlt=document.querySelector('.giris-alt');
    const girisAltMetni=profil.kurumEtiketi+' • Güvenli Yönetim Paneli';
    if(girisAlt && girisAlt.textContent!==girisAltMetni){
      girisAlt.textContent=girisAltMetni;
    }

    const appleBaslik=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(appleBaslik) appleBaslik.setAttribute('content',profil.urunAdi);

    document.body.dataset.bsKurumProfili=profil.anahtar;
  }

  function modulKimlikleriniIsaretle(){
    document.querySelectorAll('.modul-kart').forEach(kart=>{
      if(kart.dataset.bsProfilModul) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik) return;
      kart.dataset.bsProfilModul=baslik.textContent.trim();
    });
  }

  function modulGorunurluguUygula(){
    modulKimlikleriniIsaretle();
    document.querySelectorAll('.modul-kart[data-bs-profil-modul]').forEach(kart=>{
      const ad=kart.dataset.bsProfilModul;
      kart.style.display=profil.gizliModuller.includes(ad)?'none':'';
    });
  }

  function arayuzMetinleriniUygula(kok){
    const alan=kok&&kok.querySelectorAll?kok:document;
    alan.querySelectorAll(METIN_SECICILERI).forEach(eleman=>{
      if(eleman.closest('.profil-alani')) return;
      const onceki=eleman.textContent;
      const sonraki=metniDonustur(onceki);
      if(onceki!==sonraki) eleman.textContent=sonraki;
    });

    alan.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(eleman=>{
      const onceki=eleman.getAttribute('placeholder')||'';
      const sonraki=metniDonustur(onceki);
      if(onceki!==sonraki) eleman.setAttribute('placeholder',sonraki);
    });
  }

  let planli=false;
  function uygula(){
    planli=false;
    markaUygula();
    modulGorunurluguUygula();
    arayuzMetinleriniUygula(document);
  }

  function planla(){
    if(planli) return;
    planli=true;
    requestAnimationFrame(uygula);
  }

  function baslat(){
    uygula();
    if(window.MutationObserver){
      const gozlemci=new MutationObserver(planla);
      gozlemci.observe(document.body,{childList:true,subtree:true,characterData:true});
    }
    window.addEventListener('bs:gorunum-degisti',planla);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',baslat,{once:true});
  }else{
    baslat();
  }
})();