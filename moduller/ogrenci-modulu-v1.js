(function(){
  if(window.BSOgrenciModuluV1) return;

  let referans=null;
  let aktifOgrenciId='';
  let hazir=false;
  let sayfaKilitli=false;
  let sayfaScrollY=0;
  let oncekiSayfaStili=null;

  function norm(v){return String(v||'').trim().toLocaleLowerCase('tr-TR');}
  function bosIseNull(v){v=String(v||'').trim();return v===''?null:v;}

  function sayfaKilitle(){
    if(sayfaKilitli) return;
    sayfaKilitli=true;
    sayfaScrollY=window.scrollY||window.pageYOffset||0;
    oncekiSayfaStili={
      htmlOverflow:document.documentElement.style.overflow,
      bodyPosition:document.body.style.position,
      bodyTop:document.body.style.top,
      bodyLeft:document.body.style.left,
      bodyRight:document.body.style.right,
      bodyWidth:document.body.style.width,
      bodyOverflow:document.body.style.overflow
    };
    document.documentElement.style.overflow='hidden';
    document.body.style.position='fixed';
    document.body.style.top=`-${sayfaScrollY}px`;
    document.body.style.left='0';
    document.body.style.right='0';
    document.body.style.width='100%';
    document.body.style.overflow='hidden';
  }

  function sayfaKilidiniAc(){
    if(!sayfaKilitli) return;
    if(document.querySelector('#bsOgrenciDetayModal.acik,#bsOgrenciEditModal.acik')) return;
    const y=sayfaScrollY,p=oncekiSayfaStili||{};
    sayfaKilitli=false;
    document.documentElement.style.overflow=p.htmlOverflow||'';
    document.body.style.position=p.bodyPosition||'';
    document.body.style.top=p.bodyTop||'';
    document.body.style.left=p.bodyLeft||'';
    document.body.style.right=p.bodyRight||'';
    document.body.style.width=p.bodyWidth||'';
    document.body.style.overflow=p.bodyOverflow||'';
    oncekiSayfaStili=null;
    requestAnimationFrame(()=>window.scrollTo(0,y));
  }

  function detayKapat(){
    document.getElementById('bsOgrenciDetayModal')?.classList.remove('acik');
    requestAnimationFrame(sayfaKilidiniAc);
  }

  function stilEkle(){
    if(document.getElementById('bsOgrenciModulStil')) return;
    const s=document.createElement('style');
    s.id='bsOgrenciModulStil';
    s.textContent=`
      .bsogr-clickable{cursor:pointer!important;position:relative;padding-right:44px!important;touch-action:manipulation;-webkit-tap-highlight-color:rgba(37,99,235,.08)}
      .bsogr-clickable:active{background:#eff6ff!important}
      .bsogr-chevron{position:absolute;right:15px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:23px;pointer-events:none}
      .bsogr-modal{position:fixed;inset:0;z-index:900;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
      .bsogr-modal.acik{display:flex}
      .bsogr-sheet{width:min(780px,100%);max-height:91dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.2)}
      .bsogr-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      .bsogr-baslik{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}
      .bsogr-meta{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px 10px;color:var(--ikincil);font-size:10.5px}
      .bsogr-aksiyon{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .bsogr-duzenle{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .bsogr-duzenle:active{transform:scale(.98);background:#dbeafe}
      .bsogr-duzenle svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .bsogr-kapat{width:48px;height:48px;flex:0 0 48px;border:1px solid var(--kenar);border-radius:13px;background:#fff;color:var(--ikincil);font-size:24px;cursor:pointer;touch-action:manipulation}
      .bsogr-bilgi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:11px}.bsogr-bilgi>div{min-width:0;padding:11px 12px;border:1px solid var(--kenar);border-radius:13px;background:#fff}.bsogr-bilgi span{display:block;color:var(--ikincil);font-size:8.5px;font-weight:760;text-transform:uppercase;letter-spacing:.02em}.bsogr-bilgi strong{display:block;margin-top:5px;color:var(--yazi);font-size:10.5px;font-weight:760;line-height:1.4;overflow-wrap:anywhere}.bsogr-bilgi .tam{grid-column:1/-1}
      .bsogr-sonraki{margin-bottom:10px;padding:13px 14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1e40af}.bsogr-sonraki small{display:block;font-size:9px;font-weight:800;text-transform:uppercase}.bsogr-sonraki strong{display:block;margin-top:5px;font-size:12px}.bsogr-sonraki div{margin-top:4px;font-size:9.5px;color:#3b5da8}
      .bsogr-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.bsogr-kpi>div{padding:12px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.bsogr-kpi span{display:block;color:var(--ikincil);font-size:9px;font-weight:700}.bsogr-kpi strong{display:block;margin-top:7px;font-size:17px;color:var(--yazi);font-weight:850}.bsogr-borc strong{color:var(--kirmizi)}.bsogr-alacak strong{color:var(--yesil)}
      .bsogr-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bsogr-kart{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:#fff}.bsogr-kart-baslik{padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:820}.bsogr-satir{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 12px;border-bottom:1px solid #f1f5f9}.bsogr-satir:last-child{border-bottom:none}.bsogr-tarih{padding:7px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:9px;font-weight:800}.bsogr-ad2{font-size:10px;font-weight:800}.bsogr-detay{margin-top:3px;color:var(--ikincil);font-size:8.7px;line-height:1.35}.bsogr-rozet{padding:5px 7px;border-radius:999px;background:var(--mavi-acik);color:var(--mavi);font-size:8px;font-weight:800;white-space:nowrap}.bsogr-tutar{font-size:10.5px;font-weight:850;color:var(--yesil);white-space:nowrap}.bsogr-bos{padding:20px 14px;text-align:center;color:var(--ikincil);font-size:10px}
      .bsogr-detay-alt{display:flex;justify-content:flex-end;margin-top:14px}.bsogr-detay-sil{min-height:48px;padding:0 16px;border:1px solid #fecaca;border-radius:12px;background:#fff;color:#b91c1c;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .bsogr-edit-modal{position:fixed;inset:0;z-index:980;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      .bsogr-edit-modal.acik{display:flex}
      .bsogr-edit-sheet{width:min(720px,100%);max-height:94dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bsogr-edit-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.4}
      .bsogr-form{display:grid;grid-template-columns:1fr 1fr;gap:11px}.bsogr-alan{display:flex;flex-direction:column;gap:6px}.bsogr-alan.tam{grid-column:1/-1}.bsogr-alan label{font-size:10px;font-weight:780;color:var(--ikincil)}
      .bsogr-alan input,.bsogr-alan select,.bsogr-alan textarea{width:100%;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--yazi);font:inherit;font-size:16px;outline:none;padding:11px 12px}.bsogr-alan input,.bsogr-alan select{height:48px}.bsogr-alan textarea{min-height:92px;resize:vertical;line-height:1.45}
      .bsogr-alan input:focus,.bsogr-alan select:focus,.bsogr-alan textarea:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .bsogr-form-buton{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.bsogr-iptal,.bsogr-kaydet,.bsogr-sil{min-height:50px;padding:0 17px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer;touch-action:manipulation}.bsogr-iptal{border:1px solid var(--kenar);background:#fff;color:var(--ikincil)}.bsogr-kaydet{border:1px solid var(--mavi);background:var(--mavi);color:#fff;min-width:120px}.bsogr-sil{margin-right:auto;border:1px solid #fecaca;background:#fff;color:#b91c1c}.bsogr-kaydet[disabled],.bsogr-sil[disabled],.bsogr-detay-sil[disabled]{opacity:.55;cursor:default}
      .bsogr-mesaj{display:none;margin-top:12px;padding:10px 12px;border-radius:11px;font-size:10.5px;line-height:1.45}.bsogr-mesaj.hata{display:block;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}.bsogr-mesaj.basari{display:block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
      @media(max-width:700px){.bsogr-sheet,.bsogr-edit-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bsogr-baslik{font-size:18px}.bsogr-duzenle{min-height:48px;padding:0 12px;font-size:10.5px}.bsogr-kapat{width:48px;height:48px;flex-basis:48px}.bsogr-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.bsogr-grid{grid-template-columns:1fr}.bsogr-satir{grid-template-columns:54px minmax(0,1fr) auto;padding:10px}.bsogr-form{grid-template-columns:1fr;gap:9px}.bsogr-alan.tam{grid-column:auto}.bsogr-form-buton{position:sticky;bottom:0;margin:14px -2px -2px;padding:10px 2px calc(2px + env(safe-area-inset-bottom));background:linear-gradient(to top,#f8fafc 82%,rgba(248,250,252,0));display:grid;grid-template-columns:1fr 1fr}.bsogr-sil{grid-column:1/-1;margin-right:0}.bsogr-iptal,.bsogr-kaydet,.bsogr-sil{min-height:52px;width:100%}.bsogr-detay-sil{min-height:52px;width:100%}}
    `;
    document.head.appendChild(s);
  }

  function modalleriHazirla(){
    if(!document.getElementById('bsOgrenciDetayModal')){
      const m=document.createElement('div');m.id='bsOgrenciDetayModal';m.className='bsogr-modal';
      m.innerHTML='<div class="bsogr-sheet"><div class="bsogr-ust"><div><div id="bsOgrenciAd" class="bsogr-baslik">Öğrenci</div><div id="bsOgrenciMeta" class="bsogr-meta"></div></div><div class="bsogr-aksiyon"><button id="bsOgrenciDuzenle" class="bsogr-duzenle" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg><span>Düzenle</span></button><button id="bsOgrenciKapat" class="bsogr-kapat" type="button" aria-label="Kapat">×</button></div></div><div id="bsOgrenciIcerik"><div class="bsogr-bos">Yükleniyor…</div></div><div class="bsogr-detay-alt"><button id="bsOgrenciDetaySil" class="bsogr-detay-sil" type="button">Öğrenciyi Sil</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click',e=>{if(e.target===m)detayKapat();});
      document.getElementById('bsOgrenciKapat').addEventListener('click',detayKapat);
      document.getElementById('bsOgrenciDuzenle').addEventListener('click',duzenleAc);
      document.getElementById('bsOgrenciDetaySil').addEventListener('click',ogrenciSil);
    }

    if(!document.getElementById('bsOgrenciEditModal')){
      const e=document.createElement('div');e.id='bsOgrenciEditModal';e.className='bsogr-edit-modal';
      e.innerHTML=`<div class="bsogr-edit-sheet"><div class="bsogr-ust"><div><div class="bsogr-baslik">Öğrenci Bilgilerini Düzenle</div><div class="bsogr-edit-alt">Temel öğrenci, veli ve iletişim bilgileri.</div></div><button id="bsOgrenciEditKapat" class="bsogr-kapat" type="button" aria-label="Kapat">×</button></div><form id="bsOgrenciForm" autocomplete="off"><div class="bsogr-form"><div class="bsogr-alan tam"><label for="bsOgrAdSoyad">Ad Soyad</label><input id="bsOgrAdSoyad" required maxlength="160"></div><div class="bsogr-alan"><label for="bsOgrVeliAdi">Veli Ad Soyad</label><input id="bsOgrVeliAdi" maxlength="160"></div><div class="bsogr-alan"><label for="bsOgrDurum">Durum</label><select id="bsOgrDurum"><option value="Aktif">Aktif</option><option value="Pasif">Pasif</option></select></div><div class="bsogr-alan"><label for="bsOgrVeliTelefon">Veli Telefon</label><input id="bsOgrVeliTelefon" type="tel" inputmode="tel" maxlength="40"></div><div class="bsogr-alan"><label for="bsOgrTelefon">Öğrenci Telefon</label><input id="bsOgrTelefon" type="tel" inputmode="tel" maxlength="40"></div><div class="bsogr-alan"><label for="bsOgrEmail">E-posta</label><input id="bsOgrEmail" type="email" inputmode="email" maxlength="180"></div><div class="bsogr-alan"><label for="bsOgrKayit">Kayıt Tarihi</label><input id="bsOgrKayit" type="date"></div><div class="bsogr-alan tam"><label for="bsOgrNot">Not</label><textarea id="bsOgrNot" maxlength="2000"></textarea></div></div><div id="bsOgrMesaj" class="bsogr-mesaj"></div><div class="bsogr-form-buton"><button id="bskOgrenciSil" class="bsogr-sil" type="button">Sil</button><button id="bsOgrVazgec" class="bsogr-iptal" type="button">Vazgeç</button><button id="bsOgrKaydet" class="bsogr-kaydet" type="submit">Kaydet</button></div></form></div>`;
      document.body.appendChild(e);
      e.addEventListener('click',ev=>{if(ev.target===e)editKapat();});
      document.getElementById('bsOgrenciEditKapat').addEventListener('click',editKapat);
      document.getElementById('bsOgrVazgec').addEventListener('click',editKapat);
      document.getElementById('bskOgrenciSil').addEventListener('click',ogrenciSil);
      document.getElementById('bsOgrenciForm').addEventListener('submit',kaydet);
    }
  }

  function mesaj(metin,tur){const el=document.getElementById('bsOgrMesaj');el.textContent=metin||'';el.className='bsogr-mesaj'+(tur?' '+tur:'');}

  function editKapat(){
    document.getElementById('bsOgrenciEditModal')?.classList.remove('acik');
    mesaj('','');
    requestAnimationFrame(sayfaKilidiniAc);
  }

  function ogrenciBulKart(kart){
    if(!referans) return null;
    const id=kart.dataset.ogrenciId;
    if(id){const x=referans.ogrenciler.find(o=>o.ogrenci_id===id);if(x)return x;}
    const ad=norm(kart.querySelector('.v207-ogrenci-ad')?.textContent);
    return referans.ogrenciler.find(o=>norm(o.ad_soyad)===ad)||null;
  }

  function kartlariHazirla(){
    if(!hazir) return;
    document.querySelectorAll('.v207-ogrenci-kart').forEach(k=>{
      const o=ogrenciBulKart(k);if(!o)return;
      k.dataset.ogrenciId=o.ogrenci_id;k.classList.add('bsogr-clickable');
      if(!k.querySelector('.bsogr-chevron')){const c=document.createElement('span');c.className='bsogr-chevron';c.textContent='›';k.appendChild(c);}
    });
  }

  function kartGuncelle(o){
    const kart=[...document.querySelectorAll('.v207-ogrenci-kart')].find(k=>k.dataset.ogrenciId===o.ogrenci_id);
    if(!kart) return;
    const ad=kart.querySelector('.v207-ogrenci-ad');if(ad)ad.textContent=o.ad_soyad||'Öğrenci';
    const detay=kart.querySelector('.bsogr-list-detay');
    if(detay){const tel=o.ogrenci_telefon||o.veli_telefon||'';const alt=[o.veli_adi?('Veli: '+o.veli_adi):'',tel,o.email||''].filter(Boolean);detay.innerHTML=alt.map(x=>'<span>'+htmlKacir(x)+'</span>').join('');}
    const rozet=kart.querySelector('.bsogr-list-rozet');if(rozet){const pasif=norm(o.durum)==='pasif';rozet.textContent=o.durum||'Aktif';rozet.classList.toggle('pasif',pasif);}
  }

  function bilgiHtml(profil){
    const satirlar=[
      ['Veli',profil.veli_adi||'—',''],
      ['Veli Telefon',profil.veli_telefon||'—',''],
      ['Öğrenci Telefon',profil.ogrenci_telefon||'—',''],
      ['E-posta',profil.email||'—',''],
      ['Not',profil.notlar||'—','tam']
    ];
    return '<div class="bsogr-bilgi">'+satirlar.map(x=>'<div class="'+x[2]+'"><span>'+htmlKacir(x[0])+'</span><strong>'+htmlKacir(x[1])+'</strong></div>').join('')+'</div>';
  }

  async function detayAc(o){
    aktifOgrenciId=o.ogrenci_id;
    const modal=document.getElementById('bsOgrenciDetayModal'),icerik=document.getElementById('bsOgrenciIcerik');
    document.getElementById('bsOgrenciAd').textContent=o.ad_soyad||'Öğrenci';
    document.getElementById('bsOgrenciMeta').innerHTML=[o.durum||'',o.veli_adi?('Veli: '+o.veli_adi):''].filter(Boolean).map(x=>'<span>'+htmlKacir(x)+'</span>').join('');
    icerik.innerHTML='<div class="bsogr-bos">Öğrenci bilgileri yükleniyor…</div>';
    modal.classList.add('acik');sayfaKilitle();
    try{
      const [profil,sonuc]=await Promise.all([BSOgrenciServisi.ogrenciGetir(o.ogrenci_id),BSOgrenciServisi.ogrenciDetayGetir(o.ogrenci_id)]);
      document.getElementById('bsOgrenciAd').textContent=profil.ad_soyad||'Öğrenci';
      document.getElementById('bsOgrenciMeta').innerHTML=[profil.durum||'',profil.kayit_tarihi?('Kayıt: '+tarihKisa(profil.kayit_tarihi)):''].filter(Boolean).map(x=>'<span>'+htmlKacir(x)+'</span>').join('');
      const dersler=sonuc.dersler,tahsilatlar=sonuc.tahsilatlar,yapilan=dersler.filter(x=>x.ders_durumu==='Yapıldı');
      const dersTutari=yapilan.reduce((t,x)=>t+(Number(x.ogrenci_toplam_tutar)||0),0),tahsil=tahsilatlar.reduce((t,x)=>t+(Number(x.tutar)||0),0),kalan=dersTutari-tahsil;
      const bugun=istanbulBugunISO();
      const sonraki=dersler.filter(x=>String(x.tarih).slice(0,10)>=bugun&&!['İptal','Ertelendi','Öğretmen İptali'].includes(x.ders_durumu)).sort((a,b)=>(String(a.tarih)+String(a.baslangic_saati)).localeCompare(String(b.tarih)+String(b.baslangic_saati)))[0];
      const sonrakiHtml=sonraki?'<div class="bsogr-sonraki"><small>Sıradaki Ders</small><strong>'+htmlKacir(tarihKisa(sonraki.tarih))+' • '+htmlKacir(saatKisalt(sonraki.baslangic_saati))+'–'+htmlKacir(saatKisalt(sonraki.bitis_saati))+'</strong><div>'+htmlKacir(referans.ogretmenMap.get(sonraki.ogretmen_id)||'Öğretmen')+' • '+htmlKacir(referans.bransMap.get(sonraki.brans_id)||'Branş')+'</div></div>':'';
      const kalanSinif=kalan>0.009?'bsogr-borc':(kalan<-.009?'bsogr-alacak':'');
      const kalanAd=kalan>0.009?'Kalan Borç':(kalan<-.009?'Ön Ödeme':'Bakiye');
      const dersHtml=dersler.slice(0,6).map(x=>'<div class="bsogr-satir"><div class="bsogr-tarih">'+htmlKacir(tarihKisa(x.tarih).slice(0,5))+'<br>'+htmlKacir(saatKisalt(x.baslangic_saati))+'</div><div><div class="bsogr-ad2">'+htmlKacir(referans.bransMap.get(x.brans_id)||'Ders')+'</div><div class="bsogr-detay">'+htmlKacir(referans.ogretmenMap.get(x.ogretmen_id)||'Öğretmen')+(x.ders_durumu==='Yapıldı'?' • '+htmlKacir(paraYaz(x.ogrenci_toplam_tutar||0)):'')+'</div></div><span class="bsogr-rozet">'+htmlKacir(x.ders_durumu||'—')+'</span></div>').join('')||'<div class="bsogr-bos">Ders kaydı yok.</div>';
      const odHtml=tahsilatlar.slice(0,5).map(x=>'<div class="bsogr-satir"><div class="bsogr-tarih">'+htmlKacir(tarihKisa(x.tarih).slice(0,5))+'</div><div><div class="bsogr-ad2">'+htmlKacir(x.odeme_yontemi||'Tahsilat')+'</div><div class="bsogr-detay">'+htmlKacir(x.aciklama||'')+'</div></div><span class="bsogr-tutar">'+htmlKacir(paraYaz(x.tutar||0))+'</span></div>').join('')||'<div class="bsogr-bos">Tahsilat kaydı yok.</div>';
      icerik.innerHTML=bilgiHtml(profil)+sonrakiHtml+'<div class="bsogr-kpi"><div><span>Yapılan Ders</span><strong>'+yapilan.length+'</strong></div><div><span>Ders Tutarı</span><strong>'+htmlKacir(paraYaz(dersTutari))+'</strong></div><div><span>Toplam Tahsilat</span><strong>'+htmlKacir(paraYaz(tahsil))+'</strong></div><div class="'+kalanSinif+'"><span>'+kalanAd+'</span><strong>'+htmlKacir(paraYaz(Math.abs(kalan)))+'</strong></div></div><div class="bsogr-grid"><section class="bsogr-kart"><div class="bsogr-kart-baslik">Son Dersler</div>'+dersHtml+'</section><section class="bsogr-kart"><div class="bsogr-kart-baslik">Son Tahsilatlar</div>'+odHtml+'</section></div>';
    }catch(err){console.error('Öğrenci modülü detay:',err);icerik.innerHTML='<div class="bsogr-bos">Öğrenci detayları yüklenemedi.</div>';}
  }

  async function duzenleAc(){
    if(!aktifOgrenciId) return;
    const modal=document.getElementById('bsOgrenciEditModal'),b=document.getElementById('bsOgrKaydet'),sil=document.getElementById('bskOgrenciSil');
    modal.classList.add('acik');sayfaKilitle();mesaj('','');b.disabled=true;b.textContent='Yükleniyor…';if(sil)sil.disabled=true;
    try{
      const data=await BSOgrenciServisi.ogrenciGetir(aktifOgrenciId);
      document.getElementById('bsOgrAdSoyad').value=data.ad_soyad||'';document.getElementById('bsOgrVeliAdi').value=data.veli_adi||'';document.getElementById('bsOgrVeliTelefon').value=data.veli_telefon||'';document.getElementById('bsOgrTelefon').value=data.ogrenci_telefon||'';document.getElementById('bsOgrEmail').value=data.email||'';document.getElementById('bsOgrKayit').value=data.kayit_tarihi?String(data.kayit_tarihi).slice(0,10):'';document.getElementById('bsOgrDurum').value=data.durum||'Aktif';document.getElementById('bsOgrNot').value=data.notlar||'';
    }catch(err){console.error('Öğrenci modülü oku:',err);mesaj('Öğrenci bilgileri yüklenemedi.','hata');}
    finally{b.disabled=false;b.textContent='Kaydet';if(sil)sil.disabled=false;}
  }

  async function kaydet(e){
    e.preventDefault();if(!aktifOgrenciId)return;
    const ad=String(document.getElementById('bsOgrAdSoyad').value||'').trim();if(!ad){mesaj('Ad Soyad boş bırakılamaz.','hata');return;}
    const payload={ad_soyad:ad,veli_adi:bosIseNull(document.getElementById('bsOgrVeliAdi').value),veli_telefon:bosIseNull(document.getElementById('bsOgrVeliTelefon').value),ogrenci_telefon:bosIseNull(document.getElementById('bsOgrTelefon').value),email:bosIseNull(document.getElementById('bsOgrEmail').value),kayit_tarihi:bosIseNull(document.getElementById('bsOgrKayit').value),durum:String(document.getElementById('bsOgrDurum').value||'Aktif'),notlar:bosIseNull(document.getElementById('bsOgrNot').value)};
    const b=document.getElementById('bsOgrKaydet'),sil=document.getElementById('bskOgrenciSil');b.disabled=true;b.textContent='Kaydediliyor…';if(sil)sil.disabled=true;mesaj('','');
    try{
      const guncel=await BSOgrenciServisi.ogrenciGuncelle(aktifOgrenciId,payload);
      kartGuncelle(guncel);mesaj('Öğrenci bilgileri kaydedildi.','basari');if(typeof toast==='function')toast('Öğrenci bilgileri kaydedildi.');
      setTimeout(()=>{editKapat();detayAc(guncel);},320);
    }catch(err){console.error('Öğrenci modülü güncelle:',err);mesaj(err.message||'Kayıt yapılamadı.','hata');b.disabled=false;b.textContent='Kaydet';if(sil)sil.disabled=false;}
  }

  async function ogrenciSil(){
    if(!aktifOgrenciId||!window.BSKisiServisi) return;
    const ad=String(document.getElementById('bsOgrAdSoyad')?.value||document.getElementById('bsOgrenciAd')?.textContent||'Bu öğrenci').trim();
    if(!confirm(`${ad} kaydı kaldırılsın mı? Geçmiş kaydı varsa öğrenci Pasif yapılır ve geçmiş işlemler korunur.`)) return;
    const formSil=document.getElementById('bskOgrenciSil'),detaySil=document.getElementById('bsOgrenciDetaySil'),kaydetButon=document.getElementById('bsOgrKaydet');
    if(formSil){formSil.disabled=true;formSil.textContent='Kontrol ediliyor…';}
    if(detaySil){detaySil.disabled=true;detaySil.textContent='Kontrol ediliyor…';}
    if(kaydetButon)kaydetButon.disabled=true;mesaj('','');
    try{
      const sonuc=await BSKisiServisi.ogrenciSil(aktifOgrenciId);
      const islem=sonuc&&sonuc.islem?sonuc.islem:'Tamamlandı';
      if(typeof toast==='function')toast(islem==='Silindi'?'Öğrenci silindi.':'Öğrenci Pasif yapıldı.');
      editKapat();detayKapat();
      setTimeout(()=>window.location.reload(),180);
    }catch(err){
      console.error('Öğrenci kaldırma:',err);mesaj(err.message||'Öğrenci kaldırılamadı.','hata');
      if(formSil){formSil.disabled=false;formSil.textContent='Sil';}
      if(detaySil){detaySil.disabled=false;detaySil.textContent='Öğrenciyi Sil';}
      if(kaydetButon)kaydetButon.disabled=false;
    }
  }

  function delegasyon(){
    document.addEventListener('click',e=>{
      const veliDuzenle=e.target.closest&&e.target.closest('#bskVeliDuzenle');
      if(veliDuzenle&&aktifOgrenciId){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();document.getElementById('bskVeliModal')?.classList.remove('acik');duzenleAc();return;}
      const kart=e.target.closest&&e.target.closest('.v207-ogrenci-kart');if(!kart||!hazir)return;
      const o=ogrenciBulKart(kart);if(!o)return;e.preventDefault();e.stopPropagation();detayAc(o);
    },true);
  }

  async function baslat(){
    stilEkle();modalleriHazirla();delegasyon();
    window.addEventListener('pagehide',()=>{document.getElementById('bsOgrenciDetayModal')?.classList.remove('acik');document.getElementById('bsOgrenciEditModal')?.classList.remove('acik');sayfaKilidiniAc();},{once:true});
    try{referans=await BSOgrenciServisi.referanslar();hazir=true;}catch(err){console.error('Öğrenci modülü referans:',err);return;}
    kartlariHazirla();new MutationObserver(kartlariHazirla).observe(document.body,{childList:true,subtree:true});
  }

  let deneme=0;const timer=setInterval(async()=>{deneme++;try{if(typeof bsSupabase!=='undefined'&&window.BSOgrenciServisi){const {data}=await bsSupabase.auth.getSession();if(data&&data.session){clearInterval(timer);baslat();}}if(deneme>50)clearInterval(timer);}catch(e){if(deneme>50)clearInterval(timer);}},250);
  window.BSOgrenciModuluV1={baslat};
})();
