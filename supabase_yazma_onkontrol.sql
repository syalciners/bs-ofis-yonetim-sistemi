-- BS Eğitim Yönetimi / Supabase yazma mimarisi ön kontrolü
-- SADECE OKUMA YAPAR. INSERT / UPDATE / DELETE / DDL İÇERMEZ.
-- Amaç: Web arayüzünde yazma butonları açılmadan önce gerçek şema, constraint,
-- index, RLS policy ve mevcut RPC/fonksiyonları tek seferde görmek.

-- 1) Kritik tabloların gerçek kolonları, tipleri, null/default bilgileri
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'ogrenciler',
    'dersler',
    'sabit_ders_programi',
    'tahsilatlar',
    'kasa_hesaplari',
    'kasa_hareketleri',
    'ogretmen_odemeleri',
    'ogretmenler',
    'branslar',
    'derslikler',
    'kullanici_profilleri'
  )
order by table_name, ordinal_position;

-- 2) Primary key / unique / foreign key / check constraint'leri
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
left join information_schema.constraint_column_usage ccu
  on tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
where tc.constraint_schema = 'public'
  and tc.table_name in (
    'ogrenciler','dersler','sabit_ders_programi','tahsilatlar',
    'kasa_hesaplari','kasa_hareketleri','ogretmen_odemeleri'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 3) RLS politikaları
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ogrenciler','dersler','sabit_ders_programi','tahsilatlar',
    'kasa_hesaplari','kasa_hareketleri','ogretmen_odemeleri',
    'ogretmenler','branslar','derslikler','kullanici_profilleri'
  )
order by tablename, policyname;

-- 4) Index'ler: idempotency/tekillik tasarımında mevcut yapıyı gör
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'ogrenciler','dersler','sabit_ders_programi','tahsilatlar',
    'kasa_hesaplari','kasa_hareketleri','ogretmen_odemeleri'
  )
order by tablename, indexname;

-- 5) Mevcut public fonksiyon/RPC'ler
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, arguments;

-- 6) RLS açık mı?
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'ogrenciler','dersler','sabit_ders_programi','tahsilatlar',
    'kasa_hesaplari','kasa_hareketleri','ogretmen_odemeleri',
    'ogretmenler','branslar','derslikler','kullanici_profilleri'
  )
order by c.relname;

-- 7) Güncel kayıt adetleri (referans; veri yazmaz)
select 'ogrenciler' as tablo, count(*) as kayit from public.ogrenciler
union all select 'ogretmenler', count(*) from public.ogretmenler
union all select 'branslar', count(*) from public.branslar
union all select 'derslikler', count(*) from public.derslikler
union all select 'dersler', count(*) from public.dersler
union all select 'sabit_ders_programi', count(*) from public.sabit_ders_programi
union all select 'tahsilatlar', count(*) from public.tahsilatlar
union all select 'kasa_hesaplari', count(*) from public.kasa_hesaplari
union all select 'kasa_hareketleri', count(*) from public.kasa_hareketleri
union all select 'ogretmen_odemeleri', count(*) from public.ogretmen_odemeleri
union all select 'kullanici_profilleri', count(*) from public.kullanici_profilleri
order by tablo;
