(function(){
  if(window.BSDersOlusturModuluV1) return;
  window.BSDersOlusturModuluV1=true;

  let ref=null;
  let otomatikDoldurma=false;

  function stilEkle(){
    if(document.getElementById('bsDersOlusturStil')) return;
    const s=document.createElement('style');
    s.id='bsDersOlusturStil';
    s.textContent=`
      .bsdo-modal{position:fixed;inset:0;z-index:970;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      .bsdo-modal.acik{display:flex}
      .bsdo-sheet{width:min(760px,100%);max-height:94dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bsdo-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .bsdo-baslik{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}
      .bsdo-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.45}
      .bsdo-kapat{width:40px;height:40px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .bsdo-form{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .bsdo-alan{display:flex;flex-direction:column;gap:6px}.bsdo-alan.tam{grid-column:1/-1}
      .bsdo-alan label{font-size:10px;font-weight:780;color:var(--ikincil)}
      .bsdo-alan input,.bsdo-alan select{width:100%;height:44px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--yazi);font:inherit;font-size:13px;outline:none;padding:0 12px}
      .bsdo-alan input:focus,.bsdo-alan select:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .bsdo-ipucu{grid-column:1/-1;min-height:18px;margin-top:-2px;color:var(--ikincil);font-size:9.5px;line-height:1.45}
      .bsdo-sonuc{display:none;margin-top:14px;padding:13px 14px;border-radius:13px;font-size:10.5px;line-height:1.5}
      .bsdo-sonuc.uygun{display:block;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534}
      .bsdo-sonuc.hata{display:block;border:1px solid #fecaca;background:#fef2f2;color:#991b1b}
      .bsdo-sonuc strong{display:block;margin-bottom:4px;font-size:11.5px}
      .bsdo-cakisma{margin-top:7px;padding-top:7px;border-top:1px solid rgba(153,27,27,.12)}
      .bsdo-cakisma:first-of-type{margin-top:5px}
      .bsdo-butonlar{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:15px}
      .bsdo-not{max-width:420px;color:var(--ikincil);font-size:9.5px;line-height:1.45}
      .bsdo-kontrol{height:44px;padding:0 17px;border:1px solid var(--mavi);border-radius:12px;background:var(--mavi);color:#fff;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .bsdo-kontrol[disabled]{opacity:.55;cursor:default}
      @media(max-width:700px){
        .bsdo-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bsdo-baslik{font-size:18px}.bsdo-form{grid-template-columns:1fr;gap:9px}.bsdo-alan.tam,.bsdo-ipucu{grid-column:auto}.bsdo-butonlar{position:sticky;bottom:0;align-items:stretch;flex-direction:column;margin:14px -2px -2px;padding:10px 2px 2px;background:linear-gradient(to top,#f8fafc 82%,rgba(248,250,252,0))}.bsdo-not{max-width:none}.bsdo-kontrol{width:100%}
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
        <div class="bsdo-ust"><div><div class="bsdo-baslik">Ders Oluştur</div><div class="bsdo-alt">Ders bilgilerini girin; kayıttan önce öğrenci, öğretmen ve derslik uygunluğu kontrol edilir.</div></div><button id="bsDersOlusturKapat" class="bsdo-kapat" type="button">×</button></div>
        <form id="bsDersOlusturForm" autocomplete="off">
          <div class="bsdo-form">
            <div class="bsdo-alan tam"><label for="bsdoOgrenci">Öğrenci</label><select id="bsdoOgrenci" required><option value="">Öğrenci seçin</option></select></div>
            <div class="bsdo-alan"><label for="bsdoTarih">Tarih</label><input id="bsdoTarih" type="date" required></div>
            <div class="bsdo-alan"><label for="bsdoSaat">Başlangıç Saati</label><input id="bsdoSaat" type="time" step="300" required></div>
            <div class="bsdo-alan"><label for="bsdoDersSayisi">Ders Sayısı</label><select id="bsdoDersSayisi"><option value="1">1 ders</option><option value="2">2 ders</option><option value="3">3 ders</option><option value="4">4 ders</option></select></div>
            <div class="bsdo-alan"><label for="bsdoOgretmen">Öğretmen</label><select id="bsdoOgretmen" required><option value="">Öğretmen seçin</option></select></div>
            <div class="bsdo-alan"><label for="bsdoBrans">Branş</label><select id="bsdoBrans" required><option value="">Branş seçin</option></select></div>
            <div class="bsdo-alan"><label for="bsdoDerslik">Derslik / Yer</label><select id="bsdoDerslik" required><option value="">Derslik seçin</option></select></div>
            <div id="bsdoIpucu" class="bsdo-ipucu"></div>
          </div>
          <div id="bsdoSonuc" class="bsdo-sonuc"></div>
          <div class="bsdo-butonlar"><div class="bsdo-not">Bu sürüm yalnız uygunluk kontrolü yapar; ders kaydı henüz oluşturulmaz.</div><button id="bsdoKontrol" class="bsdo-kontrol" type="submit">Uygunluğu Kontrol Et</button></div>
        </form>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)kapat();});
    document.getElementById('bsDersOlusturKapat').addEventListener('click',kapat);
    document.getElementById('bsDersOlusturForm').addEventListener('submit',kontrolEt);
    ['bsdoOgrenci','bsdoTarih'].forEach(id=>document.getElementById(id).addEventListener('change',varsayilanDoldur));
    ['bsdoSaat','bsdoDersSayisi','bsdoOgretmen','bsdoBrans','bsdoDerslik'].forEach(id=>document.getElementById(id).addEventListener('change',sonucuTemizle));
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

  function sonucuTemizle(){
    if(otomatikDoldurma) return;
    const s=document.getElementById('bsdoSonuc');
    if(s){s.className='bsdo-sonuc';s.innerHTML='';}
  }

  async function varsayilanDoldur(){
    sonucuTemizle();
    const ogr=document.getElementById('bsdoOgrenci').value;
    const tarih=document.getElementById('bsdoTarih').value;
    const ip=document.getElementById('bsdoIpucu');
    ip.textContent='';
    if(!ogr||!tarih) return;
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
        ip.textContent='Bu gün için sabit program bulundu; ders bilgileri otomatik dolduruldu.';
      }else if(r.eslesenler.length>1){
        ip.textContent='Bu öğrenci için aynı gün birden fazla sabit program var; ders bilgilerini seçin.';
      }else{
        ip.textContent='Bu gün için sabit program bulunmadı; ders bilgilerini manuel seçin.';
      }
    }catch(err){
      console.error('Ders varsayılanı:',err);ip.textContent='Sabit program bilgisi alınamadı; alanları manuel seçebilirsiniz.';
    }
  }

  function kapat(){document.getElementById('bsDersOlusturModal')?.classList.remove('acik');}

  async function ac(){
    const m=document.getElementById('bsDersOlusturModal');
    m.classList.add('acik');
    document.getElementById('bsdoSonuc').className='bsdo-sonuc';
    document.getElementById('bsdoSonuc').innerHTML='';
    document.getElementById('bsdoIpucu').textContent='';
    document.getElementById('bsdoTarih').value=istanbulBugunISO();
    document.getElementById('bsdoSaat').value='';
    document.getElementById('bsdoDersSayisi').value='1';
    document.getElementById('bsdoOgrenci').value='';
    document.getElementById('bsdoOgretmen').value='';
    document.getElementById('bsdoBrans').value='';
    document.getElementById('bsdoDerslik').value='';
    const b=document.getElementById('bsdoKontrol');b.disabled=true;b.textContent='Yükleniyor…';
    try{await referanslariYukle();}
    catch(err){console.error('Ders oluştur referans:',err);const s=document.getElementById('bsdoSonuc');s.className='bsdo-sonuc hata';s.innerHTML='<strong>Bilgiler yüklenemedi</strong>Bağlantı veya erişim yetkisi kontrol edilmeli.';}
    finally{b.disabled=false;b.textContent='Uygunluğu Kontrol Et';}
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

  async function kontrolEt(e){
    e.preventDefault();
    const form=document.getElementById('bsDersOlusturForm');
    if(!form.reportValidity()) return;
    const b=document.getElementById('bsdoKontrol'),s=document.getElementById('bsdoSonuc');
    b.disabled=true;b.textContent='Kontrol Ediliyor…';s.className='bsdo-sonuc';s.innerHTML='';
    try{
      const g=formGirdisi();
      const r=await BSDersProgramServisi.manuelDersOnKontrol(g);
      if(r.uygun){
        const ogr=ref.ogrenciMap.get(g.ogrenci_id)||'Öğrenci';
        const ogt=ref.ogretmenMap.get(g.ogretmen_id)||'Öğretmen';
        const yer=(ref.derslikMap.get(g.derslik_id)||{}).mekan_adi||'Derslik';
        s.className='bsdo-sonuc uygun';
        s.innerHTML=`<strong>Ders oluşturulmaya uygun</strong>${htmlKacir(ogr)} • ${htmlKacir(ogt)} • ${htmlKacir(tarihKisa(r.tarih))} • ${htmlKacir(r.baslangicSaati)}–${htmlKacir(r.bitisSaati)} • ${htmlKacir(yer)}`;
      }else{
        s.className='bsdo-sonuc hata';
        s.innerHTML='<strong>Çakışma bulundu</strong>'+r.nedenler.map(n=>`<div class="bsdo-cakisma"><b>${htmlKacir(n.tur)}</b>${n.aciklama?'<br>'+htmlKacir(n.aciklama):`<br>${htmlKacir(n.saat)} • ${htmlKacir(n.ogrenci)}${n.ogretmen?' • '+htmlKacir(n.ogretmen):''}`}</div>`).join('');
      }
    }catch(err){
      console.error('Ders ön kontrol:',err);s.className='bsdo-sonuc hata';s.innerHTML='<strong>Kontrol yapılamadı</strong>'+htmlKacir(err.message||'Bağlantı veya erişim yetkisi kontrol edilmeli.');
    }finally{b.disabled=false;b.textContent='Uygunluğu Kontrol Et';}
  }

  function butonlariBagla(){
    document.addEventListener('click',e=>{
      const hizli=e.target.closest&&e.target.closest('.hizli-buton');
      const dersHizli=hizli&&hizli.querySelector('.hizli-baslik')&&hizli.querySelector('.hizli-baslik').textContent.trim()==='Ders Oluştur';
      const ana=e.target.closest&&e.target.closest('#gorunum-dersler .ana-islem-buton');
      if(!dersHizli&&!ana) return;
      e.preventDefault();e.stopImmediatePropagation();ac();
    },true);
  }

  function baslat(){stilEkle();modalHazirla();butonlariBagla();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();