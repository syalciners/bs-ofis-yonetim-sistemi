create or replace function public.kullanici_profili_guncelle_guvenli_v2(
  p_auth_user_id uuid,
  p_ad_soyad text,
  p_telefon text,
  p_aktif boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_hedef_rol text;
  v_hedef_aktif boolean;
  v_yeni_aktif boolean;
  v_aktif_yonetici integer;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Kullanıcı kimliği eksik.';
  end if;

  if nullif(trim(p_ad_soyad), '') is null then
    raise exception 'Ad Soyad boş bırakılamaz.';
  end if;

  select rol, aktif
    into v_hedef_rol, v_hedef_aktif
    from public.kullanici_profilleri
   where auth_user_id = p_auth_user_id;

  if not found then
    raise exception 'Kullanıcı profili bulunamadı.';
  end if;

  v_yeni_aktif := coalesce(p_aktif, v_hedef_aktif);

  if p_auth_user_id = v_uid and v_yeni_aktif = false then
    raise exception 'Oturum açmış kendi kullanıcı hesabınızı pasifleştiremezsiniz.';
  end if;

  if v_hedef_rol = 'Yönetici' and v_hedef_aktif = true and v_yeni_aktif = false then
    select count(*)
      into v_aktif_yonetici
      from public.kullanici_profilleri
     where rol = 'Yönetici'
       and aktif = true;

    if v_aktif_yonetici <= 1 then
      raise exception 'Son aktif yönetici pasifleştirilemez.';
    end if;
  end if;

  update public.kullanici_profilleri
     set ad_soyad = trim(p_ad_soyad),
         telefon = nullif(trim(coalesce(p_telefon, '')), ''),
         aktif = v_yeni_aktif,
         guncellenme_zamani = now()
   where auth_user_id = p_auth_user_id;

  return jsonb_build_object(
    'basarili', true,
    'auth_user_id', p_auth_user_id,
    'aktif', v_yeni_aktif
  );
end;
$$;

revoke all on function public.kullanici_profili_guncelle_guvenli_v2(uuid, text, text, boolean) from public;
grant execute on function public.kullanici_profili_guncelle_guvenli_v2(uuid, text, text, boolean) to authenticated;
grant execute on function public.kullanici_profili_guncelle_guvenli_v2(uuid, text, text, boolean) to service_role;
