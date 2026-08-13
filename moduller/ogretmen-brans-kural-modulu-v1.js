(function(){
  if(window.BSOgretmenBransKuralModuluV1)return;
  window.BSOgretmenBransKuralModuluV1=true;

  async function refGetir(){
    if(!window.BSReferansServisi) throw new Error('Referans servisi hazır değil.');
    return BSReferansServisi.yukle();
  }

  function doldur(select,liste,koru,ilk){
    if(!select)return;
    select.innerHTML=`<option value="">${ilk||'Branş seçin'}</option>`+liste.map(x=>`<option value="${htmlKacir(x.brans_id)}">${htmlKacir(x.brans_adi)}</option>`).join('');
    if(koru&&liste.some(x=>x.brans_id===koru)) select.value=koru;
    else if(liste.length===1) select.value=liste[0].brans_id;
  }

  async function filtrele(ogretmenSelect,bransSelect,koru){
    if(!ogretmenSelect||!bransSelect)return;
    const ogretmenId=ogretmenSelect.value;
    if(!ogretmenId){doldur(bransSelect,[],null,'Önce öğretmen seçin');return;}
    try{
      const ref=await refGetir();
      const liste=typeof ref.ogretmenBranslariGetir==='function'?ref.ogretmenBranslariGetir(ogretmenId):[];
      doldur(bransSelect,liste,koru||bransSelect.value,liste.length?'Branş seçin':'Bu öğretmene tanımlı branş yok');
      if(!liste.length){
        bransSelect.setCustomValidity('Bu öğretmene tanımlı aktif branş bulunmuyor.');
      }else bransSelect.setCustomValidity('');
    }catch(e){console.error('Öğretmen branş filtresi:',e);}
  }

  function dersFormunuSenkronla(){
    const o=document.getElementById('bsdoOgretmen'),b=document.getElementById('bsdoBrans');
    if(o&&b) filtrele(o,b,b.value);
  }

  function programFormunuSenkronla(){
    const o=document.getElementById('bspgOgt'),b=document.getElementById('bspgBrans');
    if(o&&b) filtrele(o,b,b.value);
  }

  function bagla(){
    document.addEventListener('change',e=>{
      if(e.target&&e.target.id==='bsdoOgretmen') filtrele(e.target,document.getElementById('bsdoBrans'));
      if(e.target&&e.target.id==='bspgOgt') filtrele(e.target,document.getElementById('bspgBrans'));
      if(e.target&&['bsdoOgrenci','bsdoTarih'].includes(e.target.id)) setTimeout(dersFormunuSenkronla,450);
      if(e.target&&e.target.id==='bspgMevcut') setTimeout(programFormunuSenkronla,30);
    },true);

    document.addEventListener('click',e=>{
      const b=e.target.closest&&e.target.closest('button');
      if(!b)return;
      const t=(b.textContent||'').trim();
      if(/Ders\s*Oluştur/i.test(t)&&!/Haftalık/i.test(t)) setTimeout(dersFormunuSenkronla,250);
      if(/Program Ekle|Programı Kaydet|Sabit Program/i.test(t)) setTimeout(programFormunuSenkronla,250);
    },true);
  }

  function baslat(){bagla();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();