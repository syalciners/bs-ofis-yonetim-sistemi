-- BS Eğitim SaaS V1 — İlk yönetici bootstrap
-- Bu fonksiyon client rollerine açılmaz. Kurulum operatörü SQL üzerinden bir kez çağırır.
-- Ön koşul: hedef kişi Google ile en az bir kez giriş yapmış ve auth.users kaydı oluşmuş olmalıdır.

create or replace function private.ilk_yonetici_bootstrap_v1(
  p_email text,
  p_ad_soyad text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_ad_soyad text:=trim(coalesce(p_ad_soyad,''));
  v_active_manager_count integer;
begin
  if v_email='' then raise exception 'İlk yönetici e-postası zorunludur.'; end if;
  if v_ad_soyad='' then raise exception 'İlk yönetici adı zorunludur.'; end if;

  select count(*) into v_active_manager_count
  from public.kullanici_profilleri
  where rol='Yönetici' and aktif=true;

  if v_active_manager_count>0 then
    raise exception 'İlk yönetici daha önce oluşturulmuş. Bootstrap tekrar çalıştırılamaz.';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(coalesce(u.email,''))=v_email
  order by u.id
  limit 1;

  if v_user_id is null then
    raise exception 'Bu e-posta için auth.users kaydı bulunamadı. Kullanıcı önce Google ile giriş yapmalıdır.';
  end if;

  insert into public.kullanici_profilleri(
    auth_user_id,email,ad_soyad,rol,ogretmen_id,aktif,olusturulma_zamani,guncellenme_zamani,telefon
  ) values (
    v_user_id,v_email,v_ad_soyad,'Yönetici',null,true,now(),now(),null
  )
  on conflict (auth_user_id) do update
  set email=excluded.email,
      ad_soyad=excluded.ad_soyad,
      rol='Yönetici',
      ogretmen_id=null,
      aktif=true,
      guncellenme_zamani=now();

  return jsonb_build_object(
    'basarili',true,
    'auth_user_id',v_user_id,
    'email',v_email,
    'rol','Yönetici'
  );
end;
$function$;

revoke all on function private.ilk_yonetici_bootstrap_v1(text,text) from public, anon, authenticated;
-- Kurulum operatörü veya güvenli provisioning servisi için; son kullanıcıya açık değildir.
grant execute on function private.ilk_yonetici_bootstrap_v1(text,text) to service_role;
