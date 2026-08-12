(function(){
  const V='211';
  let ogrenciler=[];
  let ogretmenMap=new Map();
  let bransMap=new Map();
  let hazir=false;

  function norm(v){return String(v||'').trim().toLocaleLowerCase('tr-TR');}
  function stilEkle(){
    if(document.getElementById('v211Stil')) return;
    const s=document.createElement('style'); s.id='v211Stil';
    s.textContent=`
      .v211-clickable{cursor:pointer!important;position:relative;padding-right:40px!important;touch-action:manipulation;-webkit-tap-highlight-color:rgba(37,99,235,.08)}
      .v211-clickable:active{background:#eff6ff!important}
      .v211-chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:22px;pointer-events:none}
      .v211-modal{position:fixed;inset:0;z-index:900;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
      .v211-modal.acik{display:flex}
      .v211-sheet{width:min(780px,100%);max-height:91dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.2)}
      .v211-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      .v211-ad{font-size:21px;font-weight:850;color:var(--yazi);line-height:1.2}.v211-meta{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px 10px;color:var(--ikincil);font-size:10.5px}
      .v211-kapat{width:40px;height:40px;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .v211-sonraki{margin-bottom:10px;padding:13px 14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1e40af}.v211-sonraki small{display:block;font-size:9px;font-weight:800;text-transform:uppercase}.v211-sonraki strong{display:block;margin-top:5px;font-size:12px}.v211-sonraki div{margin-top:4px;font-size:9.5px;color:#3b5da8}
      .v211-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.v211-kpi>div{padding:12px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.v211-kpi span{display:block;color:var(--ikincil);font-size:9px;font-weight:700}.v211-kpi strong{display:block;margin-top:7px;font-size:17px;color:var(--yazi);font-weight:850}.v211-borc strong{color:var(--kirmizi)}.v211-alacak strong{color:var(--yesil)}
      .v211-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v211-kart{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:#fff}.v211-baslik{padding:11px 13px;border-bottom:1px solid var(--kenar);font-size:11px;font-weight:820}.v211-satir{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 12px;border-bottom:1px solid #f1f5f9}.v211-satir:last-child{border-bottom:none}.v211-tarih{padding:7px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);text-align:center;font-size:9px;font-weight:800}.v211-ad2{font-size:10px;font-weight:800}.v211-detay{margin-top:3px;color:var(--ikincil);font-size:8.7px;line-height:1.35}.v211-rozet{padding:5px 7px;border-radius:999px;background:var(--mavi-acik);color:var(--mavi);font-size:8px;font-weight:800;white-space:nowrap}.v211-tutar{font-size:10.5px;font-weight:850;color:var(--yesil);white-space:nowrap}.v211-bos{padding:20px 14px;text-align:center;color:var(--ikincil);font-size:10px}
      @media(max-width:700px){.v211-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.v211-ad{font-size:18px}.v211-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.v211-grid{grid-template-columns:1fr}.v211-satir{grid-template-columns:54px minmax(0,1fr) auto;padding:10px}}
    `;
    document.head.appendChild(s);
  }

  function modalHazirla(){
    if(document.getElementById('v211Modal')) return;
    const m=document.createElement('div');m.id='v211Modal';m.className='v211-modal';
    m.innerHTML='<div class="v211-sheet"><div class="v211-ust"><div><div id="v211Ad" class="v211-ad">Öğrenci</div><div id="v211Meta" class="v211-meta"></div></div><button id="v211Kapat" class="v211-kapat" type="button">×</button></div><div id="v211Icerik"><div class="v211-bos">Yükleniyor…</div></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('acik');});
    document.getElementById('v211Kapat').addEventListener('click',()=>m.classList.remove('acik'));
  }

  async function referanslariGetir(){
    const [o,t,b]=await Promise.all([
      bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,durum').order('ad_soyad'),
      bsSupabase.from('ogretmenler').select('ogretmen_id,ad_soyad'),
      bsSupabase.from('branslar').select('brans_id,brans_adi')
    ]);
    const hata=o.error||t.error||b.error;if(hata) throw hata;
    ogrenciler=o.data||[];
    ogretmenMap=new Map((t.data||[]).map(x=>[x.ogretmen_id,x.ad_soyad]));
    bransMap=new Map((b.data||[]).map(x=>[x.brans_id,x.brans_adi]));
    hazir=true;
  }

  function ogrenciBulKart(kart){
    const id=kart.dataset.ogrenciId;
    if(id){const x=ogrenciler.find(o=>o.ogrenci_id===id);if(x)return x;}
    const adEl=kart.querySelector('.v207-ogrenci-ad');
    const ad=norm(adEl&&adEl.textContent);
    return ogrenciler.find(o=>norm(o.ad_soyad)===ad)||null;
  }

  function kartlariHazirla(){
    if(!hazir) return;
    document.querySelectorAll('.v207-ogrenci-kart').forEach(k=>{
      const o=ogrenciBulKart(k); if(!o) return;
      k.dataset.ogrenciId=o.ogrenci_id;k.classList.add('v211-clickable');
      if(!k.querySelector('.v211-chevron')){const c=document.createElement('span');c.className='v211-chevron';c.textContent='›';k.appendChild(c);}
    });
  }

  async function detayAc(o){
    const modal=document.getElementById('v211Modal'),icerik=document.getElementById('v211Icerik');
    document.getElementById('v211Ad').textContent=o.ad_soyad||'Öğrenci';
    document.getElementById('v211Meta').innerHTML=[o.durum||'',o.veli_adi?('Veli: '+o.veli_adi):'',o.ogrenci_telefon||o.veli_telefon||'',o.email||''].filter(Boolean).map(x=>'<span>'+htmlKacir(x)+'</span>').join('');
    icerik.innerHTML='<div class="v211-bos">Ders ve tahsilat bilgileri yükleniyor…</div>';modal.classList.add('acik');
    try{
      const [d,p]=await Promise.all([
        bsSupabase.from('dersler').select('tarih,baslangic_saati,bitis_saati,ogretmen_id,brans_id,ders_durumu,ogrenci_toplam_tutar').eq('ogrenci_id',o.ogrenci_id).order('tarih',{ascending:false}).order('baslangic_saati',{ascending:false}),
        bsSupabase.from('tahsilatlar').select('tarih,tutar,odeme_yontemi,aciklama').eq('ogrenci_id',o.ogrenci_id).order('tarih',{ascending:false})
      ]);
      if(d.error)throw d.error;if(p.error)throw p.error;
      const dersler=d.data||[],od=p.data||[],yapilan=dersler.filter(x=>x.ders_durumu==='Yapıldı');
      const dersTutari=yapilan.reduce((t,x)=>t+(Number(x.ogrenci_toplam_tutar)||0),0),tahsil=od.reduce((t,x)=>t+(Number(x.tutar)||0),0),kalan=dersTutari-tahsil;
      const bugun=istanbulBugunISO();
      const sonraki=dersler.filter(x=>String(x.tarih).slice(0,10)>=bugun&&!['İptal','Ertelendi','Öğretmen İptali'].includes(x.ders_durumu)).sort((a,b)=>(String(a.tarih)+String(a.baslangic_saati)).localeCompare(String(b.tarih)+String(b.baslangic_saati)))[0];
      const sonrakiHtml=sonraki?'<div class="v211-sonraki"><small>Sıradaki Ders</small><strong>'+htmlKacir(tarihKisa(sonraki.tarih))+' • '+htmlKacir(saatKisalt(sonraki.baslangic_saati))+'–'+htmlKacir(saatKisalt(sonraki.bitis_saati))+'</strong><div>'+htmlKacir(ogretmenMap.get(sonraki.ogretmen_id)||'Öğretmen')+' • '+htmlKacir(bransMap.get(sonraki.brans_id)||'Branş')+'</div></div>':'';
      const kalanSinif=kalan>0.009?'v211-borc':(kalan<-.009?'v211-alacak':'');
      const kalanAd=kalan>0.009?'Kalan Borç':(kalan<-.009?'Ön Ödeme':'Bakiye');
      const dersHtml=dersler.slice(0,6).map(x=>'<div class="v211-satir"><div class="v211-tarih">'+htmlKacir(tarihKisa(x.tarih).slice(0,5))+'<br>'+htmlKacir(saatKisalt(x.baslangic_saati))+'</div><div><div class="v211-ad2">'+htmlKacir(bransMap.get(x.brans_id)||'Ders')+'</div><div class="v211-detay">'+htmlKacir(ogretmenMap.get(x.ogretmen_id)||'Öğretmen')+(x.ders_durumu==='Yapıldı'?' • '+htmlKacir(paraYaz(x.ogrenci_toplam_tutar||0)):'')+'</div></div><span class="v211-rozet">'+htmlKacir(x.ders_durumu||'—')+'</span></div>').join('')||'<div class="v211-bos">Ders kaydı yok.</div>';
      const odHtml=od.slice(0,5).map(x=>'<div class="v211-satir"><div class="v211-tarih">'+htmlKacir(tarihKisa(x.tarih).slice(0,5))+'</div><div><div class="v211-ad2">'+htmlKacir(x.odeme_yontemi||'Tahsilat')+'</div><div class="v211-detay">'+htmlKacir(x.aciklama||'')+'</div></div><span class="v211-tutar">'+htmlKacir(paraYaz(x.tutar||0))+'</span></div>').join('')||'<div class="v211-bos">Tahsilat kaydı yok.</div>';
      icerik.innerHTML=sonrakiHtml+'<div class="v211-kpi"><div><span>Yapılan Ders</span><strong>'+yapilan.length+'</strong></div><div><span>Ders Tutarı</span><strong>'+htmlKacir(paraYaz(dersTutari))+'</strong></div><div><span>Toplam Tahsilat</span><strong>'+htmlKacir(paraYaz(tahsil))+'</strong></div><div class="'+kalanSinif+'"><span>'+kalanAd+'</span><strong>'+htmlKacir(paraYaz(Math.abs(kalan)))+'</strong></div></div><div class="v211-grid"><section class="v211-kart"><div class="v211-baslik">Son Dersler</div>'+dersHtml+'</section><section class="v211-kart"><div class="v211-baslik">Son Tahsilatlar</div>'+odHtml+'</section></div>';
    }catch(err){console.error('V211 öğrenci detay:',err);icerik.innerHTML='<div class="v211-bos">Öğrenci detayları yüklenemedi.</div>';}
  }

  function delegasyonuBagla(){
    document.addEventListener('click',e=>{
      const kart=e.target.closest&&e.target.closest('.v207-ogrenci-kart');
      if(!kart||!hazir) return;
      const o=ogrenciBulKart(kart);if(!o)return;
      e.preventDefault();e.stopPropagation();detayAc(o);
    },true);
  }

  async function baslat(){
    stilEkle();modalHazirla();delegasyonuBagla();
    try{await referanslariGetir();}catch(err){console.error('V211 referans:',err);return;}
    kartlariHazirla();
    new MutationObserver(()=>kartlariHazirla()).observe(document.body,{childList:true,subtree:true});
    setInterval(kartlariHazirla,1200);
  }

  let deneme=0;const timer=setInterval(async()=>{deneme++;try{if(typeof bsSupabase!=='undefined'){const {data}=await bsSupabase.auth.getSession();if(data&&data.session){clearInterval(timer);baslat();}}if(deneme>50)clearInterval(timer);}catch(e){if(deneme>50)clearInterval(timer);}},250);
})();