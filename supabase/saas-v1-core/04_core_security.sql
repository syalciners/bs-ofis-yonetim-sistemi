-- BS Eğitim SaaS V1 — RLS / grant güvenlik katmanı
-- Yalnız Core sözleşme nesnelerine dokunur; opsiyonel ürün/modüllerin yetkilerini değiştirmez.

revoke create on schema public from public;
grant usage on schema public to anon, authenticated;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- 26 Core tabloda istemci yetkilerini sıfırla ve RLS'yi sabitle.
do $core_table_security$
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
    execute format('revoke all on table public.%I from anon, authenticated',v_table);
    execute format('alter table public.%I enable row level security',v_table);
    execute format('drop policy if exists yonetici_tam_erisim on public.%I',v_table);
    execute format(
      'create policy yonetici_tam_erisim on public.%I for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()))',
      v_table
    );
  end loop;
end;
$core_table_security$;

-- Yönetim uygulamasının doğrudan okuduğu 17 tablo. DML yine RPC üzerinden yapılır.
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

-- Yalnız doğrulanmış Core private helper/trigger setinin API execute yetkilerini kapat.
do $private_grants$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private'
      and p.proname=any(array[
        'bs_ofis_yonetici_mi','bs_program_tarih_kontrol_v1','ogretmen_brans_uygun_mu',
        'portal_kimligi_epostadan_v2','sabit_program_tarih_uygun_mu','sabit_program_tarihe_duser_mi',
        'bs_ofis_ogretmen_brans_dogrula_v1','portal_yonetim_kimligi_cakisma_engelle_v1',
        'yonetim_portal_kimligi_cakisma_engelle_v1'
      ])
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.signature);
  end loop;
end;
$private_grants$;

grant execute on function private.bs_ofis_yonetici_mi() to authenticated;

-- 53 Core public RPC'nin execute matrisi.
do $public_rpc_grants$
declare
  r record;
  v_count integer;
  v_names text[]:=array[
    'bildirim_okundu_v1','bildirim_okunmamis_sayisi_v1','bildirimlerim_v1','brans_kaydet_guvenli_v1',
    'ders_cakisma_kontrol_v1','ders_durumu_guncelle_guvenli_v1','ders_guncelle_guvenli_v1','ders_kaydet_guvenli_v1',
    'derslik_kaydet_guvenli_v1','drive_yukleme_yetkili_mi_v1','gider_guncelle_guvenli_v1','gider_iptal_guvenli_v1',
    'gider_kategorisi_kaydet_guvenli_v1','gider_kaydet_guvenli_v1','haftalik_ders_uretim_durumu_v3',
    'haftalik_dersleri_hazirla_guvenli_v6','haftalik_program_kontrol_oneri_v2','kasa_hesabi_kaydet_guvenli_v1',
    'kullanici_kendi_profilini_guncelle_guvenli_v1','kullanici_profili_guncelle_guvenli_v2',
    'kurum_ayarlari_guncelle_guvenli_v1','kurum_public_bilgisi_v1','odev_drive_eklerini_guncelle_guvenli_v1',
    'odev_durumu_guncelle_guvenli_v1','odev_eklerini_guncelle_guvenli_v1','odev_kaydet_guvenli_v1',
    'ogrenci_ekle_guvenli_v1','ogrenci_kaydet_guvenli_v2','ogrenci_sil_guvenli_v1','ogretmen_kaydet_guvenli_v5',
    'ogretmen_odeme_guncelle_guvenli_v1','ogretmen_odeme_iptal_guvenli_v1','ogretmen_odeme_kaydet_guvenli_v2',
    'portal_bugun_v2','portal_odevler_v2','portal_ogrenci_bugun_v1','portal_ogrenci_odev_tamamla_v1',
    'portal_oturum_bilgisi_v2','portal_program_v2','profil_fotografi_guncelle_guvenli_v1',
    'program_ayarlari_guncelle_guvenli_v1','program_saglik_kontrolu_v1','sabit_program_cakisma_kontrol_v1',
    'sabit_program_hafta_atla_guvenli_v1','sabit_program_kaydet_guvenli_v4','sabit_program_oneri_v1',
    'sabit_program_onizleme_v1','sabit_program_tek_sefer_tasi_guvenli_v1','sistem_saglik_kontrolu_v1',
    'tahsilat_guncelle_guvenli_v1','tahsilat_iptal_guvenli_v1','tahsilat_kaydet_guvenli_v1','tahsilat_sil_guvenli_v1'
  ];
begin
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=any(v_names);
  if v_count<>53 then raise exception 'Core RPC güvenlik kapsamı 53 değil: %',v_count; end if;

  for r in
    select p.oid::regprocedure as signature,p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(v_names)
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.signature);
    execute format('grant execute on function %s to authenticated',r.signature);
    if r.proname='kurum_public_bilgisi_v1' then
      execute format('grant execute on function %s to anon',r.signature);
    end if;
  end loop;
end;
$public_rpc_grants$;
