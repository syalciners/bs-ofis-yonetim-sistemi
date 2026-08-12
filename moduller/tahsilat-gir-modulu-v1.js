(function(){
  if(window.BSTahsilatGirModuluV1) return;
  window.BSTahsilatGirModuluV1=true;

  let ref=null;
  let bakiyeler=new Map();
  let yontem='Havale/EFT';
  let aktifIslem=null;

  function stilEkle(){
    if(document.getElementById('bsTahsilatGirStil')) return;
    const s=document.createElement('style');
    s.id='bsTahsilatGirStil';
    s.textContent=`
      .bstg-modal{position:fixed;inset:0;z-index:975;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bstg-modal.acik{display:flex}
      .bstg-sheet{width:min(680px,100%);max-height:94dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bstg-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:15px}.bstg-baslik{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}.bstg-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.45}.bstg-kapat{width:40px;height:40px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .bstg-alan{display:flex;flex-direction:column;gap:6px;margin-bottom:11px}.bstg-alan label{font-size:10px;font-weight:780;color:var(--ikincil)}.bstg-alan select,.bstg-alan input{width:100%;height:48px;border:1px solid var(--kenar);border-radius:13px;background:#fff;color:var(--yazi);font:inherit;font-size:14px;outline:none;padding:0 13px}.bstg-alan select:focus,.bstg-alan input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
      .bstg-bakiye{display:none;align-items:center;justify-content:space-between;gap:10px;margin:-1px 0 11px;padding:11px 12px;border:1px solid #dbeafe;border-radius:12px;background:#eff6ff}.bstg-bakiye.goster{display:flex}.bstg-bakiye span{font-size:10px;color:#475569}.bstg-bakiye strong{display:block;margin-top:2px;font-size:13px;color:#1e3a8a}.bstg-kalan-buton{height:34px;padding:0 10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff;color:#1d4ed8;font-size:9.5px;font-weight:800;cursor:pointer;white-space:nowrap}
      .bstg-yontemler{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bstg-yontem{height:46px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:11px;font-weight:800;cursor:pointer}.bstg-yontem.aktif{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8;box-shadow:0 0 0 2px rgba(37,99,235,.05)}
      .bstg-detay-toggle{width:100%;height:38px;margin-top:2px;border:none;background:transparent;color:var(--mavi);font-size:10px;font-weight:750;cursor:pointer;text-align:left;padding:0}.bstg-detay{display:none;padding-top:3px}.bstg-detay.acik{display:block}
      .bstg-sonuc{display:none;margin-top:13px;padding:12px 13px;border-radius:12px;font-size:10.5px;line-height:1.5}.bstg-sonuc.hazir{display:block;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534}.bstg-sonuc.hata{display:block;border:1px solid #fecaca;background:#fef2f2;color:#991b1b}.bstg-sonuc strong{display:block;margin-bottom:4px;font-size:11.5px}
      .bstg-altbar{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px -2px -2px;padding:11px 2px 2px;background:linear-gradient(to top,#f8fafc 82%,rgba(248,250,252,0))}.bstg-not{max-width:390px;color:var(--ikincil);font-size:9.5px;line-height:1.45}.bstg-devam{height:46px;padding:0 18px;border:1px solid var(--mavi);border-radius:12px;background:var(--mavi);color:#fff;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.bstg-devam[disabled]{opacity:.55;cursor:default}
      @media(max-width:700px){.bstg-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bstg-baslik{font-size:18px}.bstg-altbar{align-items:stretch;flex-direction:column}.bstg-not{max-width:none}.bstg-devam{width:100%}}
    `;document.head.appendChild(s);
  }

  function modalHazirla(){
    if(document.getElementById('bsTahsilatGirModal')) return;
    const m=document.createElement('div');m.id='bsTahsilatGirModal';m.className='bstg-modal';
    m.innerHTML=`<div class="bstg-sheet"><div class="bstg-ust"><div><div class="bstg-baslik">Tahsilat Gir</div><div class="bstg-alt">Öğrenciyi seçin, tutarı yazın. Kasa hesabını sistem ödeme yöntemine göre otomatik belirler.</div></div><button id="bstgKapat" class="bstg-kapat" type="button">×</button></div><form id="bstgForm" autocomplete="off"><div class="bstg-alan"><label for="bstgOgrenci">Öğrenci</label><select id="bstgOgrenci" required><option value="">Öğrenci seçin</option></select></div><div id="bstgBakiye" class="bstg-bakiye"><div><span id="bstgBakiyeEtiket">Güncel bakiye</span><strong id="bstgBakiyeDeger">—</strong></div><button id="bstgKalanSec" class="bstg-kalan-buton" type="button">Kalanı seç</button></div><div class="bstg-alan"><label for="bstgTutar">Tutar</label><input id="bstgTutar" type="number" min="1" step="0.01" inputmode="decimal" placeholder="0" required></div><div class="bstg-alan"><label>Ödeme Yöntemi</label><div class="bstg-yontemler"><button class="bstg-yontem aktif" type="button" data-bstg-yontem="Havale/EFT">Havale / EFT</button><button class="bstg-yontem" type="button" data-bstg-yontem="Nakit">Nakit</button></div></div><button id="bstgDetayToggle" class="bstg-detay-toggle" type="button">Tarih ve açıklama ekle</button><div id="bstgDetay" class="bstg-detay"><div class="bstg-alan"><label for="bstgTarih">Tarih</label><input id="bstgTarih" type="date" required></div><div class="bstg-alan"><label for="bstgAciklama">Açıklama</label><input id="bstgAciklama" maxlength="300" placeholder="İsteğe bağlı"></div></div><div id="bstgSonuc" class="bstg-sonuc"></div><div class="bstg-altbar"><div class="bstg-not">Tahsilat ve kasa hareketi tek güvenli işlemde kaydedilir; aynı işlem tekrar gönderilse bile çift kayıt oluşmaz.</div><button id="bstgDevam" class="bstg-devam" type="submit">Tahsilatı Kaydet</button></div></form></div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)kapat();});document.getElementById('bstgKapat').addEventListener('click',kapat);document.getElementById('bstgOgrenci').addEventListener('change',ogrenciDegisti);document.getElementById('bstgKalanSec').addEventListener('click',kalaniSec);document.getElementById('bstgTutar').addEventListener('input',sonucuTemizle);document.getElementById('bstgTarih').addEventListener('change',sonucuTemizle);document.getElementById('bstgAciklama').addEventListener('input',sonucuTemizle);
    document.getElementById('bstgDetayToggle').addEventListener('click',()=>{const d=document.getElementById('bstgDetay');d.classList.toggle('acik');document.getElementById('bstgDetayToggle').textContent=d.classList.contains('acik')?'Detayları gizle':'Tarih ve açıklama ekle';});
    m.querySelectorAll('[data-bstg-yontem]').forEach(b=>b.addEventListener('click',()=>{yontem=b.dataset.bstgYontem;m.querySelectorAll('[data-bstg-yontem]').forEach(x=>x.classList.toggle('aktif',x===b));sonucuTemizle();}));
    document.getElementById('bstgForm').addEventListener('submit',kaydet);
  }

  async function verileriYukle(yenile=false){
    if(!yenile&&ref&&bakiyeler.size) return;
    if(!window.BSReferansServisi||!window.BSFinansServisi) throw new Error('Finans servisleri yüklenmedi.');
    const [r,b]=await Promise.all([BSReferansServisi.yukle(yenile),BSFinansServisi.borcOzetiGetir()]);ref=r;bakiyeler=new Map((b.bakiyeler||[]).map(x=>[x.ogrenci_id,Number(x.kalan)||0]));
    const s=document.getElementById('bstgOgrenci');s.innerHTML='<option value="">Öğrenci seçin</option>'+r.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=>`<option value="${htmlKacir(x.ogrenci_id)}">${htmlKacir(x.ad_soyad||'Öğrenci')}</option>`).join('');
  }

  function sonucuTemizle(){const s=document.getElementById('bstgSonuc');if(s){s.className='bstg-sonuc';s.innerHTML='';}}
  function kapat(){document.getElementById('bsTahsilatGirModal')?.classList.remove('acik');}
  function bakiyeGoster(id){const kutu=document.getElementById('bstgBakiye'),etiket=document.getElementById('bstgBakiyeEtiket'),deger=document.getElementById('bstgBakiyeDeger'),buton=document.getElementById('bstgKalanSec');if(!id){kutu.classList.remove('goster');return;}const kalan=bakiyeler.get(id)||0;kutu.classList.add('goster');if(kalan>0.009){etiket.textContent='Açık bakiye';deger.textContent=paraYaz(kalan);buton.style.display='block';}else if(kalan<-0.009){etiket.textContent='Ön ödeme bakiyesi';deger.textContent=paraYaz(Math.abs(kalan));buton.style.display='none';}else{etiket.textContent='Güncel bakiye';deger.textContent='Borç yok';buton.style.display='none';}}
  function ogrenciDegisti(){sonucuTemizle();bakiyeGoster(document.getElementById('bstgOgrenci').value);document.getElementById('bstgTutar').focus();}
  function kalaniSec(){const id=document.getElementById('bstgOgrenci').value;const kalan=bakiyeler.get(id)||0;if(kalan>0){document.getElementById('bstgTutar').value=String(Math.round(kalan*100)/100);sonucuTemizle();}}

  async function ac(){
    const m=document.getElementById('bsTahsilatGirModal');m.classList.add('acik');aktifIslem={};
    document.getElementById('bstgOgrenci').value='';document.getElementById('bstgTutar').value='';document.getElementById('bstgTarih').value=istanbulBugunISO();document.getElementById('bstgAciklama').value='';document.getElementById('bstgDetay').classList.remove('acik');document.getElementById('bstgDetayToggle').textContent='Tarih ve açıklama ekle';document.getElementById('bstgBakiye').classList.remove('goster');sonucuTemizle();yontem='Havale/EFT';m.querySelectorAll('[data-bstg-yontem]').forEach(x=>x.classList.toggle('aktif',x.dataset.bstgYontem===yontem));
    const b=document.getElementById('bstgDevam');b.disabled=true;b.textContent='Yükleniyor…';try{await verileriYukle();}catch(err){console.error('Tahsilat giriş verileri:',err);const s=document.getElementById('bstgSonuc');s.className='bstg-sonuc hata';s.innerHTML='<strong>Bilgiler yüklenemedi</strong>Bağlantı veya erişim yetkisi kontrol edilmeli.';}finally{b.disabled=false;b.textContent='Tahsilatı Kaydet';}
  }

  async function kaydet(e){
    e.preventDefault();const f=document.getElementById('bstgForm');if(!f.reportValidity()) return;
    if(!window.BSIslemServisi){const s=document.getElementById('bstgSonuc');s.className='bstg-sonuc hata';s.innerHTML='<strong>Kayıt servisi hazır değil</strong>Sayfayı yenileyip tekrar deneyin.';return;}
    const tutar=Number(document.getElementById('bstgTutar').value);if(!(tutar>0)) return;
    const b=document.getElementById('bstgDevam'),s=document.getElementById('bstgSonuc');b.disabled=true;b.textContent='Kaydediliyor…';
    try{
      Object.assign(aktifIslem,{ogrenci_id:document.getElementById('bstgOgrenci').value,tutar,tarih:document.getElementById('bstgTarih').value,odeme_yontemi:yontem,aciklama:document.getElementById('bstgAciklama').value.trim()});
      const sonuc=await BSIslemServisi.tahsilatKaydet(aktifIslem);const ad=ref.ogrenciMap.get(aktifIslem.ogrenci_id)||'Öğrenci';s.className='bstg-sonuc hazir';s.innerHTML=`<strong>Tahsilat kaydedildi</strong>${htmlKacir(ad)} • ${htmlKacir(paraYaz(tutar))} • ${htmlKacir(sonuc.hesap_adi||yontem)}`;
      await verileriYukle(true);b.textContent='Kaydedildi';
      try{window.BSFinansModuluV1&&BSFinansModuluV1.anaSayfaKpilariniYukle();window.BSFinansModuluV1&&BSFinansModuluV1.tahsilatlariYukle();}catch(x){}
      setTimeout(kapat,750);
    }catch(err){console.error('Tahsilat kaydı:',err);s.className='bstg-sonuc hata';s.innerHTML=`<strong>Tahsilat kaydedilemedi</strong>${htmlKacir(err.message||'İşlem başarısız.')}`;b.disabled=false;b.textContent='Tekrar Dene';return;}
  }

  function hedefMi(el){if(!el) return false;return /Tahsilat\s*Gir/i.test((el.textContent||'').trim());}
  function butonlariBagla(){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!hedefMi(b)) return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();ac();},true);}
  async function baslat(){stilEkle();modalHazirla();butonlariBagla();}
  let deneme=0;const timer=setInterval(async()=>{deneme++;try{if(typeof bsSupabase!=='undefined'){const {data}=await bsSupabase.auth.getSession();if(data&&data.session){clearInterval(timer);baslat();}}if(deneme>40)clearInterval(timer);}catch(e){if(deneme>40)clearInterval(timer);}},250);
})();