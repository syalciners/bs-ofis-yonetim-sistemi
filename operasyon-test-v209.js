(function(){
  const V='209';

  function stilEkle(){
    const style=document.createElement('style');
    style.textContent=`
      .v209-modal{position:fixed;inset:0;z-index:600;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.38);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
      .v209-modal.acik{display:flex}
      .v209-panel{width:min(720px,100%);max-height:88dvh;overflow:auto;background:#f8fafc;border-radius:24px 24px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(15,23,42,.18)}
      .v209-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
      .v209-baslik{font-size:20px;font-weight:820;color:var(--yazi)}
      .v209-alt{margin-top:5px;font-size:11px;line-height:1.45;color:var(--ikincil)}
      .v209-kapat{width:38px;height:38px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:white;color:var(--ikincil);font-size:22px;line-height:1;cursor:pointer}
      .v209-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
      .v209-kart{padding:13px 12px;border:1px solid var(--kenar);border-radius:14px;background:white}
      .v209-kart span{display:block;color:var(--ikincil);font-size:9.5px;font-weight:700}
      .v209-kart strong{display:block;margin-top:8px;color:var(--yazi);font-size:22px;line-height:1;font-weight:850}
      .v209-liste{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:white}
      .v209-liste-baslik{padding:12px 14px;border-bottom:1px solid var(--kenar);font-size:12px;font-weight:800}
      .v209-satir{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #f1f5f9}
      .v209-satir:last-child{border-bottom:none}
      .v209-saat{padding:8px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:10px;font-weight:800}
      .v209-ad{font-size:11px;font-weight:800;color:var(--yazi)}
      .v209-detay{margin-top:4px;display:flex;flex-wrap:wrap;gap:3px 8px;color:var(--ikincil);font-size:9px}
      .v209-rozet{padding:6px 8px;border-radius:999px;background:var(--yesil-acik);color:var(--yesil);font-size:8.5px;font-weight:800;white-space:nowrap}
      .v209-uyari{margin-top:12px;padding:11px 12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:10px;line-height:1.5}
      .v209-bos{padding:24px;text-align:center;color:var(--ikincil);font-size:11px}
      @media(max-width:640px){
        .v209-panel{padding:15px 12px calc(18px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0}
        .v209-baslik{font-size:18px}.v209-kpi{grid-template-columns:repeat(2,1fr)}.v209-kart{padding:11px}.v209-kart strong{font-size:20px}
        .v209-satir{padding:10px 11px;grid-template-columns:52px minmax(0,1fr) auto}.v209-liste-baslik{padding:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function modalHazirla(){
    if(document.getElementById('v209Modal')) return;
    const el=document.createElement('div');
    el.id='v209Modal';el.className='v209-modal';
    el.innerHTML=`<div class="v209-panel"><div class="v209-ust"><div><div class="v209-baslik">Haftalık Dersleri Oluştur</div><div id="v209Hafta" class="v209-alt">Program kontrol ediliyor…</div></div><button id="v209Kapat" class="v209-kapat" type="button">×</button></div><div id="v209Icerik"><div class="v209-bos">Kontrol ediliyor…</div></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click',e=>{if(e.target===el) el.classList.remove('acik');});
    document.getElementById('v209Kapat').addEventListener('click',()=>el.classList.remove('acik'));
  }

  async function onizleme(){
    const modal=document.getElementById('v209Modal');
    const icerik=document.getElementById('v209Icerik');
    modal.classList.add('acik');
    icerik.innerHTML='<div class="v209-bos">Sabit program ve mevcut dersler kontrol ediliyor…</div>';

    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders/program servisi yüklenmedi.');
      const sonuc=await BSDersProgramServisi.haftalikOnizleme();
      const h=sonuc.hafta,ref=sonuc.referanslar;
      document.getElementById('v209Hafta').textContent=tarihKisa(h.bas)+' – '+tarihKisa(h.son)+' • kuru kontrol';

      const hazirlar=sonuc.adaylar.filter(x=>!x.cakisma);
      icerik.innerHTML=`<div class="v209-kpi"><div class="v209-kart"><span>Aktif Program</span><strong>${sonuc.aktifProgram}</strong></div><div class="v209-kart"><span>Oluşacak</span><strong>${sonuc.olusacak}</strong></div><div class="v209-kart"><span>Zaten Var</span><strong>${sonuc.zaten}</strong></div><div class="v209-kart"><span>Çakışma</span><strong>${sonuc.cakisma}</strong></div></div><div class="v209-liste"><div class="v209-liste-baslik">Oluşturulacak Dersler</div>${hazirlar.length?hazirlar.map(x=>`<div class="v209-satir"><div class="v209-saat">${htmlKacir(BSDersProgramServisi.saatYaz(x.bas))}<br>${htmlKacir(BSDersProgramServisi.saatYaz(x.bit))}</div><div><div class="v209-ad">${htmlKacir(ref.ogrenciMap.get(x.p.ogrenci_id)||'Öğrenci')}</div><div class="v209-detay"><span>${htmlKacir(tarihKisa(x.tarih))}</span><span>${htmlKacir(ref.ogretmenMap.get(x.p.ogretmen_id)||'Öğretmen')}</span><span>${htmlKacir(ref.bransMap.get(x.p.brans_id)||'Branş')}</span><span>${htmlKacir((ref.derslikMap.get(x.p.derslik_id)||{}).mekan_adi||'Yer')}</span></div></div><span class="v209-rozet">Hazır</span></div>`).join(''):'<div class="v209-bos">Bu hafta oluşturulacak yeni ders yok.</div>'}</div><div class="v209-uyari"><strong>Önizleme modu.</strong> Bu ekran hiçbir kayıt yazmaz. Gerçek üretim butonunu güvenli ve tekrar çalıştırıldığında çift kayıt üretmeyen yazma akışı tamamlandıktan sonra açacağız.</div>`;
    }catch(err){
      console.error('V209 haftalık önizleme:',err);
      icerik.innerHTML='<div class="v209-bos">Haftalık program kontrol edilemedi. Bağlantı veya erişim yetkisi kontrol edilmeli.</div>';
    }
  }

  function butonuBagla(){
    const buton=[...document.querySelectorAll('.hizli-buton')].find(b=>b.textContent.includes('Haftalık Dersleri Oluştur'));
    if(!buton) return;
    buton.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();onizleme();},true);
  }

  function baslat(){stilEkle();modalHazirla();butonuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();
