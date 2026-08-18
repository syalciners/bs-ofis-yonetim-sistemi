create table if not exists public.kurum_ayarlari (
  kurum_id text primary key,
  kurum_adi text not null,
  marka_adi text not null,
  telefon text,
  email text,
  adres text,
  logo_url text,
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid,
  constraint kurum_ayarlari_tek_kayit check (kurum_id = 'ANA')
);

alter table public.kurum_ayarlari enable row level security;

drop policy if exists kurum_ayarlari_okuma on public.kurum_ayarlari;
create policy kurum_ayarlari_okuma
on public.kurum_ayarlari
for select
to anon, authenticated
using (true);

insert into public.kurum_ayarlari(kurum_id,kurum_adi,marka_adi,logo_url)
values('ANA','BS Eğitim Yönetimi','BS Eğitim','./bs-egitim-icon-512-v2.png')
on conflict (kurum_id) do nothing;

create or replace function public.kurum_ayarlari_guncelle_guvenli_v1(
  p_kurum_adi text,
  p_marka_adi text,
  p_telefon text,
  p_email text,
  p_adres text,
  p_logo_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_kurum_adi),'') is null then
    raise exception 'Kurum adı boş bırakılamaz.';
  end if;
  if nullif(trim(p_marka_adi),'') is null then
    raise exception 'Marka adı boş bırakılamaz.';
  end if;

  update public.kurum_ayarlari
     set kurum_adi = trim(p_kurum_adi),
         marka_adi = trim(p_marka_adi),
         telefon = nullif(trim(coalesce(p_telefon,'')),''),
         email = nullif(trim(coalesce(p_email,'')),''),
         adres = nullif(trim(coalesce(p_adres,'')),''),
         logo_url = coalesce(nullif(trim(coalesce(p_logo_url,'')),''), logo_url),
         guncellenme_zamani = now(),
         guncelleyen = auth.uid()
   where kurum_id = 'ANA';

  return jsonb_build_object('basarili',true,'kurum_id','ANA');
end;
$$;

revoke all on function public.kurum_ayarlari_guncelle_guvenli_v1(text,text,text,text,text,text) from public, anon;
grant execute on function public.kurum_ayarlari_guncelle_guvenli_v1(text,text,text,text,text,text) to authenticated, service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kurum-markasi','kurum-markasi',true,2097152,array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/png','image/jpeg','image/webp']::text[];

drop policy if exists kurum_markasi_yonetici_insert on storage.objects;
drop policy if exists kurum_markasi_yonetici_update on storage.objects;
drop policy if exists kurum_markasi_yonetici_delete on storage.objects;
create policy kurum_markasi_yonetici_insert on storage.objects for insert to authenticated with check (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
create policy kurum_markasi_yonetici_update on storage.objects for update to authenticated using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi()) with check (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
create policy kurum_markasi_yonetici_delete on storage.objects for delete to authenticated using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
