drop policy if exists kurum_markasi_yonetici_select on storage.objects;
create policy kurum_markasi_yonetici_select on storage.objects for select to authenticated using (bucket_id='kurum-markasi' and private.bs_ofis_yonetici_mi());
