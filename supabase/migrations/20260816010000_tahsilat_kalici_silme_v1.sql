create or replace function public.tahsilat_sil_guvenli_v1(
  p_tahsilat_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_tahsilat public.tahsilatlar%rowtype;
  v_hareket public.kasa_hareketleri%rowtype;
  v_silinen_hareket integer := 0;
  v_silinen_tahsilat integer := 0;
  v_sync_istek_id bigint;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_tahsilat_id, '')), '') is null then
    raise exception 'Tahsilat kimliği zorunludur.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('bs_tahsilat_sil:' || p_tahsilat_id)
  );

  select *
    into v_tahsilat
  from public.tahsilatlar
  where tahsilat_id = p_tahsilat_id
  for update;

  if not found then
    raise exception 'Tahsilat bulunamadı.';
  end if;

  if not coalesce(v_tahsilat.iptal_mi, false) then
    raise exception 'Aktif tahsilat kalıcı olarak silinemez. Önce kaydı iptal edin.';
  end if;

  begin
    select *
      into strict v_hareket
    from public.kasa_hareketleri
    where kaynak_turu = 'Tahsilat'
      and kaynak_id = p_tahsilat_id
    for update;
  exception
    when no_data_found then
      raise exception 'Tahsilata bağlı kasa hareketi bulunamadı. Hiçbir kayıt silinmedi.';
    when too_many_rows then
      raise exception 'Tahsilata bağlı birden fazla kasa hareketi bulundu. Hiçbir kayıt silinmedi.';
  end;

  if not coalesce(v_hareket.iptal_mi, false) then
    raise exception 'Bağlı kasa hareketi iptal edilmemiş. Hiçbir kayıt silinmedi.';
  end if;

  if v_hareket.ogrenci_id is distinct from v_tahsilat.ogrenci_id
     or v_hareket.hesap_id is distinct from v_tahsilat.hesap_id
     or pg_catalog.abs(v_hareket.tutar - v_tahsilat.tutar) > 0.01 then
    raise exception 'Tahsilat ve kasa hareketi bilgileri eşleşmiyor. Hiçbir kayıt silinmedi.';
  end if;

  delete from public.kasa_hareketleri
  where hareket_id = v_hareket.hareket_id;

  get diagnostics v_silinen_hareket = row_count;

  if v_silinen_hareket <> 1
     or exists (
       select 1
       from public.kasa_hareketleri
       where kaynak_turu = 'Tahsilat'
         and kaynak_id = p_tahsilat_id
     ) then
    raise exception 'Bağlı kasa hareketi güvenli biçimde silinemedi. İşlem geri alındı.';
  end if;

  delete from public.tahsilatlar
  where tahsilat_id = p_tahsilat_id
    and iptal_mi = true;

  get diagnostics v_silinen_tahsilat = row_count;

  if v_silinen_tahsilat <> 1 then
    raise exception 'İptal tahsilat güvenli biçimde silinemedi. İşlem geri alındı.';
  end if;

  v_sync_istek_id := private.finans_v18_sync_tetikle();

  if v_sync_istek_id is null then
    raise exception 'Finans senkronizasyonu başlatılamadı. Silme işlemi geri alındı.';
  end if;

  return jsonb_build_object(
    'basarili', true,
    'tahsilat_id', p_tahsilat_id,
    'silinen_tahsilat', v_silinen_tahsilat,
    'silinen_kasa_hareketi', v_silinen_hareket,
    'finans_sync_tetiklendi', true,
    'finans_sync_istek_id', v_sync_istek_id
  );
end;
$function$;

revoke all on function public.tahsilat_sil_guvenli_v1(text)
from public, anon;

grant execute on function public.tahsilat_sil_guvenli_v1(text)
to authenticated;
