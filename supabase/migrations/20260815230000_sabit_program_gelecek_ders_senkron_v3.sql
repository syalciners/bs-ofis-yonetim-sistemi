create or replace function public.sabit_program_kaydet_guvenli_v3(
  p_program_id text,
  p_ogrenci_id text,
  p_ogretmen_id text,
  p_brans_id text,
  p_derslik_id text,
  p_haftanin_gunu text,
  p_baslangic_saati time without time zone,
  p_ders_sayisi numeric,
  p_ogrenci_birim_ucreti numeric,
  p_ogretmen_birim_hakedisi numeric,
  p_tekrar_sikligi text default 'Her Hafta'::text,
  p_baslangic_tarihi date default null::date,
  p_bitis_tarihi date default null::date,
  p_aciklama text default null::text,
  p_program_durumu text default 'Aktif'::text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_bas timestamp := '2000-01-01'::date + p_baslangic_saati;
  v_bit timestamp := v_bas + (p_ders_sayisi * interval '1 hour');
  v_kapasite integer;
  v_mekan_adi text;
  v_tekrar text := coalesce(nullif(trim(p_tekrar_sikligi), ''), 'Her Hafta');
  v_kontrol jsonb;
  v_ders_kontrol jsonb;
  v_program_var_mi boolean := false;
  v_simdi timestamp without time zone := pg_catalog.timezone('Europe/Istanbul', pg_catalog.now());
  v_gun_offset integer;
  v_yeni_tarih date;
  v_yeni_bit timestamp;
  v_guncellenen integer := 0;
  v_korunan integer := 0;
  v_istisna_korunan integer := 0;
  v_email text := coalesce(auth.jwt()->>'email', auth.uid()::text, 'BS Eğitim');
  r record;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_program_id), '') is null then raise exception 'Program kimliği eksik.'; end if;
  if p_baslangic_saati is null then raise exception 'Başlangıç saati zorunludur.'; end if;
  if p_haftanin_gunu not in ('Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar') then raise exception 'Geçersiz gün.'; end if;
  if p_ders_sayisi not in (1,2,3,4) then raise exception 'Ders sayısı 1–4 arasında olmalı.'; end if;
  if v_bit::date <> '2000-01-01'::date then raise exception 'Ders saati gün sınırını aşıyor.'; end if;
  if p_ogrenci_birim_ucreti is null or p_ogrenci_birim_ucreti < 0
     or p_ogretmen_birim_hakedisi is null or p_ogretmen_birim_hakedisi < 0 then
    raise exception 'Ücret ve hakediş geçerli olmalıdır.';
  end if;
  if p_program_durumu not in ('Aktif','Pasif') then raise exception 'Geçersiz program durumu.'; end if;
  if v_tekrar not in ('Her Hafta','2 Haftada Bir','Ayda Bir') then raise exception 'Geçersiz tekrar sıklığı.'; end if;
  if v_tekrar <> 'Her Hafta' and p_baslangic_tarihi is null then raise exception 'Bu tekrar sıklığı için başlangıç tarihi zorunludur.'; end if;
  if p_bitis_tarihi is not null and p_baslangic_tarihi is not null and p_bitis_tarihi < p_baslangic_tarihi then
    raise exception 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
  end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğrenci bulunamadı.'; end if;
  if not exists(select 1 from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif') then raise exception 'Aktif öğretmen bulunamadı.'; end if;
  if not exists(select 1 from public.branslar where brans_id=p_brans_id and coalesce(aktif,true)) then raise exception 'Aktif branş bulunamadı.'; end if;
  if not private.ogretmen_brans_uygun_mu(p_ogretmen_id,p_brans_id) then raise exception 'Seçilen öğretmen bu branş için tanımlı değil.'; end if;

  select greatest(coalesce(kapasite,1),1), mekan_adi
    into v_kapasite, v_mekan_adi
  from public.derslikler
  where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;

  v_gun_offset := case p_haftanin_gunu
    when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2
    when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6
  end;

  -- Sabit program kayıtlarını kısa bir kritik bölümde sıraya alır. Böylece iki
  -- yöneticinin aynı anda yaptığı program değişiklikleri birbirini geçemez.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_sabit_program_kaydet_v3'));

  select exists(
    select 1 from public.sabit_ders_programi where program_id=p_program_id
  ) into v_program_var_mi;

  -- Değişebilecek dersler önce deterministik sırada kilitlenir. Geçmiş,
  -- tamamlanmış/iptal dersler ve tek seferlik istisnalar bu kümeye girmez.
  perform 1
  from public.dersler d
  where d.program_id=p_program_id
    and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
    and (
      d.tarih > v_simdi::date
      or (d.tarih=v_simdi::date and coalesce(d.baslangic_saati,'00:00'::time)>v_simdi::time)
    )
    and not exists(
      select 1
      from public.sabit_program_istisnalari i
      where i.program_id=p_program_id
        and i.iptal_mi=false
        and (
          i.orijinal_tarih=d.tarih
          or i.orijinal_ders_id=d.ders_id
          or i.yeni_ders_id=d.ders_id
        )
    )
  order by d.tarih, d.baslangic_saati, d.ders_id
  for update;

  select count(*)
    into v_istisna_korunan
  from public.dersler d
  where d.program_id=p_program_id
    and (
      d.tarih > v_simdi::date
      or (d.tarih=v_simdi::date and coalesce(d.baslangic_saati,'00:00'::time)>v_simdi::time)
    )
    and exists(
      select 1
      from public.sabit_program_istisnalari i
      where i.program_id=p_program_id
        and i.iptal_mi=false
        and (
          i.orijinal_tarih=d.tarih
          or i.orijinal_ders_id=d.ders_id
          or i.yeni_ders_id=d.ders_id
        )
    );

  if p_program_durumu='Aktif' then
    v_kontrol := public.sabit_program_cakisma_kontrol_v1(
      p_ogrenci_id,p_ogretmen_id,p_derslik_id,p_haftanin_gunu,
      p_baslangic_saati,p_ders_sayisi,v_tekrar,p_baslangic_tarihi,
      p_bitis_tarihi,p_program_id
    );
    if not coalesce((v_kontrol->>'uygun')::boolean,false) then
      raise exception '%',coalesce(v_kontrol->>'mesaj','Sabit program çakışıyor.');
    end if;
  end if;

  insert into public.sabit_ders_programi(
    program_id,ogrenci_id,ogretmen_id,brans_id,derslik_id,haftanin_gunu,
    baslangic_saati,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,
    baslangic_tarihi,bitis_tarihi,aktif,program_durumu,aciklama,kaynak_sistem,
    senkron_zamani,tekrar_sikligi
  ) values (
    p_program_id,p_ogrenci_id,p_ogretmen_id,p_brans_id,p_derslik_id,p_haftanin_gunu,
    p_baslangic_saati,p_ders_sayisi,p_ogrenci_birim_ucreti,p_ogretmen_birim_hakedisi,
    p_baslangic_tarihi,p_bitis_tarihi,p_program_durumu='Aktif',p_program_durumu,
    nullif(trim(coalesce(p_aciklama,'')),''),'BS Eğitim PWA',pg_catalog.now(),v_tekrar
  )
  on conflict(program_id) do update set
    ogrenci_id=excluded.ogrenci_id,
    ogretmen_id=excluded.ogretmen_id,
    brans_id=excluded.brans_id,
    derslik_id=excluded.derslik_id,
    haftanin_gunu=excluded.haftanin_gunu,
    baslangic_saati=excluded.baslangic_saati,
    ders_sayisi=excluded.ders_sayisi,
    ogrenci_birim_ucreti=excluded.ogrenci_birim_ucreti,
    ogretmen_birim_hakedisi=excluded.ogretmen_birim_hakedisi,
    baslangic_tarihi=excluded.baslangic_tarihi,
    bitis_tarihi=excluded.bitis_tarihi,
    aktif=excluded.aktif,
    program_durumu=excluded.program_durumu,
    aciklama=excluded.aciklama,
    kaynak_sistem=excluded.kaynak_sistem,
    senkron_zamani=pg_catalog.now(),
    tekrar_sikligi=excluded.tekrar_sikligi;

  if v_program_var_mi then
    for r in
      select d.*
      from public.dersler d
      where d.program_id=p_program_id
        and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
        and (
          d.tarih > v_simdi::date
          or (d.tarih=v_simdi::date and coalesce(d.baslangic_saati,'00:00'::time)>v_simdi::time)
        )
        and not exists(
          select 1
          from public.sabit_program_istisnalari i
          where i.program_id=p_program_id
            and i.iptal_mi=false
            and (
              i.orijinal_tarih=d.tarih
              or i.orijinal_ders_id=d.ders_id
              or i.yeni_ders_id=d.ders_id
            )
        )
      order by d.tarih, d.baslangic_saati, d.ders_id
    loop
      -- Pasife alma yalnız yeni ders üretimini durdurur; mevcut planlı dersler
      -- kullanıcı onayı olmadan iptal edilmez veya değiştirilmez.
      if p_program_durumu <> 'Aktif' then
        v_korunan := v_korunan + 1;
        continue;
      end if;

      -- Mevcut dersin ISO haftası korunur; programın günü değiştiyse ders aynı
      -- haftadaki yeni güne taşınır.
      v_yeni_tarih := pg_catalog.date_trunc('week', r.tarih::timestamp)::date + v_gun_offset;
      v_yeni_bit := v_yeni_tarih::timestamp + p_baslangic_saati + (p_ders_sayisi * interval '1 hour');

      -- Yeni başlangıç/bitiş/tekrar aralığına girmeyen veya geçmişe düşecek
      -- dersler otomatik silinmez; canlı kaydı korumak için olduğu gibi bırakılır.
      if v_yeni_tarih::timestamp + p_baslangic_saati <= v_simdi
         or (p_baslangic_tarihi is not null and v_yeni_tarih < p_baslangic_tarihi)
         or (p_bitis_tarihi is not null and v_yeni_tarih > p_bitis_tarihi)
         or not private.sabit_program_tarihe_duser_mi(v_tekrar,p_baslangic_tarihi,v_yeni_tarih) then
        v_korunan := v_korunan + 1;
        continue;
      end if;

      v_ders_kontrol := public.ders_cakisma_kontrol_v1(
        v_yeni_tarih,p_ogrenci_id,p_ogretmen_id,p_derslik_id,
        p_baslangic_saati,p_ders_sayisi,r.ders_id
      );
      if not coalesce((v_ders_kontrol->>'uygun')::boolean,false) then
        raise exception 'Gelecek dersler güncellenemedi: % tarihindeki ders yeni programla çakışıyor. Programda hiçbir değişiklik yapılmadı.', v_yeni_tarih;
      end if;

      update public.dersler
      set tarih=v_yeni_tarih,
          ogrenci_id=p_ogrenci_id,
          ogretmen_id=p_ogretmen_id,
          brans_id=p_brans_id,
          derslik_id=p_derslik_id,
          ders_sayisi=p_ders_sayisi,
          ogrenci_birim_ucreti=p_ogrenci_birim_ucreti,
          ogretmen_birim_hakedisi=p_ogretmen_birim_hakedisi,
          ogrenci_toplam_tutar=coalesce(p_ogrenci_birim_ucreti,0)*p_ders_sayisi,
          ogretmen_toplam_hakedis=coalesce(p_ogretmen_birim_hakedisi,0)*p_ders_sayisi,
          baslangic_saati=p_baslangic_saati,
          bitis_saati=v_yeni_bit::time,
          ders_yeri=v_mekan_adi,
          son_degistiren=v_email,
          son_degistirme_zamani=pg_catalog.now()
      where ders_id=r.ders_id;

      v_guncellenen := v_guncellenen + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'basarili',true,
    'program_id',p_program_id,
    'yeni_program',not v_program_var_mi,
    'tekrar_sikligi',v_tekrar,
    'guncellenen_gelecek_ders',v_guncellenen,
    'korunan_gelecek_ders',v_korunan,
    'korunan_istisna',v_istisna_korunan,
    'gecmis_dersler_korundu',true,
    'cakisma_kontrolu',coalesce(v_kontrol,jsonb_build_object('uygun',true))
  );
end;
$function$;

revoke all on function public.sabit_program_kaydet_guvenli_v3(
  text,text,text,text,text,text,time without time zone,numeric,numeric,numeric,
  text,date,date,text,text
) from public, anon;

grant execute on function public.sabit_program_kaydet_guvenli_v3(
  text,text,text,text,text,text,time without time zone,numeric,numeric,numeric,
  text,date,date,text,text
) to authenticated;
