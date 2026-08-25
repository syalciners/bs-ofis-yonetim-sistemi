-- BS Eğitim SaaS V1 — RLS / grant güvenlik katmanı
-- Dedicated-instance modelinde yönetim tablolarına yalnız aktif Yönetici profili erişir.
-- Client doğrudan DML yapmaz; yazma işlemleri security-definer RPC'ler üzerinden yürür.

revoke create on schema public from public;
grant usage on schema public to anon, authenticated;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Core tablolarında istemci DML yetkisini kapat.
revoke all on all tables in schema public from anon, authenticated;

-- Yönetim uygulamasının doğrudan okuduğu tablolar.
grant select on table
  public.ogrenciler,
  public.ogretmenler,
  public.branslar,
  public.ogretmen_branslari,
  public.derslikler,
  public.sabit_ders_programi,
  public.dersler,
  public.tahsilatlar,
  public.giderler,
  public.gider_kategorileri,
  public.ogretmen_odemeleri,
  public.hakedis_donemleri,
  public.kasa_hesaplari,
  public.kasa_hareketleri,
  public.odevler,
  public.kullanici_profilleri,
  public.kurum_ayarlari
  to authenticated;

-- Tüm Core tablolarında RLS açık ve tek temel politika aktif yönetici tam erişimidir.
do $security$
declare
  v_table text;
begin
  foreach v_table in array array[
    'aylik_snapshotlar','bildirim_okumalari','bildirimler','branslar','dersler','derslikler',
    'gider_kategorileri','giderler','haftalik_ders_uretimleri','hakedis_donemleri','kasa_hareketleri',
    'kasa_hesaplari','krediler','kullanici_profilleri','kurum_ayarlari','odevler','ogrenciler',
    'ogretmen_branslari','ogretmen_odemeleri','ogretmenler','portal_kullanicilari','rapor_talepleri',
    'sabit_ders_programi','sabit_program_istisnalari','tahsilatlar','tarifeler'
  ]
  loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format('drop policy if exists yonetici_tam_erisim on public.%I',v_table);
    execute format(
      'create policy yonetici_tam_erisim on public.%I for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()))',
      v_table
    );
  end loop;
end;
$security$;

-- Private helper/trigger fonksiyonları API rollerine varsayılan olarak kapalıdır.
do $private_grants$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.signature);
  end loop;
end;
$private_grants$;

grant execute on function private.bs_ofis_yonetici_mi() to authenticated;

-- Public RPC'lerde PUBLIC/anon varsayılan execute kapalıdır.
-- Contracttaki 53 Core RPC authenticated rolüne açılır; tek anon istisnası kurum_public_bilgisi_v1'dir.
do $public_rpc_grants$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature,p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.signature);
    execute format('grant execute on function %s to authenticated',r.signature);
    if r.proname='kurum_public_bilgisi_v1' then
      execute format('grant execute on function %s to anon',r.signature);
    end if;
  end loop;
end;
$public_rpc_grants$;
