create table if not exists public.kocluk_gorusmeleri (
  gorusme_id text primary key,
  ogrenci_id text not null references public.ogrenciler(ogrenci_id) on update cascade on delete cascade,
  koc_ogretmen_id text not null references public.ogretmenler(ogretmen_id) on update cascade on delete restrict,
  gorusme_tarihi date not null,
  baslangic_saati time,
  gorusme_turu text,
  durum text not null default 'Planlandı',
  gundem text,
  gorusme_notu text,
  alinan_kararlar text,
  sonraki_gorusme_tarihi date,
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint kocluk_gorusmeleri_durum_chk check (durum in ('Planlandı', 'Yapıldı', 'İptal', 'Ertelendi'))
);

create index if not exists idx_kocluk_gorusmeleri_ogrenci_tarih
  on public.kocluk_gorusmeleri(ogrenci_id, gorusme_tarihi desc);
create index if not exists idx_kocluk_gorusmeleri_koc_tarih
  on public.kocluk_gorusmeleri(koc_ogretmen_id, gorusme_tarihi desc);
create index if not exists idx_kocluk_gorusmeleri_durum
  on public.kocluk_gorusmeleri(durum);

alter table public.kocluk_gorusmeleri enable row level security;

drop policy if exists yonetici_tam_erisim on public.kocluk_gorusmeleri;
create policy yonetici_tam_erisim
on public.kocluk_gorusmeleri
as permissive
for all
to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

revoke all on table public.kocluk_gorusmeleri from anon;
grant select on table public.kocluk_gorusmeleri to authenticated;
grant all on table public.kocluk_gorusmeleri to service_role;

create or replace function public.kocluk_gorusmesi_kaydet_guvenli_v1(
  p_gorusme_id text,
  p_ogrenci_id text,
  p_koc_ogretmen_id text,
  p_gorusme_tarihi date,
  p_baslangic_saati time,
  p_gorusme_turu text,
  p_durum text,
  p_gundem text,
  p_gorusme_notu text,
  p_alinan_kararlar text,
  p_sonraki_gorusme_tarihi date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(trim(coalesce(p_gorusme_id, '')), '');
  v_koc text := nullif(trim(coalesce(p_koc_ogretmen_id, '')), '');
  v_durum text := coalesce(nullif(trim(coalesce(p_durum, '')), ''), 'Planlandı');
  v_yeni boolean;
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if nullif(trim(coalesce(p_ogrenci_id, '')), '') is null then
    raise exception 'Öğrenci seçilmelidir.';
  end if;

  if not exists (
    select 1
    from public.kocluk_ogrenci_profilleri kp
    where kp.ogrenci_id = p_ogrenci_id
      and kp.durum = 'Aktif'
  ) then
    raise exception 'Öğrencinin aktif koçluk profili bulunamadı.';
  end if;

  if v_koc is null then
    select kp.koc_ogretmen_id
      into v_koc
    from public.kocluk_ogrenci_profilleri kp
    where kp.ogrenci_id = p_ogrenci_id
      and kp.durum = 'Aktif';
  end if;

  if v_koc is null then
    raise exception 'Koç seçilmelidir.';
  end if;

  if not exists (
    select 1
    from public.ogretmenler o
    where o.ogretmen_id = v_koc
      and coalesce(o.durum, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif koç/personel bulunamadı.';
  end if;

  if p_gorusme_tarihi is null then
    raise exception 'Görüşme tarihi seçilmelidir.';
  end if;

  if v_durum not in ('Planlandı', 'Yapıldı', 'İptal', 'Ertelendi') then
    raise exception 'Geçersiz görüşme durumu.';
  end if;

  if v_id is null then
    v_id := 'KGR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  v_yeni := not exists(select 1 from public.kocluk_gorusmeleri where gorusme_id = v_id);

  insert into public.kocluk_gorusmeleri (
    gorusme_id,
    ogrenci_id,
    koc_ogretmen_id,
    gorusme_tarihi,
    baslangic_saati,
    gorusme_turu,
    durum,
    gundem,
    gorusme_notu,
    alinan_kararlar,
    sonraki_gorusme_tarihi,
    olusturan,
    guncelleyen
  ) values (
    v_id,
    p_ogrenci_id,
    v_koc,
    p_gorusme_tarihi,
    p_baslangic_saati,
    nullif(trim(coalesce(p_gorusme_turu, '')), ''),
    v_durum,
    nullif(trim(coalesce(p_gundem, '')), ''),
    nullif(trim(coalesce(p_gorusme_notu, '')), ''),
    nullif(trim(coalesce(p_alinan_kararlar, '')), ''),
    p_sonraki_gorusme_tarihi,
    auth.uid(),
    auth.uid()
  )
  on conflict (gorusme_id) do update set
    ogrenci_id = excluded.ogrenci_id,
    koc_ogretmen_id = excluded.koc_ogretmen_id,
    gorusme_tarihi = excluded.gorusme_tarihi,
    baslangic_saati = excluded.baslangic_saati,
    gorusme_turu = excluded.gorusme_turu,
    durum = excluded.durum,
    gundem = excluded.gundem,
    gorusme_notu = excluded.gorusme_notu,
    alinan_kararlar = excluded.alinan_kararlar,
    sonraki_gorusme_tarihi = excluded.sonraki_gorusme_tarihi,
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  return jsonb_build_object(
    'basarili', true,
    'gorusme_id', v_id,
    'ogrenci_id', p_ogrenci_id,
    'yeni', v_yeni,
    'durum', v_durum
  );
end;
$$;

revoke all on function public.kocluk_gorusmesi_kaydet_guvenli_v1(text, text, text, date, time, text, text, text, text, text, date) from public, anon;
grant execute on function public.kocluk_gorusmesi_kaydet_guvenli_v1(text, text, text, date, time, text, text, text, text, text, date) to authenticated, service_role;
