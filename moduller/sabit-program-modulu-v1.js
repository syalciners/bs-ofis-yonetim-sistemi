(function(){
  if(window.BSSabitProgramModuluV1) return;
  window.BSSabitProgramModuluV1=true;

  let veri=null;
  let arama='';

  function stilEkle(){
    if(document.getElementById('bsSabitProgramStil')) return;
    const s=document.createElement('style');
    s.id='bsSabitProgramStil';
    s.textContent=`
      .bssp-ust{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;margin-bottom:11px}
      .bssp-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:750;cursor:pointer}
      .bssp-islemler{display:flex;gap:8px;align-items:center}.bssp-olustur{height:38px;padding:0 13px;border:1px solid var(--mavi);border-radius:10px;background:var(--mavi);color:#fff;font-size:10px;font-weight:800;cursor:pointer}
      .bssp-arama{width:100%;height:43px;margin-bottom:10px;padding:0 13px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi);font:inherit;font-size:12px;outline:none}.bssp-arama:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .bssp-ozet{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;font-size:10px;color:var(--ikincil)}.bssp-ozet strong{color:var(--yazi)}
      .bssp-gunler{display:grid;gap:10px}.bssp-gun{border:1px solid var(--kenar);border-radius:15px;background:#fff;overflow:hidden}.bssp-gun-baslik{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:820;color:var(--ikincil)}
      .bssp-satir{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 13px;border-bottom:1px solid #f1f5f9}.bssp-satir:last-child{border-bottom:none}
      .bssp-saat{padding:8px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:10px;font-weight:820}.bssp-ad{font-size:11px;font-weight:800;color:var(--yazi)}.bssp-detay{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:4px;font-size:9px;color:var(--ikincil)}
      .bssp-ders{padding:6px 8px;border-radius:999px;background:#f8fafc;color:var(--ikincil);font-size:8.5px;font-weight:800;white-space:nowrap}.bssp-bos{padding:18px 13px;text-align:center;color:var(--ikincil);font-size:10px}
      @media(max-width:640px){.bssp-ust{align-items:stretch}.bssp-islemler{width:100%;justify-content:space-between}.bssp-geri,.bssp-olustur{flex:1}.bssp-satir{grid-template-columns:54px minmax(0,1fr);position:relative;padding-right:68px}.bssp-ders{position:absolute;right:11px;top:12px}.bssp-gun-baslik{padding:9px 11px}}
    `;
    document.head.appendChild(s);
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-sabitprogram')) return;
    const main=document.querySelector('main.icerik');
    if(!main) return;
    const sec=document.createElement('section');
    sec.className='gorunum';sec.id='gorunum-sabitprogram';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Sabit Program</div><div class="sayfa-aciklama">Haftalık tekrar eden aktif ders planları.</div></div></div><div class="bssp-ust"><div class="bssp-islemler"><button id="bsspGeri" class="bssp-geri" type="button">← Menü</button><button id="bsspHaftalikOlustur" class="bssp-olustur" type="button">Haftalık Dersleri Oluştur</button></div></div><input id="bsspArama" class="bssp-arama" type="search" placeholder="Öğrenci, öğretmen veya branş ara"><div id="bsspIcerik"><div class="ders-yukleniyor">Sabit program yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsspGeri').addEventListener('click',()=>gorunumeGit('menu'));
    document.getElementById('bsspArama').addEventListener('input',e=>{arama=(e.target.value||'').toLocaleLowerCase('tr-TR').trim();render();});
    document.getElementById('bsspHaftalikOlustur').addEventListener('click',()=>{
      if(window.BSHaftalikDersModuluV1&&typeof BSHaftalikDersModuluV1.onizleme==='function') BSHaftalikDersModuluV1.onizleme();
    });
  }

  function satirHTML(p,ref){
    const ogr=ref.ogrenciMap.get(p.ogrenci_id)||'Öğrenci';
    const ogt=ref.ogretmenMap.get(p.ogretmen_id)||'Öğretmen';
    const br=ref.bransMap.get(p.brans_id)||'Branş';
    const yer=(ref.derslikMap.get(p.derslik_id)||{}).mekan_adi||'Yer';
    const bas=String(p.baslangic_saati||'').slice(0,5);
    const bit=BSDersProgramServisi.saatYaz((Number(bas.slice(0,2))*60+Number(bas.slice(3,5)))+(Number(p.ders_sayisi)||1)*60);
    return `<div class="bssp-satir"><div class="bssp-saat">${htmlKacir(bas)}<br>${htmlKacir(bit)}</div><div><div class="bssp-ad">${htmlKacir(ogr)}</div><div class="bssp-detay"><span>${htmlKacir(ogt)}</span><span>${htmlKacir(br)}</span><span>${htmlKacir(yer)}</span></div></div><span class="bssp-ders">${htmlKacir(Number(p.ders_sayisi)||1)} ders</span></div>`;
  }

  function eslesiyor(p,ref){
    if(!arama) return true;
    const metin=[ref.ogrenciMap.get(p.ogrenci_id),ref.ogretmenMap.get(p.ogretmen_id),ref.bransMap.get(p.brans_id),(ref.derslikMap.get(p.derslik_id)||{}).mekan_adi,p.haftanin_gunu].join(' ').toLocaleLowerCase('tr-TR');
    return metin.includes(arama);
  }

  function render(){
    const hedef=document.getElementById('bsspIcerik');
    if(!hedef||!veri) return;
    const ref=veri.referanslar;
    const liste=(veri.programlar||[]).filter(p=>eslesiyor(p,ref));
    const gunler=(veri.gunSirasi||[]).map(g=>({gun:g,kayitlar:liste.filter(p=>p.haftanin_gunu===g)})).filter(x=>x.kayitlar.length);
    hedef.innerHTML=`<div class="bssp-ozet"><span><strong>${liste.length}</strong> aktif program</span><span>${arama?'Filtrelenmiş sonuç':'Tüm aktif program'}</span></div>${gunler.length?`<div class="bssp-gunler">${gunler.map(x=>`<section class="bssp-gun"><div class="bssp-gun-baslik"><span>${htmlKacir(x.gun)}</span><span>${x.kayitlar.length} ders</span></div>${x.kayitlar.map(p=>satirHTML(p,ref)).join('')}</section>`).join('')}</div>`:'<div class="bos-durum"><div class="bos-durum-baslik">Program bulunamadı</div><div class="bos-durum-aciklama">Arama sonucuna uyan aktif program yok.</div></div>'}`;
  }

  async function yukle(yenile=false){
    const hedef=document.getElementById('bsspIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Sabit program yükleniyor…</div>';
    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders program servisi yüklenmedi.');
      if(!veri||yenile) veri=await BSDersProgramServisi.sabitProgramlariGetir();
      render();
    }catch(err){console.error('Sabit program:',err);hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Sabit program yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';}
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');
      if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik||baslik.textContent.trim()!=='Sabit Program') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('sabitprogram');yukle();
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSSabitProgramModuluV1={yukle};
})();