create or replace function public.haftalik_ders_uretim_durumu_v2(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_simdi timestamp without time zone := timezone('Europe/Istanbul', now());
  v_mevcut_hafta date := date_trunc('week', timezone('Europe/Istanbul', now()))::date;
  v_beklenen integer := 0;
  v_mevcut integer := 0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici) <> 1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;

  if p_hafta_baslangici < v_mevcut_hafta then
    return jsonb_build_object('calisti',true,'gecmis_hafta',true,'guncel_hafta',false,'gecis_kilidi',true,'hafta_baslangici',p_hafta_baslangici,'beklenen',0,'mevcut',0,'eksik',0);
  end if;

  with programlar as (
    select p.*,case p.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end as gun_ofset
    from public.sabit_ders_programi p where p.program_durumu='Aktif'
  ), beklenen as (
    select p.program_id,(p_hafta_baslangici+p.gun_ofset)::date as tarih
    from programlar p
    where p.gun_ofset is not null
      and (p.baslangic_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date>=p.baslangic_tarihi)
      and (p.bitis_tarihi is null or (p_hafta_baslangici+p.gun_ofset)::date<=p.bitis_tarihi)
      and private.sabit_program_tarihe_duser_mi(p.tekrar_sikligi,p.baslangic_tarihi,(p_hafta_baslangici+p.gun_ofset)::date)
      and not exists(select 1 from public.sabit_program_istisnalari i where i.program_id=p.program_id and i.orijinal_tarih=(p_hafta_baslangici+p.gun_ofset)::date and i.iptal_mi=false)
      and (
        p_hafta_baslangici>v_mevcut_hafta
        or (p_hafta_baslangici+p.gun_ofset)::date>v_simdi::date
        or ((p_hafta_baslangici+p.gun_ofset)::date=v_simdi::date and p.baslangic_saati is not null and p.baslangic_saati>v_simdi::time)
      )
  )
  select count(*),count(*) filter(where exists(select 1 from public.dersler d where d.program_id=beklenen.program_id and d.tarih=beklenen.tarih))
  into v_beklenen,v_mevcut from beklenen;

  return jsonb_build_object('calisti',v_mevcut=v_beklenen,'gecmis_hafta',false,'guncel_hafta',p_hafta_baslangici=v_mevcut_hafta,'gecis_kilidi',v_mevcut=v_beklenen,'hafta_baslangici',p_hafta_baslangici,'beklenen',v_beklenen,'mevcut',v_mevcut,'eksik',greatest(v_beklenen-v_mevcut,0));
end;
$function$;

create or replace function private.haftalik_dersleri_tamamla_v1(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid:=auth.uid();
  v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Eğitim');
  v_simdi timestamp without time zone:=timezone('Europe/Istanbul',now());
  v_mevcut_hafta date:=date_trunc('week',timezone('Europe/Istanbul',now()))::date;
  v_hafta_sonu date;
  v_aktif integer:=0; v_olusturulan integer:=0; v_zaten integer:=0; v_cakisma integer:=0; v_hatali integer:=0; v_atlanan integer:=0; v_gecmis_atlanan integer:=0;
  v_detay jsonb:='[]'::jsonb;
  r record; v_offset integer; v_tarih date; v_bas timestamp; v_bit timestamp; v_kapasite integer; v_eszamanli integer; v_kisi_cakisma boolean; v_ders_id text; v_mekan_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.'; end if;
  if p_hafta_baslangici<v_mevcut_hafta then raise exception 'Geçmiş haftalar otomatik olarak hazırlanamaz.'; end if;
  v_hafta_sonu:=p_hafta_baslangici+6;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_haftalik_ders_v5:'||p_hafta_baslangici::text));

  for r in select p.* from public.sabit_ders_programi p where p.program_durumu='Aktif' and (p.baslangic_tarihi is null or p.baslangic_tarihi<=v_hafta_sonu) and (p.bitis_tarihi is null or p.bitis_tarihi>=p_hafta_baslangici) order by p.program_id loop
    v_offset:=case r.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end;
    if v_offset is null then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Haftanın günü geçersiz'));continue;end if;
    v_tarih:=p_hafta_baslangici+v_offset;
    if (r.baslangic_tarihi is not null and v_tarih<r.baslangic_tarihi) or (r.bitis_tarihi is not null and v_tarih>r.bitis_tarihi) or not private.sabit_program_tarihe_duser_mi(r.tekrar_sikligi,r.baslangic_tarihi,v_tarih) then continue; end if;
    if p_hafta_baslangici=v_mevcut_hafta and (v_tarih<v_simdi::date or (v_tarih=v_simdi::date and r.baslangic_saati is not null and r.baslangic_saati<=v_simdi::time)) then v_gecmis_atlanan:=v_gecmis_atlanan+1;continue;end if;
    if exists(select 1 from public.sabit_program_istisnalari i where i.program_id=r.program_id and i.orijinal_tarih=v_tarih and i.iptal_mi=false) then v_atlanan:=v_atlanan+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','İstisna','program_id',r.program_id,'tarih',v_tarih,'neden','Bu tarih sabit programdan atlandı veya taşındı'));continue;end if;
    v_aktif:=v_aktif+1;
    if r.ogrenci_id is null or r.ogretmen_id is null or r.brans_id is null or r.derslik_id is null or r.baslangic_saati is null or r.ders_sayisi is null or r.ders_sayisi not in (1,2,3,4) then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Zorunlu ders bilgisi eksik'));continue;end if;
    if not exists(select 1 from public.ogrenciler o where o.ogrenci_id=r.ogrenci_id and coalesce(o.durum,'Aktif')<>'Pasif') or not exists(select 1 from public.ogretmenler o where o.ogretmen_id=r.ogretmen_id and coalesce(o.durum,'Aktif')<>'Pasif') or not exists(select 1 from public.branslar b where b.brans_id=r.brans_id and coalesce(b.aktif,true)) or not exists(select 1 from public.derslikler l where l.derslik_id=r.derslik_id and coalesce(l.aktif,true)) then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Pasif veya bulunamayan referans kaydı'));continue;end if;
    if not private.ogretmen_brans_uygun_mu(r.ogretmen_id,r.brans_id) then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Öğretmen branş eşleşmesi geçersiz'));continue;end if;
    if exists(select 1 from public.dersler d where d.program_id=r.program_id and d.tarih=v_tarih) then v_zaten:=v_zaten+1;continue;end if;
    v_bas:=v_tarih::timestamp+r.baslangic_saati;v_bit:=v_bas+(r.ders_sayisi*interval '1 hour');
    if v_bit::date<>v_tarih then v_hatali:=v_hatali+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Hatalı Program','program_id',r.program_id,'neden','Ders saati gün sınırını aşıyor'));continue;end if;
    select greatest(coalesce(l.kapasite,1),1),l.mekan_adi into v_kapasite,v_mekan_adi from public.derslikler l where l.derslik_id=r.derslik_id and coalesce(l.aktif,true);
    select exists(select 1 from public.dersler d where d.tarih=v_tarih and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati) and (d.ogrenci_id=r.ogrenci_id or d.ogretmen_id=r.ogretmen_id)) into v_kisi_cakisma;
    select count(*) into v_eszamanli from public.dersler d where d.tarih=v_tarih and d.derslik_id=r.derslik_id and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali') and d.baslangic_saati is not null and d.bitis_saati is not null and (v_tarih::timestamp+d.baslangic_saati)<v_bit and v_bas<(v_tarih::timestamp+d.bitis_saati);
    if v_kisi_cakisma or v_eszamanli>=v_kapasite then v_cakisma:=v_cakisma+1;v_detay:=v_detay||jsonb_build_array(jsonb_build_object('tur','Çakışma','program_id',r.program_id,'tarih',v_tarih,'kisi_cakisma',v_kisi_cakisma,'derslik_dolu',v_eszamanli>=v_kapasite));continue;end if;
    loop v_ders_id:=substr(replace(gen_random_uuid()::text,'-',''),1,8);exit when not exists(select 1 from public.dersler d where d.ders_id=v_ders_id);end loop;
    insert into public.dersler(ders_id,program_id,tarih,ogrenci_id,ogretmen_id,brans_id,derslik_id,ders_sayisi,ogrenci_birim_ucreti,ogretmen_birim_hakedisi,ogrenci_toplam_tutar,ogretmen_toplam_hakedis,ders_durumu,baslangic_saati,bitis_saati,ders_yeri,olusturan,olusturulma_zamani) values(v_ders_id,r.program_id,v_tarih,r.ogrenci_id,r.ogretmen_id,r.brans_id,r.derslik_id,r.ders_sayisi,r.ogrenci_birim_ucreti,r.ogretmen_birim_hakedisi,coalesce(r.ogrenci_birim_ucreti,0)*r.ders_sayisi,coalesce(r.ogretmen_birim_hakedisi,0)*r.ders_sayisi,'Planlandı',r.baslangic_saati,v_bit::time,v_mekan_adi,v_email,now());
    v_olusturulan:=v_olusturulan+1;
  end loop;
  if v_cakisma>0 or v_hatali>0 then raise exception 'Haftalık tamamlama yapılmadı: % çakışma, % hatalı program. Hiçbir yeni ders kaydedilmedi; sorunları düzeltip tekrar deneyin.',v_cakisma,v_hatali;end if;
  insert into public.haftalik_ders_uretimleri as h(hafta_baslangici,olusturulan,zaten_mevcut,cakisma,hatali,olusturan) values(p_hafta_baslangici,v_olusturulan,v_zaten,0,0,v_email)
  on conflict(hafta_baslangici) do update set olusturulan=h.olusturulan+excluded.olusturulan,zaten_mevcut=excluded.zaten_mevcut,cakisma=0,hatali=0,olusturan=excluded.olusturan,olusturulma_zamani=now();
  return jsonb_build_object('basarili',true,'hafta_baslangici',p_hafta_baslangici,'aktif_program',v_aktif,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'atlanan',v_atlanan,'gecmis_atlanan',v_gecmis_atlanan,'cakisma',0,'hatali',0,'detay',v_detay);
end;
$function$;

create or replace function public.haftalik_dersleri_olustur_guvenli_v5(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid:=auth.uid();
  v_mevcut_hafta date:=date_trunc('week',timezone('Europe/Istanbul',now()))::date;
  v_hafta date;v_durum jsonb;v_sonuc jsonb;v_detay jsonb:='[]'::jsonb;v_olusturulan integer:=0;v_zaten integer:=0;i integer;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.';end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';end if;
  if p_hafta_baslangici<v_mevcut_hafta then raise exception 'Geçmiş haftalar otomatik olarak hazırlanamaz.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ofis_iki_haftalik_ders_v5:'||p_hafta_baslangici::text));
  for i in 0..1 loop
    v_hafta:=p_hafta_baslangici+(i*7);v_durum:=public.haftalik_ders_uretim_durumu_v2(v_hafta);
    if coalesce((v_durum->>'calisti')::boolean,false) then v_zaten:=v_zaten+coalesce((v_durum->>'mevcut')::integer,0);v_detay:=v_detay||jsonb_build_array(jsonb_build_object('hafta_baslangici',v_hafta,'durum','Hazır','olusturulan',0,'zaten_mevcut',coalesce((v_durum->>'mevcut')::integer,0),'eksik',0));continue;end if;
    v_sonuc:=private.haftalik_dersleri_tamamla_v1(v_hafta);v_olusturulan:=v_olusturulan+coalesce((v_sonuc->>'olusturulan')::integer,0);v_zaten:=v_zaten+coalesce((v_sonuc->>'zaten_mevcut')::integer,0);
    v_durum:=public.haftalik_ders_uretim_durumu_v2(v_hafta);if not coalesce((v_durum->>'calisti')::boolean,false) then raise exception 'Haftalık tamamlama sonrası % haftasında % eksik ders kaldı.',v_hafta,coalesce((v_durum->>'eksik')::integer,0);end if;
    v_detay:=v_detay||jsonb_build_array(jsonb_build_object('hafta_baslangici',v_hafta,'durum','Tamamlandı','olusturulan',coalesce((v_sonuc->>'olusturulan')::integer,0),'zaten_mevcut',coalesce((v_sonuc->>'zaten_mevcut')::integer,0),'gecmis_atlanan',coalesce((v_sonuc->>'gecmis_atlanan')::integer,0),'eksik',0));
  end loop;
  return jsonb_build_object('basarili',true,'baslangic_haftasi',p_hafta_baslangici,'sonraki_hafta',p_hafta_baslangici+7,'olusturulan',v_olusturulan,'zaten_mevcut',v_zaten,'detay',v_detay);
end;
$function$;

create or replace function public.haftalik_program_kontrol_oneri_v2(p_hafta_baslangici date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_simdi timestamp without time zone:=timezone('Europe/Istanbul',now());v_mevcut_hafta date:=date_trunc('week',timezone('Europe/Istanbul',now()))::date;
  r record;v_offset integer;v_tarih date;v_kontrol jsonb;v_room_type text;v_room record;v_room_check jsonb;v_saat_offset integer;v_candidate time;v_time_check jsonb;v_rooms jsonb;v_times jsonb;v_issues jsonb:='[]'::jsonb;v_issue_count integer:=0;v_count integer;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.';end if;
  if p_hafta_baslangici is null or extract(isodow from p_hafta_baslangici)<>1 then raise exception 'Hafta başlangıcı Pazartesi olmalıdır.';end if;
  if p_hafta_baslangici<v_mevcut_hafta then return jsonb_build_object('basarili',true,'uygun',true,'hafta_baslangici',p_hafta_baslangici,'sorun_sayisi',0,'sorunlar','[]'::jsonb,'gecmis_hafta',true);end if;
  for r in select p.*,o.ad_soyad as ogrenci_adi,t.ad_soyad as ogretmen_adi,l.mekan_adi,l.mekan_turu from public.sabit_ders_programi p left join public.ogrenciler o on o.ogrenci_id=p.ogrenci_id left join public.ogretmenler t on t.ogretmen_id=p.ogretmen_id left join public.derslikler l on l.derslik_id=p.derslik_id where p.program_durumu='Aktif' order by p.program_id loop
    v_offset:=case r.haftanin_gunu when 'Pazartesi' then 0 when 'Salı' then 1 when 'Çarşamba' then 2 when 'Perşembe' then 3 when 'Cuma' then 4 when 'Cumartesi' then 5 when 'Pazar' then 6 else null end;if v_offset is null then continue;end if;
    v_tarih:=p_hafta_baslangici+v_offset;if not private.sabit_program_tarih_uygun_mu(r.program_id,v_tarih) then continue;end if;
    if p_hafta_baslangici=v_mevcut_hafta and (v_tarih<v_simdi::date or (v_tarih=v_simdi::date and r.baslangic_saati is not null and r.baslangic_saati<=v_simdi::time)) then continue;end if;
    if exists(select 1 from public.sabit_program_istisnalari i where i.program_id=r.program_id and i.orijinal_tarih=v_tarih and i.iptal_mi=false) or exists(select 1 from public.dersler d where d.program_id=r.program_id and d.tarih=v_tarih) then continue;end if;
    v_kontrol:=private.bs_program_tarih_kontrol_v1(r.program_id,v_tarih,r.baslangic_saati,r.derslik_id);if coalesce((v_kontrol->>'uygun')::boolean,false) then continue;end if;
    v_rooms:='[]'::jsonb;v_times:='[]'::jsonb;v_count:=0;v_room_type:=r.mekan_turu;
    for v_room in select d.derslik_id,d.mekan_adi,d.mekan_turu from public.derslikler d where coalesce(d.aktif,true) and d.derslik_id<>r.derslik_id and case when v_room_type='Online' then d.mekan_turu='Online' when v_room_type='Ev' then d.mekan_turu='Ev' else coalesce(d.mekan_turu,'') not in ('Online','Ev') end order by case when d.mekan_turu=v_room_type then 0 else 1 end,d.mekan_adi loop
      v_room_check:=private.bs_program_tarih_kontrol_v1(r.program_id,v_tarih,r.baslangic_saati,v_room.derslik_id);if coalesce((v_room_check->>'uygun')::boolean,false) then v_rooms:=v_rooms||jsonb_build_array(jsonb_build_object('derslik_id',v_room.derslik_id,'derslik',v_room.mekan_adi,'saat',to_char(r.baslangic_saati,'HH24:MI')));v_count:=v_count+1;exit when v_count>=3;end if;
    end loop;
    v_count:=0;
    foreach v_saat_offset in array array[-1,1,-2,2,-3,3,-4,4,-5,5,-6,6] loop
      v_candidate:=r.baslangic_saati+(v_saat_offset*interval '30 minutes');if (date '2000-01-01'+v_candidate+(r.ders_sayisi*interval '1 hour'))::date<>date '2000-01-01' then continue;end if;if p_hafta_baslangici=v_mevcut_hafta and v_tarih=v_simdi::date and v_candidate<=v_simdi::time then continue;end if;
      v_time_check:=private.bs_program_tarih_kontrol_v1(r.program_id,v_tarih,v_candidate,r.derslik_id);if coalesce((v_time_check->>'uygun')::boolean,false) then v_times:=v_times||jsonb_build_array(jsonb_build_object('saat',to_char(v_candidate,'HH24:MI'),'derslik_id',r.derslik_id,'derslik',r.mekan_adi));v_count:=v_count+1;else
        for v_room in select d.derslik_id,d.mekan_adi,d.mekan_turu from public.derslikler d where coalesce(d.aktif,true) and d.derslik_id<>r.derslik_id and case when v_room_type='Online' then d.mekan_turu='Online' when v_room_type='Ev' then d.mekan_turu='Ev' else coalesce(d.mekan_turu,'') not in ('Online','Ev') end order by case when d.mekan_turu=v_room_type then 0 else 1 end,d.mekan_adi loop
          v_time_check:=private.bs_program_tarih_kontrol_v1(r.program_id,v_tarih,v_candidate,v_room.derslik_id);if coalesce((v_time_check->>'uygun')::boolean,false) then v_times:=v_times||jsonb_build_array(jsonb_build_object('saat',to_char(v_candidate,'HH24:MI'),'derslik_id',v_room.derslik_id,'derslik',v_room.mekan_adi));v_count:=v_count+1;exit;end if;
        end loop;
      end if;exit when v_count>=4;
    end loop;
    v_issue_count:=v_issue_count+1;v_issues:=v_issues||jsonb_build_array(jsonb_build_object('program_id',r.program_id,'tarih',v_tarih,'ogrenci',coalesce(r.ogrenci_adi,'—'),'ogretmen',coalesce(r.ogretmen_adi,'—'),'saat',to_char(r.baslangic_saati,'HH24:MI'),'derslik_id',r.derslik_id,'derslik',coalesce(r.mekan_adi,'—'),'ogrenci_cakisma',coalesce((v_kontrol->>'ogrenci_cakisma')::boolean,false),'ogretmen_cakisma',coalesce((v_kontrol->>'ogretmen_cakisma')::boolean,false),'derslik_dolu',coalesce((v_kontrol->>'derslik_dolu')::boolean,false),'onerilen_derslikler',v_rooms,'onerilen_saatler',v_times));
  end loop;
  return jsonb_build_object('basarili',true,'uygun',v_issue_count=0,'hafta_baslangici',p_hafta_baslangici,'sorun_sayisi',v_issue_count,'sorunlar',v_issues,'gecmis_hafta',false);
end;
$function$;

grant execute on function public.haftalik_ders_uretim_durumu_v2(date) to authenticated;
grant execute on function public.haftalik_dersleri_olustur_guvenli_v5(date) to authenticated;
grant execute on function public.haftalik_program_kontrol_oneri_v2(date) to authenticated;
revoke all on function private.haftalik_dersleri_tamamla_v1(date) from public;
