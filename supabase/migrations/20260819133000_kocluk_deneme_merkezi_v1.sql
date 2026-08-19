create table if not exists public.kocluk_deneme_sinavlari (
  deneme_id text primary key,
  ogrenci_id text not null references public.ogrenciler(ogrenci_id) on update cascade on delete restrict,
  sinav_turu text not null,
  deneme_adi text not null,
  deneme_tarihi date not null,
  yayinevi text,
  veri_kaynagi text not null default 'Manuel',
  yanlis_boleni numeric(6,2) not null,
  puan numeric(10,2),
  siralama integer,
  yuzdelik numeric(6,3),
  katilimci_sayisi integer,
  sure_dakika integer,
  notlar text,
  onay_durumu text not null default 'Taslak',
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint kocluk_deneme_yanlis_boleni_chk check (yanlis_boleni > 0),
  constraint kocluk_deneme_puan_chk check (puan is null or puan >= 0),
  constraint kocluk_deneme_siralama_chk check (siralama is null or siralama >= 1),
  constraint kocluk_deneme_yuzdelik_chk check (yuzdelik is null or (yuzdelik >= 0 and yuzdelik <= 100)),
  constraint kocluk_deneme_katilimci_chk check (katilimci_sayisi is null or katilimci_sayisi >= 1),
  constraint kocluk_deneme_sure_chk check (sure_dakika is null or sure_dakika >= 1),
  constraint kocluk_deneme_veri_kaynagi_chk check (veri_kaynagi in ('Manuel', 'Fotoğraf', 'Optik', 'Entegrasyon')),
  constraint kocluk_deneme_onay_durumu_chk check (onay_durumu in ('Taslak', 'Onaylandı', 'İptal'))
);

create index if not exists idx_kocluk_deneme_ogrenci_tarih
  on public.kocluk_deneme_sinavlari(ogrenci_id, deneme_tarihi desc);
create index if not exists idx_kocluk_deneme_onay
  on public.kocluk_deneme_sinavlari(onay_durumu, deneme_tarihi desc);

create table if not exists public.kocluk_deneme_bolum_sonuclari (
  sonuc_id text primary key,
  deneme_id text not null references public.kocluk_deneme_sinavlari(deneme_id) on update cascade on delete cascade,
  bolum_adi text not null,
  sira_no integer not null default 0,
  dogru integer not null default 0,
  yanlis integer not null default 0,
  bos integer not null default 0,
  soru_sayisi integer not null,
  net numeric(8,2) not null,
  olusturulma_zamani timestamptz not null default now(),
  olusturan uuid default auth.uid(),
  guncellenme_zamani timestamptz not null default now(),
  guncelleyen uuid default auth.uid(),
  constraint kocluk_deneme_bolum_sira_chk check (sira_no >= 0),
  constraint kocluk_deneme_bolum_sayilar_chk check (dogru >= 0 and yanlis >= 0 and bos >= 0 and soru_sayisi > 0),
  constraint kocluk_deneme_bolum_toplam_chk check ((dogru + yanlis + bos) <= soru_sayisi)
);

create unique index if not exists uq_kocluk_deneme_bolum_adi
  on public.kocluk_deneme_bolum_sonuclari(deneme_id, lower(trim(bolum_adi)));
create index if not exists idx_kocluk_deneme_bolum_deneme
  on public.kocluk_deneme_bolum_sonuclari(deneme_id, sira_no, bolum_adi);

alter table public.kocluk_deneme_sinavlari enable row level security;
alter table public.kocluk_deneme_bolum_sonuclari enable row level security;

drop policy if exists yonetici_tam_erisim on public.kocluk_deneme_sinavlari;
create policy yonetici_tam_erisim on public.kocluk_deneme_sinavlari
as permissive for all to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

drop policy if exists yonetici_tam_erisim on public.kocluk_deneme_bolum_sonuclari;
create policy yonetici_tam_erisim on public.kocluk_deneme_bolum_sonuclari
as permissive for all to authenticated
using ((select private.bs_ofis_yonetici_mi()))
with check ((select private.bs_ofis_yonetici_mi()));

revoke all on table public.kocluk_deneme_sinavlari from anon;
revoke all on table public.kocluk_deneme_bolum_sonuclari from anon;
grant select on table public.kocluk_deneme_sinavlari to authenticated;
grant select on table public.kocluk_deneme_bolum_sonuclari to authenticated;
grant all on table public.kocluk_deneme_sinavlari to service_role;
grant all on table public.kocluk_deneme_bolum_sonuclari to service_role;

create or replace function public.kocluk_deneme_kaydet_guvenli_v1(
  p_deneme_id text,
  p_ogrenci_id text,
  p_sinav_turu text,
  p_deneme_adi text,
  p_deneme_tarihi date,
  p_yayinevi text,
  p_veri_kaynagi text,
  p_yanlis_boleni numeric,
  p_puan numeric,
  p_siralama integer,
  p_yuzdelik numeric,
  p_katilimci_sayisi integer,
  p_sure_dakika integer,
  p_notlar text,
  p_onay_durumu text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(trim(coalesce(p_deneme_id, '')), '');
  v_sinav_turu text := nullif(trim(coalesce(p_sinav_turu, '')), '');
  v_deneme_adi text := nullif(trim(coalesce(p_deneme_adi, '')), '');
  v_veri_kaynagi text := coalesce(nullif(trim(coalesce(p_veri_kaynagi, '')), ''), 'Manuel');
  v_onay_durumu text := coalesce(nullif(trim(coalesce(p_onay_durumu, '')), ''), 'Taslak');
  v_yeni boolean;
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if not exists(
    select 1 from public.ogrenciler
    where ogrenci_id = p_ogrenci_id and coalesce(durum, 'Aktif') <> 'Pasif'
  ) then
    raise exception 'Aktif öğrenci bulunamadı.';
  end if;

  if not exists(
    select 1 from public.kocluk_ogrenci_profilleri
    where ogrenci_id = p_ogrenci_id and durum = 'Aktif'
  ) then
    raise exception 'Öğrencinin aktif koçluk profili bulunamadı.';
  end if;

  if v_sinav_turu is null then raise exception 'Sınav türü zorunludur.'; end if;
  if v_deneme_adi is null then raise exception 'Deneme adı zorunludur.'; end if;
  if p_deneme_tarihi is null then raise exception 'Deneme tarihi zorunludur.'; end if;
  if p_deneme_tarihi > current_date then raise exception 'Deneme tarihi gelecekte olamaz.'; end if;
  if p_yanlis_boleni is null or p_yanlis_boleni <= 0 then raise exception 'Yanlış götürme böleni 0’dan büyük olmalıdır.'; end if;
  if v_veri_kaynagi not in ('Manuel', 'Fotoğraf', 'Optik', 'Entegrasyon') then raise exception 'Geçersiz veri kaynağı.'; end if;
  if v_onay_durumu not in ('Taslak', 'Onaylandı', 'İptal') then raise exception 'Geçersiz onay durumu.'; end if;
  if p_puan is not null and p_puan < 0 then raise exception 'Puan negatif olamaz.'; end if;
  if p_siralama is not null and p_siralama < 1 then raise exception 'Sıralama en az 1 olmalıdır.'; end if;
  if p_yuzdelik is not null and (p_yuzdelik < 0 or p_yuzdelik > 100) then raise exception 'Yüzdelik 0 ile 100 arasında olmalıdır.'; end if;
  if p_katilimci_sayisi is not null and p_katilimci_sayisi < 1 then raise exception 'Katılımcı sayısı en az 1 olmalıdır.'; end if;
  if p_sure_dakika is not null and p_sure_dakika < 1 then raise exception 'Süre en az 1 dakika olmalıdır.'; end if;

  if v_id is null then
    v_id := 'DNM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  if v_onay_durumu = 'Onaylandı' and not exists(
    select 1 from public.kocluk_deneme_bolum_sonuclari where deneme_id = v_id
  ) then
    raise exception 'Deneme onaylanmadan önce en az bir bölüm sonucu girilmelidir.';
  end if;

  v_yeni := not exists(select 1 from public.kocluk_deneme_sinavlari where deneme_id = v_id);

  insert into public.kocluk_deneme_sinavlari(
    deneme_id, ogrenci_id, sinav_turu, deneme_adi, deneme_tarihi, yayinevi,
    veri_kaynagi, yanlis_boleni, puan, siralama, yuzdelik, katilimci_sayisi,
    sure_dakika, notlar, onay_durumu, olusturan, guncelleyen
  ) values (
    v_id, p_ogrenci_id, v_sinav_turu, v_deneme_adi, p_deneme_tarihi,
    nullif(trim(coalesce(p_yayinevi, '')), ''), v_veri_kaynagi, p_yanlis_boleni,
    p_puan, p_siralama, p_yuzdelik, p_katilimci_sayisi, p_sure_dakika,
    nullif(trim(coalesce(p_notlar, '')), ''), v_onay_durumu, auth.uid(), auth.uid()
  )
  on conflict (deneme_id) do update set
    ogrenci_id = excluded.ogrenci_id,
    sinav_turu = excluded.sinav_turu,
    deneme_adi = excluded.deneme_adi,
    deneme_tarihi = excluded.deneme_tarihi,
    yayinevi = excluded.yayinevi,
    veri_kaynagi = excluded.veri_kaynagi,
    yanlis_boleni = excluded.yanlis_boleni,
    puan = excluded.puan,
    siralama = excluded.siralama,
    yuzdelik = excluded.yuzdelik,
    katilimci_sayisi = excluded.katilimci_sayisi,
    sure_dakika = excluded.sure_dakika,
    notlar = excluded.notlar,
    onay_durumu = excluded.onay_durumu,
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  return jsonb_build_object('basarili', true, 'deneme_id', v_id, 'yeni', v_yeni, 'onay_durumu', v_onay_durumu);
end;
$$;

create or replace function public.kocluk_deneme_bolum_kaydet_guvenli_v1(
  p_sonuc_id text,
  p_deneme_id text,
  p_bolum_adi text,
  p_sira_no integer,
  p_dogru integer,
  p_yanlis integer,
  p_bos integer,
  p_soru_sayisi integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(trim(coalesce(p_sonuc_id, '')), '');
  v_bolum_adi text := nullif(trim(coalesce(p_bolum_adi, '')), '');
  v_yanlis_boleni numeric;
  v_onay_durumu text;
  v_net numeric(8,2);
  v_yeni boolean;
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  select yanlis_boleni, onay_durumu
    into v_yanlis_boleni, v_onay_durumu
  from public.kocluk_deneme_sinavlari
  where deneme_id = p_deneme_id;

  if v_yanlis_boleni is null then raise exception 'Deneme kaydı bulunamadı.'; end if;
  if v_onay_durumu = 'İptal' then raise exception 'İptal edilmiş denemeye sonuç eklenemez.'; end if;
  if v_bolum_adi is null then raise exception 'Bölüm / ders adı zorunludur.'; end if;
  if coalesce(p_sira_no, 0) < 0 then raise exception 'Sıra numarası negatif olamaz.'; end if;
  if coalesce(p_dogru, -1) < 0 or coalesce(p_yanlis, -1) < 0 or coalesce(p_bos, -1) < 0 then
    raise exception 'Doğru, yanlış ve boş değerleri negatif olamaz.';
  end if;
  if p_soru_sayisi is null or p_soru_sayisi <= 0 then raise exception 'Soru sayısı 0’dan büyük olmalıdır.'; end if;
  if p_dogru + p_yanlis + p_bos > p_soru_sayisi then raise exception 'Doğru + yanlış + boş toplamı soru sayısını aşamaz.'; end if;

  v_net := round((p_dogru::numeric - (p_yanlis::numeric / v_yanlis_boleni)), 2);

  if v_id is null then
    select sonuc_id into v_id
    from public.kocluk_deneme_bolum_sonuclari
    where deneme_id = p_deneme_id and lower(trim(bolum_adi)) = lower(v_bolum_adi)
    limit 1;
  end if;
  if v_id is null then
    v_id := 'DNS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  v_yeni := not exists(select 1 from public.kocluk_deneme_bolum_sonuclari where sonuc_id = v_id);

  insert into public.kocluk_deneme_bolum_sonuclari(
    sonuc_id, deneme_id, bolum_adi, sira_no, dogru, yanlis, bos, soru_sayisi, net, olusturan, guncelleyen
  ) values (
    v_id, p_deneme_id, v_bolum_adi, coalesce(p_sira_no, 0), p_dogru, p_yanlis, p_bos, p_soru_sayisi, v_net, auth.uid(), auth.uid()
  )
  on conflict (sonuc_id) do update set
    deneme_id = excluded.deneme_id,
    bolum_adi = excluded.bolum_adi,
    sira_no = excluded.sira_no,
    dogru = excluded.dogru,
    yanlis = excluded.yanlis,
    bos = excluded.bos,
    soru_sayisi = excluded.soru_sayisi,
    net = excluded.net,
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  return jsonb_build_object('basarili', true, 'sonuc_id', v_id, 'yeni', v_yeni, 'net', v_net);
end;
$$;

revoke all on function public.kocluk_deneme_kaydet_guvenli_v1(text,text,text,text,date,text,text,numeric,numeric,integer,numeric,integer,integer,text,text) from public, anon;
revoke all on function public.kocluk_deneme_bolum_kaydet_guvenli_v1(text,text,text,integer,integer,integer,integer,integer) from public, anon;
grant execute on function public.kocluk_deneme_kaydet_guvenli_v1(text,text,text,text,date,text,text,numeric,numeric,integer,numeric,integer,integer,text,text) to authenticated, service_role;
grant execute on function public.kocluk_deneme_bolum_kaydet_guvenli_v1(text,text,text,integer,integer,integer,integer,integer) to authenticated, service_role;
