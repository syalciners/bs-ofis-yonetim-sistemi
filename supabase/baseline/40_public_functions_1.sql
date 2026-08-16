-- BS Eğitim Yönetimi — 2026-08-16 public function baseline / 1

CREATE OR REPLACE FUNCTION public.ders_cakisma_kontrol_v1(p_tarih date, p_ogrenci_id text, p_ogretmen_id text, p_derslik_id text, p_baslangic_saati time without time zone, p_ders_sayisi numeric, p_haric_ders_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_eszamanli integer:=0;
  v_ogrenci boolean:=false;
  v_ogretmen boolean:=false;
  v_ilk_cakisma jsonb;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_tarih is null or p_baslangic_saati is null then raise exception 'Tarih ve başlangıç saati zorunludur.'; end if;
  if p_ders_sayisi not in (1,2,3,4) then raise exception 'Ders sayısı 1–4 arasında olmalıdır.'; end if;
  select greatest(coalesce(kapasite,1),1) into v_kapasite from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;
  v_bas:=p_tarih::timestamp+p_baslangic_saati;
  v_bit:=v_bas+(p_ders_sayisi*interval '1 hour');
  if v_bit::date<>p_tarih then raise exception 'Ders saati gün sınırını aşıyor.'; end if;

  select exists(
    select 1 from public.dersler d
    where d.tarih=p_tarih and d.ders_id<>coalesce(p_haric_ders_id,'')
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati)
      and d.ogrenci_id=p_ogrenci_id
  ) into v_ogrenci;

  select exists(
    select 1 from public.dersler d
    where d.tarih=p_tarih and d.ders_id<>coalesce(p_haric_ders_id,'')
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati)
      and d.ogretmen_id=p_ogretmen_id
  ) into v_ogretmen;

  select count(*) into v_eszamanli
  from public.dersler d
  where d.tarih=p_tarih and d.derslik_id=p_derslik_id and d.ders_id<>coalesce(p_haric_ders_id,'')
    and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
    and d.baslangic_saati is not null and d.bitis_saati is not null
    and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati);

  select jsonb_build_object(
    'ders_id',d.ders_id,
    'ogrenci',coalesce(o.ad_soyad,'—'),
    'ogretmen',coalesce(t.ad_soyad,'—'),
    'baslangic',d.baslangic_saati,
    'bitis',d.bitis_saati
  ) into v_ilk_cakisma
  from public.dersler d
  left join public.ogrenciler o on o.ogrenci_id=d.ogrenci_id
  left join public.ogretmenler t on t.ogretmen_id=d.ogretmen_id
  where d.tarih=p_tarih and d.ders_id<>coalesce(p_haric_ders_id,'')
    and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
    and d.baslangic_saati is not null and d.bitis_saati is not null
    and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati)
    and (d.ogrenci_id=p_ogrenci_id or d.ogretmen_id=p_ogretmen_id or d.derslik_id=p_derslik_id)
  order by d.baslangic_saati
  limit 1;

  return jsonb_build_object(
    'basarili',true,
    'uygun',not v_ogrenci and not v_ogretmen and v_eszamanli<v_kapasite,
    'ogrenci_cakisma',v_ogrenci,
    'ogretmen_cakisma',v_ogretmen,
    'derslik_dolu',v_eszamanli>=v_kapasite,
    'derslik_kapasite',v_kapasite,
    'derslik_eszamanli',v_eszamanli,
    'bitis_saati',v_bit::time,
    'ilk_cakisma',v_ilk_cakisma
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.ders_durumu_guncelle_guvenli_v1(p_ders_id text, p_yeni_durum text, p_aciklama text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email text := coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
  v_eski text;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_yeni_durum not in ('Planlandı','Yapıldı','Öğrenci Gelmedi','İptal','Ertelendi','Öğretmen İptali') then raise exception 'Geçersiz ders durumu.'; end if;
  select ders_durumu into v_eski from public.dersler where ders_id=p_ders_id for update;
  if not found then raise exception 'Ders bulunamadı.'; end if;
  update public.dersler set ders_durumu=p_yeni_durum,aciklama=coalesce(nullif(trim(coalesce(p_aciklama,'')),''),aciklama),son_degistiren=v_email,son_degistirme_zamani=now() where ders_id=p_ders_id;
  return jsonb_build_object('basarili',true,'ders_id',p_ders_id,'eski_durum',v_eski,'yeni_durum',p_yeni_durum);
end;
$function$;

CREATE OR REPLACE FUNCTION public.ders_guncelle_guvenli_v1(p_ders_id text, p_tarih date, p_ogrenci_id text, p_ogretmen_id text, p_brans_id text, p_derslik_id text, p_baslangic_saati time without time zone, p_ders_sayisi numeric, p_ogrenci_birim_ucreti numeric, p_ogretmen_birim_hakedisi numeric, p_aciklama text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email text := coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
  v_mevcut public.dersler%rowtype;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_eszamanli integer;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  select * into v_mevcut from public.dersler where ders_id=p_ders_id for update;
  if not found then raise exception 'Ders bulunamadı.'; end if;
  if coalesce(v_mevcut.ders_durumu,'Planlandı')<>'Planlandı' then raise exception 'Yalnız planlanmış dersler düzenlenebilir.'; end if;
  if p_tarih is null or p_baslangic_saati is null then raise exception 'Ders tarihi ve saati zorunludur.'; end if;
  if p_ders_sayisi not in (1,2,3,4) then raise exception 'Ders sayısı 1–4 arasında olmalıdır.'; end if;
  if p_ogrenci_birim_ucreti is null or p_ogrenci_birim_ucreti<0 or p_ogretmen_birim_hakedisi is null or p_ogretmen_birim_hakedisi<0 then raise exception 'Ücret ve hakediş geçerli olmalıdır.'; end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğrenci bulunamadı.'; end if;
  if not exists(select 1 from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğretmen bulunamadı.'; end if;
  if not exists(select 1 from public.branslar where brans_id=p_brans_id and coalesce(aktif,true)) then raise exception 'Aktif branş bulunamadı.'; end if;
  if not private.ogretmen_brans_uygun_mu(p_ogretmen_id,p_brans_id) then raise exception 'Seçilen öğretmen bu branş için tanımlı değil.'; end if;
  select greatest(coalesce(kapasite,1),1) into v_kapasite from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_ders:'||p_tarih::text||':'||p_baslangic_saati::text));
  v_bas:=p_tarih::timestamp+p_baslangic_saati;
  v_bit:=v_bas+(p_ders_sayisi*interval '1 hour');
  if v_bit::date<>p_tarih then raise exception 'Ders saati gün sınırını aşıyor.'; end if;

  if exists(
    select 1 from public.dersler d
    where d.ders_id<>p_ders_id and d.tarih=p_tarih
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati)
      and (d.ogrenci_id=p_ogrenci_id or d.ogretmen_id=p_ogretmen_id)
  ) then raise exception 'Öğrenci veya öğretmen aynı saatte başka derste.'; end if;

  select count(*) into v_eszamanli from public.dersler d
  where d.ders_id<>p_ders_id and d.tarih=p_tarih and d.derslik_id=p_derslik_id
    and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
    and d.baslangic_saati is not null and d.bitis_saati is not null
    and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati);
  if v_eszamanli>=v_kapasite then raise exception 'Seçilen derslik bu saatte kapasitesine ulaştı.'; end if;

  update public.dersler set
    tarih=p_tarih,
    ogrenci_id=p_ogrenci_id,
    ogretmen_id=p_ogretmen_id,
    brans_id=p_brans_id,
    derslik_id=p_derslik_id,
    ders_sayisi=p_ders_sayisi,
    ogrenci_birim_ucreti=p_ogrenci_birim_ucreti,
    ogretmen_birim_hakedisi=p_ogretmen_birim_hakedisi,
    ogrenci_toplam_tutar=p_ogrenci_birim_ucreti*p_ders_sayisi,
    ogretmen_toplam_hakedis=p_ogretmen_birim_hakedisi*p_ders_sayisi,
    baslangic_saati=p_baslangic_saati,
    bitis_saati=v_bit::time,
    ders_yeri=(select mekan_adi from public.derslikler where derslik_id=p_derslik_id),
    aciklama=nullif(trim(coalesce(p_aciklama,'')),''),
    son_degistiren=v_email,
    son_degistirme_zamani=now()
  where ders_id=p_ders_id;

  return jsonb_build_object('basarili',true,'ders_id',p_ders_id,'bitis_saati',v_bit::time,'program_id',v_mevcut.program_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.ders_kaydet_guvenli_v1(p_ders_id text, p_tarih date, p_ogrenci_id text, p_ogretmen_id text, p_brans_id text, p_derslik_id text, p_baslangic_saati time without time zone, p_ders_sayisi numeric, p_aciklama text DEFAULT NULL::text, p_program_id text DEFAULT NULL::text, p_ogrenci_birim_ucreti numeric DEFAULT NULL::numeric, p_ogretmen_birim_hakedisi numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email',v_uid::text,'BS Eğitim');
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_eszamanli integer;
  v_kisi_cakisma boolean;
  v_ogr_ucret numeric := p_ogrenci_birim_ucreti;
  v_ogt_ucret numeric := p_ogretmen_birim_hakedisi;
  v_program text := nullif(trim(coalesce(p_program_id,'')),'');
  v_mevcut public.dersler%rowtype;
  v_tarife public.sabit_ders_programi%rowtype;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_ders_id),'') is null then raise exception 'Ders kimliği eksik.'; end if;
  if p_tarih is null or p_baslangic_saati is null then raise exception 'Ders tarihi ve saati zorunludur.'; end if;
  if nullif(trim(p_ogrenci_id),'') is null or nullif(trim(p_ogretmen_id),'') is null or nullif(trim(p_brans_id),'') is null or nullif(trim(p_derslik_id),'') is null then raise exception 'Ders bilgileri eksik.'; end if;
  if p_ders_sayisi not in (1,2,3,4) then raise exception 'Ders sayısı 1–4 arasında olmalıdır.'; end if;

  select * into v_mevcut from public.dersler where ders_id=p_ders_id;
  if v_mevcut.ders_id is not null then
    if v_mevcut.tarih=p_tarih and v_mevcut.ogrenci_id=p_ogrenci_id and v_mevcut.ogretmen_id=p_ogretmen_id and v_mevcut.brans_id=p_brans_id and v_mevcut.derslik_id=p_derslik_id and v_mevcut.baslangic_saati=p_baslangic_saati and v_mevcut.ders_sayisi=p_ders_sayisi then
      return jsonb_build_object('basarili',true,'tekrar',true,'ders_id',p_ders_id);
    end if;
    raise exception 'Aynı ders kimliği farklı bir kayıtta kullanılıyor.';
  end if;

  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğrenci bulunamadı.'; end if;
  if not exists(select 1 from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğretmen bulunamadı.'; end if;
  if not exists(select 1 from public.branslar where brans_id=p_brans_id and coalesce(aktif,true)) then raise exception 'Aktif branş bulunamadı.'; end if;
  if not private.ogretmen_brans_uygun_mu(p_ogretmen_id,p_brans_id) then raise exception 'Seçilen öğretmen bu branş için tanımlı değil.'; end if;
  if not exists(select 1 from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true)) then raise exception 'Aktif derslik bulunamadı.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_ders:'||p_tarih::text||':'||p_baslangic_saati::text));
  v_bas := p_tarih::timestamp+p_baslangic_saati;
  v_bit := v_bas+(p_ders_sayisi*interval '1 hour');
  if v_bit::date<>p_tarih then raise exception 'Ders saati gün sınırını aşıyor.'; end if;

  select exists(
    select 1 from public.dersler d
    where d.tarih=p_tarih and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati)
      and (d.ogrenci_id=p_ogrenci_id or d.ogretmen_id=p_ogretmen_id)
  ) into v_kisi_cakisma;
  if v_kisi_cakisma then raise exception 'Öğrenci veya öğretmen aynı saatte başka derste.'; end if;

  select greatest(coalesce(kapasite,1),1) into v_kapasite from public.derslikler where derslik_id=p_derslik_id;
  select count(*) into v_eszamanli from public.dersler d
  where d.tarih=p_tarih and d.derslik_id=p_derslik_id and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
    and d.baslangic_saati is not null and d.bitis_saati is not null
    and (p_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(p_tarih::timestamp+d.bitis_saati);
  if v_eszamanli>=v_kapasite then raise exception 'Seçilen derslik bu saatte kapasitesine ulaştı.'; end if;

  if v_program is not null then
    select * into v_tarife from public.sabit_ders_programi where program_id=v_program limit 1;
    if v_tarife.program_id is null then raise exception 'Bağlı sabit program bulunamadı.'; end if;
  elsif v_ogr_ucret is null or v_ogt_ucret is null then
    select * into v_tarife from public.sabit_ders_programi
    where ogrenci_id=p_ogrenci_id and ogretmen_id=p_ogretmen_id and brans_id=p_brans_id and program_durumu='Aktif'
    order by coalesce(bitis_tarihi,'9999-12-31'::date) desc,coalesce(baslangic_tarihi,'1900-01-01'::date) desc limit 1;
  end if;

  v_ogr_ucret := coalesce(v_ogr_ucret,v_tarife.ogrenci_birim_ucreti);
  v_ogt_ucret := coalesce(v_ogt_ucret,v_tarife.ogretmen_birim_hakedisi);
  if v_ogr_ucret is null or v_ogt_ucret is null then raise exception 'Bu ders için öğrenci ücreti veya öğretmen hakedişi bulunamadı.'; end if;

  insert into public.dersler(
    ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,
    ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,
    ders_durumu,aciklama,olusturan,olusturulma_zamani,baslangic_saati,bitis_saati,ders_turu,ders_yeri
  )
  values(
    p_ders_id,v_program,p_tarih,p_ogrenci_id,p_ogretmen_id,p_brans_id,p_derslik_id,p_ders_sayisi,
    v_ogr_ucret,v_ogt_ucret,v_ogr_ucret*p_ders_sayisi,v_ogt_ucret*p_ders_sayisi,'Planlandı',
    nullif(trim(coalesce(p_aciklama,'')),''),v_email,now(),p_baslangic_saati,v_bit::time,'Manuel',
    (select mekan_adi from public.derslikler where derslik_id=p_derslik_id)
  );
  return jsonb_build_object('basarili',true,'tekrar',false,'ders_id',p_ders_id,'bitis_saati',v_bit::time,'ogrenci_birim_ucreti',v_ogr_ucret,'ogretmen_birim_hakedisi',v_ogt_ucret);
end;
$function$;

CREATE OR REPLACE FUNCTION public.drive_yukleme_yetkili_mi_v1()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null and private.bs_ofis_yonetici_mi();
$function$;

CREATE OR REPLACE FUNCTION public.finans_gelir_dagitim_kuru_v18(p_baslangic_tarihi date DEFAULT '2026-08-01'::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_suleyman_id text;
  v_basak_id text;
  v_kontrol jsonb := '[]'::jsonb;
  v_aktarilacaklar jsonb := '[]'::jsonb;
  v_toplam_tahsilat numeric := 0;
  v_toplam_dagitilan numeric := 0;
  v_toplam_bekleyen numeric := 0;
  v_kalan numeric;
  v_dagitilan numeric;
  v_ogrenci_adi text;
  pay record;
  les record;
begin
  select ogretmen_id into v_suleyman_id
  from public.ogretmenler
  where coalesce(kaynakta_var,true)
    and upper(ad_soyad) like '%SÜLEYMAN%'
    and upper(ad_soyad) like '%YALÇINER%'
  order by ogretmen_id
  limit 1;

  select ogretmen_id into v_basak_id
  from public.ogretmenler
  where coalesce(kaynakta_var,true)
    and upper(ad_soyad) like '%BAŞAK%'
    and upper(ad_soyad) like '%ATİLLA%'
  order by ogretmen_id
  limit 1;

  v_suleyman_id := coalesce(v_suleyman_id, 'TCH-001');
  v_basak_id := coalesce(v_basak_id, 'TCH-002');

  create temp table if not exists finans_v18_ders_havuzu (
    ogrenci_id text not null,
    ders_id text not null,
    tarih date not null,
    baslangic_saati time,
    ogretmen_id text not null,
    gelir_sahibi text not null,
    toplam_tutar numeric not null,
    kalan_tutar numeric not null,
    olusturulma_zamani timestamptz,
    primary key (ders_id)
  ) on commit drop;
  truncate table finans_v18_ders_havuzu;

  create temp table if not exists finans_v18_dagitim_parcalari (
    tahsilat_id text not null,
    tarih date not null,
    ogrenci_id text not null,
    ogrenci_adi text not null,
    gelir_sahibi text not null,
    tutar numeric not null,
    ders_id text not null,
    ders_tarihi date not null,
    ders_tutari numeric not null,
    sira bigserial
  ) on commit drop;
  truncate table finans_v18_dagitim_parcalari restart identity;

  for les in
    select
      x.ders_id,
      x.ogrenci_id,
      x.ogretmen_id,
      x.tarih,
      x.baslangic_saati,
      x.olusturulma_zamani,
      coalesce(x.ogrenci_toplam_tutar, x.ders_sayisi * x.ogrenci_birim_ucreti) as hesaplanan_tutar,
      o.ad_soyad as ogrenci_adi
    from public.dersler x
    left join public.ogrenciler o on o.ogrenci_id = x.ogrenci_id
    where lower(coalesce(x.ders_durumu,'')) = lower('Yapıldı')
      and coalesce(x.kaynakta_var,true)
    order by x.tarih, x.baslangic_saati nulls first, x.olusturulma_zamani nulls first, x.ders_id
  loop
    if les.ogrenci_id is null or btrim(les.ogrenci_id) = ''
       or les.ogretmen_id is null or btrim(les.ogretmen_id) = ''
       or les.ders_id is null or btrim(les.ders_id) = ''
       or les.tarih is null then
      v_kontrol := v_kontrol || jsonb_build_array(jsonb_build_object(
        'Tur','Ders','LessonID',coalesce(les.ders_id,''),'StudentID',coalesce(les.ogrenci_id,''),
        'Tarih',case when les.tarih is null then '' else to_char(les.tarih,'YYYY-MM-DD') end,
        'Neden','Yapıldı dersinde StudentID / TeacherID / LessonID / Tarih eksik'
      ));
      continue;
    end if;

    if coalesce(les.hesaplanan_tutar,0) <= 0 then
      v_kontrol := v_kontrol || jsonb_build_array(jsonb_build_object(
        'Tur','Ders','LessonID',les.ders_id,'Ogrenci',coalesce(les.ogrenci_adi,les.ogrenci_id),
        'Tarih',to_char(les.tarih,'YYYY-MM-DD'),'Neden','Yapıldı dersinde öğrenci toplam tutarı hesaplanamadı'
      ));
      continue;
    end if;

    insert into finans_v18_ders_havuzu(
      ogrenci_id, ders_id, tarih, baslangic_saati, ogretmen_id,
      gelir_sahibi, toplam_tutar, kalan_tutar, olusturulma_zamani
    ) values (
      les.ogrenci_id,les.ders_id,les.tarih,les.baslangic_saati,les.ogretmen_id,
      case when les.ogretmen_id = v_basak_id then 'Başak' when les.ogretmen_id = v_suleyman_id then 'Süleyman' else 'Kurum Kasası' end,
      round(les.hesaplanan_tutar::numeric,2),round(les.hesaplanan_tutar::numeric,2),les.olusturulma_zamani
    ) on conflict (ders_id) do nothing;
  end loop;

  for pay in
    select t.tahsilat_id,t.tarih,t.ogrenci_id,round(t.tutar::numeric,2) as tutar,t.olusturulma_zamani,o.ad_soyad as ogrenci_adi
    from public.tahsilatlar t
    left join public.ogrenciler o on o.ogrenci_id = t.ogrenci_id
    where coalesce(t.kaynakta_var,true) and not coalesce(t.iptal_mi,false)
      and t.tahsilat_id is not null and btrim(t.tahsilat_id) <> ''
      and t.ogrenci_id is not null and btrim(t.ogrenci_id) <> ''
      and t.tarih is not null and coalesce(t.tutar,0) > 0
    order by t.ogrenci_id, t.tarih, t.olusturulma_zamani nulls first, t.tahsilat_id
  loop
    v_kalan := pay.tutar;
    v_ogrenci_adi := coalesce(pay.ogrenci_adi, 'ÖĞRENCİ ADI BULUNAMADI');
    for les in
      select h.* from finans_v18_ders_havuzu h
      where h.ogrenci_id = pay.ogrenci_id and h.kalan_tutar > 0.005
      order by case when h.tarih = pay.tarih then 0 when h.tarih < pay.tarih then 1 else 2 end,
               h.tarih,h.baslangic_saati nulls first,h.olusturulma_zamani nulls first,h.ders_id
    loop
      exit when v_kalan <= 0.005;
      if les.kalan_tutar <= 0.005 then continue; end if;
      v_dagitilan := round(least(v_kalan, les.kalan_tutar)::numeric,2);
      if v_dagitilan <= 0 then continue; end if;
      update finans_v18_ders_havuzu set kalan_tutar = round((kalan_tutar - v_dagitilan)::numeric,2) where ders_id = les.ders_id;
      v_kalan := round((v_kalan - v_dagitilan)::numeric,2);
      if pay.tarih >= p_baslangic_tarihi then
        insert into finans_v18_dagitim_parcalari(tahsilat_id,tarih,ogrenci_id,ogrenci_adi,gelir_sahibi,tutar,ders_id,ders_tarihi,ders_tutari)
        values(pay.tahsilat_id,pay.tarih,pay.ogrenci_id,v_ogrenci_adi,les.gelir_sahibi,v_dagitilan,les.ders_id,les.tarih,v_dagitilan);
      end if;
    end loop;

    if pay.tarih >= p_baslangic_tarihi then
      v_toplam_tahsilat := round((v_toplam_tahsilat + pay.tutar)::numeric,2);
      v_toplam_dagitilan := round((v_toplam_dagitilan + (pay.tutar - v_kalan))::numeric,2);
      if v_kalan > 0.005 then
        v_toplam_bekleyen := round((v_toplam_bekleyen + v_kalan)::numeric,2);
        v_kontrol := v_kontrol || jsonb_build_array(jsonb_build_object(
          'Tur','Tahsilat','PaymentID',pay.tahsilat_id,'Tarih',to_char(pay.tarih,'YYYY-MM-DD'),'Ogrenci',v_ogrenci_adi,
          'TahsilatTutari',pay.tutar,'DagitilamayanTutar',v_kalan,'Neden','Tahsilatın tamamına karşılık yeterli Yapıldı ders ücreti bulunamadı'
        ));
      end if;
    end if;
  end loop;

  select coalesce(jsonb_agg(x.obj order by x.tarih, x.tahsilat_id, x.gelir_sahibi), '[]'::jsonb)
  into v_aktarilacaklar
  from (
    select min(dp.tarih) as tarih,dp.tahsilat_id,dp.gelir_sahibi,
      jsonb_build_object(
        'PaymentID',dp.tahsilat_id,'Tarih',to_char(min(dp.tarih),'YYYY-MM-DD'),'Ogrenci',min(dp.ogrenci_adi),
        'GelirSahibi',dp.gelir_sahibi,'GelirTuru','Özel Ders','Tutar',round(sum(dp.tutar)::numeric,2),
        'Dersler',jsonb_agg(jsonb_build_object('LessonID',dp.ders_id,'Tarih',to_char(dp.ders_tarihi,'YYYY-MM-DD'),'Tutar',dp.ders_tutari) order by dp.sira)
      ) as obj
    from finans_v18_dagitim_parcalari dp
    group by dp.tahsilat_id, dp.gelir_sahibi
  ) x;

  return jsonb_build_object(
    'aktarilacaklar', v_aktarilacaklar,'kontrolGerekli', v_kontrol,
    'ozet', jsonb_build_object('baslangicTarihi',to_char(p_baslangic_tarihi,'YYYY-MM-DD'),'kaynak','BS Eğitim Yönetimi / Supabase tahsilatlar',
      'toplamTahsilat',v_toplam_tahsilat,'toplamDagitilan',v_toplam_dagitilan,'toplamBekleyen',v_toplam_bekleyen,'gelirSatiriSayisi',jsonb_array_length(v_aktarilacaklar))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.gider_guncelle_guvenli_v1(p_gider_id text, p_tarih date, p_kategori_id text, p_tutar numeric, p_odeme_yontemi text, p_aciklama text DEFAULT NULL::text, p_hesap_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Ofis');
  v_g public.giderler%rowtype;
  v_h public.kasa_hareketleri%rowtype;
  v_hesap_id text := nullif(pg_catalog.btrim(coalesce(p_hesap_id,'')),'');
  v_hesap_adi text;
  v_kategori_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_gider_id,'')),'') is null then raise exception 'Gider kimliği zorunludur.'; end if;
  if p_tarih is null then raise exception 'Gider tarihi eksik.'; end if;
  if p_tutar is null or p_tutar<=0 then raise exception 'Gider tutarı sıfırdan büyük olmalı.'; end if;
  select kategori_adi into v_kategori_adi from public.gider_kategorileri where kategori_id=p_kategori_id and coalesce(aktif,true);
  if v_kategori_adi is null then raise exception 'Gider kategorisi bulunamadı.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_gider_guncelle:'||p_gider_id));
  select * into v_g from public.giderler where gider_id=p_gider_id for update;
  if not found then raise exception 'Gider bulunamadı.'; end if;
  if coalesce(v_g.iptal_mi,false) then raise exception 'İptal edilmiş gider düzenlenemez.'; end if;
  begin
    select * into strict v_h from public.kasa_hareketleri where kaynak_turu='Gider' and kaynak_id=p_gider_id and coalesce(iptal_mi,false)=false for update;
  exception when no_data_found then raise exception 'Gidere bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.';
            when too_many_rows then raise exception 'Gidere bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.';
  end;
  if v_h.hareket_turu is distinct from 'Gider' or v_h.hesap_id is distinct from v_g.hesap_id or pg_catalog.abs(v_h.tutar-v_g.tutar)>0.01
     or (v_g.kasa_hareket_id is not null and v_g.kasa_hareket_id is distinct from v_h.hareket_id) then
    raise exception 'Gider ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.';
  end if;
  if v_hesap_id is null then
    if pg_catalog.lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1;
    else
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1;
    end if;
  end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  update public.giderler set tarih=p_tarih,kategori_id=p_kategori_id,tutar=p_tutar,odeme_yontemi=p_odeme_yontemi,
    aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),hesap_id=v_hesap_id,odeme_durumu='Ödendi',guncelleyen=v_email,guncellenme_tarihi=pg_catalog.now()
  where gider_id=p_gider_id;
  update public.kasa_hareketleri set tarih=p_tarih,hesap_id=v_hesap_id,tutar=p_tutar,
    aciklama=coalesce(nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),v_kategori_adi),ogrenci_id=null,ogretmen_id=null,durum='Tamamlandı'
  where hareket_id=v_h.hareket_id;
  return jsonb_build_object('basarili',true,'gider_id',p_gider_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'kategori_adi',v_kategori_adi);
end;
$function$;

CREATE OR REPLACE FUNCTION public.gider_iptal_guvenli_v1(p_gider_id text, p_aciklama text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Ofis'); v_g public.giderler%rowtype; v_hareket_sayisi integer := 0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(coalesce(p_gider_id,'')),'') is null then raise exception 'Gider kimliği zorunludur.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_gider_iptal:'||p_gider_id));
  select * into v_g from public.giderler where gider_id=p_gider_id for update;
  if not found then raise exception 'Gider bulunamadı.'; end if;
  if coalesce(v_g.iptal_mi,false) then return jsonb_build_object('basarili',true,'tekrar',true,'gider_id',p_gider_id); end if;
  select count(*) into v_hareket_sayisi from public.kasa_hareketleri k where k.kaynak_turu='Gider' and k.kaynak_id=p_gider_id and coalesce(k.iptal_mi,false)=false;
  if v_hareket_sayisi<>1 then raise exception 'Gidere bağlı aktif kasa hareketi tekil değil (% kayıt). İşlem yapılmadı.',v_hareket_sayisi; end if;
  update public.giderler set iptal_mi=true,odeme_durumu='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'İptal edildi'),guncelleyen=v_email,guncellenme_tarihi=now() where gider_id=p_gider_id;
  update public.kasa_hareketleri set iptal_mi=true,durum='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'Kaynak gider iptal edildi') where kaynak_turu='Gider' and kaynak_id=p_gider_id and coalesce(iptal_mi,false)=false;
  return jsonb_build_object('basarili',true,'tekrar',false,'gider_id',p_gider_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.gider_kaydet_guvenli_v1(p_gider_id text, p_hareket_id text, p_tarih date, p_kategori_id text, p_tutar numeric, p_odeme_yontemi text, p_aciklama text DEFAULT NULL::text, p_hesap_id text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_hesap_id text := nullif(trim(coalesce(p_hesap_id,'')),''); v_hesap_adi text; v_kategori_adi text; v_olusturan text := coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim'); v_gider public.giderler%rowtype; v_hareket public.kasa_hareketleri%rowtype;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_gider_id),'') is null or nullif(trim(p_hareket_id),'') is null then raise exception 'İşlem kimlikleri eksik.'; end if;
  if p_tarih is null then raise exception 'Gider tarihi eksik.'; end if;
  if p_tutar is null or p_tutar<=0 then raise exception 'Gider tutarı sıfırdan büyük olmalı.'; end if;
  select kategori_adi into v_kategori_adi from public.gider_kategorileri where kategori_id=p_kategori_id and coalesce(aktif,true);
  if v_kategori_adi is null then raise exception 'Gider kategorisi bulunamadı.'; end if;
  if v_hesap_id is null then
    if lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and lower(trim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1;
    else select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and lower(coalesce(hesap_turu,'')) like '%havale%' order by hesap_id limit 1; end if;
  end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  select * into v_gider from public.giderler where gider_id=p_gider_id;
  select * into v_hareket from public.kasa_hareketleri where hareket_id=p_hareket_id;
  if v_gider.gider_id is not null or v_hareket.hareket_id is not null then
    if v_gider.gider_id is not null and v_hareket.hareket_id is not null and v_gider.tarih=p_tarih and v_gider.kategori_id=p_kategori_id and v_gider.tutar=p_tutar and v_gider.hesap_id=v_hesap_id and v_hareket.kaynak_turu='Gider' and v_hareket.kaynak_id=p_gider_id and v_hareket.hareket_turu='Gider' and v_hareket.tutar=p_tutar and v_hareket.hesap_id=v_hesap_id then return jsonb_build_object('basarili',true,'tekrar',true,'gider_id',p_gider_id,'hareket_id',p_hareket_id); end if;
    raise exception 'Aynı işlem kimliğiyle farklı veya eksik kayıt bulundu.';
  end if;
  insert into public.giderler(gider_id,tarih,kategori_id,tutar,odeme_yontemi,aciklama,olusturan,olusturulma_zamani,hesap_id,odeme_durumu,kasa_hareket_id,iptal_mi)
  values(p_gider_id,p_tarih,p_kategori_id,p_tutar,p_odeme_yontemi,nullif(trim(coalesce(p_aciklama,'')),''),v_olusturan,now(),v_hesap_id,'Ödendi',p_hareket_id,false);
  insert into public.kasa_hareketleri(hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,olusturan,olusturulma_zamani,iptal_mi,durum)
  values(p_hareket_id,p_tarih,'Gider','Gider',p_gider_id,v_hesap_id,p_tutar,coalesce(nullif(trim(coalesce(p_aciklama,'')),''),v_kategori_adi),v_olusturan,now(),false,'Tamamlandı');
  return jsonb_build_object('basarili',true,'tekrar',false,'gider_id',p_gider_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'kategori_adi',v_kategori_adi);
end;
$function$;

CREATE OR REPLACE FUNCTION public.haftalik_ders_uretim_durumu_v1(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_kayit public.haftalik_ders_uretimleri%rowtype; v_beklenen integer:=0; v_mevcut integer:=0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  select * into v_kayit from public.haftalik_ders_uretimleri where hafta_baslangici=p_hafta_baslangici;
  if found then return jsonb_build_object('calisti',true,'gecis_kilidi',false,'hafta_baslangici',v_kayit.hafta_baslangici,'olusturulan',v_kayit.olusturulan,'zaten_mevcut',v_kayit.zaten_mevcut,'cakisma',v_kayit.cakisma,'hatali',v_kayit.hatali,'olusturulma_zamani',v_kayit.olusturulma_zamani); end if;
  with programlar as (select p.*,case p.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end as gun_ofset from public.sabit_ders_programi p where p.program_durumu='Aktif'),
  beklenen as (select p.program_id,(p_hafta_baslangici+p.gun_ofset)::date as tarih from programlar p where p.gun_ofset is not null and (p.baslangic_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date>=p.baslangic_tarihi) and (p.bitis_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date<=p.bitis_tarihi) and private.sabit_program_tarihe_duser_mi(p.tekrar_sikligi,p.baslangic_tarihi,(p_hafta_baslangici+p.gun_ofset)::date) and not exists(select 1 from public.sabit_program_istisnalari i where i.program_id=p.program_id and i.orijinal_tarih=(p_hafta_baslangici+p.gun_ofset)::date and i.iptal_mi=false))
  select count(*),count(*) filter(where exists(select 1 from public.dersler d where d.program_id=beklenen.program_id and d.tarih=beklenen.tarih)) into v_beklenen,v_mevcut from beklenen;
  if v_beklenen>0 and v_mevcut=v_beklenen then return jsonb_build_object('calisti',true,'gecis_kilidi',true,'hafta_baslangici',p_hafta_baslangici,'olusturulan',0,'zaten_mevcut',v_mevcut,'cakisma',0,'hatali',0,'beklenen',v_beklenen,'eksik',0); end if;
  return jsonb_build_object('calisti',false,'gecis_kilidi',false,'hafta_baslangici',p_hafta_baslangici,'beklenen',v_beklenen,'mevcut',v_mevcut,'eksik',greatest(v_beklenen-v_mevcut,0));
end;
$function$;

CREATE OR REPLACE FUNCTION public.haftalik_ders_uretim_durumu_v2(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_simdi timestamp without time zone := timezone('Europe/Istanbul', now()); v_mevcut_hafta date := date_trunc('week', timezone('Europe/Istanbul', now()))::date; v_beklenen integer := 0; v_mevcut integer := 0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici) <> 1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  if p_hafta_baslangici < v_mevcut_hafta then return jsonb_build_object('calisti',true,'gecmis_hafta',true,'guncel_hafta',false,'gecis_kilidi',true,'hafta_baslangici',p_hafta_baslangici,'beklenen',0,'mevcut',0,'eksik',0); end if;
  with programlar as (
    select p.*,case p.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end as gun_ofset
    from public.sabit_ders_programi p where p.program_durumu='Aktif'
  ), beklenen as (
    select p.program_id,(p_hafta_baslangici+p.gun_ofset)::date as tarih from programlar p
    where p.gun_ofset is not null and (p.baslangic_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date>=p.baslangic_tarihi) and (p.bitis_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date<=p.bitis_tarihi)
      and private.sabit_program_tarihe_duser_mi(p.tekrar_sikligi,p.baslangic_tarihi,(p_hafta_baslangici+p.gun_ofset)::date)
      and not exists(select 1 from public.sabit_program_istisnalari i where i.program_id=p.program_id and i.orijinal_tarih=(p_hafta_baslangici+p.gun_ofset)::date and i.iptal_mi=false)
      and (p_hafta_baslangici>v_mevcut_hafta or (p_hafta_baslangici+p.gun_ofset)::date>v_simdi::date or ((p_hafta_baslangici+p.gun_ofset)::date=v_simdi::date and p.baslangic_saati is not null and p.baslangic_saati>v_simdi::time))
  )
  select count(*),count(*) filter(where exists(select 1 from public.dersler d where d.program_id=beklenen.program_id and d.tarih=beklenen.tarih)) into v_beklenen,v_mevcut from beklenen;
  return jsonb_build_object('calisti',v_mevcut=v_beklenen,'gecmis_hafta',false,'guncel_hafta',p_hafta_baslangici=v_mevcut_hafta,'gecis_kilidi',v_mevcut=v_beklenen,'hafta_baslangici',p_hafta_baslangici,'beklenen',v_beklenen,'mevcut',v_mevcut,'eksik',greatest(v_beklenen-v_mevcut,0));
end;
$function$;

-- Eski üretim sürümleri de canlı baseline'da korunur; uygulama güncel olarak V5 kullanır.

CREATE OR REPLACE FUNCTION public.haftalik_dersleri_olustur_guvenli_v1(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text); v_hafta_sonu date; v_aktif integer:=0; v_olusturulan integer:=0; v_zaten integer:=0; v_cakisma integer:=0; v_hatali integer:=0; v_detay jsonb:='[]'::jsonb; r record; v_offset integer; v_tarih date; v_bas timestamp; v_bit timestamp; v_kapasite integer; v_eszamanli integer; v_kisi_cakisma boolean; v_ders_id text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null then raise exception 'Hafta başlangıcı zorunludur.'; end if;
  if extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  v_hafta_sonu:=p_hafta_baslangici+6; perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders:'||p_hafta_baslangici::text));
  for r in select p.* from public.sabit_ders_programi p where p.program_durumu='Aktif' and (p.baslangic_tarihi is null or p.baslangic_tarihi<=v_hafta_sonu) and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici) order by p.program_id loop
    v_offset:=case r.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end;
    if v_offset is null then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Haftanın günü geçersiz'));continue;end if;
    v_tarih:=p_hafta_baslangici+v_offset;
    if (r.baslangic_tarihi is not null and v_tarih<r.baslangic_tarihi) or (r.bitis_tarihi is not null and v_tarih>r.bitis_tarihi) then continue; end if;
    v_aktif:=v_aktif+1;
    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then v_hatali:=v_hatali+1;continue;end if;
    if exists(select 1 from public.dersler d where d.program_id=r.program_id and d.tarih=v_tarih) then v_zaten:=v_zaten+1;continue;end if;
    v_bas:=v_tarih::timestamp+r.baslangic_saati; v_bit:=v_bas+(r.ders_sayisi*interval '1 hour');
    select greatest(coalesce(l.kapasite,1),1) into v_kapasite from public.derslikler l where l.derslik_id=r.derslik_id;
    select exists(select 1 from public.dersler d where d.tarih=v_tarih and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati) and (d.ogrenci_id=r.ogrenci_id or d.ogretmen_id=r.ogretmen_id)) into v_kisi_cakisma;
    select count(*) into v_eszamanli from public.dersler d where d.tarih=v_tarih and d.derslik_id=r.derslik_id and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati);
    if v_kisi_cakisma or v_eszamanli>=v_kapasite then v_cakisma:=v_cakisma+1;continue;end if;
    loop v_ders_id:=substr(replace(gen_random_uuid()::text,'-',''),1,8);exit when not exists(select 1 from public.dersler d where d.ders_id=v_ders_id);end loop;
    insert into public.dersler(ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu,baslangic_saati,bitis_saati,olusturan,olusturulma_zamani)
    values(v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_email,now()); v_olusturulan:=v_olusturulan+1;
  end loop;
  return jsonb_build_object('basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'cakisma',v_cakisma,'hatali',v_hatali,'detay',v_detay);
end;
$function$;

CREATE OR REPLACE FUNCTION public.haftalik_dersleri_olustur_guvenli_v2(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text); v_hafta_sonu date; v_aktif integer:=0; v_olusturulan integer:=0; v_zaten integer:=0; v_cakisma integer:=0; v_hatali integer:=0; v_detay jsonb:='[]'::jsonb; r record; v_offset integer; v_tarih date; v_bas timestamp; v_bit timestamp; v_kapasite integer; v_eszamanli integer; v_kisi_cakisma boolean; v_ders_id text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  v_hafta_sonu:=p_hafta_baslangici+6; perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders:'||p_hafta_baslangici::text));
  if exists(select 1 from public.haftalik_ders_uretimleri where hafta_baslangici=p_hafta_baslangici) then raise exception 'Bu haftanın dersleri daha önce oluşturuldu. Sonraki haftaya kadar tekrar çalıştırılamaz.'; end if;
  for r in select p.* from public.sabit_ders_programi p where p.program_durumu='Aktif' and (p.baslangic_tarihi is null or p.baslangic_tarihi<=v_hafta_sonu) and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici) order by p.program_id loop
    v_offset:=case r.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end;
    if v_offset is null then v_hatali:=v_hatali+1;continue;end if; v_tarih:=p_hafta_baslangici+v_offset;
    if (r.baslangic_tarihi is not null and v_tarih<r.baslangic_tarihi) or (r.bitis_tarihi is not null and v_tarih>r.bitis_tarihi) or not private.sabit_program_tarihe_duser_mi(r.tekrar_sikligi,r.baslangic_tarihi,v_tarih) then continue; end if;
    v_aktif:=v_aktif+1;
    if not exists(select 1 from public.branslar b where b.brans_id=r.brans_id and b.varsayilan_ogretmen_id=r.ogretmen_id and coalesce(b.aktif,true)) then v_hatali:=v_hatali+1;continue;end if;
    if exists(select 1 from public.dersler d where d.program_id=r.program_id and d.tarih=v_tarih) then v_zaten:=v_zaten+1;continue;end if;
    v_bas:=v_tarih::timestamp+r.baslangic_saati;v_bit:=v_bas+(r.ders_sayisi*interval '1 hour'); select greatest(coalesce(l.kapasite,1),1) into v_kapasite from public.derslikler l where l.derslik_id=r.derslik_id;
    select exists(select 1 from public.dersler d where d.tarih=v_tarih and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati) and (d.ogrenci_id=r.ogrenci_id or d.ogretmen_id=r.ogretmen_id)) into v_kisi_cakisma;
    select count(*) into v_eszamanli from public.dersler d where d.tarih=v_tarih and d.derslik_id=r.derslik_id and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati);
    if v_kisi_cakisma or v_eszamanli>=v_kapasite then v_cakisma:=v_cakisma+1;continue;end if;
    loop v_ders_id:=substr(replace(gen_random_uuid()::text,'-',''),1,8);exit when not exists(select 1 from public.dersler where ders_id=v_ders_id);end loop;
    insert into public.dersler(ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu,baslangic_saati,bitis_saati,olusturan,olusturulma_zamani)
    values(v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_email,now());v_olusturulan:=v_olusturulan+1;
  end loop;
  insert into public.haftalik_ders_uretimleri(hafta_baslangici,olusturulan,zaten_mevcut,cakisma,hatali,olusturan) values(p_hafta_baslangici,v_olusturulan,v_zaten,v_cakisma,v_hatali,v_email);
  return jsonb_build_object('basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'cakisma',v_cakisma,'hatali',v_hatali,'detay',v_detay);
end;
$function$;

CREATE OR REPLACE FUNCTION public.haftalik_dersleri_olustur_guvenli_v3(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Eğitim'); v_hafta_sonu date; v_aktif integer:=0; v_olusturulan integer:=0; v_zaten integer:=0; v_cakisma integer:=0; v_hatali integer:=0; v_atlanan integer:=0; v_detay jsonb:='[]'::jsonb; r record; v_offset integer; v_tarih date; v_bas timestamp; v_bit timestamp; v_kapasite integer; v_eszamanli integer; v_kisi_cakisma boolean; v_ders_id text; v_mekan_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  v_hafta_sonu:=p_hafta_baslangici+6; perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders:'||p_hafta_baslangici::text));
  if exists(select 1 from public.haftalik_ders_uretimleri where hafta_baslangici=p_hafta_baslangici) then raise exception 'Bu haftanın dersleri daha önce oluşturuldu. Sonraki haftaya kadar tekrar çalıştırılamaz.'; end if;
  for r in select p.* from public.sabit_ders_programi p where p.program_durumu='Aktif' and (p.baslangic_tarihi is null or p.baslangic_tarihi<=v_hafta_sonu) and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici) order by p.program_id loop
    v_offset:=case r.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end;
    if v_offset is null then v_hatali:=v_hatali+1;continue;end if; v_tarih:=p_hafta_baslangici+v_offset;
    if (r.baslangic_tarihi is not null and v_tarih<r.baslangic_tarihi) or (r.bitis_tarihi is not null and v_tarih>r.bitis_tarihi) or not private.sabit_program_tarihe_duser_mi(r.tekrar_sikligi,r.baslangic_tarihi,v_tarih) then continue; end if;
    if exists(select 1 from public.sabit_program_istisnalari i where i.program_id=r.program_id and i.orijinal_tarih=v_tarih and i.iptal_mi=false) then v_atlanan:=v_atlanan+1;continue;end if;
    v_aktif:=v_aktif+1;
    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then v_hatali:=v_hatali+1;continue;end if;
    if not private.ogretmen_brans_uygun_mu(r.ogretmen_id,r.brans_id) then v_hatali:=v_hatali+1;continue;end if;
    if exists(select 1 from public.dersler d where d.program_id=r.program_id and d.tarih=v_tarih) then v_zaten:=v_zaten+1;continue;end if;
    v_bas:=v_tarih::timestamp+r.baslangic_saati;v_bit:=v_bas+(r.ders_sayisi*interval '1 hour'); select greatest(coalesce(l.kapasite,1),1),l.mekan_adi into v_kapasite,v_mekan_adi from public.derslikler l where l.derslik_id=r.derslik_id and coalesce(l.aktif,true);
    select exists(select 1 from public.dersler d where d.tarih=v_tarih and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati) and (d.ogrenci_id=r.ogrenci_id or d.ogretmen_id=r.ogretmen_id)) into v_kisi_cakisma;
    select count(*) into v_eszamanli from public.dersler d where d.tarih=v_tarih and d.derslik_id=r.derslik_id and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati);
    if v_kisi_cakisma or v_eszamanli>=v_kapasite then v_cakisma:=v_cakisma+1;continue;end if;
    loop v_ders_id:=substr(replace(gen_random_uuid()::text,'-',''),1,8);exit when not exists(select 1 from public.dersler where ders_id=v_ders_id);end loop;
    insert into public.dersler(ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu,baslangic_saati,bitis_saati,ders_yeri,olusturan,olusturulma_zamani)
    values(v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_mekan_adi,v_email,now());v_olusturulan:=v_olusturulan+1;
  end loop;
  if v_cakisma>0 or v_hatali>0 then raise exception 'Haftalık oluşturma tamamlanmadı: % çakışma, % hatalı program. Hiçbir ders kaydedilmedi; sorunları düzeltip tekrar deneyin.',v_cakisma,v_hatali;end if;
  insert into public.haftalik_ders_uretimleri(hafta_baslangici,olusturulan,zaten_mevcut,cakisma,hatali,olusturan) values(p_hafta_baslangici,v_olusturulan,v_zaten,0,0,v_email);
  return jsonb_build_object('basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'atlanan',v_atlanan,'cakisma',0,'hatali',0,'detay',v_detay);
end;
$function$;

CREATE OR REPLACE FUNCTION public.haftalik_dersleri_olustur_guvenli_v4(p_hafta_baslangici date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_hafta date; v_durum jsonb; v_sonuc jsonb; v_detay jsonb:='[]'::jsonb; v_olusturulan integer:=0; v_zaten integer:=0; v_basarili_hafta integer:=0; v_hata_hafta integer:=0; i integer;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_iki_haftalik_ders:'||p_hafta_baslangici::text));
  for i in 0..1 loop
    v_hafta:=p_hafta_baslangici+(i*7); v_durum:=public.haftalik_ders_uretim_durumu_v1(v_hafta);
    if coalesce((v_durum->>'calisti')::boolean,false) then
      v_zaten:=v_zaten+coalesce((v_durum->>'zaten_mevcut')::integer,(v_durum->>'mevcut')::integer,0);v_basarili_hafta:=v_basarili_hafta+1;
      v_detay:=v_detay||jsonb_build_array(jsonb_build_object('hafta_baslangici',v_hafta,'durum','Zaten Hazır','olusturulan',0,'zaten_mevcut',coalesce((v_durum->>'zaten_mevcut')::integer,(v_durum->>'mevcut')::integer,0),'gecis_kilidi',coalesce((v_durum->>'gecis_kilidi')::boolean,false)));continue;
    end if;
    begin
      v_sonuc:=public.haftalik_dersleri_olustur_guvenli_v3(v_hafta);v_olusturulan:=v_olusturulan+coalesce((v_sonuc->>'olusturulan')::integer,0);v_zaten:=v_zaten+coalesce((v_sonuc->>'zaten_mevcut')::integer,0);v_basarili_hafta:=v_basarili_hafta+1;
      v_detay:=v_detay||jsonb_build_array(jsonb_build_object('hafta_baslangici',v_hafta,'durum','Oluşturuldu','olusturulan',coalesce((v_sonuc->>'olusturulan')::integer,0),'zaten_mevcut',coalesce((v_sonuc->>'zaten_mevcut')::integer,0),'aktif_program',coalesce((v_sonuc->>'aktif_program')::integer,0)));
    exception when others then v_hata_hafta:=v_hata_hafta+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('hafta_baslangici',v_hafta,'durum','Hata','hata',sqlerrm)); end;
  end loop;
  return jsonb_build_object('basarili',v_hata_hafta=0,'kismi',v_hata_hafta>0 and v_basarili_hafta>0,'baslangic_haftasi',p_hafta_baslangici,'sonraki_hafta',p_hafta_baslangici+7,'basarili_hafta',v_basarili_hafta,'hata_hafta',v_hata_hafta,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'detay',v_detay);
end;
$function$;
