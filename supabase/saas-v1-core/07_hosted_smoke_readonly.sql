-- BS Eğitim SaaS V1 — Hosted Supabase salt-okunur kabul testi
-- Bu dosya veri/şema değiştirmez. Boş hosted instance kurulumundan sonra çalıştırılır.
-- Kabul: dönen TÜM satırlarda passed=true olmalıdır.

with expected_tables(name) as (
  values
    ('aylik_snapshotlar'),('bildirim_okumalari'),('bildirimler'),('branslar'),('dersler'),('derslikler'),
    ('gider_kategorileri'),('giderler'),('haftalik_ders_uretimleri'),('hakedis_donemleri'),
    ('kasa_hareketleri'),('kasa_hesaplari'),('krediler'),('kullanici_profilleri'),('kurum_ayarlari'),
    ('odevler'),('ogrenciler'),('ogretmen_branslari'),('ogretmen_odemeleri'),('ogretmenler'),
    ('portal_kullanicilari'),('rapor_talepleri'),('sabit_ders_programi'),('sabit_program_istisnalari'),
    ('tahsilatlar'),('tarifeler')
),
core_relations as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  join expected_tables e on e.name=c.relname
  where n.nspname='public' and c.relkind='r'
),
public_functions as (
  select p.oid, p.proname, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f'
),
checks as (
  select
    '01_core_tablolar_26'::text as check_name,
    (select count(*) from core_relations)=26 as passed,
    format('bulunan=%s beklenen=26',(select count(*) from core_relations)) as detail

  union all
  select
    '02_core_tablolar_tam_liste',
    not exists (
      select 1 from expected_tables e
      where not exists (select 1 from core_relations r where r.relname=e.name)
    ),
    'Manifestteki 26 Core tablonun tamamı public şemada bulunmalı.'

  union all
  select
    '03_core_primary_key_26',
    (select count(*)
     from pg_constraint con
     join core_relations r on r.oid=con.conrelid
     where con.contype='p')=26,
    format('primary_key=%s beklenen=26',(
      select count(*) from pg_constraint con join core_relations r on r.oid=con.conrelid where con.contype='p'
    ))

  union all
  select
    '04_core_rls_26',
    (select count(*) from core_relations where relrowsecurity)=26,
    format('rls_acik=%s beklenen=26',(select count(*) from core_relations where relrowsecurity))

  union all
  select
    '05_core_rpc_53',
    (select count(*) from public_functions)=53,
    format('public_function=%s beklenen=53',(select count(*) from public_functions))

  union all
  select
    '06_core_rpc_security_definer_53',
    (select count(*) from public_functions where prosecdef)=53,
    format('security_definer=%s beklenen=53',(select count(*) from public_functions where prosecdef))

  union all
  select
    '07_anon_rpc_yalniz_kurum_public',
    (select count(*) from public_functions where has_function_privilege('anon',oid,'EXECUTE'))=1
      and exists (
        select 1 from public_functions
        where proname='kurum_public_bilgisi_v1' and has_function_privilege('anon',oid,'EXECUTE')
      ),
    format('anon_execute=%s beklenen=1 (kurum_public_bilgisi_v1)',(
      select count(*) from public_functions where has_function_privilege('anon',oid,'EXECUTE')
    ))

  union all
  select
    '08_authenticated_rpc_53',
    (select count(*) from public_functions where has_function_privilege('authenticated',oid,'EXECUTE'))=53,
    format('authenticated_execute=%s beklenen=53',(
      select count(*) from public_functions where has_function_privilege('authenticated',oid,'EXECUTE')
    ))

  union all
  select
    '09_anon_direct_dml_yok',
    not exists (
      select 1 from core_relations
      where has_table_privilege('anon',oid,'INSERT')
         or has_table_privilege('anon',oid,'UPDATE')
         or has_table_privilege('anon',oid,'DELETE')
    ),
    'anon rolü Core tablolarda doğrudan INSERT/UPDATE/DELETE alamaz.'

  union all
  select
    '10_authenticated_direct_dml_yok',
    not exists (
      select 1 from core_relations
      where has_table_privilege('authenticated',oid,'INSERT')
         or has_table_privilege('authenticated',oid,'UPDATE')
         or has_table_privilege('authenticated',oid,'DELETE')
    ),
    'authenticated rolü Core tablolarda doğrudan DML alamaz; yazma güvenli RPC üzerinden yapılır.'

  union all
  select
    '11_pgcrypto_extensions_semasinda',
    exists (
      select 1
      from pg_extension e
      join pg_namespace n on n.oid=e.extnamespace
      where e.extname='pgcrypto' and n.nspname='extensions'
    ),
    'pgcrypto eklentisi extensions şemasında olmalı.'

  union all
  select
    '12_seed_tek_ANA_kurum',
    (select count(*) from public.kurum_ayarlari)=1
      and (select count(*) from public.kurum_ayarlari where kurum_id='ANA')=1,
    format('kurum_ayarlari=%s ANA=%s',
      (select count(*) from public.kurum_ayarlari),
      (select count(*) from public.kurum_ayarlari where kurum_id='ANA'))

  union all
  select
    '13_seed_operasyonel_veri_yok',
    (select count(*) from public.ogrenciler)=0
      and (select count(*) from public.ogretmenler)=0
      and (select count(*) from public.dersler)=0
      and (select count(*) from public.tahsilatlar)=0
      and (select count(*) from public.giderler)=0,
    format('ogrenci=%s ogretmen=%s ders=%s tahsilat=%s gider=%s',
      (select count(*) from public.ogrenciler),
      (select count(*) from public.ogretmenler),
      (select count(*) from public.dersler),
      (select count(*) from public.tahsilatlar),
      (select count(*) from public.giderler))

  union all
  select
    '14_core_disi_tablo_sizintisi_yok',
    not exists (
      select 1 from pg_tables
      where schemaname='public'
        and (tablename like 'kocluk_%'
          or tablename like 'md_%'
          or tablename in ('kitap_katalogu','ogrenci_kitaplari'))
    ),
    'Koçluk, md_* ve kitap ürün tabloları Core instancea kurulmaz.'

  union all
  select
    '15_storage_uc_bucket',
    (select count(*) from storage.buckets where id in ('kurum-markasi','odev-ekleri','profil-fotograflari'))=3,
    format('core_bucket=%s beklenen=3',(
      select count(*) from storage.buckets where id in ('kurum-markasi','odev-ekleri','profil-fotograflari')
    ))

  union all
  select
    '16_storage_kurum_markasi',
    exists (
      select 1 from storage.buckets
      where id='kurum-markasi' and public=true and file_size_limit=2097152
    ),
    'kurum-markasi public=true ve 2 MB olmalı.'

  union all
  select
    '17_storage_odev_ekleri',
    exists (
      select 1 from storage.buckets
      where id='odev-ekleri' and public=false and file_size_limit=15728640
    ),
    'odev-ekleri private ve 15 MB olmalı.'

  union all
  select
    '18_storage_profil_fotograflari',
    exists (
      select 1 from storage.buckets
      where id='profil-fotograflari' and public=false and file_size_limit=5242880
    ),
    'profil-fotograflari private ve 5 MB olmalı.'

  union all
  select
    '19_bootstrap_private_mevcut',
    to_regprocedure('private.ilk_yonetici_bootstrap_v1(text,text)') is not null,
    'private.ilk_yonetici_bootstrap_v1(text,text) mevcut olmalı.'

  union all
  select
    '20_bootstrap_anon_kapali',
    coalesce(not has_function_privilege('anon',to_regprocedure('private.ilk_yonetici_bootstrap_v1(text,text)'),'EXECUTE'),false),
    'anon bootstrap çağramaz.'

  union all
  select
    '21_bootstrap_authenticated_kapali',
    coalesce(not has_function_privilege('authenticated',to_regprocedure('private.ilk_yonetici_bootstrap_v1(text,text)'),'EXECUTE'),false),
    'authenticated bootstrap çağramaz.'

  union all
  select
    '22_bootstrap_service_role_acik',
    coalesce(has_function_privilege('service_role',to_regprocedure('private.ilk_yonetici_bootstrap_v1(text,text)'),'EXECUTE'),false),
    'yalnız güvenli provisioning/kurulum operatörü service_role ile bootstrap yapabilir.'

  union all
  select
    '23_yonetici_helper_authenticated',
    coalesce(has_function_privilege('authenticated',to_regprocedure('private.bs_ofis_yonetici_mi()'),'EXECUTE'),false),
    'RLS/Storage değerlendirmesinin kullandığı yönetici helper authenticated rolüne açık olmalı.'
)
select check_name, passed, detail
from checks
order by check_name;
