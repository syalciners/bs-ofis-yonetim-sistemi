(function(){
  const V='212';
  let ogrenciler=new Map();
  let hesaplar=new Map();
  let kayitlar=[];
  let filtre='Tümü';

  function stilEkle(){
    const style=document.createElement('style');
    style.textContent=`
      .v212-filtre{display:grid;grid-template-columns:180px minmax(220px,1fr) auto;gap:10px;align-items:center;margin-bottom:12px}
      .v212-input,.v212-ay{height:42px;border:1px solid var(--kenar);border-radius:11px;background:#fff;color:var(--yazi);padding:0 12px;outline:none}
      .v212-input:focus,.v212-ay:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
      .v212-chipler{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .v212-chip{height:34px;padding:0 11px;border:1px solid var(--kenar);border-radius:999px;background:#fff;color:var(--ikincil);font-size:10px;font-weight:780;cursor:pointer}
      .v212-chip.aktif{border-color:#bfdbfe;background:var(--mavi-acik);color:var(--mavi)}
      .v212-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:12px;border-bottom:1px solid var(--kenar);background:#f8fafc}
      .v212-kpi-kart{padding:12px 13px;border:1px solid var(--kenar);border-radius:13px;background:#fff}
      .v212-kpi-kart span{display:block;font-size:9.5px;font-weight:720;color:var(--ikincil)}
      .v212-kpi-kart strong{display:block;margin-top:7px;font-size:18px;line-height:1.05;font-weight:850;color:var(--yazi)}
      .v212-kpi-kart.vurgu strong{color:var(--yesil)}
      .v212-baslik-satir{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--kenar)}
      .v212-baslik-satir strong{font-size:12px}.v212-sayac{font-size:10px;color:var(--ikincil);font-weight:700}
      .v212-liste{display:grid}
      .v212-satir{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 14px;border-bottom:1px solid #f1f5f9}
      .v212-satir:last-child{border-bottom:none}
      .v212-tarih{padding:7px 5px;border-radius:9px;background:var(--mavi-acik);color:var(--mavi);font-size:9px;line-height:1.25;text-align:center;font-weight:820}
      .v212-ad{font-size:11px;font-weight:820;color:var(--yazi)}
      .v212-detay{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:4px;color:var(--ikincil);font-size:9px;line-height:1.35}
      .v212-tutar{font-size:12px;font-weight:850;color:var(--yesil);white-space:nowrap}
      .v212-bos{min-height:180px;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--ikincil);font-size:10.5px}
      @media(max-width:760px){
        .v212-filtre{grid-template-columns:1fr 1fr}.v212-chipler{grid-column:1/-1;justify-content:flex-start}
        .v212-kpi{grid-template-columns:repeat(2,minmax(0,1fr));padding:9px;gap:7px}.v212-kpi-kart{padding:10px}.v212-kpi-kart strong{font-size:16px}
      }
      @media(max-width:520px){
        .v212-filtre{grid-template-columns:1fr}.v212-chipler{grid-column:auto}.v212-ay,.v212-input{width:100%;height:40px}
        .v212-satir{grid-template-columns:54px minmax(0,1fr) auto;padding:10px 11px;gap:9px}.v212-tarih{font-size:8.5px}.v212-ad{font-size:10.5px}.v212-detay{font-size:8.5px}.v212-tutar{font-size:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function aySiniri(ym){
    const p=String(ym||'').split('-');
    const y=Number(p[0]),m=Number(p[1]);
    const sonraki=m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`;
    return {bas:`${y}-${String(m).padStart(2,'0')}-01`,sonraki};
  }

  function tarihEtiket(iso){
    try{return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short'}).format(new Date(String(iso).slice(0,10)+'T12:00:00+03:00'));}
    catch(e){return String(iso||'').slice(0,10);}
  }

  function arayuzHazirla(){
    const bolum=document.getElementById('gorunum-tahsilat');
    if(!bolum) return false;
    if(document.getElementById('v212Filtre')) return true;
    const kart=bolum.querySelector('.kart');
    if(!kart) return false;
    const toolbar=document.createElement('div');
    toolbar.id='v212Filtre';toolbar.className='v212-filtre';
    toolbar.innerHTML=`<input id="v212Ay" class="v212-ay" type="month" aria-label="Ay seç"><input id="v212Ara" class="v212-input" type="search" placeholder="Öğrenci veya ödeme yöntemi ara…" aria-label="Tahsilat ara"><div class="v212-chipler"><button class="v212-chip aktif" data-v212-filtre="Tümü" type="button">Tümü</button><button class="v212-chip" data-v212-filtre="Havale/EFT" type="button">Havale/EFT</button><button class="v212-chip" data-v212-filtre="Nakit" type="button">Nakit</button></div>`;
    kart.parentNode.insertBefore(toolbar,kart);
    kart.innerHTML=`<div id="v212Kpi" class="v212-kpi"><div class="v212-kpi-kart vurgu"><span>Toplam Tahsilat</span><strong>…</strong></div><div class="v212-kpi-kart"><span>Kayıt</span><strong>…</strong></div><div class="v212-kpi-kart"><span>Havale/EFT</span><strong>…</strong></div><div class="v212-kpi-kart"><span>Nakit</span><strong>…</strong></div></div><div class="v212-baslik-satir"><strong>Tahsilat Geçmişi</strong><span id="v212Sayac" class="v212-sayac"></span></div><div id="v212Liste" class="v212-bos">Tahsilatlar yükleniyor…</div>`;
    const ay=document.getElementById('v212Ay'); ay.value=istanbulBugunISO().slice(0,7);
    ay.addEventListener('change',verileriYukle);
    document.getElementById('v212Ara').addEventListener('input',listeyiCiz);
    toolbar.querySelectorAll('[data-v212-filtre]').forEach(b=>b.addEventListener('click',()=>{filtre=b.dataset.v212Filtre;toolbar.querySelectorAll('[data-v212-filtre]').forEach(x=>x.classList.toggle('aktif',x===b));listeyiCiz();}));
    return true;
  }

  async function referanslariGetir(){
    if(ogrenciler.size&&hesaplar.size) return;
    const [o,h]=await Promise.all([
      bsSupabase.from('ogrenciler').select('ogrenci_id,ad_soyad'),
      bsSupabase.from('kasa_hesaplari').select('hesap_id,hesap_adi')
    ]);
    if(o.error) throw o.error;if(h.error) throw h.error;
    ogrenciler=new Map((o.data||[]).map(x=>[x.ogrenci_id,x.ad_soyad]));
    hesaplar=new Map((h.data||[]).map(x=>[x.hesap_id,x.hesap_adi]));
  }

  async function verileriYukle(){
    const liste=document.getElementById('v212Liste'); if(!liste) return;
    liste.className='v212-bos';liste.textContent='Tahsilatlar yükleniyor…';
    try{
      await referanslariGetir();
      const ym=document.getElementById('v212Ay').value||istanbulBugunISO().slice(0,7);
      const s=aySiniri(ym);
      const {data,error}=await bsSupabase.from('tahsilatlar').select('tahsilat_id,tarih,ogrenci_id,tutar,odeme_yontemi,aciklama,hesap_id').gte('tarih',s.bas).lt('tarih',s.sonraki).order('tarih',{ascending:false});
      if(error) throw error;
      kayitlar=data||[];
      const toplam=kayitlar.reduce((t,x)=>t+(Number(x.tutar)||0),0);
      const havale=kayitlar.filter(x=>String(x.odeme_yontemi||'').toLocaleLowerCase('tr-TR').includes('havale')).reduce((t,x)=>t+(Number(x.tutar)||0),0);
      const nakit=kayitlar.filter(x=>String(x.odeme_yontemi||'').toLocaleLowerCase('tr-TR').includes('nakit')).reduce((t,x)=>t+(Number(x.tutar)||0),0);
      const kartlar=document.querySelectorAll('#v212Kpi .v212-kpi-kart strong');
      if(kartlar[0]) kartlar[0].textContent=paraYaz(toplam);
      if(kartlar[1]) kartlar[1].textContent=String(kayitlar.length);
      if(kartlar[2]) kartlar[2].textContent=paraYaz(havale);
      if(kartlar[3]) kartlar[3].textContent=paraYaz(nakit);
      listeyiCiz();
    }catch(err){
      console.error('V212 tahsilatlar:',err);liste.className='v212-bos';liste.textContent='Tahsilatlar yüklenemedi. Bağlantı veya erişim yetkisi kontrol edilmeli.';
    }
  }

  function listeyiCiz(){
    const hedef=document.getElementById('v212Liste'); if(!hedef) return;
    const q=(document.getElementById('v212Ara')?.value||'').trim().toLocaleLowerCase('tr-TR');
    const secilen=kayitlar.filter(x=>{
      const yontem=String(x.odeme_yontemi||'');
      if(filtre!=='Tümü'&&!yontem.toLocaleLowerCase('tr-TR').includes(filtre.toLocaleLowerCase('tr-TR').split('/')[0])) return false;
      if(!q) return true;
      const metin=[ogrenciler.get(x.ogrenci_id)||'',yontem,x.aciklama||'',hesaplar.get(x.hesap_id)||''].join(' ').toLocaleLowerCase('tr-TR');
      return metin.includes(q);
    });
    const sayac=document.getElementById('v212Sayac');if(sayac) sayac.textContent=secilen.length+' kayıt';
    if(!secilen.length){hedef.className='v212-bos';hedef.textContent='Seçili filtrede tahsilat bulunmuyor.';return;}
    hedef.className='v212-liste';
    hedef.innerHTML=secilen.map(x=>`<div class="v212-satir"><div class="v212-tarih">${htmlKacir(tarihEtiket(x.tarih))}</div><div><div class="v212-ad">${htmlKacir(ogrenciler.get(x.ogrenci_id)||'Öğrenci')}</div><div class="v212-detay"><span>${htmlKacir(x.odeme_yontemi||'Tahsilat')}</span>${x.hesap_id?`<span>${htmlKacir(hesaplar.get(x.hesap_id)||x.hesap_id)}</span>`:''}${x.aciklama?`<span>${htmlKacir(x.aciklama)}</span>`:''}</div></div><div class="v212-tutar">${htmlKacir(paraYaz(x.tutar||0))}</div></div>`).join('');
  }

  async function baslat(){
    stilEkle();
    if(!arayuzHazirla()) return;
    try{await verileriYukle();}catch(e){console.error(e);}
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