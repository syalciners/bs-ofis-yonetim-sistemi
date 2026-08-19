create or replace function public.kocluk_deneme_tam_kaydet_guvenli_v1(
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
  p_bolumler jsonb
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
  v_yeni boolean;
  v_row jsonb;
  v_bolum_adi text;
  v_sira_no integer;
  v_dogru integer;
  v_yanlis integer;
  v_bos integer;
  v_soru_sayisi integer;
  v_net numeric(8,2);
  v_toplam_net numeric(10,2) := 0;
  v_toplam_dogru integer := 0;
  v_toplam_yanlis integer := 0;
  v_toplam_bos integer := 0;
  v_bolum_sayisi integer := 0;
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
  if p_puan is not null and p_puan < 0 then raise exception 'Puan negatif olamaz.'; end if;
  if p_siralama is not null and p_siralama < 1 then raise exception 'Sıralama en az 1 olmalıdır.'; end if;
  if p_yuzdelik is not null and (p_yuzdelik < 0 or p_yuzdelik > 100) then raise exception 'Yüzdelik 0 ile 100 arasında olmalıdır.'; end if;
  if p_katilimci_sayisi is not null and p_katilimci_sayisi < 1 then raise exception 'Katılımcı sayısı en az 1 olmalıdır.'; end if;
  if p_sure_dakika is not null and p_sure_dakika < 1 then raise exception 'Süre en az 1 dakika olmalıdır.'; end if;
  if p_bolumler is null or jsonb_typeof(p_bolumler) <> 'array' or jsonb_array_length(p_bolumler) = 0 then
    raise exception 'En az bir ders / bölüm sonucu girilmelidir.';
  end if;

  if v_id is null then
    v_id := 'DNM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
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
    nullif(trim(coalesce(p_notlar, '')), ''), 'Taslak', auth.uid(), auth.uid()
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
    onay_durumu = 'Taslak',
    guncellenme_zamani = now(),
    guncelleyen = auth.uid();

  delete from public.kocluk_deneme_bolum_sonuclari where deneme_id = v_id;

  for v_row in select value from jsonb_array_elements(p_bolumler) as t(value)
  loop
    v_bolum_adi := nullif(trim(coalesce(v_row->>'bolum_adi', '')), '');
    v_sira_no := coalesce((v_row->>'sira_no')::integer, 0);
    v_dogru := coalesce((v_row->>'dogru')::integer, -1);
    v_yanlis := coalesce((v_row->>'yanlis')::integer, -1);
    v_bos := coalesce((v_row->>'bos')::integer, -1);
    v_soru_sayisi := coalesce((v_row->>'soru_sayisi')::integer, 0);

    if v_bolum_adi is null then raise exception 'Ders / bölüm adı zorunludur.'; end if;
    if v_sira_no < 0 then raise exception 'Sıra numarası negatif olamaz.'; end if;
    if v_dogru < 0 or v_yanlis < 0 or v_bos < 0 then raise exception 'Doğru, yanlış ve boş değerleri negatif olamaz.'; end if;
    if v_soru_sayisi <= 0 then raise exception 'Soru sayısı 0’dan büyük olmalıdır.'; end if;
    if v_dogru + v_yanlis + v_bos > v_soru_sayisi then
      raise exception '% için doğru + yanlış + boş toplamı soru sayısını aşamaz.', v_bolum_adi;
    end if;

    v_net := round((v_dogru::numeric - (v_yanlis::numeric / p_yanlis_boleni)), 2);

    insert into public.kocluk_deneme_bolum_sonuclari(
      sonuc_id, deneme_id, bolum_adi, sira_no, dogru, yanlis, bos, soru_sayisi,
      net, olusturan, guncelleyen
    ) values (
      'DNS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      v_id, v_bolum_adi, v_sira_no, v_dogru, v_yanlis, v_bos, v_soru_sayisi,
      v_net, auth.uid(), auth.uid()
    );

    v_toplam_net := v_toplam_net + v_net;
    v_toplam_dogru := v_toplam_dogru + v_dogru;
    v_toplam_yanlis := v_toplam_yanlis + v_yanlis;
    v_toplam_bos := v_toplam_bos + v_bos;
    v_bolum_sayisi := v_bolum_sayisi + 1;
  end loop;

  update public.kocluk_deneme_sinavlari
  set onay_durumu = 'Onaylandı', guncellenme_zamani = now(), guncelleyen = auth.uid()
  where deneme_id = v_id;

  return jsonb_build_object(
    'basarili', true,
    'deneme_id', v_id,
    'yeni', v_yeni,
    'onay_durumu', 'Onaylandı',
    'bolum_sayisi', v_bolum_sayisi,
    'toplam_dogru', v_toplam_dogru,
    'toplam_yanlis', v_toplam_yanlis,
    'toplam_bos', v_toplam_bos,
    'toplam_net', v_toplam_net
  );
end;
$$;

revoke all on function public.kocluk_deneme_tam_kaydet_guvenli_v1(text,text,text,text,date,text,text,numeric,numeric,integer,numeric,integer,integer,text,jsonb) from public, anon;
grant execute on function public.kocluk_deneme_tam_kaydet_guvenli_v1(text,text,text,text,date,text,text,numeric,numeric,integer,numeric,integer,integer,text,jsonb) to authenticated, service_role;
