(function(){
  if(window.BSDersDetayModuluV1) return;
  window.BSDersDetayModuluV1=true;

  let ref=null;
  let aktifDersId=null;

  function stilEkle(){
    if(document.getElementById('bsDersDetayStil')) return;
    const s=document.createElement('style');s.id='bsDersDetayStil';
    s.textContent=`
      .bsdd-modal{position:fixed;inset:0;z-index:980;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bsdd-modal.acik{display:flex}.bsdd-sheet{width:min(720px,100%);max-height:92dvh;overflow:auto;background:#f8fafc;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(15,23,42,.22)}
      .bsdd-ust{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px}.bsdd-baslik{font-size:21px;font-weight:850;line-height:1.2;color:var(--yazi)}.bsdd-alt{margin-top:5px;color:var(--ikincil);font-size:10.5px;line-height:1.4}.bsdd-kapat{width:40px;height:40px;flex:0 0 auto;border:1px solid var(--kenar);border-radius:12px;background:#fff;color:var(--ikincil);font-size:23px;cursor:pointer}
      .bsdd-ozet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}.bsdd-kpi{padding:12px;border:1px solid var(--kenar);border-radius:14px;background:#fff}.bsdd-kpi span{display:block;font-size:9px;font-weight:720;color:var(--ikincil)}.bsdd-kpi strong{display:block;margin-top:6px;font-size:14px;font-weight:850;color:var(--yazi)}
      .bsdd-kart{overflow:hidden;border:1px solid var(--kenar);border-radius:15px;background:#fff;margin-top:10px}.bsdd-satir{display:grid;grid-template-columns:115px minmax(0,1fr);gap:12px;padding:11px 13px;border-bottom:1px solid #f1f5f9}.bsdd-satir:last-child{border-bottom:none}.bsdd-etiket{font-size:9.5px;font-weight:750;color:var(--ikincil)}.bsdd-deger{font-size:11px;font-weight:760;color:var(--yazi);text-align:right;overflow-wrap:anywhere}.bsdd-not{font-weight:600;line-height:1.5;color:#475569}
      .bsdd-rozet{display:inline-flex;align-items:center;justify-content:center;padding:6px 9px;border-radius:999px;font-size:9px;font-weight:800}.bsdd-rozet.planlandi{background:#eff6ff;color:#2563eb}.bsdd-rozet.yapildi{background:#f0fdf4;color:#15803d}.bsdd-rozet.iptal{background:#fef2f2;color:#b91c1c}.bsdd-rozet.diger{background:#f8fafc;color:#64748b}.bsdd-zoom{display:flex;align-items:center;justify-content:center;width:100%;height:46px;margin-top:12px;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:12px;font-weight:820}.bsdd-yukleniyor{padding:30px 12px;text-align:center;color:var(--ikincil);font-size:11px}
      .bsdd-islemler{margin-top:12px;padding:12px;border:1px solid var(--kenar);border-radius:15px;background:#fff}.bsdd-islem-baslik{font-size:10px;font-weight:800;color:var(--ikincil);margin-bottom:8px}.bsdd-islem-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.bsdd-islem{min-height:40px;padding:6px 8px;border:1px solid var(--kenar);border-radius:10px;background:#fff;color:var(--ikincil);font-size:9.5px;font-weight:780;cursor:pointer}.bsdd-islem.birincil{border-color:#86efac;background:#f0fdf4;color:#15803d}.bsdd-islem.tehlike{border-color:#fecaca;background:#fef2f2;color:#b91c1c}.bsdd-islem[disabled]{opacity:.5}.bsdd-finans-not{margin-top:8px;font-size:8.8px;line-height:1.4;color:var(--ikincil)}
      @media(max-width:640px){.bsdd-sheet{padding:15px 11px calc(18px + env(safe-area-inset-bottom));border-radius:21px 21px 0 0}.bsdd-baslik{font-size:18px}.bsdd-ozet{grid-template-columns:1fr 1fr}.bsdd-kpi:last-child{grid-column:1/-1}.bsdd-satir{grid-template-columns:95px minmax(0,1fr);padding:10px 11px}.bsdd-islem-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function durumRozeti(durum){const d=String(durum||'');const c=d==='Planlandı'?'planlandi':d==='Yapıldı'?'yapildi':(d.includes('İptal')||d==='Ertelendi')?'iptal':'diger';return `<span class="bsdd-rozet ${c}">${htmlKacir(d||'—')}</span>`;}
  function modalHazirla(){if(document.getElementById('bsDersDetayModal')) return;const m=document.createElement('div');m.id='bsDersDetayModal';m.className='bsdd-modal';m.innerHTML=`<div class="bsdd-sheet"><div class="bsdd-ust"><div><div id="bsddBaslik" class="bsdd-baslik">Ders Detayı</div><div id="bsddAlt" class="bsdd-alt"></div></div><button id="bsddKapat" class="bsdd-kapat" type="button">×</button></div><div id="bsddIcerik" class="bsdd-yukleniyor">Ders bilgileri yükleniyor…</div></div>`;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)kapat();});document.getElementById('bsddKapat').addEventListener('click',kapat);}
  function kapat(){document.getElementById('bsDersDetayModal')?.classList.remove('acik');}

  function durumButonlari(d){
    const tum=['Yapıldı','Öğrenci Gelmedi','İptal','Ertelendi','Öğretmen İptali'];
    if(d.ders_durumu!=='Planlandı') tum.push('Planlandı');
    return `<div class="bsdd-islemler"><div class="bsdd-islem-baslik">Ders Durumunu Güncelle</div><div class="bsdd-islem-grid">${tum.filter(x=>x!==d.ders_durumu).map(x=>`<button type="button" class="bsdd-islem ${x==='Yapıldı'?'birincil':x.includes('İptal')?'tehlike':''}" data-bsdd-durum="${htmlKacir(x)}">${htmlKacir(x)}</button>`).join('')}</div><div class="bsdd-finans-not">Öğrenci ücreti ve öğretmen hakedişi yalnız <strong>Yapıldı</strong> durumundaki derslerde finansal toplamları etkiler.</div></div>`;
  }

  async function ac(dersId){
    aktifDersId=dersId;const m=document.getElementById('bsDersDetayModal'),icerik=document.getElementById('bsddIcerik');m.classList.add('acik');document.getElementById('bsddBaslik').textContent='Ders Detayı';document.getElementById('bsddAlt').textContent='';icerik.className='bsdd-yukleniyor';icerik.textContent='Ders bilgileri yükleniyor…';
    try{
      if(!window.BSDersProgramServisi) throw new Error('Ders servisi yüklenmedi.');const [d,r]=await Promise.all([BSDersProgramServisi.dersDetayGetir(dersId),BSDersProgramServisi.referanslar()]);ref=r;const ogr=ref.ogrenciMap.get(d.ogrenci_id)||'Öğrenci',ogt=ref.ogretmenMap.get(d.ogretmen_id)||'Öğretmen',br=ref.bransMap.get(d.brans_id)||'Branş',loc=ref.derslikMap.get(d.derslik_id),yer=(loc&&loc.mekan_adi)||d.ders_yeri||'—';document.getElementById('bsddBaslik').textContent=ogr;document.getElementById('bsddAlt').textContent=`${tarihKisa(d.tarih)} • ${saatKisalt(d.baslangic_saati)}–${saatKisalt(d.bitis_saati)}`;icerik.className='';
      icerik.innerHTML=`<div class="bsdd-ozet"><div class="bsdd-kpi"><span>Durum</span><strong>${durumRozeti(d.ders_durumu)}</strong></div><div class="bsdd-kpi"><span>Ders Sayısı</span><strong>${htmlKacir(String(Number(d.ders_sayisi)||1))}</strong></div><div class="bsdd-kpi"><span>Ders Ücreti</span><strong>${htmlKacir(paraYaz(Number(d.ogrenci_toplam_tutar)||0))}</strong></div></div><div class="bsdd-kart"><div class="bsdd-satir"><div class="bsdd-etiket">Öğretmen</div><div class="bsdd-deger">${htmlKacir(ogt)}</div></div><div class="bsdd-satir"><div class="bsdd-etiket">Branş</div><div class="bsdd-deger">${htmlKacir(br)}</div></div><div class="bsdd-satir"><div class="bsdd-etiket">Derslik / Yer</div><div class="bsdd-deger">${htmlKacir(yer)}</div></div><div class="bsdd-satir"><div class="bsdd-etiket">Öğretmen Hakedişi</div><div class="bsdd-deger">${htmlKacir(paraYaz(Number(d.ogretmen_toplam_hakedis)||0))}</div></div>${d.aciklama?`<div class="bsdd-satir"><div class="bsdd-etiket">Not</div><div class="bsdd-deger bsdd-not">${htmlKacir(d.aciklama)}</div></div>`:''}</div>${durumButonlari(d)}${d.zoom_katilim_baglantisi?`<a class="bsdd-zoom" href="${htmlKacir(d.zoom_katilim_baglantisi)}" target="_blank" rel="noopener">Zoom Dersine Katıl</a>`:''}`;
      icerik.querySelectorAll('[data-bsdd-durum]').forEach(b=>b.addEventListener('click',()=>durumGuncelle(b.dataset.bsddDurum,b)));
    }catch(err){console.error('Ders detay:',err);icerik.className='bsdd-yukleniyor';icerik.textContent='Ders detayı yüklenemedi.';}
  }

  async function durumGuncelle(yeniDurum,buton){
    if(!aktifDersId||!window.BSIslemServisi) return;const tum=[...document.querySelectorAll('[data-bsdd-durum]')];tum.forEach(x=>x.disabled=true);const eski=buton.textContent;buton.textContent='Kaydediliyor…';
    try{await BSIslemServisi.dersDurumuGuncelle(aktifDersId,yeniDurum);await ac(aktifDersId);try{window.BSFinansModuluV1&&BSFinansModuluV1.anaSayfaKpilariniYukle();}catch(e){}}
    catch(err){console.error('Ders durumu:',err);tum.forEach(x=>x.disabled=false);buton.textContent=eski;alert(err.message||'Ders durumu güncellenemedi.');}
  }

  function bagla(){document.addEventListener('click',e=>{const satir=e.target.closest('[data-bs-ders-id]');if(!satir||!satir.dataset.bsDersId) return;e.preventDefault();ac(satir.dataset.bsDersId);},true);}
  function baslat(){stilEkle();modalHazirla();bagla();}if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat); else baslat();
})();