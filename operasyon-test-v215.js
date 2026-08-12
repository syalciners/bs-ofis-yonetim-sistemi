(function(){
  const V='215';
  let aktifOgrenciId='';

  function stilEkle(){
    if(document.getElementById('v215Stil')) return;
    const s=document.createElement('style');
    s.id='v215Stil';
    s.textContent=`
      .v215-aksiyonlar{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .v215-duzenle{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .v215-duzenle:active{transform:scale(.98);background:#dbeafe}
      .v215-duzenle svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .v215-modal{position:fixed;inset:0;z-index:980;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      .v215-modal.acik{display:flex}
      .v215-sheet{width:min(720px,100%);max-height:94dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .v215-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .v215-baslik{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}
      .v215-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.4}
      .v215-kapat{width:40px;height:40px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .v215-form{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .v215-alan{display:flex;flex-direction:column;gap:6px}
      .v215-alan.tam{grid-column:1/-1}
      .v215-alan label{font-size:10px;font-weight:780;color:var(--ikincil)}
      .v215-alan input,.v215-alan select,.v215-alan textarea{width:100%;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--yazi);font:inherit;font-size:13px;outline:none;padding:11px 12px}
      .v215-alan input,.v215-alan select{height:44px}
      .v215-alan textarea{min-height:88px;resize:vertical;line-height:1.45}
      .v215-alan input:focus,.v215-alan select:focus,.v215-alan textarea:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .v215-butonlar{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}
      .v215-iptal,.v215-kaydet{height:44px;padding:0 16px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer}
      .v215-iptal{border:1px solid var(--kenar);background:#fff;color:var(--ikincil)}
      .v215-kaydet{border:1px solid var(--mavi);background:var(--mavi);color:#fff;min-width:112px}
      .v215-kaydet[disabled]{opacity:.55;cursor:default}
      .v215-mesaj{display:none;margin-top:12px;padding:10px 12px;border-radius:11px;font-size:10.5px;line-height:1.45}
      .v215-mesaj.hata{display:block;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
      .v215-mesaj.basari{display:block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
      @media(max-width:700px){
        .v215-duzenle{height:38px;padding:0 11px;font-size:10px}
        .v215-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}
        .v215-baslik{font-size:18px}.v215-form{grid-template-columns:1fr;gap:9px}.v215-alan.tam{grid-column:auto}
        .v215-butonlar{position:sticky;bottom:0;margin:14px -2px -2px;padding:10px 2px 2px;background:linear-gradient(to top,#f8fafc 78%,rgba(248,250,252,0))}
        .v215-iptal,.v215-kaydet{flex:1}
      }
    `;
    document.head.appendChild(s);
  }

  function modalOlustur(){
    if(document.getElementById('v215Modal')) return;
    const m=document.createElement('div');
    m.id='v215Modal';
    m.className='v215-modal';
    m.innerHTML=`
      <div class="v215-sheet">
        <div class="v215-ust">
          <div><div class="v215-baslik">Öğrenci Bilgilerini Düzenle</div><div class="v215-alt">Değişiklikler bu uygulama üzerinden kaydedilir.</div></div>
          <button id="v215Kapat" class="v215-kapat" type="button">×</button>
        </div>
        <form id="v215Form" autocomplete="off">
          <div class="v215-form">
            <div class="v215-alan tam"><label for="v215AdSoyad">Ad Soyad</label><input id="v215AdSoyad" required maxlength="160"></div>
            <div class="v215-alan"><label for="v215VeliAdi">Veli Adı</label><input id="v215VeliAdi" maxlength="160"></div>
            <div class="v215-alan"><label for="v215Durum">Durum</label><select id="v215Durum"><option value="Aktif">Aktif</option><option value="Pasif">Pasif</option></select></div>
            <div class="v215-alan"><label for="v215VeliTelefon">Veli Telefon</label><input id="v215VeliTelefon" type="tel" inputmode="tel" maxlength="40"></div>
            <div class="v215-alan"><label for="v215OgrenciTelefon">Öğrenci Telefon</label><input id="v215OgrenciTelefon" type="tel" inputmode="tel" maxlength="40"></div>
            <div class="v215-alan"><label for="v215Email">E-posta</label><input id="v215Email" type="email" inputmode="email" maxlength="180"></div>
            <div class="v215-alan"><label for="v215KayitTarihi">Kayıt Tarihi</label><input id="v215KayitTarihi" type="date"></div>
            <div class="v215-alan tam"><label for="v215Notlar">Not</label><textarea id="v215Notlar" maxlength="2000"></textarea></div>
          </div>
          <div id="v215Mesaj" class="v215-mesaj"></div>
          <div class="v215-butonlar"><button id="v215Iptal" class="v215-iptal" type="button">Vazgeç</button><button id="v215Kaydet" class="v215-kaydet" type="submit">Kaydet</button></div>
        </form>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m) kapat();});
    document.getElementById('v215Kapat').addEventListener('click',kapat);
    document.getElementById('v215Iptal').addEventListener('click',kapat);
    document.getElementById('v215Form').addEventListener('submit',kaydet);
  }

  function mesaj(metin,tur){
    const el=document.getElementById('v215Mesaj');
    el.textContent=metin||'';
    el.className='v215-mesaj'+(tur?' '+tur:'');
  }

  function kapat(){
    const m=document.getElementById('v215Modal');
    if(m)m.classList.remove('acik');
    mesaj('','');
  }

  async function duzenleAc(){
    const anaModal=document.getElementById('v211Modal');
    const id=(anaModal&&anaModal.dataset.ogrenciId)||aktifOgrenciId||'';
    if(!id){if(typeof toast==='function')toast('Öğrenci kaydı belirlenemedi.');return;}
    aktifOgrenciId=id;
    mesaj('','');
    const kaydetBtn=document.getElementById('v215Kaydet');
    kaydetBtn.disabled=true;kaydetBtn.textContent='Yükleniyor…';
    document.getElementById('v215Modal').classList.add('acik');
    try{
      const {data,error}=await bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar').eq('ogrenci_id',id).single();
      if(error) throw error;
      document.getElementById('v215AdSoyad').value=data.ad_soyad||'';
      document.getElementById('v215VeliAdi').value=data.veli_adi||'';
      document.getElementById('v215VeliTelefon').value=data.veli_telefon||'';
      document.getElementById('v215OgrenciTelefon').value=data.ogrenci_telefon||'';
      document.getElementById('v215Email').value=data.email||'';
      document.getElementById('v215KayitTarihi').value=data.kayit_tarihi?String(data.kayit_tarihi).slice(0,10):'';
      document.getElementById('v215Durum').value=data.durum||'Aktif';
      document.getElementById('v215Notlar').value=data.notlar||'';
    }catch(err){console.error('V215 öğrenci oku:',err);mesaj('Öğrenci bilgileri yüklenemedi.','hata');}
    finally{kaydetBtn.disabled=false;kaydetBtn.textContent='Kaydet';}
  }

  function bosIseNull(v){v=String(v||'').trim();return v===''?null:v;}

  async function kaydet(e){
    e.preventDefault();
    if(!aktifOgrenciId) return;
    const ad=String(document.getElementById('v215AdSoyad').value||'').trim();
    if(!ad){mesaj('Ad Soyad boş bırakılamaz.','hata');return;}
    const payload={
      ad_soyad:ad,
      veli_adi:bosIseNull(document.getElementById('v215VeliAdi').value),
      veli_telefon:bosIseNull(document.getElementById('v215VeliTelefon').value),
      ogrenci_telefon:bosIseNull(document.getElementById('v215OgrenciTelefon').value),
      email:bosIseNull(document.getElementById('v215Email').value),
      kayit_tarihi:bosIseNull(document.getElementById('v215KayitTarihi').value),
      durum:String(document.getElementById('v215Durum').value||'Aktif'),
      notlar:bosIseNull(document.getElementById('v215Notlar').value)
    };
    const b=document.getElementById('v215Kaydet');
    b.disabled=true;b.textContent='Kaydediliyor…';mesaj('','');
    try{
      const {data,error}=await bsSupabase.from('ogrenciler').update(payload).eq('ogrenci_id',aktifOgrenciId).select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar').single();
      if(error) throw error;
      if(!data||data.ogrenci_id!==aktifOgrenciId) throw new Error('Kayıt doğrulanamadı.');
      mesaj('Öğrenci bilgileri kaydedildi.','basari');
      if(typeof toast==='function')toast('Öğrenci bilgileri kaydedildi.');
      setTimeout(()=>window.location.reload(),550);
    }catch(err){
      console.error('V215 öğrenci güncelle:',err);
      mesaj('Kayıt yapılamadı. Yetki veya bağlantı kontrol edilmeli.','hata');
      b.disabled=false;b.textContent='Kaydet';
    }
  }

  function detayButonuHazirla(){
    const modal=document.getElementById('v211Modal');
    const ust=modal&&modal.querySelector('.v211-ust');
    const kapatBtn=document.getElementById('v211Kapat');
    if(!modal||!ust||!kapatBtn) return false;
    const eski=document.getElementById('v213Duzenle')||document.getElementById('v214Duzenle');
    if(eski){
      const ebeveyn=eski.parentElement;
      eski.remove();
      if(ebeveyn&&ebeveyn.children.length===1&&ebeveyn.contains(kapatBtn)){
        ebeveyn.parentElement.insertBefore(kapatBtn,ebeveyn);ebeveyn.remove();
      }
    }
    if(document.getElementById('v215Duzenle')) return true;
    const aks=document.createElement('div');aks.className='v215-aksiyonlar';
    const b=document.createElement('button');b.id='v215Duzenle';b.type='button';b.className='v215-duzenle';
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg><span>Düzenle</span>';
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();duzenleAc();});
    const parent=kapatBtn.parentElement;
    if(parent&&parent!==ust&&parent.classList.contains('v213-aksiyonlar')) parent.removeChild(kapatBtn);
    if(kapatBtn.parentElement===ust) ust.removeChild(kapatBtn);
    aks.appendChild(b);aks.appendChild(kapatBtn);ust.appendChild(aks);
    return true;
  }

  function aktifOgrenciyiYakala(){
    document.addEventListener('click',function(e){
      const kart=e.target.closest&&e.target.closest('.v207-ogrenci-kart');
      if(!kart) return;
      const id=kart.dataset.ogrenciId||'';
      if(id){aktifOgrenciId=id;const m=document.getElementById('v211Modal');if(m)m.dataset.ogrenciId=id;}
    },true);
  }

  function baslat(){
    stilEkle();modalOlustur();aktifOgrenciyiYakala();
    let n=0;const t=setInterval(()=>{n++;if(detayButonuHazirla()||n>80)clearInterval(t);},200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();
