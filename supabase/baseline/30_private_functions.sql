-- BS Eğitim Yönetimi — 2026-08-16 private function baseline
-- Fonksiyon gövdeleri canlı katalogdan alınmıştır; gizli ayar değeri içermez.

CREATE OR REPLACE FUNCTION private.bs_ofis_ogretmen_brans_dogrula_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.ogretmen_id is null or new.brans_id is null then
    return new;
  end if;
  if not private.bs_ofis_ogretmen_brans_uygun_mu(new.ogretmen_id,new.brans_id) then
    raise exception 'Seçilen öğretmen bu branş için tanımlı değil.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.bs_ofis_ogretmen_brans_uygun_mu(p_ogretmen_id text, p_brans_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.ogretmenler o
    join public.branslar b on b.brans_id=p_brans_id
    cross join lateral regexp_split_to_table(coalesce(o.branslar,''), '\s*/\s*') x
    where o.ogretmen_id=p_ogretmen_id
      and coalesce(o.durum,'Aktif')<>'Pasif'
      and coalesce(b.aktif,true)=true
      and lower(trim(x))=lower(trim(b.brans_adi))
  );
$function$;

CREATE OR REPLACE FUNCTION private.bs_ofis_yonetici_mi()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = auth.uid()
      and kp.aktif = true
      and kp.rol = 'Yönetici'
  );
$function$;

CREATE OR REPLACE FUNCTION private.bs_program_tarih_kontrol_v1(p_program_id text, p_tarih date, p_baslangic_saati time without time zone, p_derslik_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_program public.sabit_ders_programi%rowtype;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_ogrenci boolean:=false;
  v_ogretmen boolean:=false;
  v_eszamanli integer:=0;
begin
  select * into v_program from public.sabit_ders_programi where program_id=p_program_id and program_durumu='Aktif';
  if not found then raise exception 'Aktif sabit program bulunamadı.'; end if;
  select greatest(coalesce(kapasite,1),1) into v_kapasite from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;
  v_bas:=p_tarih::timestamp+p_baslangic_saati;
  v_bit:=v_bas+(coalesce(v_program.ders_sayisi,1)*interval '1 hour');
  if v_bit::date<>p_tarih then return jsonb_build_object('uygun',false,'gun_siniri',true,'ogrenci_cakisma',false,'ogretmen_cakisma',false,'derslik_dolu',false); end if;

  with kaynak as (
    select d.ogrenci_id,d.ogretmen_id,d.derslik_id,
           p_tarih::timestamp+d.baslangic_saati as bas,
           p_tarih::timestamp+d.bitis_saati as bit
    from public.dersler d
    where d.tarih=p_tarih
      and d.program_id is distinct from p_program_id
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
    union all
    select p.ogrenci_id,p.ogretmen_id,p.derslik_id,
           p_tarih::timestamp+p.baslangic_saati as bas,
           p_tarih::timestamp+p.baslangic_saati+(coalesce(p.ders_sayisi,1)*interval '1 hour') as bit
    from public.sabit_ders_programi p
    where p.program_durumu='Aktif'
      and p.program_id<>p_program_id
      and private.sabit_program_tarih_uygun_mu(p.program_id,p_tarih)
      and not exists(select 1 from public.sabit_program_istisnalari i where i.program_id=p.program_id and i.orijinal_tarih=p_tarih and i.iptal_mi=false)
      and not exists(select 1 from public.dersler d where d.program_id=p.program_id and d.tarih=p_tarih)
  ), cakisan as (
    select * from kaynak where bas<v_bit and v_bas<bit
  )
  select coalesce(bool_or(ogrenci_id=v_program.ogrenci_id),false),
         coalesce(bool_or(ogretmen_id=v_program.ogretmen_id),false),
         count(*) filter(where derslik_id=p_derslik_id)
  into v_ogrenci,v_ogretmen,v_eszamanli
  from cakisan;

  return jsonb_build_object(
    'uygun',not v_ogrenci and not v_ogretmen and v_eszamanli<v_kapasite,
    'ogrenci_cakisma',v_ogrenci,
    'ogretmen_cakisma',v_ogretmen,
    'derslik_dolu',v_eszamanli>=v_kapasite,
    'derslik_kapasite',v_kapasite,
    'derslik_eszamanli',v_eszamanli,
    'gun_siniri',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.finans_v18_sync_tetikle()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'net', 'pg_temp'
AS $function$
declare
  a private.finans_v18_edge_ayar%rowtype;
  v_request_id bigint;
begin
  select * into a
  from private.finans_v18_edge_ayar
  where id=true and aktif=true;

  if a.id is null then
    raise exception 'FINANS_V18_EDGE_AYAR_PASIF';
  end if;

  select net.http_post(
    url := a.endpoint,
    body := jsonb_build_object('mode','sync'),
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-bs-sync-secret',a.trigger_token
    ),
    timeout_milliseconds := 15000
  ) into v_request_id;

  return v_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION private.haftalik_dersleri_tamamla_v1(p_hafta_baslangici date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Eğitim');
  v_simdi timestamp without time zone := timezone('Europe/Istanbul', now());
  v_mevcut_hafta date := date_trunc('week', timezone('Europe/Istanbul', now()))::date;
  v_hafta_sonu date;
  v_aktif integer := 0;
  v_olusturulan integer := 0;
  v_zaten integer := 0;
  v_cakisma integer := 0;
  v_hatali integer := 0;
  v_atlanan integer := 0;
  v_gecmis_atlanan integer := 0;
  v_detay jsonb := '[]'::jsonb;
  r record;
  v_offset integer;
  v_tarih date;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_eszamanli integer;
  v_kisi_cakisma boolean;
  v_ders_id text;
  v_mekan_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici) <> 1 then
    raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';
  end if;
  if p_hafta_baslangici < v_mevcut_hafta then
    raise exception 'Geçmiş haftalar otomatik olarak hazırlanamaz.';
  end if;

  v_hafta_sonu := p_hafta_baslangici + 6;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders_v5:' || p_hafta_baslangici::text));

  for r in
    select p.*
    from public.sabit_ders_programi p
    where p.program_durumu = 'Aktif'
      and (p.baslangic_tarihi is null or p.baslangic_tarihi <= v_hafta_sonu)
      and (p.bitis_tarihi is null or p.bitis_tarihi >= p_hafta_baslangici)
    order by p.program_id
  loop
    v_offset := case r.haftanin_gunu
      when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2
      when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6
      else null
    end;
    if v_offset is null then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Haftanın günü geçersiz'));
      continue;
    end if;

    v_tarih := p_hafta_baslangici + v_offset;
    if (r.baslangic_tarihi is not null and v_tarih < r.baslangic_tarihi)
       or (r.bitis_tarihi is not null and v_tarih > r.bitis_tarihi)
       or not private.sabit_program_tarihe_duser_mi(r.tekrar_sikligi, r.baslangic_tarihi, v_tarih) then
      continue;
    end if;

    if p_hafta_baslangici = v_mevcut_hafta
       and (v_tarih < v_simdi::date or (v_tarih = v_simdi::date and r.baslangic_saati is not null and r.baslangic_saati <= v_simdi::time)) then
      v_gecmis_atlanan := v_gecmis_atlanan + 1;
      continue;
    end if;

    if exists (
      select 1 from public.sabit_program_istisnalari i
      where i.program_id = r.program_id and i.orijinal_tarih = v_tarih and i.iptal_mi = false
    ) then
      v_atlanan := v_atlanan + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','İstisna','program_id',r.program_id,'tarih',v_tarih,'neden','Bu tarih sabit programdan atlandı veya taşındı'));
      continue;
    end if;

    v_aktif := v_aktif + 1;
    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null
       or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Zorunlu ders bilgisi eksik'));
      continue;
    end if;

    if not exists(select 1 from public.ogrenciler o where o.ogrenci_id = r.ogrenci_id and coalesce(o.durum,'Aktif') <> 'Pasif')
       or not exists(select 1 from public.ogretmenler o where o.ogretmen_id = r.ogretmen_id and coalesce(o.durum,'Aktif') <> 'Pasif')
       or not exists(select 1 from public.branslar b where b.brans_id = r.brans_id and coalesce(b.aktif,true))
       or not exists(select 1 from public.derslikler l where l.derslik_id = r.derslik_id and coalesce(l.aktif,true)) then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Pasif veya bulunamayan referans kaydı'));
      continue;
    end if;

    if not private.ogretmen_brans_uygun_mu(r.ogretmen_id, r.brans_id) then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Öğretmen branş eşleşmesi geçersiz'));
      continue;
    end if;

    if exists(select 1 from public.dersler d where d.program_id = r.program_id and d.tarih = v_tarih) then
      v_zaten := v_zaten + 1;
      continue;
    end if;

    v_bas := v_tarih::timestamp + r.baslangic_saati;
    v_bit := v_bas + (r.ders_sayisi * interval '1 hour');
    if v_bit::date <> v_tarih then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Ders saati gün sınırını aşıyor'));
      continue;
    end if;

    select greatest(coalesce(l.kapasite,1),1), l.mekan_adi
      into v_kapasite, v_mekan_adi
    from public.derslikler l
    where l.derslik_id = r.derslik_id and coalesce(l.aktif,true);

    select exists(
      select 1 from public.dersler d
      where d.tarih = v_tarih
        and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
        and d.baslangic_saati is not null and d.bitis_saati is not null
        and (v_tarih::timestamp + d.baslangic_saati) < v_bit
        and v_bas < (v_tarih::timestamp + d.bitis_saati)
        and (d.ogrenci_id = r.ogrenci_id or d.ogretmen_id = r.ogretmen_id)
    ) into v_kisi_cakisma;

    select count(*) into v_eszamanli
    from public.dersler d
    where d.tarih = v_tarih
      and d.derslik_id = r.derslik_id
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (v_tarih::timestamp + d.baslangic_saati) < v_bit
      and v_bas < (v_tarih::timestamp + d.bitis_saati);

    if v_kisi_cakisma or v_eszamanli >= v_kapasite then
      v_cakisma := v_cakisma + 1;
      v_detay := v_detay || jsonb_build_array(jsonb_build_object('tur','Çakışma','program_id',r.program_id,'tarih',v_tarih,'kisi_cakisma',v_kisi_cakisma,'derslik_dolu',v_eszamanli >= v_kapasite));
      continue;
    end if;

    loop
      v_ders_id := substr(replace(gen_random_uuid()::text,'-',''),1,8);
      exit when not exists(select 1 from public.dersler d where d.ders_id = v_ders_id);
    end loop;

    insert into public.dersler(
      ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,
      ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,
      ders_durumu,baslangic_saati,bitis_saati,ders_yeri,olusturan,olusturulma_zamani
    ) values(
      v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,
      r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,
      coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_mekan_adi,v_email,now()
    );
    v_olusturulan := v_olusturulan + 1;
  end loop;

  if v_cakisma > 0 or v_hatali > 0 then
    raise exception 'Haftalık tamamlama yapılmadı: % çakışma, % hatalı program. Hiçbir yeni ders kaydedilmedi; sorunları düzeltip tekrar deneyin.', v_cakisma, v_hatali;
  end if;

  insert into public.haftalik_ders_uretimleri as h(hafta_baslangici,olusturulan,zaten_mevcut,cakisma,hatali,olusturan)
  values(p_hafta_baslangici,v_olusturulan,v_zaten,0,0,v_email)
  on conflict (hafta_baslangici) do update set
    olusturulan = h.olusturulan + excluded.olusturulan,
    zaten_mevcut = excluded.zaten_mevcut,
    cakisma = 0,
    hatali = 0,
    olusturan = excluded.olusturan,
    olusturulma_zamani = now();

  return jsonb_build_object(
    'basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,
    'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'atlanan',v_atlanan,
    'gecmis_atlanan',v_gecmis_atlanan,'cakisma',0,'hatali',0,'detay',v_detay
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.ogretmen_brans_uygun_mu(p_ogretmen_id text, p_brans_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.ogretmen_branslari ob
    join public.ogretmenler o on o.ogretmen_id=ob.ogretmen_id
    join public.branslar b on b.brans_id=ob.brans_id
    where ob.ogretmen_id=p_ogretmen_id
      and ob.brans_id=p_brans_id
      and ob.aktif=true
      and coalesce(o.durum,'Aktif')<>'Pasif'
      and coalesce(b.aktif,true)=true
  );
$function$;

CREATE OR REPLACE FUNCTION private.sabit_program_tarih_uygun_mu(p_program_id text, p_tarih date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.sabit_ders_programi p
    where p.program_id=p_program_id
      and p.program_durumu='Aktif'
      and p_tarih is not null
      and extract(isodow from p_tarih)=case p.haftanin_gunu
        when 'Pazartesi' then 1 when 'Salı' then 2 when 'Çarşamba' then 3
        when 'Perşembe' then 4 when 'Cuma' then 5 when 'Cumartesi' then 6 when 'Pazar' then 7 else 0 end
      and (p.baslangic_tarihi is null or p_tarih>=p.baslangic_tarihi)
      and (p.bitis_tarihi is null or p_tarih<=p.bitis_tarihi)
      and private.sabit_program_tarihe_duser_mi(p.tekrar_sikligi,p.baslangic_tarihi,p_tarih)
  );
$function$;

CREATE OR REPLACE FUNCTION private.sabit_program_tarihe_duser_mi(p_tekrar_sikligi text, p_baslangic_tarihi date, p_hedef_tarih date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_tekrar text := coalesce(nullif(trim(p_tekrar_sikligi),''),'Her Hafta');
  v_hedef_gun integer;
  v_bas_gun integer;
  v_ankor date;
  v_hafta_farki integer;
  v_ankor_sira integer;
  v_hedef_sira integer;
begin
  if p_hedef_tarih is null then return false; end if;

  if v_tekrar='Her Hafta' then
    return p_baslangic_tarihi is null or p_hedef_tarih>=p_baslangic_tarihi;
  end if;

  if p_baslangic_tarihi is null then return false; end if;

  v_hedef_gun := extract(isodow from p_hedef_tarih)::integer;
  v_bas_gun := extract(isodow from p_baslangic_tarihi)::integer;
  v_ankor := p_baslangic_tarihi + mod(v_hedef_gun-v_bas_gun+7,7);

  if p_hedef_tarih<v_ankor then return false; end if;

  if v_tekrar='2 Haftada Bir' then
    v_hafta_farki := ((p_hedef_tarih-v_ankor)/7)::integer;
    return v_hafta_farki>=0 and mod(v_hafta_farki,2)=0;
  end if;

  if v_tekrar='Ayda Bir' then
    v_ankor_sira := ceil(extract(day from v_ankor)::numeric/7)::integer;
    v_hedef_sira := ceil(extract(day from p_hedef_tarih)::numeric/7)::integer;

    if v_hedef_sira=v_ankor_sira then return true; end if;

    if v_ankor_sira=5
       and v_hedef_sira=4
       and date_trunc('month',(p_hedef_tarih+7)::timestamp)<>date_trunc('month',p_hedef_tarih::timestamp) then
      return true;
    end if;

    return false;
  end if;

  return false;
end;
$function$;
