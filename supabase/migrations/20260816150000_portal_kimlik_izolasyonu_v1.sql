create or replace function private.portal_yonetim_kimligi_cakisma_engelle_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create or replace function private.yonetim_portal_kimligi_cakisma_engelle_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.portal_yonetim_kimligi_cakisma_engelle_v1() from public, anon, authenticated;
revoke all on function private.yonetim_portal_kimligi_cakisma_engelle_v1() from public, anon, authenticated;

drop trigger if exists trg_portal_yonetim_kimligi_cakisma_engelle on public.portal_kullanicilari;
create trigger trg_portal_yonetim_kimligi_cakisma_engelle
before insert or update of auth_user_id
on public.portal_kullanicilari
for each row
execute function private.portal_yonetim_kimligi_cakisma_engelle_v1();

drop trigger if exists trg_yonetim_portal_kimligi_cakisma_engelle on public.kullanici_profilleri;
create trigger trg_yonetim_portal_kimligi_cakisma_engelle
before insert or update of auth_user_id
on public.kullanici_profilleri
for each row
execute function private.yonetim_portal_kimligi_cakisma_engelle_v1();
