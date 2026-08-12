-- BS Eğitim Yönetimi
-- Haftalık sabit programdan güvenli ve idempotent ders üretimi.
-- Supabase migration ile kurulmuştur. Frontend canlı yazma henüz açılmamıştır.

create or replace function public.haftalik_dersleri_olustur_guvenli_v1(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text);
  v_hafta_sonu date;
  v_aktif integer := 0;
  v_olusturulan integer := 0;
  v_zaten integer := 0;
  v_cakisma integer := 0;
  v_hatali integer := 0;
  v_detay jsonb := '[]'::jsonb;
  r record;
  v_offset integer;
  v_tarih date;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_eszamanli integer;
  v_kisi_cakisma boolean;
  v_ders_id text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  if p_hafta_baslangici is null then
    raise exception 'Hafta başlangıcı zorunludur.';
  end if;

  if extract(isodow from p_hafta_baslangici) <> 1 then
    raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';
  end if;

  v_hafta_sonu := p_hafta_baslangici + 6;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders:' || p_hafta_baslangici::text));

  for r in
    select p.*
    from public.sabit_ders_programi p
    where p.program_durumu = 'Aktif'
      and (p.baslangic_tarihi is null or p.baslangic_tarihi <= v_hafta_sonu)
      and (p.bitis_tarihi is null or p.bitis_tarihi >= p_hafta_baslangici)
    order by p.program_id
  loop
    v_offset := case r.haftanin_gunu
      when 'Pazartesi' then 0
      when 'Salı' then 1
      when 'Çarşamba' then 2
      when 'Perşembe' then 3
      when 'Cuma' then 4
      when 'Cumartesi' then 5
      when 'Pazar' then 6
      else null
    end;

    if v_offset is null then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Haftanın günü geçersiz'));
      continue;
    end if;

    v_tarih := p_hafta_baslangici + v_offset;
    if (r.baslangic_tarihi is not null and v_tarih < r.baslangic_tarihi)
       or (r.bitis_tarihi is not null and v_tarih > r.bitis_tarihi) then
      continue;
    end if;

    v_aktif := v_aktif + 1;

    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null
       or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Zorunlu ders bilgisi eksik'));
      continue;
    end if;

    if not exists (select 1 from public.ogrenciler o where o.ogrenci_id = r.ogrenci_id and coalesce(o.durum,'Aktif') <> 'Pasif')
       or not exists (select 1 from public.ogretmenler o where o.ogretmen_id = r.ogretmen_id and coalesce(o.durum,'Aktif') <> 'Pasif')
       or not exists (select 1 from public.branslar b where b.brans_id = r.brans_id and coalesce(b.aktif,true) = true)
       or not exists (select 1 from public.derslikler l where l.derslik_id = r.derslik_id and coalesce(l.aktif,true) = true) then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Pasif veya bulunamayan referans kaydı'));
      continue;
    end if;

    if exists (select 1 from public.dersler d where d.program_id = r.program_id and d.tarih = v_tarih) then
      v_zaten := v_zaten + 1;
      continue;
    end if;

    v_bas := v_tarih::timestamp + r.baslangic_saati;
    v_bit := v_bas + (r.ders_sayisi * interval '1 hour');

    if v_bit::date <> v_tarih then
      v_hatali := v_hatali + 1;
      v_detay := v_detay || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Ders saati gün sınırını aşıyor'));
      continue;
    end if;

    select coalesce(l.kapasite,1) into v_kapasite from public.derslikler l where l.derslik_id = r.derslik_id;
    v_kapasite := greatest(coalesce(v_kapasite,1),1);

    select exists (
      select 1 from public.dersler d
      where d.tarih = v_tarih
        and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
        and d.baslangic_saati is not null and d.bitis_saati is not null
        and (v_tarih::timestamp + d.baslangic_saati) < v_bit
        and v_bas < (v_tarih::timestamp + d.bitis_saati)
        and (d.ogrenci_id = r.ogrenci_id or d.ogretmen_id = r.ogretmen_id)
    ) into v_kisi_cakisma;

    select count(*) into v_eszamanli
    from public.dersler d
    where d.tarih = v_tarih
      and d.derslik_id = r.derslik_id
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
      and (v_tarih::timestamp + d.baslangic_saati) < v_bit
      and v_bas < (v_tarih::timestamp + d.bitis_saati);

    if v_kisi_cakisma or v_eszamanli >= v_kapasite then
      v_cakisma := v_cakisma + 1;
      v_detay := v_detay || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('tur','Çakışma','program_id',r.program_id,'tarih',v_tarih,'kisi_cakisma',v_kisi_cakisma,'derslik_dolu',v_eszamanli >= v_kapasite));
      continue;
    end if;

    loop
      v_ders_id := substr(replace(gen_random_uuid()::text,'-',''),1,8);
      exit when not exists (select 1 from public.dersler d where d.ders_id = v_ders_id);
    end loop;

    insert into public.dersler (
      ders_id, program_id, tarih, ogrenci_id, ogretmen_id, brans_id, derslik_id,
      ders_sayisi, ogrenci_birim_ucreti, ogretmen_birim_hakedisi,
      ogrenci_toplam_tutar, ogretmen_toplam_hakedis,
      ders_durumu, baslangic_saati, bitis_saati, olusturan, olusturulma_zamani
    ) values (
      v_ders_id, r.program_id, v_tarih, r.ogrenci_id, r.ogretmen_id, r.brans_id, r.derslik_id,
      r.ders_sayisi, r.ogrenci_birim_ucreti, r.ogretmen_birim_hakedisi,
      coalesce(r.ogrenci_birim_ucreti,0) * r.ders_sayisi,
      coalesce(r.ogretmen_birim_hakedisi,0) * r.ders_sayisi,
      'Planlandı', r.baslangic_saati, v_bit::time, v_email, pg_catalog.now()
    );

    v_olusturulan := v_olusturulan + 1;
  end loop;

  return pg_catalog.jsonb_build_object('basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'cakisma',v_cakisma,'hatali',v_hatali,'detay',v_detay);
end;
$$;

revoke all on function public.haftalik_dersleri_olustur_guvenli_v1(date) from public;
revoke all on function public.haftalik_dersleri_olustur_guvenli_v1(date) from anon;
grant execute on function public.haftalik_dersleri_olustur_guvenli_v1(date) to authenticated;
