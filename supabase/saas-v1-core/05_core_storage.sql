-- BS Eğitim SaaS V1 — Storage bucket ve RLS politikaları
-- Supabase Storage şeması hazır olduktan sonra uygulanır.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('kurum-markasi','kurum-markasi',true,2097152,array['image/png','image/jpeg','image/webp']::text[]),
  ('odev-ekleri','odev-ekleri',false,15728640,null),
  ('profil-fotograflari','profil-fotograflari',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update
set name=excluded.name,
    public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

-- Kurum markası: yalnız yönetici yazabilir/silebilir; bucket public olduğu için yayın URL'si herkese açıktır.
drop policy if exists kurum_markasi_yonetici_select on storage.objects;
drop policy if exists kurum_markasi_yonetici_insert on storage.objects;
drop policy if exists kurum_markasi_yonetici_update on storage.objects;
drop policy if exists kurum_markasi_yonetici_delete on storage.objects;
create policy kurum_markasi_yonetici_select on storage.objects for select to authenticated
using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
create policy kurum_markasi_yonetici_insert on storage.objects for insert to authenticated
with check (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
create policy kurum_markasi_yonetici_update on storage.objects for update to authenticated
using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi())
with check (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
create policy kurum_markasi_yonetici_delete on storage.objects for delete to authenticated
using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());

-- Ödev ekleri: private bucket, yönetim uygulaması signed URL üretir.
drop policy if exists odev_ekleri_yonetici_select on storage.objects;
drop policy if exists odev_ekleri_yonetici_insert on storage.objects;
drop policy if exists odev_ekleri_yonetici_update on storage.objects;
drop policy if exists odev_ekleri_yonetici_delete on storage.objects;
create policy odev_ekleri_yonetici_select on storage.objects for select to authenticated
using (bucket_id='odev-ekleri' and private.bs_ofis_yonetici_mi());
create policy odev_ekleri_yonetici_insert on storage.objects for insert to authenticated
with check (bucket_id='odev-ekleri' and private.bs_ofis_yonetici_mi());
create policy odev_ekleri_yonetici_update on storage.objects for update to authenticated
using (bucket_id='odev-ekleri' and private.bs_ofis_yonetici_mi())
with check (bucket_id='odev-ekleri' and private.bs_ofis_yonetici_mi());
create policy odev_ekleri_yonetici_delete on storage.objects for delete to authenticated
using (bucket_id='odev-ekleri' and private.bs_ofis_yonetici_mi());

-- Profil fotoğrafları: private bucket ve yalnız iki izinli üst klasör.
drop policy if exists profil_fotograflari_yonetici_oku on storage.objects;
drop policy if exists profil_fotograflari_yonetici_ekle on storage.objects;
drop policy if exists profil_fotograflari_yonetici_sil on storage.objects;
create policy profil_fotograflari_yonetici_oku on storage.objects for select to authenticated
using (bucket_id='profil-fotograflari' and private.bs_ofis_yonetici_mi());
create policy profil_fotograflari_yonetici_ekle on storage.objects for insert to authenticated
with check (
  bucket_id='profil-fotograflari'
  and private.bs_ofis_yonetici_mi()
  and (storage.foldername(name))[1]=any(array['ogrenciler'::text,'ogretmenler'::text])
);
create policy profil_fotograflari_yonetici_sil on storage.objects for delete to authenticated
using (bucket_id='profil-fotograflari' and private.bs_ofis_yonetici_mi());
