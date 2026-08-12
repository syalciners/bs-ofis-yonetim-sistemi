(function(){
  if(window.BSDersOlusturModuluV1) return;
  window.BSDersOlusturModuluV1=true;

  let ref=null;
  let otomatikDoldurma=false;
  let kontrolTimer=null;

  function stilEkle(){
    if(document.getElementById('bsDersOlusturStil')) return;
    const s=document.createElement('style');
    s.id='bsDersOlusturStil';
    s.textContent=`
      .bsdo-modal{position:fixed;inset:0;z-index:970;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      .bsdo-modal.acik{display:flex}
      .bsdo-sheet{width:min(720px,100%);max-height:94dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bsdo-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:15px}
      .bsdo-baslik{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}
      .bsdo-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.45}
      .bsdo-kapat{width:40px;height:40px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .bsdo-hizli{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(160px,.7fr);gap:10px}
      .bsdo-alan{display:flex;flex-direction:column;gap:6px}.bsdo-alan label{font-size:10px;font-weight:780;color:var(--ikincil)}
      .bsdo-alan input,.bsdo-alan select{width:100%;height:46px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--yazi);font:inherit;font-size:13px;outline:none;padding:0 12px}
      .bsdo-alan input:focus,.bsdo-alan select:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .bsdo-ipucu{min-height:20px;margin-top:8px;color:var(--ikincil);font-size:9.5px;line-height:1.45}
      .bsdo-ozet{display:none;margin-top:11px;padding:13px 14px;border:1px solid #dbeafe;border-radius:14px;background:#fff}
      .bsdo-ozet.goster{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .bsdo-ozet-sol{min-width:0}.bsdo-ozet-baslik{font-size:11.5px;font-weight:820;color:var(--yazi)}
      .bsdo-ozet-alt{margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 9px;color:var(--ikincil);font-size:9.5px;line-height:1.4}
      .bsdo-degistir{flex:0 0 auto;height:34px;padding:0 10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#2563eb;font-size:9.5px;font-weight:800;cursor:pointer}
      .bsdo-detay{display:none;margin-top:11px;padding:13px;border:1px solid var(--kenar);border-radius:14px;background:#fff}
      .bsdo-detay.acik{display:block}.bsdo-detay-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .bsdo-sonuc{display:none;margin-top:12px;padding:13px 14px;border-radius:13px;font-size:10.5px;line-height:1.5}
      .bsdo-sonuc.kontrol{display:block;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8}
      .bsdo-sonuc.uygun{display:block;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534}
      .bsdo-sonuc.hata{display:block;border:1px solid #fecaca;background:#fef2f2;color:#991b1b}
      .bsdo-sonuc strong{display:block;margin-bottom:4px;font-size:11.5px}
      .bsdo-cakisma{margin-top:7px;padding-top:7px;border-top:1px solid rgba(153,27,27,.12)}
      .bsdo-altbilgi{margin-top:12px;padding:10px 12px;border-radius:11px;background:#f1f5f9;color:var(--ikincil);font-size:9.5px;line-height:1.45}
      @media(max-width:700px){
        .bsdo-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bsdo-baslik{font-size:18px}.bsdo-hizli{grid-template-columns:1fr}.bsdo-detay-grid{grid-template-columns:1fr}.bsdo-ozet.goster{align-items:flex-start}.bsdo-degistir{height:32px}.bsdo-alan input,.bsdo-alan select{height:44px}
      }
    `;
    document.head.appendChild(s);
  }

  function modalHazirla(){
    if(document.getElementById('bsDersOlusturModal')) return;
    const m=document.createElement('div');
    m.id='bsDersOlusturModal';m.className='bsdo-modal';
    m.innerHTML=`
      <div class="bsdo-sheet">
        <div class="bsdo-ust">
          <div><div class="bsdo-baslik">Ders Oluştur</div><div class="bsdo-alt">Öğrenciyi seçin. Sabit programı varsa diğer bilgiler otomatik hazırlanır ve uygunluk kendiliğinden kontrol edilir.</div></div>
          <button id="bsDersOlusturKapat" class="bsdo-kapat" type="button">×</button>
        </div>
        <form id="bsDersOlusturForm" autocomplete="off">
          <div class="bsdo-hizli">
            <div class="bsdo-alan"><label for="bsdoOgrenci">Öğrenci</label><select id="bsdoOgrenci" required><option value="">Öğrenci seçin</option></select></div>
            <div class="bsdo-alan"><label for="bsdoTarih">Tarih</label><input id="bsdoTarih" type="date" required></div>
          </div>
          <div id="bsdoIpucu" class="bsdo-ipucu">Önce öğrenciyi seçin.</div>
          <div id="bsdoOzet" class="bsdo-ozet">
            <div class="bsdo-ozet-sol"><div id="bsdoOzetBaslik" class="bsdo-ozet-baslik"></div><div id="bsdoOzetAlt" class="bsdo-ozet-alt"></div></div>
            <button id="bsdoDegistir" class="bsdo-degistir" type="button">Değiştir</button>
          </div>
          <div id="bsdoDetay" class="bsdo-detay">
            <div class="bsdo-detay-grid">
              <div class="bsdo-alan"><label for="bsdoSaat">Başlangıç Saati</label><input id="bsdoSaat" type="time" step="300" required></div>
              <div class="bsdo-alan"><label for="bsdoDersSayisi">Ders Sayısı</label><select id="bsdoDersSayisi"><option value="1">1 ders</option><option value="2">2 ders</option><option value="3">3 ders</option><option value="4">4 ders</option></select></div>
              <div class="bsdo-alan"><label for="bsdoOgretmen">Öğretmen</label><select id="bsdoOgretmen" required><option value="">Öğretmen seçin</option></select></div>
              <div class="bsdo-alan"><label for="bsdoBrans">Branş</label><select id="bsdoBrans" required><option value="">Branş seçin</option></select></div>
              <div class="bsdo-alan"><label for="bsdoDerslik">Derslik / Yer</label><select id="bsdoDerslik" required><option value="">Derslik seçin</option></select></div>
            </div>
          </div>
          <div id="bsdoSonuc" class="bsdo-sonuc"></div>
          <div class="bsdo-altbilgi">Bu test sürümü henüz ders kaydı oluşturmaz. Gerçek kayıt açıldığında normal akışta öğrenci seçimi + tek “Oluştur” dokunuşu hedeflenecek.</div>
        </form>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)kapat();});
    document.getElementById('bsDersOlusturKapat').addEventListener('click',kapat);
    document.getElementById('bsDersOlusturForm').addEventListener('submit',e=>e.preventDefault());
    document.getElementById('bsdoOgrenci').addEventListener('change',varsayilanDoldur);
    document.getElementById('bsdoTarih').addEventListener('change',varsayilanDoldur);
    document.getElementById('bsdoDegistir').addEventListener('click',()=>{
      document.getElementById('bsdoDetay').classList.toggle('acik');
      document.getElementById('bsdoDegistir').textContent=document.getElementById('bsdoDetay').classList.contains('acik')?'Kapat':'Değiştir';
    });
    ['bsdoSaat','bsdoDersSayisi','bsdoOgretmen','bsdoBrans','bsdoDerslik'].forEach(id=>document.getElementById(id).addEventListener('change',manuelAlanDegisti));
  }

  function secenekler(select,kayitlar,idAlan,adAlan,ilk){
    select.innerHTML=`<option value="">${ilk}</option>`+kayitlar.map(x=>`<option value="${htmlKacir(x[idAlan])}">${htmlKacir(x[adAlan]||'—')}</option>`).join('');
  }

  async function referanslariYukle(){
    if(ref) return ref;
    if(!window.BSDersProgramServisi) throw new Error('Ders servisi yüklenmedi.');
    ref=await BSDersProgramServisi.referanslar();
    secenekler(document.getElementById('bsdoOgrenci'),ref.ogrenciler.filter(x=>x.durum!=='Pasif'),'ogrenci_id','ad_soyad','Öğrenci seçin');
    secenekler(document.getElementById('bsdoOgretmen'),ref.ogretmenler.filter(x=>x.durum!=='Pasif'),'ogretmen_id','ad_soyad','Öğretmen seçin');
    secenekler(document.getElementById('bsdoBrans'),ref.branslar.filter(x=>x.aktif!==false),'brans_id','brans_adi','Branş seçin');
    secenekler(document.getElementById('bsdoDerslik'),ref.derslikler.filter(x=>x.aktif!==false),'derslik_id','mekan_adi','Derslik seçin');
    return ref;
  }

  function sonucTemizle(){
    if(otomatikDoldurma) return;
    const s=document.getElementById('bsdoSonuc');
    s.className='bsdo-sonuc';s.innerHTML='';
  }

  function formGirdisi(){return {
    ogrenci_id:document.getElementById('bsdoOgrenci').value,
    tarih:document.getElementById('bsdoTarih').value,
    baslangic_saati:document.getElementById('bsdoSaat').value,
    ders_sayisi:Number(document.getElementById('bsdoDersSayisi').value),
    ogretmen_id:document.getElementById('bsdoOgretmen').value,
    brans_id:document.getElementById('bsdoBrans').value,
    derslik_id:document.getElementById('bsdoDerslik').value
  };}

  function formTam(g){return !!(g.ogrenci_id&&g.tarih&&g.baslangic_saati&&g.ogretmen_id&&g.brans_id&&g.derslik_id&&[1,2,3,4].includes(g.ders_sayisi));}

  function ozetGuncelle(){
    const g=formGirdisi();
    const kutu=document.getElementById('bsdoOzet');
    if(!formTam(g)||!ref){kutu.classList.remove('goster');return;}
    const ogr=ref.ogrenciMap.get(g.ogrenci_id)||'Öğrenci';
    const ogt=ref.ogretmenMap.get(g.ogretmen_id)||'Öğretmen';
    const br=ref.bransMap.get(g.brans_id)||'Branş';
    const yer=(ref.derslikMap.get(g.derslik_id)||{}).mekan_adi||'Derslik';
    const bas=String(g.baslangic_saati).slice(0,5);
    const par=bas.split(':');const bit=Number(par[0]||0)*60+Number(par[1]||0)+g.ders_sayisi*60;
    document.getElementById('bsdoOzetBaslik').textContent=ogr;
    document.getElementById('bsdoOzetAlt').innerHTML=`<span>${htmlKacir(tarihKisa(g.tarih))}</span><span>${htmlKacir(bas)}–${htmlKacir(BSDersProgramServisi.saatYaz(bit))}</span><span>${htmlKacir(ogt)}</span><span>${htmlKacir(br)}</span><span>${htmlKacir(yer)}</span>`;
    kutu.classList.add('goster');
  }

  function detayAc(acik){
    document.getElementById('bsdoDetay').classList.toggle('acik',!!acik);
    document.getElementById('bsdoDegistir').textContent=acik?'Kapat':'Değiştir';
  }

  function alanlariTemizle(){
    otomatikDoldurma=true;
    document.getElementById('bsdoSaat').value='';
    document.getElementById('bsdoDersSayisi').value='1';
    document.getElementById('bsdoOgretmen').value='';
    document.getElementById('bsdoBrans').value='';
    document.getElementById('bsdoDerslik').value='';
    otomatikDoldurma=false;
    ozetGuncelle();
  }

  async function varsayilanDoldur(){
    if(kontrolTimer) clearTimeout(kontrolTimer);
    sonucTemizle();
    const ogr=document.getElementById('bsdoOgrenci').value;
    const tarih=document.getElementById('bsdoTarih').value;
    const ip=document.getElementById('bsdoIpucu');
    if(!ogr){ip.textContent='Önce öğrenciyi seçin.';alanlariTemizle();detayAc(false);return;}
    if(!tarih){ip.textContent='Tarih seçin.';return;}
    ip.textContent='Sabit program kontrol ediliyor…';
    try{
      const r=await BSDersProgramServisi.ogrenciProgramVarsayilaniGetir(ogr,tarih);
      if(r.varsayilan){
        const p=r.varsayilan;otomatikDoldurma=true;
        document.getElementById('bsdoSaat').value=String(p.baslangic_saati||'').slice(0,5);
        document.getElementById('bsdoDersSayisi').value=String(Number(p.ders_sayisi)||1);
        document.getElementById('bsdoOgretmen').value=p.ogretmen_id||'';
        document.getElementById('bsdoBrans').value=p.brans_id||'';
        document.getElementById('bsdoDerslik').value=p.derslik_id||'';
        otomatikDoldurma=false;
        ip.textContent='Sabit program bulundu. Bilgiler hazırlandı.';
        detayAc(false);ozetGuncelle();
        await kontrolEt(true);
      }else{
        alanlariTemizle();detayAc(true);
        ip.textContent=r.eslesenler.length>1?'Bu gün için birden fazla program var. Ders ayrıntılarını seçin.':'Bu gün için sabit program yok. Yalnız gerekli ders ayrıntılarını seçin.';
      }
    }catch(err){
      console.error('Ders varsayılanı:',err);alanlariTemizle();detayAc(true);ip.textContent='Sabit program alınamadı. Ders ayrıntılarını manuel seçebilirsiniz.';
    }
  }

  function manuelAlanDegisti(){
    if(otomatikDoldurma) return;
    sonucTemizle();ozetGuncelle();
    if(kontrolTimer) clearTimeout(kontrolTimer);
    const g=formGirdisi();
    if(formTam(g)) kontrolTimer=setTimeout(()=>kontrolEt(true),350);
  }

  async function kontrolEt(sessiz){
    const g=formGirdisi();
    if(!formTam(g)) return;
    const s=document.getElementById('bsdoSonuc');
    s.className='bsdo-sonuc kontrol';s.innerHTML='<strong>Uygunluk kontrol ediliyor…</strong>Öğrenci, öğretmen ve derslik kontrol ediliyor.';
    try{
      const r=await BSDersProgramServisi.manuelDersOnKontrol(g);
      ozetGuncelle();
      if(r.uygun){
        s.className='bsdo-sonuc uygun';
        s.innerHTML='<strong>Ders uygun</strong>Çakışma yok. Gerçek kayıt adımı açıldığında bu ders tek dokunuşla oluşturulabilecek.';
      }else{
        s.className='bsdo-sonuc hata';
        s.innerHTML='<strong>Çakışma bulundu</strong>'+r.nedenler.map(n=>`<div class="bsdo-cakisma"><b>${htmlKacir(n.tur)}</b>${n.aciklama?'<br>'+htmlKacir(n.aciklama):`<br>${htmlKacir(n.saat)} • ${htmlKacir(n.ogrenci)}${n.ogretmen?' • '+htmlKacir(n.ogretmen):''}`}</div>`).join('');
      }
    }catch(err){
      console.error('Ders ön kontrol:',err);s.className='bsdo-sonuc hata';s.innerHTML='<strong>Kontrol yapılamadı</strong>Bağlantı veya erişim yetkisi kontrol edilmeli.';
    }
  }

  function kapat(){
    if(kontrolTimer) clearTimeout(kontrolTimer);
    document.getElementById('bsDersOlusturModal')?.classList.remove('acik');
  }

  async function ac(){
    const m=document.getElementById('bsDersOlusturModal');
    m.classList.add('acik');
    document.getElementById('bsdoTarih').value=istanbulBugunISO();
    document.getElementById('bsdoOgrenci').value='';
    document.getElementById('bsdoIpucu').textContent='Önce öğrenciyi seçin.';
    document.getElementById('bsdoSonuc').className='bsdo-sonuc';
    document.getElementById('bsdoSonuc').innerHTML='';
    alanlariTemizle();detayAc(false);
    try{await referanslariYukle();}
    catch(err){
      console.error('Ders oluştur referans:',err);
      const s=document.getElementById('bsdoSonuc');s.className='bsdo-sonuc hata';s.innerHTML='<strong>Bilgiler yüklenemedi</strong>Bağlantı veya erişim yetkisi kontrol edilmeli.';
    }
  }

  function butonMu(el){
    const b=el.closest&&el.closest('button');
    if(!b) return false;
    if(b.classList.contains('hizli-buton')&&b.textContent.includes('Ders Oluştur')&&!b.textContent.includes('Haftalık')) return true;
    if(b.classList.contains('ana-islem-buton')&&b.textContent.includes('Ders Oluştur')) return true;
    return false;
  }

  function baslat(){
    stilEkle();modalHazirla();
    document.addEventListener('click',function(e){
      if(!butonMu(e.target)) return;
      e.preventDefault();e.stopImmediatePropagation();ac();
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
