create or replace function public.brans_kaydet_guvenli_v1(
  p_brans_id text,
  p_brans_adi text,
  p_aktif boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yeni boolean;
  v_aktif boolean := coalesce(p_aktif, true);
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_brans_id), '') is null then
    raise exception 'Branş kimliği eksik.';
  end if;
  if nullif(trim(p_brans_adi), '') is null then
    raise exception 'Branş adı boş bırakılamaz.';
  end if;
  if exists (
    select 1 from public.branslar
    where lower(trim(brans_adi)) = lower(trim(p_brans_adi))
      and brans_id <> p_brans_id
  ) then
    raise exception 'Aynı adla başka bir branş zaten var.';
  end if;
  if v_aktif = false and exists (
    select 1 from public.sabit_ders_programi
    where brans_id = p_brans_id
      and coalesce(aktif, true) = true
      and coalesce(program_durumu, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif sabit programlarda kullanılan branş pasifleştirilemez.';
  end if;

  v_yeni := not exists(select 1 from public.branslar where brans_id = p_brans_id);
  if v_yeni then
    insert into public.branslar(brans_id, brans_adi, aktif, kaynakta_var)
    values(trim(p_brans_id), trim(p_brans_adi), v_aktif, true);
  else
    update public.branslar
       set brans_adi = trim(p_brans_adi), aktif = v_aktif
     where brans_id = p_brans_id;
  end if;

  return jsonb_build_object('basarili', true, 'brans_id', p_brans_id, 'yeni', v_yeni, 'aktif', v_aktif);
end;
$$;

create or replace function public.derslik_kaydet_guvenli_v1(
  p_derslik_id text,
  p_mekan_adi text,
  p_mekan_turu text,
  p_kapasite integer,
  p_aktif boolean,
  p_aciklama text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yeni boolean;
  v_aktif boolean := coalesce(p_aktif, true);
  v_kapasite integer := coalesce(p_kapasite, 1);
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_derslik_id), '') is null then
    raise exception 'Derslik kimliği eksik.';
  end if;
  if nullif(trim(p_mekan_adi), '') is null then
    raise exception 'Derslik adı boş bırakılamaz.';
  end if;
  if v_kapasite < 1 then
    raise exception 'Derslik kapasitesi en az 1 olmalıdır.';
  end if;
  if exists (
    select 1 from public.derslikler
    where lower(trim(mekan_adi)) = lower(trim(p_mekan_adi))
      and derslik_id <> p_derslik_id
  ) then
    raise exception 'Aynı adla başka bir derslik zaten var.';
  end if;
  if v_aktif = false and exists (
    select 1 from public.sabit_ders_programi
    where derslik_id = p_derslik_id
      and coalesce(aktif, true) = true
      and coalesce(program_durumu, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif sabit programlarda kullanılan derslik pasifleştirilemez.';
  end if;

  v_yeni := not exists(select 1 from public.derslikler where derslik_id = p_derslik_id);
  if v_yeni then
    insert into public.derslikler(derslik_id, mekan_adi, mekan_turu, kapasite, aktif, aciklama, kaynakta_var)
    values(trim(p_derslik_id), trim(p_mekan_adi), nullif(trim(coalesce(p_mekan_turu, '')), ''), v_kapasite, v_aktif, nullif(trim(coalesce(p_aciklama, '')), ''), true);
  else
    update public.derslikler
       set mekan_adi = trim(p_mekan_adi),
           mekan_turu = nullif(trim(coalesce(p_mekan_turu, '')), ''),
           kapasite = v_kapasite,
           aktif = v_aktif,
           aciklama = nullif(trim(coalesce(p_aciklama, '')), '')
     where derslik_id = p_derslik_id;
  end if;

  return jsonb_build_object('basarili', true, 'derslik_id', p_derslik_id, 'yeni', v_yeni, 'aktif', v_aktif);
end;
$$;

revoke all on function public.brans_kaydet_guvenli_v1(text, text, boolean) from public, anon;
revoke all on function public.derslik_kaydet_guvenli_v1(text, text, text, integer, boolean, text) from public, anon;
grant execute on function public.brans_kaydet_guvenli_v1(text, text, boolean) to authenticated, service_role;
grant execute on function public.derslik_kaydet_guvenli_v1(text, text, text, integer, boolean, text) to authenticated, service_role;
