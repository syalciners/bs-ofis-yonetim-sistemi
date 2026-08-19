-- BS Koçluk Koç rolü V1
-- Yönetici erişimini değiştirmeden, Koç rolünü yalnız kendisine atanmış öğrencilerle sınırlar.

alter table public.kullanici_profilleri
  drop constraint if exists kullanici_profilleri_rol_check;

alter table public.kullanici_profilleri
  add constraint kullanici_profilleri_rol_check
  check (rol = any (array['Yönetici'::text, 'Personel'::text, 'Öğretmen'::text, 'Koç'::text]));

create or replace function private.bs_kocluk_koc_mu()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.auth_user_id = auth.uid()
      and kp.aktif = true
      and kp.rol = 'Koç'
      and kp.ogretmen_id is not null
  );
$$;

create or replace function private.bs_kocluk_erisim_var_mi()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.bs_ofis_yonetici_mi() or private.bs_kocluk_koc_mu();
$$;

create or replace function private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.bs_ofis_yonetici_mi()
    or exists (
      select 1
      from public.kullanici_profilleri kp
      join public.kocluk_ogrenci_profilleri ko
        on ko.koc_ogretmen_id = kp.ogretmen_id
       and ko.ogrenci_id = p_ogrenci_id
       and ko.durum = 'Aktif'
      where kp.auth_user_id = auth.uid()
        and kp.aktif = true
        and kp.rol = 'Koç'
        and kp.ogretmen_id is not null
    );
$$;

create or replace function private.bs_kocluk_deneme_erisim_var_mi(p_deneme_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kocluk_deneme_sinavlari d
    where d.deneme_id = p_deneme_id
      and private.bs_kocluk_ogrenci_erisim_var_mi(d.ogrenci_id)
  );
$$;

grant execute on function private.bs_kocluk_koc_mu() to authenticated;
grant execute on function private.bs_kocluk_erisim_var_mi() to authenticated;
grant execute on function private.bs_kocluk_ogrenci_erisim_var_mi(text) to authenticated;
grant execute on function private.bs_kocluk_deneme_erisim_var_mi(text) to authenticated;

-- Koç yalnız kendi kullanıcı profilini okuyabilir.
drop policy if exists koc_kendi_profilini_gor on public.kullanici_profilleri;
create policy koc_kendi_profilini_gor
on public.kullanici_profilleri
for select
to authenticated
using (auth_user_id = auth.uid() and aktif = true and rol = 'Koç');

-- Koçluk verileri öğrenci atamasına göre okunur.
drop policy if exists koc_kocluk_profili_gor on public.kocluk_ogrenci_profilleri;
create policy koc_kocluk_profili_gor
on public.kocluk_ogrenci_profilleri
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_ogrenci_gor on public.ogrenciler;
create policy koc_ogrenci_gor
on public.ogrenciler
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_odev_gor on public.odevler;
create policy koc_odev_gor
on public.odevler
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_ogrenci_kitabi_gor on public.ogrenci_kitaplari;
create policy koc_ogrenci_kitabi_gor
on public.ogrenci_kitaplari
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_kitap_katalogu_gor on public.kitap_katalogu;
create policy koc_kitap_katalogu_gor
on public.kitap_katalogu
for select
to authenticated
using (private.bs_kocluk_koc_mu() and durum = 'Onaylı');

drop policy if exists koc_gorusme_gor on public.kocluk_gorusmeleri;
create policy koc_gorusme_gor
on public.kocluk_gorusmeleri
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_deneme_gor on public.kocluk_deneme_sinavlari;
create policy koc_deneme_gor
on public.kocluk_deneme_sinavlari
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

drop policy if exists koc_deneme_bolum_gor on public.kocluk_deneme_bolum_sonuclari;
create policy koc_deneme_bolum_gor
on public.kocluk_deneme_bolum_sonuclari
for select
to authenticated
using (private.bs_kocluk_deneme_erisim_var_mi(deneme_id));

-- Ayrı BS Koçluk uygulamasının hızlı çalışma kaydı.
create or replace function public.kocluk_calisma_kaydet_erisimli_v1(
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
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;

  select kp.koc_ogretmen_id into v_ogretmen_id
  from public.kocluk_ogrenci_profilleri kp
  where kp.ogrenci_id = p_ogrenci_id and kp.durum = 'Aktif';
  if v_ogretmen_id is null then raise exception 'Öğrencinin aktif koçu bulunamadı.'; end if;

  select kk.kitap_adi into v_kitap_adi
  from public.ogrenci_kitaplari ok
  join public.kitap_katalogu kk on kk.kitap_id = ok.kitap_id
  where ok.ogrenci_kitap_id = p_ogrenci_kitap_id
    and ok.ogrenci_id = p_ogrenci_id
    and ok.durum = 'Aktif'
    and kk.durum = 'Onaylı';
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

-- Koç katalogda var olan kitabı değiştiremez; yalnız yeni kitap oluşturabilir.
create or replace function public.kocluk_kitap_katalogu_kaydet_erisimli_v1(
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
  v_yonetici boolean := private.bs_ofis_yonetici_mi();
  v_yeni boolean := false;
begin
  if not private.bs_kocluk_erisim_var_mi() then raise exception 'Bu işlem için koçluk yetkisi gerekir.'; end if;
  if v_ad is null then raise exception 'Kitap adı zorunludur.'; end if;
  if p_toplam_sayfa is not null and p_toplam_sayfa <= 0 then raise exception 'Toplam sayfa 0’dan büyük olmalıdır.'; end if;

  if v_isbn is not null then
    select kitap_id into v_id from public.kitap_katalogu where isbn = v_isbn limit 1;
    if v_id is not null and not v_yonetici then
      return jsonb_build_object('basarili', true, 'kitap_id', v_id, 'yeni', false);
    end if;
  end if;

  if v_id is not null and exists(select 1 from public.kitap_katalogu where kitap_id = v_id) and not v_yonetici then
    return jsonb_build_object('basarili', true, 'kitap_id', v_id, 'yeni', false);
  end if;

  if v_id is null then
    v_id := 'KTP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    v_yeni := true;
  else
    v_yeni := not exists(select 1 from public.kitap_katalogu where kitap_id = v_id);
  end if;

  insert into public.kitap_katalogu(
    kitap_id, kitap_adi, yayinevi, isbn, ders, sinav_turu, baski, toplam_sayfa, kapak_url, durum, olusturan, guncelleyen
  ) values (
    v_id, v_ad, nullif(trim(coalesce(p_yayinevi,'')),''), v_isbn,
    nullif(trim(coalesce(p_ders,'')),''), nullif(trim(coalesce(p_sinav_turu,'')),''),
    nullif(trim(coalesce(p_baski,'')),''), p_toplam_sayfa,
    nullif(trim(coalesce(p_kapak_url,'')),''), 'Onaylı', auth.uid(), auth.uid()
  )
  on conflict (kitap_id) do update set
    kitap_adi = case when v_yonetici then excluded.kitap_adi else public.kitap_katalogu.kitap_adi end,
    yayinevi = case when v_yonetici then excluded.yayinevi else public.kitap_katalogu.yayinevi end,
    isbn = case when v_yonetici then excluded.isbn else public.kitap_katalogu.isbn end,
    ders = case when v_yonetici then excluded.ders else public.kitap_katalogu.ders end,
    sinav_turu = case when v_yonetici then excluded.sinav_turu else public.kitap_katalogu.sinav_turu end,
    baski = case when v_yonetici then excluded.baski else public.kitap_katalogu.baski end,
    toplam_sayfa = case when v_yonetici then excluded.toplam_sayfa else public.kitap_katalogu.toplam_sayfa end,
    kapak_url = case when v_yonetici then excluded.kapak_url else public.kitap_katalogu.kapak_url end,
    durum = case when v_yonetici then 'Onaylı' else public.kitap_katalogu.durum end,
    guncellenme_zamani = case when v_yonetici then now() else public.kitap_katalogu.guncellenme_zamani end,
    guncelleyen = case when v_yonetici then auth.uid() else public.kitap_katalogu.guncelleyen end;

  return jsonb_build_object('basarili', true, 'kitap_id', v_id, 'yeni', v_yeni);
end;
$$;

create or replace function public.kocluk_ogrenci_kitabi_kaydet_erisimli_v1(
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
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id = p_ogrenci_id and coalesce(durum,'Aktif') <> 'Pasif') then
    raise exception 'Aktif öğrenci bulunamadı.';
  end if;
  if not exists(select 1 from public.kocluk_ogrenci_profilleri where ogrenci_id = p_ogrenci_id and durum = 'Aktif') then
    raise exception 'Öğrencinin aktif koçluk profili bulunamadı.';
  end if;
  if not exists(select 1 from public.kitap_katalogu where kitap_id = p_kitap_id and durum = 'Onaylı') then
    raise exception 'Onaylı kitap kaydı bulunamadı.';
  end if;

  select ogrenci_kitap_id into v_id
  from public.ogrenci_kitaplari
  where ogrenci_id = p_ogrenci_id and kitap_id = p_kitap_id and durum = 'Aktif'
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
    where ogrenci_kitap_id = v_id;
  end if;

  return jsonb_build_object('basarili', true, 'ogrenci_kitap_id', v_id, 'yeni', v_yeni);
end;
$$;

revoke execute on function public.kocluk_calisma_kaydet_erisimli_v1(text,text,text,integer,integer,text,date,text,text) from public, anon;
revoke execute on function public.kocluk_kitap_katalogu_kaydet_erisimli_v1(text,text,text,text,text,text,text,integer,text) from public, anon;
revoke execute on function public.kocluk_ogrenci_kitabi_kaydet_erisimli_v1(text,text,text) from public, anon;
grant execute on function public.kocluk_calisma_kaydet_erisimli_v1(text,text,text,integer,integer,text,date,text,text) to authenticated;
grant execute on function public.kocluk_kitap_katalogu_kaydet_erisimli_v1(text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.kocluk_ogrenci_kitabi_kaydet_erisimli_v1(text,text,text) to authenticated;
