(function(){
  if(window.BSOgrenciListeModuluV1) return;
  window.BSOgrenciListeModuluV1=true;

  let ogrenciler=[];

  function stilEkle(){
    if(document.getElementById('bsOgrenciListeStil')) return;
    const s=document.createElement('style');
    s.id='bsOgrenciListeStil';
    s.textContent=`
      .bsogr-listesi{display:grid;gap:8px;padding:10px}
      .bsogr-list-kart{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 14px;border:1px solid var(--kenar);border-radius:13px;background:#fff}
      .bsogr-list-ad{font-size:13px;font-weight:800;color:var(--yazi)}
      .bsogr-list-detay{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.4}
      .bsogr-list-rozet{padding:6px 9px;border-radius:999px;background:var(--yesil-acik);color:var(--yesil);font-size:9px;font-weight:800;white-space:nowrap}
      .bsogr-list-rozet.pasif{background:#f1f5f9;color:#64748b}
      .bsogr-list-sayac{font-size:11px;color:var(--ikincil);font-weight:700}
      @media(max-width:640px){.bsogr-listesi{padding:7px}.bsogr-list-kart{padding:11px 12px}.bsogr-list-ad{font-size:11px}.bsogr-list-detay{font-size:9px;gap:3px 8px}}
    `;
    document.head.appendChild(s);
  }

  function listele(kayitlar){
    const hedef=document.getElementById('bsOgrenciListe');
    const sayac=document.getElementById('bsOgrenciListeSayac');
    if(!hedef) return;
    if(sayac) sayac.textContent=(kayitlar||[]).length+' öğrenci';
    hedef.className='bsogr-listesi';
    hedef.innerHTML=(kayitlar||[]).map(o=>{
      const tel=o.ogrenci_telefon||o.veli_telefon||'';
      const alt=[o.veli_adi?('Veli: '+o.veli_adi):'',tel,o.email||''].filter(Boolean);
      const pasif=String(o.durum||'').toLocaleLowerCase('tr-TR')==='pasif';
      return `<article class="bsogr-list-kart v207-ogrenci-kart" data-ogrenci-id="${htmlKacir(o.ogrenci_id)}"><div><div class="bsogr-list-ad v207-ogrenci-ad">${htmlKacir(o.ad_soyad)}</div><div class="bsogr-list-detay">${alt.map(x=>`<span>${htmlKacir(x)}</span>`).join('')}</div></div><span class="bsogr-list-rozet ${pasif?'pasif':''}">${htmlKacir(o.durum||'Aktif')}</span></article>`;
    }).join('');
  }

  async function verileriYukle(){
    const hedef=document.getElementById('bsOgrenciListe');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Öğrenciler yükleniyor…</div>';
    try{
      if(!window.BSReferansServisi) throw new Error('Referans servisi yüklenmedi.');
      const ref=await BSReferansServisi.yukle();
      ogrenciler=ref.ogrenciler||[];
      listele(ogrenciler);
    }catch(err){
      console.error('Öğrenci listesi:',err);
      hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Öğrenciler yüklenemedi</div></div>';
    }
  }

  function arayuzuHazirla(){
    const bolum=document.getElementById('gorunum-ogrenciler');
    if(!bolum) return false;
    stilEkle();
    const input=bolum.querySelector('input[type="search"]');
    if(input){
      input.id='bsOgrenciArama';
      input.addEventListener('input',()=>{
        const q=input.value.trim().toLocaleLowerCase('tr-TR');
        const filtre=ogrenciler.filter(o=>[o.ad_soyad,o.veli_adi,o.email,o.veli_telefon,o.ogrenci_telefon].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q)));
        listele(filtre);
      });
    }
    const kart=bolum.querySelector('.kart');
    if(kart) kart.innerHTML='<div class="kart-baslik"><h2>Öğrenci Listesi</h2><span id="bsOgrenciListeSayac" class="bsogr-list-sayac"></span></div><div id="bsOgrenciListe"><div class="ders-yukleniyor">Öğrenciler yükleniyor…</div></div>';
    return true;
  }

  function baslat(){
    if(!arayuzuHazirla()) return;
    let deneme=0;
    const timer=setInterval(async()=>{
      deneme++;
      try{
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){clearInterval(timer);await verileriYukle();}
        else if(deneme>40) clearInterval(timer);
      }catch(e){if(deneme>40) clearInterval(timer);}
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
