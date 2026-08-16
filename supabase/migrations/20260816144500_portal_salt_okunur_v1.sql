create table if not exists public.portal_kullanicilari (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('Öğretmen', 'Öğrenci')),
  ogrenci_id text references public.ogrenciler(ogrenci_id) on delete restrict,
  ogretmen_id text references public.ogretmenler(ogretmen_id) on delete restrict,
  aktif boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint portal_kullanicilari_rol_baglanti_ck check (
    (rol = 'Öğretmen' and ogretmen_id is not null and ogrenci_id is null)
    or
    (rol = 'Öğrenci' and ogrenci_id is not null and ogretmen_id is null)
  )
);

create unique index if not exists portal_kullanicilari_ogretmen_uniq
  on public.portal_kullanicilari (ogretmen_id)
  where ogretmen_id is not null;

create unique index if not exists portal_kullanicilari_ogrenci_uniq
  on public.portal_kullanicilari (ogrenci_id)
  where ogrenci_id is not null;

alter table public.portal_kullanicilari enable row level security;

revoke all on table public.portal_kullanicilari from anon, authenticated;

drop policy if exists "Yöneticiler portal kullanıcılarını yönetebilir" on public.portal_kullanicilari;
create policy "Yöneticiler portal kullanıcılarını yönetebilir"
  on public.portal_kullanicilari
  for all
  to authenticated
  using ((select private.bs_ofis_yonetici_mi()))
  with check ((select private.bs_ofis_yonetici_mi()));

create or replace function public.portal_oturum_bilgisi_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_ad_soyad text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select pk.rol, pk.ogrenci_id, pk.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from public.portal_kullanicilari pk
  where pk.auth_user_id = v_uid
    and pk.aktif = true;

  if not found then
    raise exception 'Bu hesap portal için yetkilendirilmemiş.';
  end if;

  if v_rol = 'Öğrenci' then
    select o.ad_soyad into v_ad_soyad
    from public.ogrenciler o
    where o.ogrenci_id = v_ogrenci_id;
  elsif v_rol = 'Öğretmen' then
    select o.ad_soyad into v_ad_soyad
    from public.ogretmenler o
    where o.ogretmen_id = v_ogretmen_id;
  else
    raise exception 'Geçersiz portal rolü.';
  end if;

  if v_ad_soyad is null then
    raise exception 'Portal hesabına bağlı kişi kaydı bulunamadı.';
  end if;

  return jsonb_build_object(
    'rol', v_rol,
    'ad_soyad', v_ad_soyad,
    'email', auth.jwt() ->> 'email'
  );
end;
$$;

create or replace function public.portal_bugun_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select pk.rol, pk.ogrenci_id, pk.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from public.portal_kullanicilari pk
  where pk.auth_user_id = v_uid
    and pk.aktif = true;

  if not found then
    raise exception 'Bu hesap portal için yetkilendirilmemiş.';
  end if;

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

create or replace function public.portal_program_v1(p_gun integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if p_gun is null or p_gun < 1 or p_gun > 60 then
    raise exception 'Program aralığı 1 ile 60 gün arasında olmalıdır.';
  end if;

  select pk.rol, pk.ogrenci_id, pk.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from public.portal_kullanicilari pk
  where pk.auth_user_id = v_uid
    and pk.aktif = true;

  if not found then
    raise exception 'Bu hesap portal için yetkilendirilmemiş.';
  end if;

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

create or replace function public.portal_odevler_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select pk.rol, pk.ogrenci_id, pk.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from public.portal_kullanicilari pk
  where pk.auth_user_id = v_uid
    and pk.aktif = true;

  if not found then
    raise exception 'Bu hesap portal için yetkilendirilmemiş.';
  end if;

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

revoke all on function public.portal_oturum_bilgisi_v1() from public, anon;
revoke all on function public.portal_bugun_v1() from public, anon;
revoke all on function public.portal_program_v1(integer) from public, anon;
revoke all on function public.portal_odevler_v1() from public, anon;

grant execute on function public.portal_oturum_bilgisi_v1() to authenticated;
grant execute on function public.portal_bugun_v1() to authenticated;
grant execute on function public.portal_program_v1(integer) to authenticated;
grant execute on function public.portal_odevler_v1() to authenticated;
