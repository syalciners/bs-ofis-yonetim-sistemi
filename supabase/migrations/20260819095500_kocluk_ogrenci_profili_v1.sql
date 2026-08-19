create table if not exists public.kocluk_ogrenci_profilleri (
  ogrenci_id text primary key references public.ogrenciler(ogrenci_id) on update cascade on delete cascade,
  koc_ogretmen_id text references public.ogretmenler(ogretmen_id) on update cascade on delete set null,
  sinav_turu text,
  hedef_okul text,
  hedef_bolum text,
  hedef_puan numeric,
  hedef_siralama integer,
  baslangic_tarihi date not null default current_date,
  durum text not null default 'Aktif',
  notlar text,
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint kocluk_profili_hedef_puan_chk check (hedef_puan is null or hedef_puan >= 0),
  constraint kocluk_profili_hedef_siralama_chk check (hedef_siralama is null or hedef_siralama >= 1),
  constraint kocluk_profili_durum_chk check (durum in ('Aktif', 'Pasif'))
);

create index if not exists idx_kocluk_profilleri_koc on public.kocluk_ogrenci_profilleri(koc_ogretmen_id);
create index if not exists idx_kocluk_profilleri_durum on public.kocluk_ogrenci_profilleri(durum);

alter table public.kocluk_ogrenci_profilleri enable row level security;

drop policy if exists yonetici_tam_erisim on public.kocluk_ogrenci_profilleri;
create policy yonetici_tam_erisim
on public.kocluk_ogrenci_profilleri
as permissive
for all
to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

revoke all on table public.kocluk_ogrenci_profilleri from anon;
grant select on table public.kocluk_ogrenci_profilleri to authenticated;
grant all on table public.kocluk_ogrenci_profilleri to service_role;

create or replace function public.kocluk_profili_kaydet_guvenli_v1(
  p_ogrenci_id text,
  p_koc_ogretmen_id text,
  p_sinav_turu text,
  p_hedef_okul text,
  p_hedef_bolum text,
  p_hedef_puan numeric,
  p_hedef_siralama integer,
  p_baslangic_tarihi date,
  p_durum text,
  p_notlar text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yeni boolean;
  v_durum text := coalesce(nullif(trim(coalesce(p_durum, '')), ''), 'Aktif');
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if nullif(trim(coalesce(p_ogrenci_id, '')), '') is null then
    raise exception 'Öğrenci seçilmelidir.';
  end if;

  if not exists (
    select 1
    from public.ogrenciler
    where ogrenci_id = p_ogrenci_id
      and coalesce(durum, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif öğrenci bulunamadı.';
  end if;

  if p_koc_ogretmen_id is not null and not exists (
    select 1
    from public.ogretmenler
    where ogretmen_id = p_koc_ogretmen_id
      and coalesce(durum, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif koç/personel bulunamadı.';
  end if;

  if v_durum not in ('Aktif', 'Pasif') then
    raise exception 'Geçersiz koçluk profili durumu.';
  end if;

  if p_hedef_puan is not null and p_hedef_puan < 0 then
    raise exception 'Hedef puan negatif olamaz.';
  end if;

  if p_hedef_siralama is not null and p_hedef_siralama < 1 then
    raise exception 'Hedef sıralama en az 1 olmalıdır.';
  end if;

  v_yeni := not exists(
    select 1 from public.kocluk_ogrenci_profilleri where ogrenci_id = p_ogrenci_id
  );

  insert into public.kocluk_ogrenci_profilleri (
    ogrenci_id,
    koc_ogretmen_id,
    sinav_turu,
    hedef_okul,
    hedef_bolum,
    hedef_puan,
    hedef_siralama,
    baslangic_tarihi,
    durum,
    notlar,
    olusturan,
    guncelleyen
  ) values (
    p_ogrenci_id,
    p_koc_ogretmen_id,
    nullif(trim(coalesce(p_sinav_turu, '')), ''),
    nullif(trim(coalesce(p_hedef_okul, '')), ''),
    nullif(trim(coalesce(p_hedef_bolum, '')), ''),
    p_hedef_puan,
    p_hedef_siralama,
    coalesce(p_baslangic_tarihi, current_date),
    v_durum,
    nullif(trim(coalesce(p_notlar, '')), ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (ogrenci_id) do update set
    koc_ogretmen_id = excluded.koc_ogretmen_id,
    sinav_turu = excluded.sinav_turu,
    hedef_okul = excluded.hedef_okul,
    hedef_bolum = excluded.hedef_bolum,
    hedef_puan = excluded.hedef_puan,
    hedef_siralama = excluded.hedef_siralama,
    baslangic_tarihi = excluded.baslangic_tarihi,
    durum = excluded.durum,
    notlar = excluded.notlar,
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  return jsonb_build_object(
    'basarili', true,
    'ogrenci_id', p_ogrenci_id,
    'yeni', v_yeni,
    'durum', v_durum
  );
end;
$$;

revoke all on function public.kocluk_profili_kaydet_guvenli_v1(text, text, text, text, text, numeric, integer, date, text, text) from public, anon;
grant execute on function public.kocluk_profili_kaydet_guvenli_v1(text, text, text, text, text, numeric, integer, date, text, text) to authenticated, service_role;
