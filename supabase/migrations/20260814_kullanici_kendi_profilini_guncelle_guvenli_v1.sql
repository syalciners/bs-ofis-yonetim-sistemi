create or replace function public.kullanici_kendi_profilini_guncelle_guvenli_v1(
  p_ad_soyad text,
  p_telefon text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;
  if nullif(trim(p_ad_soyad), '') is null then
    raise exception 'Ad Soyad boş bırakılamaz.';
  end if;

  update public.kullanici_profilleri
     set ad_soyad = trim(p_ad_soyad),
         telefon = nullif(trim(coalesce(p_telefon, '')), ''),
         guncellenme_zamani = now()
   where auth_user_id = v_uid;

  if not found then
    raise exception 'Kullanıcı profili bulunamadı.';
  end if;

  return jsonb_build_object('basarili', true, 'auth_user_id', v_uid);
end;
$$;

revoke all on function public.kullanici_kendi_profilini_guncelle_guvenli_v1(text,text) from public, anon;
grant execute on function public.kullanici_kendi_profilini_guncelle_guvenli_v1(text,text) to authenticated, service_role;
