(function(){
  const V='210';
  let ogrenciMap=new Map();
  let ogretmenMap=new Map();
  let bransMap=new Map();

  function stilEkle(){
    const style=document.createElement('style');
    style.textContent=`
      .v210-clickable{cursor:pointer;position:relative;padding-right:40px!important;transition:background .16s,border-color .16s,transform .16s}
      .v210-clickable:hover{background:#f8fbff;border-color:#bfdbfe}
      .v210-clickable:active{transform:scale(.995)}
      .v210-chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--soluk);font-size:22px;font-weight:400}
      .v210-modal{position:fixed;inset:0;z-index:650;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
      .v210-modal.acik{display:flex}
      .v210-sheet{width:min(780px,100%);max-height:91dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.2)}
      .v210-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}
      .v210-ad{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}
      .v210-meta{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px 10px;color:var(--ikincil);font-size:10.5px;line-height:1.45}
      .v210-kapat{width:38px;height:38px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:white;color:var(--ikincil);font-size:22px;line-height:1;cursor:pointer}
      .v210-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .v210-kpi-kart{padding:13px 12px;border:1px solid var(--kenar);border-radius:14px;background:white}
      .v210-kpi-kart span{display:block;color:var(--ikincil);font-size:9.5px;font-weight:700;line-height:1.25}
      .v210-kpi-kart strong{display:block;margin-top:8px;color:var(--yazi);font-size:18px;line-height:1.05;font-weight:850;word-break:break-word}
      .v210-kpi-kart.borc strong{color:var(--kirmizi)}
      .v210-kpi-kart.alacak strong{color:var(--yesil)}
      .v210-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .v210-kart{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:white}
      .v210-kart-baslik{padding:12px 14px;border-bottom:1px solid var(--kenar);font-size:12px;font-weight:820;color:var(--yazi)}
      .v210-satir{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 13px;border-bottom:1px solid #f1f5f9}
      .v210-satir:last-child{border-bottom:none}
      .v210-saat{padding:7px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);font-size:9.5px;line-height:1.25;text-align:center;font-weight:820}
      .v210-satir-ad{font-size:10.5px;font-weight:800;color:var(--yazi)}
      .v210-satir-detay{margin-top:4px;display:flex;flex-wrap:wrap;gap:3px 8px;color:var(--ikincil);font-size:8.8px;line-height:1.35}
      .v210-tutar{font-size:11px;font-weight:850;color:var(--yesil);white-space:nowrap}
      .v210-rozet{padding:5px 7px;border-radius:999px;font-size:8px;font-weight:800;white-space:nowrap}
      .v210-rozet.plan{background:var(--mavi-acik);color:var(--mavi)}
      .v210-rozet.yapildi{background:var(--yesil-acik);color:var(--yesil)}
      .v210-rozet.iptal{background:var(--kirmizi-acik);color:var(--kirmizi)}
      .v210-bos{padding:20px 14px;color:var(--ikincil);font-size:10px;text-align:center;line-height:1.45}
      .v210-sonraki{margin-bottom:10px;padding:13px 14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1e40af}
      .v210-sonraki-etiket{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
      .v210-sonraki-main{margin-top:5px;font-size:12px;font-weight:850}
      .v210-sonraki-alt{margin-top:4px;font-size:9.5px;line-height:1.4;color:#3b5da8}
      @media(max-width:700px){
        .v210-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}
        .v210-ad{font-size:18px}.v210-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.v210-kpi-kart{padding:11px}.v210-kpi-kart strong{font-size:17px}
        .v210-grid{grid-template-columns:1fr}.v210-satir{padding:10px 11px;grid-template-columns:54px minmax(0,1fr) auto}
      }
    `;
    document.head.appendChild(style);
  }

  function durumClass(d){
    if(d==='Yapıldı') return 'yapildi';
    if(['İptal','Ertelendi','Öğretmen İptali'].includes(d)) return 'iptal';
    return 'plan';
  }

  function modalHazirla(){
    if(document.getElementById('v210Modal')) return;
    const modal=document.createElement('div');
    modal.id='v210Modal';
    modal.className='v210-modal';
    modal.innerHTML=`<div class="v210-sheet"><div class="v210-ust"><div><div id="v210Ad" class="v210-ad">Öğrenci</div><div id="v210Meta" class="v210-meta"></div></div><button id="v210Kapat" class="v210-kapat" type="button">×</button></div><div id="v210Icerik"><div class="v210-bos">Yükleniyor…</div></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal) modal.classList.remove('acik');});
    document.getElementById('v210Kapat').addEventListener('click',()=>modal.classList.remove('acik'));
    document.addEventListener('keydown',e=>{if(e.key==='Escape') modal.classList.remove('acik');});
  }

  async function referanslariGetir(){
    const [o,t,b]=await Promise.all([
      bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar').order('ad_soyad'),
      bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad'),
      bsSupabase.from('branslar').select('brans_id,brans_adi')
    ]);
    const hata=o.error||t.error||b.error;if(hata) throw hata;
    ogrenciMap=new Map((o.data||[]).map(x=>[String(x.ad_soyad||'').trim(),x]));
    ogretmenMap=new Map((t.data||[]).map(x=>[x.ogretmen_id,x.ad_soyad]));
    bransMap=new Map((b.data||[]).map(x=>[x.brans_id,x.brans_adi]));
  }

  function kartlariIsaretle(){
    document.querySelectorAll('.v207-ogrenci-kart').forEach(kart=>{
      if(kart.dataset.v210==='1') return;
      const adEl=kart.querySelector('.v207-ogrenci-ad');
      const ad=adEl?adEl.textContent.trim():'';
      const ogr=ogrenciMap.get(ad);
      if(!ogr) return;
      kart.dataset.v210='1';
      kart.dataset.ogrenciId=ogr.ogrenci_id;
      kart.classList.add('v210-clickable');
      const ok=document.createElement('span');ok.className='v210-chevron';ok.textContent='›';kart.appendChild(ok);
      kart.addEventListener('click',()=>detayAc(ogr.ogrenci_id));
    });
  }

  async function detayAc(ogrenciId){
    const modal=document.getElementById('v210Modal');
    const icerik=document.getElementById('v210Icerik');
    const ogr=[...ogrenciMap.values()].find(x=>x.ogrenci_id===ogrenciId);
    if(!ogr) return;
    document.getElementById('v210Ad').textContent=ogr.ad_soyad||'Öğrenci';
    const meta=[ogr.durum||'',ogr.veli_adi?('Veli: '+ogr.veli_adi):'',ogr.ogrenci_telefon||ogr.veli_telefon||'',ogr.email||''].filter(Boolean);
    document.getElementById('v210Meta').innerHTML=meta.map(x=>`<span>${htmlKacir(x)}</span>`).join('');
    icerik.innerHTML='<div class="v210-bos">Ders ve ödeme geçmişi yükleniyor…</div>';
    modal.classList.add('acik');

    try{
      const [dSonuc,pSonuc]=await Promise.all([
        bsSupabase.from('dersler').select('ders_id,tarih,baslangic_saati,bitis_saati,ogretmen_id,brans_id,ders_durumu,ogrenci_toplam_tutar').eq('ogrenci_id',ogrenciId).order('tarih',{ascending:false}).order('baslangic_saati',{ascending:false}),
        bsSupabase.from('tahsilatlar').select('tahsilat_id,tarih,tutar,odeme_yontemi,aciklama').eq('ogrenci_id',ogrenciId).order('tarih',{ascending:false})
      ]);
      if(dSonuc.error) throw dSonuc.error;if(pSonuc.error) throw pSonuc.error;
      const dersler=dSonuc.data||[];const tahsilatlar=pSonuc.data||[];
      const yapilan=dersler.filter(d=>d.ders_durumu==='Yapıldı');
      const tahakkuk=yapilan.reduce((t,d)=>t+(Number(d.ogrenci_toplam_tutar)||0),0);
      const tahsil=tahsilatlar.reduce((t,p)=>t+(Number(p.tutar)||0),0);
      const kalan=tahakkuk-tahsil;
      const bugun=istanbulBugunISO();
      const sonraki=dersler.filter(d=>String(d.tarih).slice(0,10)>=bugun&&!['İptal','Ertelendi','Öğretmen İptali'].includes(d.ders_durumu)).sort((a,b)=>(String(a.tarih)+String(a.baslangic_saati)).localeCompare(String(b.tarih)+String(b.baslangic_saati)))[0];
      const gecmis=dersler.slice().sort((a,b)=>(String(b.tarih)+String(b.baslangic_saati)).localeCompare(String(a.tarih)+String(a.baslangic_saati))).slice(0,6);
      const sonOdemeler=tahsilatlar.slice(0,5);
      const kalanEtiket=kalan>0.009?'Kalan Borç':(kalan<-.009?'Ön Ödeme':'Bakiye');
      const kalanSinif=kalan>0.009?'borc':(kalan<-.009?'alacak':'');

      const sonrakiHtml=sonraki?`<div class="v210-sonraki"><div class="v210-sonraki-etiket">Sıradaki Ders</div><div class="v210-sonraki-main">${htmlKacir(tarihKisa(sonraki.tarih))} • ${htmlKacir(saatKisalt(sonraki.baslangic_saati))}–${htmlKacir(saatKisalt(sonraki.bitis_saati))}</div><div class="v210-sonraki-alt">${htmlKacir(ogretmenMap.get(sonraki.ogretmen_id)||'Öğretmen')} • ${htmlKacir(bransMap.get(sonraki.brans_id)||'Branş')} • ${htmlKacir(sonraki.ders_durumu||'Planlandı')}</div></div>`:'';

      const dersHtml=gecmis.length?gecmis.map(d=>`<div class="v210-satir"><div class="v210-saat">${htmlKacir(tarihKisa(d.tarih).slice(0,5))}<br>${htmlKacir(saatKisalt(d.baslangic_saati))}</div><div><div class="v210-satir-ad">${htmlKacir(bransMap.get(d.brans_id)||'Ders')}</div><div class="v210-satir-detay"><span>${htmlKacir(ogretmenMap.get(d.ogretmen_id)||'Öğretmen')}</span>${d.ders_durumu==='Yapıldı'?`<span>${htmlKacir(paraYaz(d.ogrenci_toplam_tutar||0))}</span>`:''}</div></div><span class="v210-rozet ${durumClass(d.ders_durumu)}">${htmlKacir(d.ders_durumu||'—')}</span></div>`).join(''):'<div class="v210-bos">Ders kaydı bulunmuyor.</div>';
      const odemeHtml=sonOdemeler.length?sonOdemeler.map(p=>`<div class="v210-satir" style="grid-template-columns:60px minmax(0,1fr) auto"><div class="v210-saat">${htmlKacir(tarihKisa(p.tarih).slice(0,5))}</div><div><div class="v210-satir-ad">${htmlKacir(p.odeme_yontemi||'Tahsilat')}</div><div class="v210-satir-detay">${p.aciklama?`<span>${htmlKacir(p.aciklama)}</span>`:''}</div></div><span class="v210-tutar">${htmlKacir(paraYaz(p.tutar||0))}</span></div>`).join(''):'<div class="v210-bos">Tahsilat kaydı bulunmuyor.</div>';

      icerik.innerHTML=`${sonrakiHtml}<div class="v210-kpi"><div class="v210-kpi-kart"><span>Yapılan Ders</span><strong>${yapilan.length}</strong></div><div class="v210-kpi-kart"><span>Ders Tutarı</span><strong>${htmlKacir(paraYaz(tahakkuk))}</strong></div><div class="v210-kpi-kart"><span>Toplam Tahsilat</span><strong>${htmlKacir(paraYaz(tahsil))}</strong></div><div class="v210-kpi-kart ${kalanSinif}"><span>${htmlKacir(kalanEtiket)}</span><strong>${htmlKacir(paraYaz(Math.abs(kalan)))}</strong></div></div><div class="v210-grid"><section class="v210-kart"><div class="v210-kart-baslik">Son Dersler</div>${dersHtml}</section><section class="v210-kart"><div class="v210-kart-baslik">Son Tahsilatlar</div>${odemeHtml}</section></div>`;
    }catch(err){
      console.error('V210 öğrenci detay:',err);
      icerik.innerHTML='<div class="v210-bos">Öğrenci detayları yüklenemedi. Bağlantı veya erişim yetkisi kontrol edilmeli.</div>';
    }
  }

  async function baslat(){
    stilEkle();modalHazirla();
    try{await referanslariGetir();}catch(err){console.error('V210 referans:',err);return;}
    kartlariIsaretle();
    const hedef=document.getElementById('ogrenciListesiV207');
    if(hedef){new MutationObserver(()=>kartlariIsaretle()).observe(hedef,{childList:true,subtree:true});}
  }

  let deneme=0;
  const timer=setInterval(async()=>{
    deneme++;
    try{
      if(typeof bsSupabase!=='undefined'){
        const {data}=await bsSupabase.auth.getSession();
        if(data&&data.session){clearInterval(timer);baslat();}
      }
      if(deneme>40) clearInterval(timer);
    }catch(e){if(deneme>40) clearInterval(timer);}
  },250);
})();
