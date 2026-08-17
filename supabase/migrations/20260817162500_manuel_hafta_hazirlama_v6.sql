-- BS Eğitim Yönetimi
-- Manuel hafta hazırlama: yalnız seçilen hafta işlenir.
-- Sabit program değişiklikleri gelecek derslere otomatik yazılmaz;
-- kullanıcı Haftayı Hazırla dediğinde seçili haftadaki eksik/değişmiş Planlandı dersler uzlaştırılır.

create or replace function public.sabit_program_kaydet_guvenli_v4(
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
  p_tekrar_sikligi text default 'Her Hafta',
  p_baslangic_tarihi date default null,
  p_bitis_tarihi date default null,
  p_aciklama text default null,
  p_program_durumu text default 'Aktif'
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_bas timestamp := date '2000-01-01' + p_baslangic_saati;
  v_bit timestamp;
  v_tekrar text := coalesce(nullif(trim(p_tekrar_sikligi),''),'Her Hafta');
  v_kontrol jsonb;
  v_program_var_mi boolean := false;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_program_id),'') is null then raise exception 'Program kimliği eksik.'; end if;
  if p_baslangic_saati is null then raise exception 'Başlangıç saati zorunludur.'; end if;
  if p_haftanin_gunu not in ('Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar') then raise exception 'Geçersiz gün.'; end if;
  if p_ders_sayisi not in (1,2,3,4) then raise exception 'Ders sayısı 1–4 arasında olmalı.'; end if;
  v_bit := v_bas + (p_ders_sayisi * interval '1 hour');
  if v_bit::date <> date '2000-01-01' then raise exception 'Ders saati gün sınırını aşıyor.'; end if;
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
  if not exists(select 1 from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true)) then raise exception 'Aktif derslik bulunamadı.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_sabit_program_kaydet_v4'));
  select exists(select 1 from public.sabit_ders_programi where program_id=p_program_id) into v_program_var_mi;

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

  return jsonb_build_object(
    'basarili',true,
    'program_id',p_program_id,
    'yeni_program',not v_program_var_mi,
    'tekrar_sikligi',v_tekrar,
    'guncellenen_gelecek_ders',0,
    'korunan_gelecek_ders',0,
    'korunan_istisna',0,
    'gecmis_dersler_korundu',true,
    'manuel_hafta_hazirlama',true,
    'cakisma_kontrolu',coalesce(v_kontrol,jsonb_build_object('uygun',true))
  );
end;
$$;

create or replace function public.haftalik_ders_uretim_durumu_v3(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_simdi timestamp without time zone := pg_catalog.timezone('Europe/Istanbul',pg_catalog.now());
  v_mevcut_hafta date := pg_catalog.date_trunc('week',pg_catalog.timezone('Europe/Istanbul',pg_catalog.now()))::date;
  v_tarih date;
  v_offset integer;
  v_beklenen integer := 0;
  v_hazir integer := 0;
  v_eksik integer := 0;
  v_degismis integer := 0;
  v_korunan integer := 0;
  v_fazla integer := 0;
  v_adet integer;
  v_ders public.dersler%rowtype;
  r record;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then
    raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';
  end if;
  if p_hafta_baslangici < v_mevcut_hafta then
    return jsonb_build_object('calisti',true,'gecmis_hafta',true,'guncel_hafta',false,'gecis_kilidi',true,'hafta_baslangici',p_hafta_baslangici,'beklenen',0,'mevcut',0,'hazir',0,'eksik',0,'degismis',0,'korunan',0,'fazla',0);
  end if;

  for r in
    select p.* from public.sabit_ders_programi p
    where p.program_durumu='Aktif'
      and (p.baslangic_tarihi is null or p.baslangic_tarihi<=p_hafta_baslangici+6)
      and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici)
    order by p.program_id
  loop
    v_offset := case r.haftanin_gunu
      when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2
      when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6
      else null end;
    if v_offset is null then continue; end if;
    v_tarih := p_hafta_baslangici+v_offset;
    if not private.sabit_program_tarih_uygun_mu(r.program_id,v_tarih) then continue; end if;
    if p_hafta_baslangici=v_mevcut_hafta
       and (v_tarih<v_simdi::date or (v_tarih=v_simdi::date and r.baslangic_saati<=v_simdi::time)) then
      continue;
    end if;
    if exists(select 1 from public.sabit_program_istisnalari i where i.program_id=r.program_id and i.orijinal_tarih=v_tarih and i.iptal_mi=false) then
      continue;
    end if;

    v_beklenen := v_beklenen+1;

    if exists(
      select 1 from public.dersler d
      where d.program_id=r.program_id
        and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
        and (
          coalesce(d.ders_durumu,'Planlandı')<>'Planlandı'
          or (p_hafta_baslangici=v_mevcut_hafta and d.tarih::timestamp+coalesce(d.baslangic_saati,'00:00'::time)<=v_simdi)
        )
    ) then
      v_korunan := v_korunan+1;
      continue;
    end if;

    select count(*) into v_adet
    from public.dersler d
    where d.program_id=r.program_id
      and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
      and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
      and not exists(
        select 1 from public.sabit_program_istisnalari i
        where i.program_id=r.program_id and i.iptal_mi=false
          and (i.orijinal_tarih=d.tarih or i.orijinal_ders_id=d.ders_id or i.yeni_ders_id=d.ders_id)
      );

    if v_adet>1 then
      v_fazla := v_fazla+(v_adet-1);
      v_degismis := v_degismis+1;
      continue;
    end if;
    if v_adet=0 then
      v_eksik := v_eksik+1;
      continue;
    end if;

    select d.* into v_ders
    from public.dersler d
    where d.program_id=r.program_id
      and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
      and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
      and not exists(
        select 1 from public.sabit_program_istisnalari i
        where i.program_id=r.program_id and i.iptal_mi=false
          and (i.orijinal_tarih=d.tarih or i.orijinal_ders_id=d.ders_id or i.yeni_ders_id=d.ders_id)
      )
    order by d.tarih,d.baslangic_saati,d.ders_id
    limit 1;

    if v_ders.tarih=v_tarih
       and v_ders.ogrenci_id is not distinct from r.ogrenci_id
       and v_ders.ogretmen_id is not distinct from r.ogretmen_id
       and v_ders.brans_id is not distinct from r.brans_id
       and v_ders.derslik_id is not distinct from r.derslik_id
       and v_ders.baslangic_saati is not distinct from r.baslangic_saati
       and v_ders.ders_sayisi is not distinct from r.ders_sayisi
       and coalesce(v_ders.ogrenci_birim_ucreti,0)=coalesce(r.ogrenci_birim_ucreti,0)
       and coalesce(v_ders.ogretmen_birim_hakedisi,0)=coalesce(r.ogretmen_birim_hakedisi,0) then
      v_hazir := v_hazir+1;
    else
      v_degismis := v_degismis+1;
    end if;
  end loop;

  return jsonb_build_object(
    'calisti',v_eksik=0 and v_degismis=0 and v_fazla=0,
    'gecmis_hafta',false,
    'guncel_hafta',p_hafta_baslangici=v_mevcut_hafta,
    'gecis_kilidi',v_eksik=0 and v_degismis=0 and v_fazla=0,
    'hafta_baslangici',p_hafta_baslangici,
    'beklenen',v_beklenen,
    'mevcut',v_hazir+v_korunan,
    'hazir',v_hazir,
    'eksik',v_eksik,
    'degismis',v_degismis,
    'korunan',v_korunan,
    'fazla',v_fazla
  );
end;
$$;

create or replace function public.haftalik_dersleri_hazirla_guvenli_v6(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email',v_uid::text,'BS Eğitim');
  v_simdi timestamp without time zone := pg_catalog.timezone('Europe/Istanbul',pg_catalog.now());
  v_mevcut_hafta date := pg_catalog.date_trunc('week',pg_catalog.timezone('Europe/Istanbul',pg_catalog.now()))::date;
  v_tarih date;
  v_offset integer;
  v_bit timestamp;
  v_mekan_adi text;
  v_ders_id text;
  v_adet integer;
  v_olusturulan integer := 0;
  v_guncellenen integer := 0;
  v_zaten integer := 0;
  v_korunan integer := 0;
  v_istisna integer := 0;
  v_gecmis integer := 0;
  v_kontrol jsonb;
  v_durum jsonb;
  v_ders public.dersler%rowtype;
  r record;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then
    raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';
  end if;
  if p_hafta_baslangici<v_mevcut_hafta then
    raise exception 'Geçmiş haftalar hazırlanamaz.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_manuel_hafta_v6:'||p_hafta_baslangici::text));

  for r in
    select p.* from public.sabit_ders_programi p
    where p.program_durumu='Aktif'
      and (p.baslangic_tarihi is null or p.baslangic_tarihi<=p_hafta_baslangici+6)
      and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici)
    order by p.program_id
  loop
    v_offset := case r.haftanin_gunu
      when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2
      when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6
      else null end;
    if v_offset is null then raise exception 'Sabit programda geçersiz gün var: %',r.program_id; end if;
    v_tarih := p_hafta_baslangici+v_offset;
    if not private.sabit_program_tarih_uygun_mu(r.program_id,v_tarih) then continue; end if;

    if p_hafta_baslangici=v_mevcut_hafta
       and (v_tarih<v_simdi::date or (v_tarih=v_simdi::date and r.baslangic_saati<=v_simdi::time)) then
      v_gecmis := v_gecmis+1;
      continue;
    end if;

    if exists(select 1 from public.sabit_program_istisnalari i where i.program_id=r.program_id and i.orijinal_tarih=v_tarih and i.iptal_mi=false) then
      v_istisna := v_istisna+1;
      continue;
    end if;

    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null
       or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then
      raise exception 'Sabit programda zorunlu ders bilgisi eksik: %',r.program_id;
    end if;
    if not exists(select 1 from public.ogrenciler o where o.ogrenci_id=r.ogrenci_id and coalesce(o.durum,'Aktif')<>'Pasif') then raise exception 'Sabit program öğrencisi aktif değil: %',r.program_id; end if;
    if not exists(select 1 from public.ogretmenler o where o.ogretmen_id=r.ogretmen_id and coalesce(o.durum,'Aktif')<>'Pasif') then raise exception 'Sabit program öğretmeni aktif değil: %',r.program_id; end if;
    if not exists(select 1 from public.branslar b where b.brans_id=r.brans_id and coalesce(b.aktif,true)) then raise exception 'Sabit program branşı aktif değil: %',r.program_id; end if;
    if not private.ogretmen_brans_uygun_mu(r.ogretmen_id,r.brans_id) then raise exception 'Sabit program öğretmen-branş eşleşmesi geçersiz: %',r.program_id; end if;
    select l.mekan_adi into v_mekan_adi from public.derslikler l where l.derslik_id=r.derslik_id and coalesce(l.aktif,true);
    if v_mekan_adi is null then raise exception 'Sabit program dersliği aktif değil: %',r.program_id; end if;

    if exists(
      select 1 from public.dersler d
      where d.program_id=r.program_id
        and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
        and (
          coalesce(d.ders_durumu,'Planlandı')<>'Planlandı'
          or (p_hafta_baslangici=v_mevcut_hafta and d.tarih::timestamp+coalesce(d.baslangic_saati,'00:00'::time)<=v_simdi)
        )
    ) then
      v_korunan := v_korunan+1;
      continue;
    end if;

    select count(*) into v_adet
    from public.dersler d
    where d.program_id=r.program_id
      and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
      and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
      and not exists(
        select 1 from public.sabit_program_istisnalari i
        where i.program_id=r.program_id and i.iptal_mi=false
          and (i.orijinal_tarih=d.tarih or i.orijinal_ders_id=d.ders_id or i.yeni_ders_id=d.ders_id)
      );
    if v_adet>1 then
      raise exception 'Aynı sabit program için bu haftada birden fazla Planlandı ders var (%). Önce bu kayıtları kontrol edin.',r.program_id;
    end if;

    v_bit := v_tarih::timestamp+r.baslangic_saati+(r.ders_sayisi*interval '1 hour');
    if v_bit::date<>v_tarih then raise exception 'Ders saati gün sınırını aşıyor: %',r.program_id; end if;

    if v_adet=1 then
      select d.* into v_ders
      from public.dersler d
      where d.program_id=r.program_id
        and pg_catalog.date_trunc('week',d.tarih::timestamp)::date=p_hafta_baslangici
        and coalesce(d.ders_durumu,'Planlandı')='Planlandı'
        and not exists(
          select 1 from public.sabit_program_istisnalari i
          where i.program_id=r.program_id and i.iptal_mi=false
            and (i.orijinal_tarih=d.tarih or i.orijinal_ders_id=d.ders_id or i.yeni_ders_id=d.ders_id)
        )
      order by d.tarih,d.baslangic_saati,d.ders_id
      limit 1
      for update;

      if v_ders.tarih=v_tarih
         and v_ders.ogrenci_id is not distinct from r.ogrenci_id
         and v_ders.ogretmen_id is not distinct from r.ogretmen_id
         and v_ders.brans_id is not distinct from r.brans_id
         and v_ders.derslik_id is not distinct from r.derslik_id
         and v_ders.baslangic_saati is not distinct from r.baslangic_saati
         and v_ders.ders_sayisi is not distinct from r.ders_sayisi
         and coalesce(v_ders.ogrenci_birim_ucreti,0)=coalesce(r.ogrenci_birim_ucreti,0)
         and coalesce(v_ders.ogretmen_birim_hakedisi,0)=coalesce(r.ogretmen_birim_hakedisi,0) then
        v_zaten := v_zaten+1;
        continue;
      end if;

      v_kontrol := public.ders_cakisma_kontrol_v1(v_tarih,r.ogrenci_id,r.ogretmen_id,r.derslik_id,r.baslangic_saati,r.ders_sayisi,v_ders.ders_id);
      if not coalesce((v_kontrol->>'uygun')::boolean,false) then
        raise exception 'Hafta hazırlanamadı: % tarihindeki değişmiş ders yeni gün/saat/derslikte çakışıyor.',v_tarih;
      end if;

      update public.dersler set
        tarih=v_tarih,
        ogrenci_id=r.ogrenci_id,
        ogretmen_id=r.ogretmen_id,
        brans_id=r.brans_id,
        derslik_id=r.derslik_id,
        ders_sayisi=r.ders_sayisi,
        ogrenci_birim_ucreti=r.ogrenci_birim_ucreti,
        ogretmen_birim_hakedisi=r.ogretmen_birim_hakedisi,
        ogrenci_toplam_tutar=coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,
        ogretmen_toplam_hakedis=coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,
        baslangic_saati=r.baslangic_saati,
        bitis_saati=v_bit::time,
        ders_yeri=v_mekan_adi,
        son_degistiren=v_email,
        son_degistirme_zamani=pg_catalog.now()
      where ders_id=v_ders.ders_id;
      v_guncellenen := v_guncellenen+1;
      continue;
    end if;

    v_kontrol := public.ders_cakisma_kontrol_v1(v_tarih,r.ogrenci_id,r.ogretmen_id,r.derslik_id,r.baslangic_saati,r.ders_sayisi,null);
    if not coalesce((v_kontrol->>'uygun')::boolean,false) then
      raise exception 'Hafta hazırlanamadı: % tarihindeki yeni ders çakışıyor.',v_tarih;
    end if;

    loop
      v_ders_id := substr(replace(gen_random_uuid()::text,'-',''),1,8);
      exit when not exists(select 1 from public.dersler d where d.ders_id=v_ders_id);
    end loop;
    insert into public.dersler(
      ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,
      ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,
      ders_durumu,baslangic_saati,bitis_saati,ders_yeri,olusturan,olusturulma_zamani
    ) values(
      v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,
      r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,
      coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_mekan_adi,v_email,pg_catalog.now()
    );
    v_olusturulan := v_olusturulan+1;
  end loop;

  v_durum := public.haftalik_ders_uretim_durumu_v3(p_hafta_baslangici);
  if not coalesce((v_durum->>'calisti')::boolean,false) then
    raise exception 'Hafta hazırlama tamamlanamadı: % eksik, % değişmiş kayıt kaldı.',coalesce((v_durum->>'eksik')::integer,0),coalesce((v_durum->>'degismis')::integer,0);
  end if;

  return jsonb_build_object(
    'basarili',true,
    'hafta_baslangici',p_hafta_baslangici,
    'olusturulan',v_olusturulan,
    'guncellenen',v_guncellenen,
    'zaten_mevcut',v_zaten,
    'korunan',v_korunan,
    'istisna',v_istisna,
    'gecmis_atlanan',v_gecmis,
    'durum',v_durum
  );
end;
$$;
