create table if not exists public.kitap_katalogu (
  kitap_id text primary key,
  kitap_adi text not null,
  yayinevi text,
  isbn text,
  ders text,
  sinav_turu text,
  baski text,
  toplam_sayfa integer,
  kapak_url text,
  durum text not null default 'Onaylı',
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint kitap_katalogu_toplam_sayfa_chk check (toplam_sayfa is null or toplam_sayfa > 0),
  constraint kitap_katalogu_durum_chk check (durum in ('Onaylı', 'Taslak', 'Pasif'))
);

create unique index if not exists uq_kitap_katalogu_isbn
  on public.kitap_katalogu(isbn)
  where isbn is not null and trim(isbn) <> '';
create index if not exists idx_kitap_katalogu_adi on public.kitap_katalogu(kitap_adi);
create index if not exists idx_kitap_katalogu_yayinevi on public.kitap_katalogu(yayinevi);

create table if not exists public.ogrenci_kitaplari (
  ogrenci_kitap_id text primary key,
  ogrenci_id text not null references public.ogrenciler(ogrenci_id) on update cascade on delete restrict,
  kitap_id text not null references public.kitap_katalogu(kitap_id) on update cascade on delete restrict,
  durum text not null default 'Aktif',
  eklenme_tarihi date not null default current_date,
  notlar text,
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint ogrenci_kitaplari_durum_chk check (durum in ('Aktif', 'Tamamlandı', 'Bırakıldı'))
);

create unique index if not exists uq_ogrenci_kitaplari_aktif
  on public.ogrenci_kitaplari(ogrenci_id, kitap_id)
  where durum = 'Aktif';
create index if not exists idx_ogrenci_kitaplari_ogrenci on public.ogrenci_kitaplari(ogrenci_id, durum);

alter table public.odevler
  add column if not exists ogrenci_kitap_id text references public.ogrenci_kitaplari(ogrenci_kitap_id) on update cascade on delete restrict,
  add column if not exists calisma_turu text,
  add column if not exists baslangic_no integer,
  add column if not exists bitis_no integer,
  add column if not exists calisma_detayi text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'odevler_calisma_turu_chk') then
    alter table public.odevler add constraint odevler_calisma_turu_chk
      check (calisma_turu is null or calisma_turu in ('Sayfa', 'Test', 'Konu'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'odevler_calisma_araligi_chk') then
    alter table public.odevler add constraint odevler_calisma_araligi_chk
      check (
        (baslangic_no is null and bitis_no is null)
        or (baslangic_no is not null and baslangic_no > 0 and bitis_no is not null and bitis_no >= baslangic_no)
      );
  end if;
end $$;

alter table public.kitap_katalogu enable row level security;
alter table public.ogrenci_kitaplari enable row level security;

drop policy if exists yonetici_tam_erisim on public.kitap_katalogu;
create policy yonetici_tam_erisim on public.kitap_katalogu
as permissive for all to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

drop policy if exists yonetici_tam_erisim on public.ogrenci_kitaplari;
create policy yonetici_tam_erisim on public.ogrenci_kitaplari
as permissive for all to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

revoke all on table public.kitap_katalogu from anon;
revoke all on table public.ogrenci_kitaplari from anon;
grant select on table public.kitap_katalogu to authenticated;
grant select on table public.ogrenci_kitaplari to authenticated;
grant all on table public.kitap_katalogu to service_role;
grant all on table public.ogrenci_kitaplari to service_role;

create or replace function public.kitap_katalogu_kaydet_guvenli_v1(
  p_kitap_id text,
  p_kitap_adi text,
  p_yayinevi text,
  p_isbn text,
  p_ders text,
  p_sinav_turu text,
  p_baski text,
  p_toplam_sayfa integer,
  p_kapak_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(trim(coalesce(p_kitap_id, '')), '');
  v_ad text := nullif(trim(coalesce(p_kitap_adi, '')), '');
  v_isbn text := nullif(regexp_replace(coalesce(p_isbn, ''), '[^0-9Xx]', '', 'g'), '');
  v_yeni boolean;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if v_ad is null then raise exception 'Kitap adı zorunludur.'; end if;
  if p_toplam_sayfa is not null and p_toplam_sayfa <= 0 then raise exception 'Toplam sayfa 0’dan büyük olmalıdır.'; end if;

  if v_isbn is not null then
    select kitap_id into v_id from public.kitap_katalogu where isbn = v_isbn limit 1;
  end if;
  if v_id is null then v_id := 'KTP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)); end if;
  v_yeni := not exists(select 1 from public.kitap_katalogu where kitap_id = v_id);

  insert into public.kitap_katalogu(
    kitap_id, kitap_adi, yayinevi, isbn, ders, sinav_turu, baski, toplam_sayfa, kapak_url, durum, olusturan, guncelleyen
  ) values (
    v_id, v_ad, nullif(trim(coalesce(p_yayinevi,'')),''), v_isbn,
    nullif(trim(coalesce(p_ders,'')),''), nullif(trim(coalesce(p_sinav_turu,'')),''),
    nullif(trim(coalesce(p_baski,'')),''), p_toplam_sayfa,
    nullif(trim(coalesce(p_kapak_url,'')),''), 'Onaylı', auth.uid(), auth.uid()
  )
  on conflict (kitap_id) do update set
    kitap_adi = excluded.kitap_adi,
    yayinevi = excluded.yayinevi,
    isbn = excluded.isbn,
    ders = excluded.ders,
    sinav_turu = excluded.sinav_turu,
    baski = excluded.baski,
    toplam_sayfa = excluded.toplam_sayfa,
    kapak_url = excluded.kapak_url,
    durum = 'Onaylı',
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  return jsonb_build_object('basarili', true, 'kitap_id', v_id, 'yeni', v_yeni);
end;
$$;

create or replace function public.ogrenci_kitabi_kaydet_guvenli_v1(
  p_ogrenci_id text,
  p_kitap_id text,
  p_notlar text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_yeni boolean := false;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id and coalesce(durum,'Aktif') <> 'Pasif') then
    raise exception 'Aktif öğrenci bulunamadı.';
  end if;
  if not exists(select 1 from public.kocluk_ogrenci_profilleri where ogrenci_id=p_ogrenci_id and durum='Aktif') then
    raise exception 'Öğrencinin aktif koçluk profili bulunamadı.';
  end if;
  if not exists(select 1 from public.kitap_katalogu where kitap_id=p_kitap_id and durum='Onaylı') then
    raise exception 'Onaylı kitap kaydı bulunamadı.';
  end if;

  select ogrenci_kitap_id into v_id
  from public.ogrenci_kitaplari
  where ogrenci_id=p_ogrenci_id and kitap_id=p_kitap_id and durum='Aktif'
  limit 1;

  if v_id is null then
    v_id := 'OKT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    v_yeni := true;
    insert into public.ogrenci_kitaplari(ogrenci_kitap_id, ogrenci_id, kitap_id, durum, notlar, olusturan, guncelleyen)
    values(v_id, p_ogrenci_id, p_kitap_id, 'Aktif', nullif(trim(coalesce(p_notlar,'')),''), auth.uid(), auth.uid());
  else
    update public.ogrenci_kitaplari set
      notlar = nullif(trim(coalesce(p_notlar,'')),''),
      guncellenme_zamani = now(),
      guncelleyen = auth.uid()
    where ogrenci_kitap_id=v_id;
  end if;

  return jsonb_build_object('basarili', true, 'ogrenci_kitap_id', v_id, 'yeni', v_yeni);
end;
$$;

create or replace function public.kocluk_calisma_kaydet_guvenli_v1(
  p_ogrenci_id text,
  p_ogrenci_kitap_id text,
  p_calisma_turu text,
  p_baslangic_no integer,
  p_bitis_no integer,
  p_calisma_detayi text,
  p_son_teslim_tarihi date,
  p_oncelik text,
  p_aciklama text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_odev_id text;
  v_ogretmen_id text;
  v_kitap_adi text;
  v_tur text := coalesce(nullif(trim(coalesce(p_calisma_turu,'')),''), 'Sayfa');
  v_detay text := nullif(trim(coalesce(p_calisma_detayi,'')), '');
  v_baslik text;
  v_oncelik text := coalesce(nullif(trim(coalesce(p_oncelik,'')),''), 'Normal');
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;

  select kp.koc_ogretmen_id into v_ogretmen_id
  from public.kocluk_ogrenci_profilleri kp
  where kp.ogrenci_id=p_ogrenci_id and kp.durum='Aktif';
  if v_ogretmen_id is null then raise exception 'Öğrencinin aktif koçu bulunamadı.'; end if;

  select kk.kitap_adi into v_kitap_adi
  from public.ogrenci_kitaplari ok
  join public.kitap_katalogu kk on kk.kitap_id=ok.kitap_id
  where ok.ogrenci_kitap_id=p_ogrenci_kitap_id and ok.ogrenci_id=p_ogrenci_id and ok.durum='Aktif' and kk.durum='Onaylı';
  if v_kitap_adi is null then raise exception 'Öğrencinin aktif kitap kaydı bulunamadı.'; end if;

  if v_tur not in ('Sayfa','Test','Konu') then raise exception 'Geçersiz çalışma türü.'; end if;
  if v_tur in ('Sayfa','Test') then
    if p_baslangic_no is null or p_bitis_no is null or p_baslangic_no <= 0 or p_bitis_no < p_baslangic_no then
      raise exception 'Başlangıç ve bitiş aralığı geçersiz.';
    end if;
    v_baslik := v_kitap_adi || ' · ' || v_tur || ' ' || p_baslangic_no || '–' || p_bitis_no;
  else
    if v_detay is null then raise exception 'Konu çalışmasında konu detayı zorunludur.'; end if;
    v_baslik := v_kitap_adi || ' · ' || v_detay;
  end if;

  if p_son_teslim_tarihi is not null and p_son_teslim_tarihi < current_date then
    raise exception 'Son teslim tarihi geçmişte olamaz.';
  end if;

  v_odev_id := 'ODV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.odevler(
    odev_id, ogrenci_id, ogretmen_id, konu, odev_basligi, odev_aciklamasi,
    verilis_tarihi, son_teslim_tarihi, durum, oncelik,
    ogrenci_kitap_id, calisma_turu, baslangic_no, bitis_no, calisma_detayi,
    olusturan, olusturulma_zamani, son_guncelleyen, son_guncellenme_zamani
  ) values (
    v_odev_id, p_ogrenci_id, v_ogretmen_id, v_baslik, v_baslik,
    nullif(trim(coalesce(p_aciklama,'')),''), current_date, p_son_teslim_tarihi, 'Verildi', v_oncelik,
    p_ogrenci_kitap_id, v_tur,
    case when v_tur in ('Sayfa','Test') then p_baslangic_no else null end,
    case when v_tur in ('Sayfa','Test') then p_bitis_no else null end,
    v_detay,
    auth.uid()::text, now(), auth.uid()::text, now()
  );

  return jsonb_build_object('basarili', true, 'odev_id', v_odev_id, 'baslik', v_baslik);
end;
$$;

revoke all on function public.kitap_katalogu_kaydet_guvenli_v1(text,text,text,text,text,text,text,integer,text) from public, anon;
revoke all on function public.ogrenci_kitabi_kaydet_guvenli_v1(text,text,text) from public, anon;
revoke all on function public.kocluk_calisma_kaydet_guvenli_v1(text,text,text,integer,integer,text,date,text,text) from public, anon;
grant execute on function public.kitap_katalogu_kaydet_guvenli_v1(text,text,text,text,text,text,text,integer,text) to authenticated, service_role;
grant execute on function public.ogrenci_kitabi_kaydet_guvenli_v1(text,text,text) to authenticated, service_role;
grant execute on function public.kocluk_calisma_kaydet_guvenli_v1(text,text,text,integer,integer,text,date,text,text) to authenticated, service_role;
