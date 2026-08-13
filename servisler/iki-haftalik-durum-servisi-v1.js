(function(){
  if(window.BSIkiHaftalikDurumServisiV1) return;
  async function getir(){
    const h=BSDersProgramServisi.haftaSiniri();
    const n=h.sonraki;
    const [a,b]=await Promise.all([
      bsSupabase.rpc('haftalik_ders_uretim_durumu_v1',{p_hafta_baslangici:h.bas}),
      bsSupabase.rpc('haftalik_ders_uretim_durumu_v1',{p_hafta_baslangici:n})
    ]);
    if(a.error) throw a.error;
    if(b.error) throw b.error;
    return {bu:a.data||{},sonraki:b.data||{},tumHazir:!!(a.data&&a.data.calisti)&&!!(b.data&&b.data.calisti),buBas:h.bas,sonrakiBas:n};
  }
  window.BSIkiHaftalikDurumServisiV1={getir};
})();