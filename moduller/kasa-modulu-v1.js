(function(){
  if(window.BSKasaModuluV1) return;
  window.BSKasaModuluV1=true;

  let veri=null;
  let filtre='Tümü';

  function stilEkle(){
    if(document.getElementById('bsKasaStil')) return;
    const s=document.createElement('style');
    s.id='bsKasaStil';
    s.textContent=`
      .bska-ust{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;margin-bottom:11px}.bska-geri,.bska-tahsilat{height:38px;padding:0 12px;border-radius:10px;font-size:10px;font-weight:780;cursor:pointer}.bska-geri{border:1px solid var(--kenar);background:#fff;color:var(--ikincil)}.bska-tahsilat{border:1px solid var(--mavi);background:var(--mavi);color:#fff}
      .bska-toplam{padding:16px;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff;margin-bottom:10px}.bska-toplam span{display:block;font-size:9.5px;color:#475569}.bska-toplam strong{display:block;margin-top:5px;font-size:25px;color:#0f172a}
      .bska-hesaplar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px}.bska-hesap{padding:12px;border:1px solid var(--kenar);border-radius:13px;background:#fff}.bska-hesap span{display:block;font-size:9px;color:var(--ikincil)}.bska-hesap strong{display:block;margin-top:5px;font-size:15px;color:var(--yazi)}.bska-hesap small{display:block;margin-top:3px;font-size:8.5px;color:var(--ikincil)}
      .bska-filtre{display:flex;gap:6px;margin:0 0 9px}.bska-chip{height:34px;padding:0 11px;border:1px solid var(--kenar);border-radius:999px;background:#fff;color:var(--ikincil);font-size:9.5px;font-weight:760;cursor:pointer}.bska-chip.aktif{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8}
      .bska-liste{border:1px solid var(--kenar);border-radius:15px;background:#fff;overflow:hidden}.bska-baslik{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800}.bska-satir{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bska-satir:last-child{border-bottom:none}.bska-tarih{font-size:9.5px;color:var(--ikincil)}.bska-kaynak{font-size:10.5px;font-weight:760;color:var(--yazi)}.bska-detay{margin-top:3px;font-size:9px;color:var(--ikincil)}.bska-tutar{font-size:11px;font-weight:850;white-space:nowrap}.bska-tutar.gelir{color:#15803d}.bska-tutar.gider{color:#b91c1c}
      @media(max-width:640px){.bska-ust{align-items:stretch}.bska-geri,.bska-tahsilat{flex:1}.bska-hesaplar{grid-template-columns:1fr 1fr}.bska-satir{grid-template-columns:56px minmax(0,1fr);position:relative;padding-right:86px}.bska-tutar{position:absolute;right:12px;top:12px;font-size:10px}}
    `;
    document.head.appendChild(s);
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-kasa')) return;
    const main=document.querySelector('main.icerik');
    if(!main) return;
    const sec=document.createElement('section');
    sec.className='gorunum';sec.id='gorunum-kasa';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Kasa</div><div class="sayfa-aciklama">Güncel hesap bakiyeleri ve son hareketler.</div></div></div><div class="bska-ust"><button id="bskaGeri" class="bska-geri" type="button">← Menü</button><button id="bskaTahsilat" class="bska-tahsilat" type="button">Tahsilat Gir</button></div><div id="bskaIcerik"><div class="ders-yukleniyor">Kasa yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bskaGeri').addEventListener('click',()=>gorunumeGit('menu'));
    document.getElementById('bskaTahsilat').addEventListener('click',()=>{
      const btn=[...document.querySelectorAll('button')].find(b=>/Tahsilat\s*Gir/i.test((b.textContent||'').trim())&&b.id!=='bskaTahsilat');
      if(btn) btn.click();
    });
  }

  function kisiAdi(h){
    if(!veri) return '';
    if(h.ogrenci_id) return veri.ogrenciMap.get(h.ogrenci_id)||'';
    if(h.ogretmen_id) return veri.ogretmenMap.get(h.ogretmen_id)||'';
    return '';
  }

  function hareketHTML(h){
    const gelir=h.hareket_turu==='Gelir';
    const ad=kisiAdi(h);
    const kaynak=[h.kaynak_turu||h.hareket_turu,ad].filter(Boolean).join(' • ');
    const detay=[h.aciklama,h.durum].filter(Boolean).join(' • ');
    return `<div class="bska-satir"><div class="bska-tarih">${htmlKacir(tarihKisa(h.tarih))}</div><div><div class="bska-kaynak">${htmlKacir(kaynak||'Kasa hareketi')}</div>${detay?`<div class="bska-detay">${htmlKacir(detay)}</div>`:''}</div><div class="bska-tutar ${gelir?'gelir':'gider'}">${gelir?'+':'−'}${htmlKacir(paraYaz(h.tutar))}</div></div>`;
  }

  function render(){
    const hedef=document.getElementById('bskaIcerik');
    if(!hedef||!veri) return;
    const hareketler=(veri.hareketler||[]).filter(h=>filtre==='Tümü'||h.hareket_turu===filtre);
    hedef.innerHTML=`<div class="bska-toplam"><span>Toplam Kasa Bakiyesi</span><strong>${htmlKacir(paraYaz(veri.toplam))}</strong></div><div class="bska-hesaplar">${(veri.hesaplar||[]).map(h=>`<div class="bska-hesap"><span>${htmlKacir(h.ad)}</span><strong>${htmlKacir(paraYaz(h.bakiye))}</strong><small>${htmlKacir(h.tur||h.banka||'Hesap')}</small></div>`).join('')}</div><div class="bska-filtre">${['Tümü','Gelir','Gider'].map(x=>`<button type="button" class="bska-chip ${filtre===x?'aktif':''}" data-bska-filtre="${x}">${x}</button>`).join('')}</div><div class="bska-liste"><div class="bska-baslik"><span>Son Hareketler</span><span>${hareketler.length} kayıt</span></div>${hareketler.length?hareketler.map(hareketHTML).join(''):'<div class="bos-durum">Hareket bulunamadı.</div>'}</div>`;
    hedef.querySelectorAll('[data-bska-filtre]').forEach(b=>b.addEventListener('click',()=>{filtre=b.dataset.bskaFiltre;render();}));
  }

  async function yukle(yenile=false){
    const hedef=document.getElementById('bskaIcerik');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Kasa yükleniyor…</div>';
    try{
      if(!window.BSFinansServisi) throw new Error('Finans servisi yüklenmedi.');
      if(!veri||yenile) veri=await BSFinansServisi.kasaDetayGetir(60);
      render();
    }catch(err){console.error('Kasa:',err);hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Kasa yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';}
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');
      if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik||baslik.textContent.trim()!=='Kasa') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('kasa');yukle(true);
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSKasaModuluV1={yukle};
})();