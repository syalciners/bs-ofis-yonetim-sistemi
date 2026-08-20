alter table public.odevler
  add column if not exists kaynak_gorusme_id text;

create unique index if not exists odevler_kaynak_gorusme_tekil_idx
  on public.odevler (kaynak_gorusme_id)
  where kaynak_gorusme_id is not null;

create or replace function public.kocluk_gorusme_karari_aksiyona_cevir_v1(
  p_gorusme_id text,
  p_son_teslim_tarihi date default null,
  p_oncelik text default 'Normal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_gorusme public.kocluk_gorusmeleri%rowtype;
  v_existing public.odevler%rowtype;
  v_odev_id text;
  v_ogretmen_id text;
  v_karar text;
  v_baslik text;
  v_teslim date;
  v_oncelik text := coalesce(nullif(trim(coalesce(p_oncelik, '')), ''), 'Normal');
begin
  select * into v_gorusme
  from public.kocluk_gorusmeleri
  where gorusme_id = p_gorusme_id
  for update;

  if not found then
    raise exception 'Görüşme kaydı bulunamadı.';
  end if;

  if not private.bs_kocluk_ogrenci_erisim_var_mi(v_gorusme.ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;

  if v_gorusme.durum = 'İptal' then
    raise exception 'İptal edilmiş görüşmeden aksiyon oluşturulamaz.';
  end if;

  v_karar := nullif(trim(coalesce(v_gorusme.alinan_kararlar, '')), '');
  if v_karar is null then
    raise exception 'Önce görüşmede alınan kararı kaydedin.';
  end if;

  select * into v_existing
  from public.odevler
  where kaynak_gorusme_id = p_gorusme_id
  limit 1;

  if found then
    return jsonb_build_object(
      'basarili', true,
      'tekrar', true,
      'odev_id', v_existing.odev_id,
      'baslik', coalesce(v_existing.odev_basligi, v_existing.konu, 'Görüşme kararı'),
      'son_teslim_tarihi', v_existing.son_teslim_tarihi
    );
  end if;

  select kp.koc_ogretmen_id into v_ogretmen_id
  from public.kocluk_ogrenci_profilleri kp
  where kp.ogrenci_id = v_gorusme.ogrenci_id
    and kp.durum = 'Aktif'
  order by kp.guncellenme_zamani desc nulls last
  limit 1;

  if v_ogretmen_id is null then
    raise exception 'Öğrencinin aktif koçu bulunamadı.';
  end if;

  v_teslim := coalesce(
    p_son_teslim_tarihi,
    case
      when v_gorusme.sonraki_gorusme_tarihi is not null
       and v_gorusme.sonraki_gorusme_tarihi >= current_date
      then v_gorusme.sonraki_gorusme_tarihi
      else current_date + 7
    end
  );

  if v_teslim < current_date then
    raise exception 'Son teslim tarihi geçmişte olamaz.';
  end if;

  v_baslik := case
    when char_length(v_karar) <= 90 then v_karar
    else left(v_karar, 87) || '…'
  end;

  v_odev_id := 'ODV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.odevler(
    odev_id,
    ogrenci_id,
    ogretmen_id,
    konu,
    odev_basligi,
    odev_aciklamasi,
    verilis_tarihi,
    son_teslim_tarihi,
    durum,
    oncelik,
    calisma_turu,
    calisma_detayi,
    kaynak_gorusme_id,
    olusturan,
    olusturulma_zamani,
    son_guncelleyen,
    son_guncellenme_zamani
  ) values (
    v_odev_id,
    v_gorusme.ogrenci_id,
    v_ogretmen_id,
    'Görüşme kararı',
    v_baslik,
    v_karar,
    current_date,
    v_teslim,
    'Verildi',
    v_oncelik,
    'Konu',
    v_karar,
    p_gorusme_id,
    auth.uid()::text,
    now(),
    auth.uid()::text,
    now()
  );

  return jsonb_build_object(
    'basarili', true,
    'tekrar', false,
    'odev_id', v_odev_id,
    'baslik', v_baslik,
    'son_teslim_tarihi', v_teslim
  );
exception
  when unique_violation then
    select * into v_existing
    from public.odevler
    where kaynak_gorusme_id = p_gorusme_id
    limit 1;

    if found then
      return jsonb_build_object(
        'basarili', true,
        'tekrar', true,
        'odev_id', v_existing.odev_id,
        'baslik', coalesce(v_existing.odev_basligi, v_existing.konu, 'Görüşme kararı'),
        'son_teslim_tarihi', v_existing.son_teslim_tarihi
      );
    end if;
    raise;
end;
$function$;

revoke all on function public.kocluk_gorusme_karari_aksiyona_cevir_v1(text, date, text) from public;
revoke all on function public.kocluk_gorusme_karari_aksiyona_cevir_v1(text, date, text) from anon;
grant execute on function public.kocluk_gorusme_karari_aksiyona_cevir_v1(text, date, text) to authenticated;
