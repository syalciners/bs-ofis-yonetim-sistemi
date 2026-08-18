alter table public.kurum_ayarlari
  add column if not exists varsayilan_ders_birimi smallint not null default 1,
  add column if not exists takvim_baslangic_saati time without time zone not null default '08:00',
  add column if not exists takvim_bitis_saati time without time zone not null default '21:00';

alter table public.kurum_ayarlari
  drop constraint if exists kurum_ayarlari_varsayilan_ders_birimi_check,
  drop constraint if exists kurum_ayarlari_takvim_saatleri_check;

alter table public.kurum_ayarlari
  add constraint kurum_ayarlari_varsayilan_ders_birimi_check
    check (varsayilan_ders_birimi between 1 and 2),
  add constraint kurum_ayarlari_takvim_saatleri_check
    check (takvim_baslangic_saati < takvim_bitis_saati);

create or replace function public.program_ayarlari_guncelle_guvenli_v1(
  p_varsayilan_ders_birimi integer,
  p_takvim_baslangic_saati time without time zone,
  p_takvim_bitis_saati time without time zone
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if p_varsayilan_ders_birimi not between 1 and 2 then
    raise exception 'Varsayılan ders birimi 1 veya 2 olmalıdır.';
  end if;
  if p_takvim_baslangic_saati is null or p_takvim_bitis_saati is null then
    raise exception 'Takvim başlangıç ve bitiş saati zorunludur.';
  end if;
  if p_takvim_baslangic_saati >= p_takvim_bitis_saati then
    raise exception 'Takvim bitiş saati başlangıç saatinden sonra olmalıdır.';
  end if;

  update public.kurum_ayarlari
     set varsayilan_ders_birimi = p_varsayilan_ders_birimi,
         takvim_baslangic_saati = p_takvim_baslangic_saati,
         takvim_bitis_saati = p_takvim_bitis_saati,
         guncellenme_zamani = now(),
         guncelleyen = auth.uid()
   where kurum_id = 'ANA';

  return jsonb_build_object(
    'basarili', true,
    'varsayilan_ders_birimi', p_varsayilan_ders_birimi,
    'takvim_baslangic_saati', p_takvim_baslangic_saati,
    'takvim_bitis_saati', p_takvim_bitis_saati
  );
end;
$$;

revoke all on function public.program_ayarlari_guncelle_guvenli_v1(integer,time without time zone,time without time zone) from public, anon;
grant execute on function public.program_ayarlari_guncelle_guvenli_v1(integer,time without time zone,time without time zone) to authenticated, service_role;
