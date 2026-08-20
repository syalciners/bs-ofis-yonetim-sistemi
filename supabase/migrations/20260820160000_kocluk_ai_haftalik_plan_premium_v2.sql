alter table public.kocluk_ogrenci_profilleri
  add column if not exists haftalik_calisma_yogunlugu text not null default 'Normal',
  add column if not exists pazar_calisma boolean not null default true;

alter table public.kocluk_ogrenci_profilleri
  drop constraint if exists kocluk_ogrenci_profilleri_haftalik_yogunluk_chk;

alter table public.kocluk_ogrenci_profilleri
  add constraint kocluk_ogrenci_profilleri_haftalik_yogunluk_chk
  check (haftalik_calisma_yogunlugu in ('Hafif', 'Normal', 'Yoğun'));

alter table public.odevler
  add column if not exists haftalik_plan_id text,
  add column if not exists plan_kaynagi text,
  add column if not exists ai_plan_madde_anahtari text;

create unique index if not exists odevler_ai_plan_madde_anahtari_uidx
  on public.odevler (ai_plan_madde_anahtari)
  where ai_plan_madde_anahtari is not null;

create or replace function public.kocluk_haftalik_plan_ayari_kaydet_v2(
  p_ogrenci_id text,
  p_yogunluk text,
  p_pazar_calisma boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_yogunluk text := trim(coalesce(p_yogunluk, ''));
begin
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;

  if v_yogunluk not in ('Hafif', 'Normal', 'Yoğun') then
    raise exception 'Geçersiz çalışma yoğunluğu.';
  end if;

  update public.kocluk_ogrenci_profilleri
     set haftalik_calisma_yogunlugu = v_yogunluk,
         pazar_calisma = coalesce(p_pazar_calisma, true),
         guncellenme_zamani = now(),
         guncelleyen = auth.uid()
   where ogrenci_id = p_ogrenci_id
     and durum = 'Aktif';

  if not found then
    raise exception 'Aktif koçluk profili bulunamadı.';
  end if;

  return jsonb_build_object(
    'basarili', true,
    'yogunluk', v_yogunluk,
    'pazar_calisma', coalesce(p_pazar_calisma, true)
  );
end;
$function$;

revoke all on function public.kocluk_haftalik_plan_ayari_kaydet_v2(text, text, boolean) from public;
revoke all on function public.kocluk_haftalik_plan_ayari_kaydet_v2(text, text, boolean) from anon;
grant execute on function public.kocluk_haftalik_plan_ayari_kaydet_v2(text, text, boolean) to authenticated;

create or replace function public.kocluk_ai_haftalik_plan_onayla_v2(
  p_ogrenci_id text,
  p_plan_id text,
  p_maddeler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_plan_id text := nullif(trim(coalesce(p_plan_id, '')), '');
  v_item jsonb;
  v_kitap_id text;
  v_tur text;
  v_baslangic integer;
  v_bitis integer;
  v_teslim date;
  v_gerekce text;
  v_max_sayfa integer;
  v_madde_key text;
  v_existing_id text;
  v_result jsonb;
  v_odev_id text;
  v_tekrar boolean;
  v_results jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;

  if v_plan_id is null or char_length(v_plan_id) > 80 then
    raise exception 'Plan kimliği geçersiz.';
  end if;

  if jsonb_typeof(p_maddeler) <> 'array' then
    raise exception 'Plan maddeleri geçersiz.';
  end if;

  v_count := jsonb_array_length(p_maddeler);
  if v_count < 1 or v_count > 20 then
    raise exception 'Plan 1 ile 20 çalışma arasında olmalıdır.';
  end if;

  for v_item in select value from jsonb_array_elements(p_maddeler)
  loop
    v_kitap_id := nullif(trim(coalesce(v_item->>'ogrenci_kitap_id', '')), '');
    v_tur := nullif(trim(coalesce(v_item->>'calisma_turu', '')), '');
    v_baslangic := nullif(v_item->>'baslangic_no', '')::integer;
    v_bitis := nullif(v_item->>'bitis_no', '')::integer;
    v_teslim := nullif(v_item->>'son_teslim_tarihi', '')::date;
    v_gerekce := nullif(trim(coalesce(v_item->>'gerekce', '')), '');

    if v_kitap_id is null then
      raise exception 'Plan maddesinde öğrenci kitabı eksik.';
    end if;
    if v_tur not in ('Sayfa', 'Test') then
      raise exception 'Plan maddesinde çalışma türü geçersiz.';
    end if;
    if v_baslangic is null or v_bitis is null or v_baslangic <= 0 or v_bitis < v_baslangic then
      raise exception 'Plan maddesinde çalışma aralığı geçersiz.';
    end if;
    if v_teslim is null or v_teslim < current_date or v_teslim > current_date + 14 then
      raise exception 'Plan maddesinde teslim tarihi geçersiz.';
    end if;

    select case when v_tur = 'Sayfa' then kk.toplam_sayfa else null end
      into v_max_sayfa
    from public.ogrenci_kitaplari ok
    join public.kitap_katalogu kk on kk.kitap_id = ok.kitap_id
    where ok.ogrenci_kitap_id = v_kitap_id
      and ok.ogrenci_id = p_ogrenci_id
      and ok.durum = 'Aktif'
      and kk.durum = 'Onaylı'
    limit 1;

    if not found then
      raise exception 'Plan maddesindeki kitap artık aktif değil.';
    end if;
    if v_max_sayfa is not null and v_bitis > v_max_sayfa then
      raise exception 'Plan maddesi kitabın kayıtlı son sayfasını aşıyor.';
    end if;

    v_madde_key := pg_catalog.md5(pg_catalog.concat_ws('|',
      p_ogrenci_id,
      v_plan_id,
      v_kitap_id,
      v_tur,
      v_baslangic::text,
      v_bitis::text,
      v_teslim::text
    ));

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_madde_key, 0));

    select o.odev_id into v_existing_id
    from public.odevler o
    where o.ai_plan_madde_anahtari = v_madde_key
    limit 1;

    if v_existing_id is not null then
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'odev_id', v_existing_id,
        'tekrar', true,
        'plan_maddesi', true
      ));
      continue;
    end if;

    v_result := public.kocluk_haftalik_plan_onayla_v1(
      p_ogrenci_id,
      v_kitap_id,
      v_tur,
      v_baslangic,
      v_bitis,
      null,
      v_teslim,
      'Normal',
      case when v_gerekce is null then 'AI haftalık plan önerisi koç tarafından onaylandı.'
           else 'AI haftalık plan · ' || left(v_gerekce, 280)
      end
    );

    v_odev_id := v_result->>'odev_id';
    v_tekrar := coalesce((v_result->>'tekrar')::boolean, false);

    if v_odev_id is null then
      raise exception 'Plan maddesi kaydedilemedi.';
    end if;

    if not v_tekrar then
      update public.odevler
         set haftalik_plan_id = v_plan_id,
             plan_kaynagi = 'AI Haftalık Plan',
             ai_plan_madde_anahtari = v_madde_key,
             son_guncelleyen = auth.uid()::text,
             son_guncellenme_zamani = now()
       where odev_id = v_odev_id;
    end if;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'odev_id', v_odev_id,
      'tekrar', v_tekrar,
      'plan_maddesi', not v_tekrar
    ));
  end loop;

  return jsonb_build_object(
    'basarili', true,
    'plan_id', v_plan_id,
    'maddeler', v_results
  );
end;
$function$;

revoke all on function public.kocluk_ai_haftalik_plan_onayla_v2(text, text, jsonb) from public;
revoke all on function public.kocluk_ai_haftalik_plan_onayla_v2(text, text, jsonb) from anon;
grant execute on function public.kocluk_ai_haftalik_plan_onayla_v2(text, text, jsonb) to authenticated;
