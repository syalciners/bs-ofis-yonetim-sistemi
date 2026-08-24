alter table public.ogrenciler
  add column if not exists profil_fotografi text;

alter table public.ogretmenler
  add column if not exists profil_fotografi text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profil-fotograflari',
  'profil-fotograflari',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.profil_fotografi_guncelle_guvenli_v1(
  p_kayit_turu text,
  p_kayit_id text,
  p_profil_fotografi text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if nullif(trim(coalesce(p_kayit_id, '')), '') is null then
    raise exception 'Kayıt kimliği eksik.';
  end if;

  if nullif(trim(coalesce(p_profil_fotografi, '')), '') is null then
    raise exception 'Profil fotoğrafı yolu eksik.';
  end if;

  if p_kayit_turu = 'ogrenci' then
    update public.ogrenciler
       set profil_fotografi = trim(p_profil_fotografi)
     where ogrenci_id = p_kayit_id;
  elsif p_kayit_turu = 'ogretmen' then
    update public.ogretmenler
       set profil_fotografi = trim(p_profil_fotografi)
     where ogretmen_id = p_kayit_id;
  else
    raise exception 'Geçersiz kayıt türü.';
  end if;

  if not found then
    raise exception 'Profil fotoğrafı güncellenecek kayıt bulunamadı.';
  end if;

  return jsonb_build_object(
    'basarili', true,
    'kayit_turu', p_kayit_turu,
    'kayit_id', p_kayit_id,
    'profil_fotografi', trim(p_profil_fotografi)
  );
end;
$$;

revoke all on function public.profil_fotografi_guncelle_guvenli_v1(text, text, text) from public;
grant execute on function public.profil_fotografi_guncelle_guvenli_v1(text, text, text) to authenticated;
grant execute on function public.profil_fotografi_guncelle_guvenli_v1(text, text, text) to service_role;

drop policy if exists "profil_fotograflari_yonetici_oku" on storage.objects;
create policy "profil_fotograflari_yonetici_oku"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profil-fotograflari'
  and private.bs_ofis_yonetici_mi()
);

drop policy if exists "profil_fotograflari_yonetici_ekle" on storage.objects;
create policy "profil_fotograflari_yonetici_ekle"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profil-fotograflari'
  and private.bs_ofis_yonetici_mi()
  and (storage.foldername(name))[1] in ('ogrenciler', 'ogretmenler')
);

drop policy if exists "profil_fotograflari_yonetici_sil" on storage.objects;
create policy "profil_fotograflari_yonetici_sil"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profil-fotograflari'
  and private.bs_ofis_yonetici_mi()
);
