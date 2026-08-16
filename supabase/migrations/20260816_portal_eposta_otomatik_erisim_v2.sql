-- BS Eğitim Portalı V2
-- E-posta tabanlı otomatik öğrenci/öğretmen kimlik çözümleme.
-- V1 ve portal_kullanicilari rollback amacıyla korunur.

create or replace function private.portal_kimligi_epostadan_v2()
returns table (
  rol text,
  ogrenci_id text,
  ogretmen_id text,
  ad_soyad text,
  email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_eslesme_sayisi integer;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  -- Yönetim hesapları portalın salt-okunur kimliği olarak kullanılmaz.
  -- Böylece yönetici/personel JWT yetkilerinin portal oturumuna taşınması önlenir.
  if exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = v_uid
      and kp.aktif = true
  ) then
    raise exception 'Yönetim hesapları BS Eğitim Portalı üzerinden kullanılamaz.';
  end if;

  -- E-posta istemci parametresinden değil, Supabase Auth kaydından okunur.
  -- Yalnız doğrulanmış Auth e-postası kabul edilir.
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
  select
    'Öğrenci'::text,
    o.ogrenci_id,
    null::text,
    o.ad_soyad,
    v_email
  from public.ogrenciler o
  where o.email is not null
    and lower(btrim(o.email)) = v_email
    and coalesce(o.durum, 'Aktif') = 'Aktif'

  union all

  select
    'Öğretmen'::text,
    null::text,
    t.ogretmen_id,
    t.ad_soyad,
    v_email
  from public.ogretmenler t
  where t.email is not null
    and lower(btrim(t.email)) = v_email
    and coalesce(t.durum, 'Aktif') = 'Aktif';
end;
$$;

revoke all on function private.portal_kimligi_epostadan_v2() from public;
revoke all on function private.portal_kimligi_epostadan_v2() from anon;
revoke all on function private.portal_kimligi_epostadan_v2() from authenticated;

create or replace function public.portal_oturum_bilgisi_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_ad_soyad text;
  v_email text;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id, k.ad_soyad, k.email
    into v_rol, v_ogrenci_id, v_ogretmen_id, v_ad_soyad, v_email
  from private.portal_kimligi_epostadan_v2() k;

  return jsonb_build_object(
    'rol', v_rol,
    'ad_soyad', v_ad_soyad,
    'email', v_email
  );
end;
$$;

create or replace function public.portal_bugun_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ders_id', d.ders_id,
        'tarih', d.tarih,
        'baslangic_saati', d.baslangic_saati,
        'bitis_saati', d.bitis_saati,
        'ders_durumu', d.ders_durumu,
        'brans_adi', b.brans_adi,
        'derslik_adi', dl.mekan_adi,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'zoom_katilim_baglantisi', d.zoom_katilim_baglantisi
      ) order by d.baslangic_saati, d.ders_id
    ),
    '[]'::jsonb
  )
  into v_result
  from public.dersler d
  left join public.branslar b on b.brans_id = d.brans_id
  left join public.derslikler dl on dl.derslik_id = d.derslik_id
  left join public.ogrenciler ogr on ogr.ogrenci_id = d.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = d.ogretmen_id
  where d.tarih = v_bugun
    and d.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and d.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and d.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$$;

create or replace function public.portal_program_v2(p_gun integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  if p_gun is null or p_gun < 1 or p_gun > 60 then
    raise exception 'Program aralığı 1 ile 60 gün arasında olmalıdır.';
  end if;

  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ders_id', d.ders_id,
        'tarih', d.tarih,
        'baslangic_saati', d.baslangic_saati,
        'bitis_saati', d.bitis_saati,
        'ders_durumu', d.ders_durumu,
        'brans_adi', b.brans_adi,
        'derslik_adi', dl.mekan_adi,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'zoom_katilim_baglantisi', d.zoom_katilim_baglantisi
      ) order by d.tarih, d.baslangic_saati, d.ders_id
    ),
    '[]'::jsonb
  )
  into v_result
  from public.dersler d
  left join public.branslar b on b.brans_id = d.brans_id
  left join public.derslikler dl on dl.derslik_id = d.derslik_id
  left join public.ogrenciler ogr on ogr.ogrenci_id = d.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = d.ogretmen_id
  where d.tarih >= v_bugun
    and d.tarih <= (v_bugun + p_gun)
    and d.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and d.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and d.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$$;

create or replace function public.portal_odevler_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_result jsonb;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'odev_id', o.odev_id,
        'odev_basligi', o.odev_basligi,
        'odev_aciklamasi', o.odev_aciklamasi,
        'verilis_tarihi', o.verilis_tarihi,
        'son_teslim_tarihi', o.son_teslim_tarihi,
        'durum', o.durum,
        'oncelik', o.oncelik,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'odev_dosya_linki', o.odev_dosya_linki,
        'odev_fotograf_linki', o.odev_fotograf_linki,
        'ogretmen_notu', o.ogretmen_notu,
        'puan', o.puan
      ) order by o.verilis_tarihi desc, o.odev_id
    ),
    '[]'::jsonb
  )
  into v_result
  from public.odevler o
  left join public.ogrenciler ogr on ogr.ogrenci_id = o.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = o.ogretmen_id
  where o.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and o.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and o.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$$;

revoke all on function public.portal_oturum_bilgisi_v2() from public;
revoke all on function public.portal_bugun_v2() from public;
revoke all on function public.portal_program_v2(integer) from public;
revoke all on function public.portal_odevler_v2() from public;

revoke all on function public.portal_oturum_bilgisi_v2() from anon;
revoke all on function public.portal_bugun_v2() from anon;
revoke all on function public.portal_program_v2(integer) from anon;
revoke all on function public.portal_odevler_v2() from anon;

grant execute on function public.portal_oturum_bilgisi_v2() to authenticated;
grant execute on function public.portal_bugun_v2() to authenticated;
grant execute on function public.portal_program_v2(integer) to authenticated;
grant execute on function public.portal_odevler_v2() to authenticated;
