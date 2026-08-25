-- BS Eğitim SaaS V1 — private runtime helpers ve trigger kökleri
-- Client rollerine kapalıdır; yalnız private.bs_ofis_yonetici_mi() RLS/Storage için authenticated EXECUTE alır.

create or replace function private.bs_ofis_yonetici_mi()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = auth.uid()
      and kp.aktif = true
      and kp.rol = 'Yönetici'
  );
$function$;

create or replace function private.ogretmen_brans_uygun_mu(p_ogretmen_id text, p_brans_id text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
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

create or replace function private.sabit_program_tarihe_duser_mi(
  p_tekrar_sikligi text,
  p_baslangic_tarihi date,
  p_hedef_tarih date
)
returns boolean
language plpgsql
stable
set search_path to ''
as $function$
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

create or replace function private.sabit_program_tarih_uygun_mu(p_program_id text, p_tarih date)
returns boolean
language sql
stable
set search_path to ''
as $function$
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

create or replace function private.bs_program_tarih_kontrol_v1(
  p_program_id text,
  p_tarih date,
  p_baslangic_saati time without time zone,
  p_derslik_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_program public.sabit_ders_programi%rowtype;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_ogrenci boolean:=false;
  v_ogretmen boolean:=false;
  v_eszamanli integer:=0;
begin
  select * into v_program
  from public.sabit_ders_programi
  where program_id=p_program_id and program_durumu='Aktif';
  if not found then raise exception 'Aktif sabit program bulunamadı.'; end if;

  select greatest(coalesce(kapasite,1),1)
    into v_kapasite
  from public.derslikler
  where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;

  v_bas:=p_tarih::timestamp+p_baslangic_saati;
  v_bit:=v_bas+(coalesce(v_program.ders_sayisi,1)*interval '1 hour');
  if v_bit::date<>p_tarih then
    return jsonb_build_object('uygun',false,'gun_siniri',true,'ogrenci_cakisma',false,'ogretmen_cakisma',false,'derslik_dolu',false);
  end if;

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
      and not exists(
        select 1 from public.sabit_program_istisnalari i
        where i.program_id=p.program_id and i.orijinal_tarih=p_tarih and i.iptal_mi=false
      )
      and not exists(
        select 1 from public.dersler d
        where d.program_id=p.program_id and d.tarih=p_tarih
      )
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

create or replace function private.portal_kimligi_epostadan_v2()
returns table(rol text, ogrenci_id text, ogretmen_id text, ad_soyad text, email text)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_eslesme_sayisi integer;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = v_uid
      and kp.aktif = true
  ) then
    raise exception 'Yönetim hesapları BS Eğitim Portalı üzerinden kullanılamaz.';
  end if;

  select lower(btrim(u.email))
    into v_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null
    and u.email is not null
    and btrim(u.email) <> '';

  if v_email is null then
    raise exception 'Doğrulanmış Google e-posta adresi bulunamadı.';
  end if;

  select count(*)::integer
    into v_eslesme_sayisi
  from (
    select o.ogrenci_id
    from public.ogrenciler o
    where o.email is not null
      and lower(btrim(o.email)) = v_email
      and coalesce(o.durum, 'Aktif') = 'Aktif'
    union all
    select t.ogretmen_id
    from public.ogretmenler t
    where t.email is not null
      and lower(btrim(t.email)) = v_email
      and coalesce(t.durum, 'Aktif') = 'Aktif'
  ) eslesmeler;

  if v_eslesme_sayisi = 0 then
    raise exception 'Bu Google hesabı BS Eğitim sisteminde aktif öğrenci veya öğretmen olarak tanımlı değil.';
  end if;

  if v_eslesme_sayisi > 1 then
    raise exception 'Bu e-posta birden fazla aktif kişi kaydıyla eşleşiyor. Güvenlik nedeniyle portal erişimi durduruldu.';
  end if;

  return query
  select 'Öğrenci'::text,o.ogrenci_id,null::text,o.ad_soyad,v_email
  from public.ogrenciler o
  where o.email is not null
    and lower(btrim(o.email)) = v_email
    and coalesce(o.durum, 'Aktif') = 'Aktif'
  union all
  select 'Öğretmen'::text,null::text,t.ogretmen_id,t.ad_soyad,v_email
  from public.ogretmenler t
  where t.email is not null
    and lower(btrim(t.email)) = v_email
    and coalesce(t.durum, 'Aktif') = 'Aktif';
end;
$function$;

create or replace function private.bs_ofis_ogretmen_brans_dogrula_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.ogretmen_id is null or new.brans_id is null then
    return new;
  end if;
  if not private.ogretmen_brans_uygun_mu(new.ogretmen_id,new.brans_id) then
    raise exception 'Seçilen öğretmen bu branş için tanımlı değil.';
  end if;
  return new;
end;
$function$;

create or replace function private.portal_yonetim_kimligi_cakisma_engelle_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = new.auth_user_id
  ) then
    raise exception 'Bu hesap yönetim kullanıcısıdır; portal kullanıcısı olarak aynı anda tanımlanamaz.';
  end if;
  return new;
end;
$function$;

create or replace function private.yonetim_portal_kimligi_cakisma_engelle_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if exists (
    select 1
    from public.portal_kullanicilari pk
    where pk.auth_user_id = new.auth_user_id
  ) then
    raise exception 'Bu hesap portal kullanıcısıdır; yönetim kullanıcısı olarak aynı anda tanımlanamaz.';
  end if;
  return new;
end;
$function$;

-- Client rollerine varsayılan kapatma.
revoke all on function private.bs_ofis_yonetici_mi() from public, anon, authenticated;
revoke all on function private.ogretmen_brans_uygun_mu(text,text) from public, anon, authenticated;
revoke all on function private.sabit_program_tarihe_duser_mi(text,date,date) from public, anon, authenticated;
revoke all on function private.sabit_program_tarih_uygun_mu(text,date) from public, anon, authenticated;
revoke all on function private.bs_program_tarih_kontrol_v1(text,date,time without time zone,text) from public, anon, authenticated;
revoke all on function private.portal_kimligi_epostadan_v2() from public, anon, authenticated;
revoke all on function private.bs_ofis_ogretmen_brans_dogrula_v1() from public, anon, authenticated;
revoke all on function private.portal_yonetim_kimligi_cakisma_engelle_v1() from public, anon, authenticated;
revoke all on function private.yonetim_portal_kimligi_cakisma_engelle_v1() from public, anon, authenticated;

-- RLS ve Storage policy ifadelerinin doğrudan kullandığı tek kontrollü private helper istisnası.
grant execute on function private.bs_ofis_yonetici_mi() to authenticated;

-- Trigger bağları.
create trigger trg_dersler_ogretmen_brans
before insert or update of ogretmen_id, brans_id on public.dersler
for each row execute function private.bs_ofis_ogretmen_brans_dogrula_v1();

create trigger trg_sabit_program_ogretmen_brans
before insert or update of ogretmen_id, brans_id on public.sabit_ders_programi
for each row execute function private.bs_ofis_ogretmen_brans_dogrula_v1();

create trigger trg_yonetim_portal_kimligi_cakisma_engelle
before insert or update of auth_user_id on public.kullanici_profilleri
for each row execute function private.yonetim_portal_kimligi_cakisma_engelle_v1();

create trigger trg_portal_yonetim_kimligi_cakisma_engelle
before insert or update of auth_user_id on public.portal_kullanicilari
for each row execute function private.portal_yonetim_kimligi_cakisma_engelle_v1();
