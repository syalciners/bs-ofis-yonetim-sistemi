drop policy if exists kurum_ayarlari_okuma on public.kurum_ayarlari;
drop policy if exists kurum_ayarlari_yonetici_okuma on public.kurum_ayarlari;
create policy kurum_ayarlari_yonetici_okuma
on public.kurum_ayarlari
for select
to authenticated
using (private.bs_ofis_yonetici_mi());

create or replace function public.kurum_public_bilgisi_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kurum_id', kurum_id,
    'kurum_adi', kurum_adi,
    'marka_adi', marka_adi,
    'logo_url', logo_url
  )
  from public.kurum_ayarlari
  where kurum_id = 'ANA';
$$;

revoke all on function public.kurum_public_bilgisi_v1() from public;
grant execute on function public.kurum_public_bilgisi_v1() to anon, authenticated, service_role;
