-- BS Koçluk Koç rolü: mevcut kitap RPC adlarını geriye uyumlu biçimde genişletir.
-- Yönetici davranışı korunur. Koç var olan katalog kaydını değiştiremez.

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
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;
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

revoke execute on function public.kitap_katalogu_kaydet_guvenli_v1(text,text,text,text,text,text,text,integer,text) from public, anon;
revoke execute on function public.ogrenci_kitabi_kaydet_guvenli_v1(text,text,text) from public, anon;
grant execute on function public.kitap_katalogu_kaydet_guvenli_v1(text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.ogrenci_kitabi_kaydet_guvenli_v1(text,text,text) to authenticated;
