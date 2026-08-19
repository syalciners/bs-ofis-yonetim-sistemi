-- BS Koçluk Akıllı Haftalık Plan V1
-- Aynı açık çalışma için tekrarlanan onay çağrıları ikinci kayıt üretmez.

create or replace function public.kocluk_haftalik_plan_onayla_v1(
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
  v_tur text := coalesce(nullif(trim(coalesce(p_calisma_turu, '')), ''), 'Sayfa');
  v_lock_text text;
  v_lock_id bigint;
  v_existing_id text;
  v_existing_title text;
  v_result jsonb;
begin
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;

  v_lock_text := pg_catalog.concat_ws('|',
    coalesce(p_ogrenci_id, ''),
    coalesce(p_ogrenci_kitap_id, ''),
    v_tur,
    coalesce(p_baslangic_no::text, ''),
    coalesce(p_bitis_no::text, ''),
    coalesce(p_calisma_detayi, ''),
    coalesce(p_son_teslim_tarihi::text, '')
  );
  v_lock_id := pg_catalog.hashtextextended(v_lock_text, 0);
  perform pg_catalog.pg_advisory_xact_lock(v_lock_id);

  select o.odev_id, o.odev_basligi
    into v_existing_id, v_existing_title
  from public.odevler o
  where o.ogrenci_id = p_ogrenci_id
    and o.ogrenci_kitap_id = p_ogrenci_kitap_id
    and o.calisma_turu = v_tur
    and o.baslangic_no is not distinct from p_baslangic_no
    and o.bitis_no is not distinct from p_bitis_no
    and nullif(trim(coalesce(o.calisma_detayi, '')), '') is not distinct from nullif(trim(coalesce(p_calisma_detayi, '')), '')
    and o.son_teslim_tarihi is not distinct from p_son_teslim_tarihi
    and o.durum not in ('Tamamlandı', 'Teslim Edildi', 'İptal')
    and coalesce(o.kaynakta_var, true) = true
  order by o.olusturulma_zamani desc nulls last
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'basarili', true,
      'odev_id', v_existing_id,
      'baslik', v_existing_title,
      'tekrar', true
    );
  end if;

  v_result := public.kocluk_calisma_kaydet_erisimli_v1(
    p_ogrenci_id,
    p_ogrenci_kitap_id,
    v_tur,
    p_baslangic_no,
    p_bitis_no,
    p_calisma_detayi,
    p_son_teslim_tarihi,
    p_oncelik,
    p_aciklama
  );

  return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('tekrar', false);
end;
$$;

revoke execute on function public.kocluk_haftalik_plan_onayla_v1(text,text,text,integer,integer,text,date,text,text) from public, anon;
grant execute on function public.kocluk_haftalik_plan_onayla_v1(text,text,text,integer,integer,text,date,text,text) to authenticated;
