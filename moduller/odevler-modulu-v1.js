(function(){
  if(window.BSOdevlerModuluV1) return;
  window.BSOdevlerModuluV1=true;

  let veri=null,filtre='Açık',arama='';

  function stilEkle(){
    if(document.getElementById('bsOdevStil')) return;
    const s=document.createElement('style');s.id='bsOdevStil';
    s.textContent=`
      .bsod-ust{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}.bsod-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:760;cursor:pointer}.bsod-arama{flex:1;min-width:220px;height:40px;border:1px solid var(--kenar);border-radius:11px;background:#fff;padding:0 12px;font:inherit;font-size:12px;outline:none}
      .bsod-filtre{display:flex;gap:6px;overflow:auto;margin-bottom:10px}.bsod-chip{height:34px;padding:0 11px;border:1px solid var(--kenar);border-radius:999px;background:#fff;color:var(--ikincil);font-size:9.5px;font-weight:760;cursor:pointer;white-space:nowrap}.bsod-chip.aktif{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8}
      .bsod-liste{display:grid;gap:8px}.bsod-kart{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:13px;border:1px solid var(--kenar);border-radius:14px;background:#fff;text-align:left;color:var(--yazi);cursor:pointer}.bsod-ad{font-size:11.5px;font-weight:820}.bsod-konu{margin-top:3px;font-size:10px;color:var(--ikincil);line-height:1.4}.bsod-meta{display:flex;flex-wrap:wrap;gap:4px 9px;margin-top:7px;font-size:9px;color:var(--ikincil)}.bsod-rozet{align-self:start;padding:6px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:8.5px;font-weight:800;white-space:nowrap}.bsod-rozet.gecikti{background:#fef2f2;color:#b91c1c}.bsod-rozet.tamam{background:#f0fdf4;color:#15803d}
      .bsod-modal{position:fixed;inset:0;z-index:979;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bsod-modal.acik{display:flex}.bsod-sheet{width:min(680px,100%);max-height:92dvh;overflow:auto;background:#f8fafc;border-radius:24px 24px 0 0;padding:17px 17px calc(22px + env(safe-area-inset-bottom))}.bsod-baslik{font-size:19px;font-weight:850}.bsod-alt{margin-top:4px;font-size:10px;color:var(--ikincil)}.bsod-kapat{width:40px;height:40px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}.bsod-modal-ust{display:flex;justify-content:space-between;gap:12px}.bsod-blok{margin-top:12px;padding:13px;border:1px solid var(--kenar);border-radius:13px;background:#fff}.bsod-label{font-size:8.5px;color:var(--ikincil);font-weight:760;text-transform:uppercase;letter-spacing:.03em}.bsod-deger{margin-top:4px;font-size:11px;line-height:1.55;color:var(--yazi)}.bsod-linkler{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.bsod-linkler a{padding:8px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:9.5px;font-weight:780}
      @media(max-width:640px){.bsod-ust{align-items:stretch}.bsod-arama{min-width:0;order:3;width:100%}.bsod-kart{padding:11px}.bsod-sheet{padding:14px 11px calc(18px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0}}
    `;document.head.appendChild(s);
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-odevler')) return;
    const main=document.querySelector('main.icerik');if(!main) return;
    const sec=document.createElement('section');sec.className='gorunum';sec.id='gorunum-odevler';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Ödevler</div><div class="sayfa-aciklama">Verilen ödevleri ve teslim durumunu hızlıca takip edin.</div></div></div><div class="bsod-ust"><button id="bsodGeri" class="bsod-geri" type="button">← Menü</button><input id="bsodArama" class="bsod-arama" placeholder="Öğrenci, öğretmen veya konu ara"></div><div class="bsod-filtre">${['Açık','Tümü','Tamamlandı'].map(x=>`<button class="bsod-chip ${x==='Açık'?'aktif':''}" data-bsod-filtre="${x}" type="button">${x}</button>`).join('')}</div><div id="bsodListe"><div class="ders-yukleniyor">Ödevler yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsodGeri').addEventListener('click',()=>gorunumeGit('menu'));
    document.getElementById('bsodArama').addEventListener('input',e=>{arama=e.target.value||'';render();});
    sec.querySelectorAll('[data-bsod-filtre]').forEach(b=>b.addEventListener('click',()=>{filtre=b.dataset.bsodFiltre;sec.querySelectorAll('[data-bsod-filtre]').forEach(x=>x.classList.toggle('aktif',x===b));render();}));

    const m=document.createElement('div');m.id='bsOdevModal';m.className='bsod-modal';m.innerHTML='<div class="bsod-sheet"><div class="bsod-modal-ust"><div><div id="bsodModalBaslik" class="bsod-baslik">Ödev</div><div id="bsodModalAlt" class="bsod-alt"></div></div><button id="bsodKapat" class="bsod-kapat" type="button">×</button></div><div id="bsodModalIcerik"></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('acik');});document.getElementById('bsodKapat').addEventListener('click',()=>m.classList.remove('acik'));
  }

  function tamamMi(o){return ['Tamamlandı','Teslim Edildi','Kontrol Edildi'].includes(o.durum);}
  function geciktiMi(o){return !tamamMi(o)&&o.son_teslim_tarihi&&String(o.son_teslim_tarihi).slice(0,10)<istanbulBugunISO();}
  function urlGuvenli(v){try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(e){return '';}}

  function kartHTML(o){
    const ref=veri.referanslar,ogr=ref.ogrenciMap.get(o.ogrenci_id)||'Öğrenci',ogrt=ref.ogretmenMap.get(o.ogretmen_id)||'Öğretmen';
    const r=tamamMi(o)?'Tamamlandı':geciktiMi(o)?'Gecikti':(o.durum||'Verildi');
    const cls=tamamMi(o)?'tamam':geciktiMi(o)?'gecikti':'';
    return `<button class="bsod-kart" data-bsod-id="${htmlKacir(o.odev_id)}" type="button"><div><div class="bsod-ad">${htmlKacir(ogr)}</div><div class="bsod-konu">${htmlKacir(o.odev_basligi||o.konu||'Ödev')}</div><div class="bsod-meta"><span>${htmlKacir(ogrt)}</span><span>Veriliş ${htmlKacir(tarihKisa(o.verilis_tarihi))}</span>${o.son_teslim_tarihi?`<span>Son ${htmlKacir(tarihKisa(o.son_teslim_tarihi))}</span>`:''}</div></div><span class="bsod-rozet ${cls}">${htmlKacir(r)}</span></button>`;
  }

  function render(){
    const hedef=document.getElementById('bsodListe');if(!hedef||!veri) return;
    const q=arama.toLocaleLowerCase('tr-TR').trim();
    const ref=veri.referanslar;
    let l=(veri.kayitlar||[]).filter(o=>{
      if(filtre==='Açık'&&tamamMi(o)) return false;
      if(filtre==='Tamamlandı'&&!tamamMi(o)) return false;
      if(!q) return true;
      const metin=[ref.ogrenciMap.get(o.ogrenci_id),ref.ogretmenMap.get(o.ogretmen_id),o.konu,o.odev_basligi,o.odev_aciklamasi].join(' ').toLocaleLowerCase('tr-TR');
      return metin.includes(q);
    });
    hedef.innerHTML=l.length?`<div class="bsod-liste">${l.map(kartHTML).join('')}</div>`:'<div class="bos-durum"><div class="bos-durum-baslik">Ödev bulunamadı</div></div>';
    hedef.querySelectorAll('[data-bsod-id]').forEach(b=>b.addEventListener('click',()=>detayAc(b.dataset.bsodId)));
  }

  async function detayAc(id){
    const m=document.getElementById('bsOdevModal'),ic=document.getElementById('bsodModalIcerik');m.classList.add('acik');ic.innerHTML='<div class="ders-yukleniyor">Ödev yükleniyor…</div>';
    try{
      const r=await BSOdevServisi.detayGetir(id),o=r.kayit,ref=r.referanslar,ogr=ref.ogrenciMap.get(o.ogrenci_id)||'Öğrenci',ogrt=ref.ogretmenMap.get(o.ogretmen_id)||'Öğretmen';
      document.getElementById('bsodModalBaslik').textContent=o.odev_basligi||o.konu||'Ödev';document.getElementById('bsodModalAlt').textContent=ogr+' • '+ogrt;
      const dosya=urlGuvenli(o.odev_dosya_linki),foto=urlGuvenli(o.odev_fotograf_linki);
      ic.innerHTML=`<div class="bsod-blok"><div class="bsod-label">Durum</div><div class="bsod-deger">${htmlKacir(o.durum||'Verildi')} • ${htmlKacir(tarihKisa(o.verilis_tarihi))}${o.son_teslim_tarihi?' → '+htmlKacir(tarihKisa(o.son_teslim_tarihi)):''}</div></div>${o.odev_aciklamasi?`<div class="bsod-blok"><div class="bsod-label">Ödev Açıklaması</div><div class="bsod-deger">${htmlKacir(o.odev_aciklamasi)}</div></div>`:''}${o.ogretmen_notu?`<div class="bsod-blok"><div class="bsod-label">Öğretmen Notu</div><div class="bsod-deger">${htmlKacir(o.ogretmen_notu)}</div></div>`:''}${o.puan?`<div class="bsod-blok"><div class="bsod-label">Puan</div><div class="bsod-deger">${htmlKacir(o.puan)}</div></div>`:''}<div class="bsod-linkler">${dosya?`<a href="${htmlKacir(dosya)}" target="_blank" rel="noopener">Ödev Dosyasını Aç</a>`:''}${foto?`<a href="${htmlKacir(foto)}" target="_blank" rel="noopener">Fotoğrafı Aç</a>`:''}</div>`;
    }catch(err){console.error('Ödev detay:',err);ic.innerHTML='<div class="bos-durum">Ödev yüklenemedi.</div>';}
  }

  async function yukle(yenile=false){
    const hedef=document.getElementById('bsodListe');if(!hedef) return;hedef.innerHTML='<div class="ders-yukleniyor">Ödevler yükleniyor…</div>';
    try{if(!veri||yenile) veri=await BSOdevServisi.listeGetir();render();}catch(err){console.error('Ödevler:',err);hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Ödevler yüklenemedi</div></div>';}
  }

  function menuBagla(){document.addEventListener('click',e=>{const kart=e.target.closest('.modul-kart');if(!kart) return;const b=kart.querySelector('.modul-baslik');if(!b||b.textContent.trim()!=='Ödevler') return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();gorunumeGit('odevler');yukle(true);},true);}
  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
  window.BSOdevlerModuluV1={yukle};
})();