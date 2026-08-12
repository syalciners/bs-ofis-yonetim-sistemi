-- BS Eğitim Yönetimi
-- Sabit Ders Programı V1
-- Tarih: 12.08.2026
--
-- Amaç: AppSheet / Google Sheets içindeki DersProgrami tablosunu
-- yeni web uygulamasının okuyacağı public.sabit_ders_programi tablosuna
-- güvenli ve idempotent biçimde taşıyabilmek.
--
-- Bu script mevcut operasyon tablolarına veri yazmaz.
-- Yalnız sabit_ders_programi tablosunu ve onun okuma politikasını hazırlar.
-- İlk geçişte FK constraint eklenmemiştir; senkron doğrulandıktan sonra
-- referans bütünlüğü ayrıca sıkılaştırılacaktır.

begin;

create table if not exists public.sabit_ders_programi (
  program_id text primary key,
  ogrenci_id text not null,
  ogretmen_id text not null,
  brans_id text not null,
  derslik_id text,
  haftanin_gunu text not null,
  baslangic_saati time without time zone not null,
  ders_sayisi smallint not null default 1,
  ogrenci_birim_ucreti numeric(12,2) not null default 0,
  ogretmen_birim_hakedisi numeric(12,2) not null default 0,
  baslangic_tarihi date,
  bitis_tarihi date,
  aktif boolean not null default true,
  program_durumu text not null default 'Aktif',
  aciklama text,
  kaynak_sistem text not null default 'AppSheet',
  kaynak_hash text,
  senkron_zamani timestamptz not null default now(),

  constraint sabit_ders_programi_gun_chk
    check (haftanin_gunu in (
      'Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'
    )),

  constraint sabit_ders_programi_sure_chk
    check (ders_sayisi between 1 and 4),

  constraint sabit_ders_programi_durum_chk
    check (program_durumu in ('Aktif','Donduruldu','Sonlandırıldı')),

  constraint sabit_ders_programi_tarih_chk
    check (bitis_tarihi is null or baslangic_tarihi is null or bitis_tarihi >= baslangic_tarihi)
);

create index if not exists ix_sabit_ders_programi_ogrenci
  on public.sabit_ders_programi (ogrenci_id);

create index if not exists ix_sabit_ders_programi_ogretmen
  on public.sabit_ders_programi (ogretmen_id);

create index if not exists ix_sabit_ders_programi_gun_saat
  on public.sabit_ders_programi (haftanin_gunu, baslangic_saati);

create index if not exists ix_sabit_ders_programi_durum
  on public.sabit_ders_programi (program_durumu);

create index if not exists ix_sabit_ders_programi_tarih_araligi
  on public.sabit_ders_programi (baslangic_tarihi, bitis_tarihi);

alter table public.sabit_ders_programi enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sabit_ders_programi'
      and policyname = 'sabit_ders_programi_authenticated_select'
  ) then
    create policy sabit_ders_programi_authenticated_select
      on public.sabit_ders_programi
      for select
      to authenticated
      using (true);
  end if;
end $$;

grant select on public.sabit_ders_programi to authenticated;

comment on table public.sabit_ders_programi is
  'AppSheet DersProgrami tablosunun yeni BS Eğitim Yönetimi için senkron kopyası.';
comment on column public.sabit_ders_programi.program_id is
  'Kaynak DersProgrami.ProgramID; idempotent senkron anahtarı.';
comment on column public.sabit_ders_programi.ders_sayisi is
  'AppSheet DersSayisiSaat değeri. Takvim planlamasında her birim 60 dakikalık slot; ders/hizmet birimi finans tarafında ayrı iş kuralıdır.';
comment on column public.sabit_ders_programi.kaynak_hash is
  'Kaynak alanların SHA-256 özeti; senkron/denetim amaçlı.';

commit;

-- Son kontrol: yalnız okuma
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sabit_ders_programi'
order by ordinal_position;

select count(*) as mevcut_kayit
from public.sabit_ders_programi;
