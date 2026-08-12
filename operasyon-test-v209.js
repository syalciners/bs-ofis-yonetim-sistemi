(function(){
  const V='209';
  const GUN_OFFSET={Pazartesi:0,'Salı':1,'Çarşamba':2,'Perşembe':3,Cuma:4,Cumartesi:5,Pazar:6};

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

  function tarihEkle(iso,gun){const d=new Date(iso+'T12:00:00+03:00');d.setDate(d.getDate()+gun);return d.toISOString().slice(0,10);}
  function haftaSiniri(){const bugun=istanbulBugunISO();const d=new Date(bugun+'T12:00:00+03:00');const g=d.getDay();const fark=g===0?-6:1-g;const bas=tarihEkle(bugun,fark);return {bas,son:tarihEkle(bas,6),sonraki:tarihEkle(bas,7)};}
  function dakika(s){const p=String(s||'00:00').split(':');return Number(p[0]||0)*60+Number(p[1]||0);}
  function saatYaz(dk){dk=Math.round(dk);const h=Math.floor(dk/60)%24;const m=dk%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  function cakisir(a1,a2,b1,b2){return a1<b2&&b1<a2;}

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
    const modal=document.getElementById('v209Modal');const icerik=document.getElementById('v209Icerik');
    modal.classList.add('acik');icerik.innerHTML='<div class="v209-bos">Sabit program ve mevcut dersler kontrol ediliyor…</div>';
    const h=haftaSiniri();document.getElementById('v209Hafta').textContent=tarihKisa(h.bas)+' – '+tarihKisa(h.son)+' • kuru kontrol';
    try{
      const [pSonuc,dSonuc,oSonuc,tSonuc,bSonuc,lSonuc]=await Promise.all([
        bsSupabase.from('sabit_ders_programi').select('program_id,ogrenci_id,ogretmen_id,brans_id,derslik_id,haftanin_gunu,baslangic_saati,ders_sayisi,baslangic_tarihi,bitis_tarihi,program_durumu'),
        bsSupabase.from('dersler').select('ders_id,program_id,tarih,ogrenci_id,ogretmen_id,derslik_id,baslangic_saati,bitis_saati,ders_durumu').gte('tarih',h.bas).lt('tarih',h.sonraki),
        bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad'),
        bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad'),
        bsSupabase.from('branslar').select('brans_id,brans_adi'),
        bsSupabase.from('derslikler').select('derslik_id,mekan_adi,kapasite')
      ]);
      const hata=pSonuc.error||dSonuc.error||oSonuc.error||tSonuc.error||bSonuc.error||lSonuc.error;if(hata) throw hata;
      const dersler=dSonuc.data||[];
      const programlar=(pSonuc.data||[]).filter(p=>p.program_durumu==='Aktif' && (!p.baslangic_tarihi||p.baslangic_tarihi<=h.son) && (!p.bitis_tarihi||p.bitis_tarihi>=h.bas));
      const om=new Map((oSonuc.data||[]).map(x=>[x.ogrenci_id,x.ad_soyad]));const tm=new Map((tSonuc.data||[]).map(x=>[x.ogretmen_id,x.ad_soyad]));const bm=new Map((bSonuc.data||[]).map(x=>[x.brans_id,x.brans_adi]));const lm=new Map((lSonuc.data||[]).map(x=>[x.derslik_id,x]));
      const adaylar=[];let zaten=0;
      programlar.forEach(p=>{
        const off=GUN_OFFSET[p.haftanin_gunu];if(off===undefined) return;const tarih=tarihEkle(h.bas,off);
        if((p.baslangic_tarihi&&tarih<p.baslangic_tarihi)||(p.bitis_tarihi&&tarih>p.bitis_tarihi)) return;
        const varMi=dersler.some(d=>d.program_id===p.program_id&&String(d.tarih).slice(0,10)===tarih);if(varMi){zaten++;return;}
        const bas=dakika(p.baslangic_saati),bit=bas+(Number(p.ders_sayisi)||1)*60;
        const aktifDers=dersler.filter(d=>String(d.tarih).slice(0,10)===tarih&&!['İptal','Ertelendi','Öğretmen İptali'].includes(d.ders_durumu));
        const kisiCakisma=aktifDers.some(d=>cakisir(bas,bit,dakika(d.baslangic_saati),dakika(d.bitis_saati))&&(d.ogretmen_id===p.ogretmen_id||d.ogrenci_id===p.ogrenci_id));
        const loc=lm.get(p.derslik_id);const kapasite=Math.max(1,Number(loc&&loc.kapasite)||1);const eszamanli=aktifDers.filter(d=>d.derslik_id===p.derslik_id&&cakisir(bas,bit,dakika(d.baslangic_saati),dakika(d.bitis_saati))).length;
        adaylar.push({p,tarih,bas,bit,cakisma:kisiCakisma||eszamanli>=kapasite});
      });
      const cakisma=adaylar.filter(x=>x.cakisma).length;const olusacak=adaylar.length-cakisma;
      icerik.innerHTML=`<div class="v209-kpi"><div class="v209-kart"><span>Aktif Program</span><strong>${programlar.length}</strong></div><div class="v209-kart"><span>Oluşacak</span><strong>${olusacak}</strong></div><div class="v209-kart"><span>Zaten Var</span><strong>${zaten}</strong></div><div class="v209-kart"><span>Çakışma</span><strong>${cakisma}</strong></div></div><div class="v209-liste"><div class="v209-liste-baslik">Oluşturulacak Dersler</div>${adaylar.filter(x=>!x.cakisma).length?adaylar.filter(x=>!x.cakisma).map(x=>`<div class="v209-satir"><div class="v209-saat">${htmlKacir(saatYaz(x.bas))}<br>${htmlKacir(saatYaz(x.bit))}</div><div><div class="v209-ad">${htmlKacir(om.get(x.p.ogrenci_id)||'Öğrenci')}</div><div class="v209-detay"><span>${htmlKacir(tarihKisa(x.tarih))}</span><span>${htmlKacir(tm.get(x.p.ogretmen_id)||'Öğretmen')}</span><span>${htmlKacir(bm.get(x.p.brans_id)||'Branş')}</span><span>${htmlKacir((lm.get(x.p.derslik_id)||{}).mekan_adi||'Yer')}</span></div></div><span class="v209-rozet">Hazır</span></div>`).join(''):'<div class="v209-bos">Bu hafta oluşturulacak yeni ders yok.</div>'}</div><div class="v209-uyari"><strong>Önizleme modu.</strong> Bu ekran hiçbir kayıt yazmaz. Gerçek üretim butonunu, Google Sheets → Supabase güvenli yazma akışı tamamlandıktan sonra açacağız.</div>`;
    }catch(err){console.error('V209 haftalık önizleme:',err);icerik.innerHTML='<div class="v209-bos">Haftalık program kontrol edilemedi. Bağlantı veya erişim yetkisi kontrol edilmeli.</div>';}
  }

  function butonuBagla(){
    const buton=[...document.querySelectorAll('.hizli-buton')].find(b=>b.textContent.includes('Haftalık Dersleri Oluştur'));
    if(!buton) return;
    buton.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();onizleme();},true);
  }

  function baslat(){stilEkle();modalHazirla();butonuBagla();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();