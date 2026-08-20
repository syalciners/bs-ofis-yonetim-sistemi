-- BS Koçluk Veli İletişim Geçmişi V1
-- Veli özeti dışarı taşınırken yalnız doğrulanabilir kullanıcı aksiyonunu kaydeder.
-- WhatsApp açılması gönderim olarak kabul edilmez.

create table if not exists public.kocluk_veli_iletisimleri (
  iletisim_id text primary key,
  ogrenci_id text not null references public.ogrenciler(ogrenci_id) on delete cascade,
  kanal text not null,
  durum text not null,
  icerik text not null,
  kaynak text not null default 'Veli Özeti',
  iletisim_zamani timestamptz not null default now(),
  olusturan text not null default (auth.uid()::text),
  olusturulma_zamani timestamptz not null default now(),
  constraint kocluk_veli_iletisim_kanal_check check (kanal in ('Kopyalama', 'WhatsApp')),
  constraint kocluk_veli_iletisim_durum_check check (durum in ('Kopyalandı', 'WhatsApp''ta Açıldı')),
  constraint kocluk_veli_iletisim_kaynak_check check (kaynak = 'Veli Özeti'),
  constraint kocluk_veli_iletisim_icerik_check check (char_length(btrim(icerik)) between 1 and 4000)
);

create index if not exists kocluk_veli_iletisim_ogrenci_zaman_idx
  on public.kocluk_veli_iletisimleri (ogrenci_id, iletisim_zamani desc);

alter table public.kocluk_veli_iletisimleri enable row level security;

drop policy if exists koc_veli_iletisim_gor on public.kocluk_veli_iletisimleri;
create policy koc_veli_iletisim_gor
on public.kocluk_veli_iletisimleri
for select
to authenticated
using (private.bs_kocluk_ogrenci_erisim_var_mi(ogrenci_id));

revoke all on table public.kocluk_veli_iletisimleri from anon;
revoke insert, update, delete on table public.kocluk_veli_iletisimleri from authenticated;
grant select on table public.kocluk_veli_iletisimleri to authenticated;

create or replace function public.kocluk_veli_iletisim_kaydet_v1(
  p_ogrenci_id text,
  p_kanal text,
  p_icerik text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kanal text := nullif(btrim(coalesce(p_kanal, '')), '');
  v_icerik text := nullif(btrim(coalesce(p_icerik, '')), '');
  v_durum text;
  v_id text;
  v_tekrar boolean := false;
begin
  if not private.bs_kocluk_ogrenci_erisim_var_mi(p_ogrenci_id) then
    raise exception 'Bu öğrenci için koçluk erişiminiz yok.';
  end if;
  if v_kanal not in ('Kopyalama', 'WhatsApp') then raise exception 'Geçersiz veli iletişim kanalı.'; end if;
  if v_icerik is null then raise exception 'İletişim içeriği boş olamaz.'; end if;
  if char_length(v_icerik) > 4000 then raise exception 'İletişim içeriği çok uzun.'; end if;
  v_durum := case when v_kanal = 'WhatsApp' then 'WhatsApp''ta Açıldı' else 'Kopyalandı' end;

  select v.iletisim_id into v_id
  from public.kocluk_veli_iletisimleri v
  where v.ogrenci_id = p_ogrenci_id
    and v.kanal = v_kanal
    and v.icerik = v_icerik
    and v.iletisim_zamani >= now() - interval '10 minutes'
  order by v.iletisim_zamani desc
  limit 1;

  if v_id is not null then
    v_tekrar := true;
    update public.kocluk_veli_iletisimleri set iletisim_zamani = now(), durum = v_durum where iletisim_id = v_id;
  else
    v_id := 'VLT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.kocluk_veli_iletisimleri(
      iletisim_id, ogrenci_id, kanal, durum, icerik, kaynak,
      iletisim_zamani, olusturan, olusturulma_zamani
    ) values (
      v_id, p_ogrenci_id, v_kanal, v_durum, v_icerik, 'Veli Özeti',
      now(), auth.uid()::text, now()
    );
  end if;

  return jsonb_build_object('basarili', true, 'iletisim_id', v_id, 'kanal', v_kanal, 'durum', v_durum, 'tekrar', v_tekrar);
end;
$$;

revoke all on function public.kocluk_veli_iletisim_kaydet_v1(text, text, text) from public;
revoke all on function public.kocluk_veli_iletisim_kaydet_v1(text, text, text) from anon;
grant execute on function public.kocluk_veli_iletisim_kaydet_v1(text, text, text) to authenticated;
