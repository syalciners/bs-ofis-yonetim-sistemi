(function(){
  if(window.BSOgretmenModuluV1) return;
  window.BSOgretmenModuluV1=true;

  let ozetCache=null;

  function stilEkle(){
    if(document.getElementById('bsOgretmenStil')) return;
    const s=document.createElement('style');
    s.id='bsOgretmenStil';
    s.textContent=`
      .bsog-geri{height:38px;padding:0 12px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:750;cursor:pointer}
      .bsog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
      .bsog-kart{padding:15px;border:1px solid var(--kenar);border-radius:16px;background:#fff;cursor:pointer;text-align:left;color:var(--yazi)}
      .bsog-kart:hover{border-color:#bfdbfe;box-shadow:0 10px 26px rgba(15,23,42,.05)}
      .bsog-ad{font-size:13px;font-weight:820;line-height:1.25}.bsog-rol{margin-top:3px;font-size:9px;color:var(--ikincil)}
      .bsog-kpiler{display:grid;grid-template-columns:1.35fr 1fr;gap:7px;margin-top:13px}.bsog-kpi{padding:9px 10px;border-radius:11px;background:#f8fafc}.bsog-kpi span{display:block;font-size:8.5px;color:var(--ikincil)}.bsog-kpi strong{display:block;margin-top:3px;font-size:13px;color:var(--yazi)}
      .bsog-modal{position:fixed;inset:0;z-index:978;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bsog-modal.acik{display:flex}
      .bsog-sheet{width:min(760px,100%);max-height:94dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bsog-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.bsog-baslik{font-size:20px;font-weight:850}.bsog-alt{margin-top:4px;font-size:10px;color:var(--ikincil)}.bsog-kapat{width:40px;height:40px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .bsog-ozet{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.bsog-ozet-kart{padding:12px;border:1px solid var(--kenar);border-radius:13px;background:#fff}.bsog-ozet-kart span{display:block;font-size:9px;color:var(--ikincil)}.bsog-ozet-kart strong{display:block;margin-top:4px;font-size:15px}
      .bsog-bolum{margin-top:12px;border:1px solid var(--kenar);border-radius:14px;background:#fff;overflow:hidden}.bsog-bolum-baslik{padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:800}.bsog-satir{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 13px;border-bottom:1px solid #f1f5f9}.bsog-satir:last-child{border-bottom:none}.bsog-saat{font-size:10px;font-weight:800;color:var(--mavi)}.bsog-ogr{font-size:10.5px;font-weight:760}.bsog-detay{margin-top:3px;font-size:9px;color:var(--ikincil)}.bsog-tutar{font-size:10px;font-weight:800;white-space:nowrap}.bsog-bos{padding:18px 13px;font-size:10px;color:var(--ikincil);text-align:center}
      .bsog-iletisim{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.bsog-iletisim a{padding:7px 9px;border:1px solid var(--kenar);border-radius:9px;background:#fff;color:var(--mavi);text-decoration:none;font-size:9.5px;font-weight:750}
      @media(max-width:850px){.bsog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.bsog-grid{grid-template-columns:1fr}.bsog-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bsog-ozet{grid-template-columns:repeat(3,1fr);gap:6px}.bsog-ozet-kart{padding:10px 8px}.bsog-ozet-kart strong{font-size:13px}.bsog-satir{grid-template-columns:58px minmax(0,1fr);position:relative;padding-right:76px}.bsog-tutar{position:absolute;right:12px;top:11px;font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function arayuzEkle(){
    if(document.getElementById('gorunum-ogretmenler')) return;
    const main=document.querySelector('main.icerik');
    if(!main) return;
    const sec=document.createElement('section');
    sec.className='gorunum';sec.id='gorunum-ogretmenler';
    sec.innerHTML=`<div class="sayfa-baslik-alani"><div><div class="sayfa-baslik">Öğretmenler</div><div class="sayfa-aciklama">Bu ayki gerçekleşen ders ve güncel hakediş özeti.</div></div><button id="bsOgretmenGeri" class="bsog-geri" type="button">← Menü</button></div><div id="bsOgretmenListe"><div class="ders-yukleniyor">Öğretmenler yükleniyor…</div></div>`;
    main.appendChild(sec);
    document.getElementById('bsOgretmenGeri').addEventListener('click',()=>gorunumeGit('menu'));

    const m=document.createElement('div');m.id='bsOgretmenModal';m.className='bsog-modal';
    m.innerHTML='<div class="bsog-sheet"><div class="bsog-ust"><div><div id="bsOgretmenModalBaslik" class="bsog-baslik">Öğretmen</div><div id="bsOgretmenModalAlt" class="bsog-alt">Detaylar yükleniyor…</div></div><button id="bsOgretmenKapat" class="bsog-kapat" type="button">×</button></div><div id="bsOgretmenModalIcerik"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('acik');});
    document.getElementById('bsOgretmenKapat').addEventListener('click',()=>m.classList.remove('acik'));
  }

  function listeHTML(o){
    return `<button class="bsog-kart" type="button" data-bsog-id="${htmlKacir(o.ogretmen_id)}"><div class="bsog-ad">${htmlKacir(o.ad_soyad)}</div><div class="bsog-rol">${htmlKacir(o.durum||'Aktif')}</div><div class="bsog-kpiler"><div class="bsog-kpi"><span>Bu Ay Hakediş</span><strong>${htmlKacir(paraYaz(o.hakedis))}</strong></div><div class="bsog-kpi"><span>Ders Birimi</span><strong>${htmlKacir(Number(o.ders_birimi||0).toLocaleString('tr-TR'))}</strong></div></div></button>`;
  }

  async function listeYukle(yenile=false){
    const hedef=document.getElementById('bsOgretmenListe');
    if(!hedef) return;
    hedef.innerHTML='<div class="ders-yukleniyor">Öğretmenler yükleniyor…</div>';
    try{
      if(!window.BSOgretmenServisi) throw new Error('Öğretmen servisi yüklenmedi.');
      if(!ozetCache||yenile) ozetCache=await BSOgretmenServisi.aylikOzetGetir();
      const liste=ozetCache.ogretmenler||[];
      hedef.innerHTML=liste.length?`<div class="bsog-grid">${liste.map(listeHTML).join('')}</div>`:'<div class="bos-durum">Aktif öğretmen bulunamadı.</div>';
      hedef.querySelectorAll('[data-bsog-id]').forEach(b=>b.addEventListener('click',()=>detayAc(b.dataset.bsogId)));
    }catch(err){console.error('Öğretmen listesi:',err);hedef.innerHTML='<div class="bos-durum"><div class="bos-durum-baslik">Öğretmenler yüklenemedi</div><div class="bos-durum-aciklama">Bağlantı veya erişim yetkisi kontrol edilmeli.</div></div>';}
  }

  function dersSatir(d,ref,hakedisGoster){
    const ogr=ref.ogrenciMap.get(d.ogrenci_id)||'Öğrenci';
    const br=ref.bransMap.get(d.brans_id)||'Branş';
    const yer=(ref.derslikMap.get(d.derslik_id)||{}).mekan_adi||'Yer';
    return `<div class="bsog-satir"><div class="bsog-saat">${htmlKacir(tarihKisa(d.tarih))}<br>${htmlKacir(saatKisalt(d.baslangic_saati))}</div><div><div class="bsog-ogr">${htmlKacir(ogr)}</div><div class="bsog-detay">${htmlKacir(br)} • ${htmlKacir(yer)} • ${htmlKacir(d.ders_durumu||'')}</div></div>${hakedisGoster?`<div class="bsog-tutar">${htmlKacir(paraYaz(d.ogretmen_toplam_hakedis))}</div>`:''}</div>`;
  }

  async function detayAc(id){
    const modal=document.getElementById('bsOgretmenModal'),icerik=document.getElementById('bsOgretmenModalIcerik');
    modal.classList.add('acik');icerik.innerHTML='<div class="ders-yukleniyor">Bilgiler yükleniyor…</div>';
    document.getElementById('bsOgretmenModalBaslik').textContent='Öğretmen';document.getElementById('bsOgretmenModalAlt').textContent='Detaylar yükleniyor…';
    try{
      const r=await BSOgretmenServisi.detayGetir(id),p=r.profil,o=r.ozet,ref=r.referanslar;
      document.getElementById('bsOgretmenModalBaslik').textContent=p.ad_soyad||'Öğretmen';
      document.getElementById('bsOgretmenModalAlt').textContent=p.branslar||p.rol||'Aktif öğretmen';
      const iletisim=[p.telefon?`<a href="tel:${htmlKacir(p.telefon)}">Ara</a>`:'',p.email?`<a href="mailto:${htmlKacir(p.email)}">E-posta</a>`:''].join('');
      const hafta=(r.haftaDersleri||[]).filter(d=>!['İptal','Ertelendi','Öğretmen İptali'].includes(d.ders_durumu));
      icerik.innerHTML=`<div class="bsog-ozet"><div class="bsog-ozet-kart"><span>Bu Ay Hakediş</span><strong>${htmlKacir(paraYaz(o.hakedis))}</strong></div><div class="bsog-ozet-kart"><span>Ders Birimi</span><strong>${htmlKacir(Number(o.ders_birimi||0).toLocaleString('tr-TR'))}</strong></div><div class="bsog-ozet-kart"><span>Bu Hafta</span><strong>${htmlKacir(hafta.length)} ders</strong></div></div>${iletisim?`<div class="bsog-iletisim">${iletisim}</div>`:''}<section class="bsog-bolum"><div class="bsog-bolum-baslik">Bu Haftaki Program</div>${hafta.length?hafta.map(d=>dersSatir(d,ref,false)).join(''):'<div class="bsog-bos">Bu hafta planlı ders yok.</div>'}</section><section class="bsog-bolum"><div class="bsog-bolum-baslik">Bu Ay Yapılan Dersler</div>${r.yapilan.length?r.yapilan.map(d=>dersSatir(d,ref,true)).join(''):'<div class="bsog-bos">Bu ay yapılmış ders yok.</div>'}</section>`;
    }catch(err){console.error('Öğretmen detay:',err);icerik.innerHTML='<div class="bos-durum">Öğretmen bilgileri yüklenemedi.</div>';}
  }

  function menuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest('.modul-kart');
      if(!kart) return;
      const baslik=kart.querySelector('.modul-baslik');
      if(!baslik||baslik.textContent.trim()!=='Öğretmenler') return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      gorunumeGit('ogretmenler');listeYukle();
    },true);
  }

  function baslat(){stilEkle();arayuzEkle();menuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
