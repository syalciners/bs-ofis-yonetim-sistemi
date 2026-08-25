-- BS Eğitim SaaS V1 — Yönetim, kurum ve temel tanım RPC paketi
-- Canlı çalışan gövdelerden Core dışı bağımlılık taraması sonrası alınmıştır.

create or replace function public.brans_kaydet_guvenli_v1(p_brans_id text, p_brans_adi text, p_aktif boolean)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_yeni boolean; v_aktif boolean := coalesce(p_aktif,true);
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_brans_id),'') is null then raise exception 'Branş kimliği eksik.'; end if;
  if nullif(trim(p_brans_adi),'') is null then raise exception 'Branş adı boş bırakılamaz.'; end if;
  if exists(select 1 from public.branslar where lower(trim(brans_adi))=lower(trim(p_brans_adi)) and brans_id<>p_brans_id) then raise exception 'Aynı adla başka bir branş zaten var.'; end if;
  if v_aktif=false and exists(select 1 from public.sabit_ders_programi where brans_id=p_brans_id and coalesce(aktif,true)=true and coalesce(program_durumu,'Aktif')<>'Pasif') then raise exception 'Aktif sabit programlarda kullanılan branş pasifleştirilemez.'; end if;
  v_yeni:=not exists(select 1 from public.branslar where brans_id=p_brans_id);
  if v_yeni then
    insert into public.branslar(brans_id,brans_adi,aktif,kaynakta_var) values(trim(p_brans_id),trim(p_brans_adi),v_aktif,true);
  else
    update public.branslar set brans_adi=trim(p_brans_adi),aktif=v_aktif where brans_id=p_brans_id;
  end if;
  return jsonb_build_object('basarili',true,'brans_id',p_brans_id,'yeni',v_yeni,'aktif',v_aktif);
end;
$function$;

create or replace function public.derslik_kaydet_guvenli_v1(p_derslik_id text,p_mekan_adi text,p_mekan_turu text,p_kapasite integer,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_yeni boolean; v_aktif boolean:=coalesce(p_aktif,true); v_kapasite integer:=coalesce(p_kapasite,1);
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_derslik_id),'') is null then raise exception 'Derslik kimliği eksik.'; end if;
  if nullif(trim(p_mekan_adi),'') is null then raise exception 'Derslik adı boş bırakılamaz.'; end if;
  if v_kapasite<1 then raise exception 'Derslik kapasitesi en az 1 olmalıdır.'; end if;
  if exists(select 1 from public.derslikler where lower(trim(mekan_adi))=lower(trim(p_mekan_adi)) and derslik_id<>p_derslik_id) then raise exception 'Aynı adla başka bir derslik zaten var.'; end if;
  if v_aktif=false and exists(select 1 from public.sabit_ders_programi where derslik_id=p_derslik_id and coalesce(aktif,true)=true and coalesce(program_durumu,'Aktif')<>'Pasif') then raise exception 'Aktif sabit programlarda kullanılan derslik pasifleştirilemez.'; end if;
  v_yeni:=not exists(select 1 from public.derslikler where derslik_id=p_derslik_id);
  if v_yeni then
    insert into public.derslikler(derslik_id,mekan_adi,mekan_turu,kapasite,aktif,aciklama,kaynakta_var)
    values(trim(p_derslik_id),trim(p_mekan_adi),nullif(trim(coalesce(p_mekan_turu,'')),''),v_kapasite,v_aktif,nullif(trim(coalesce(p_aciklama,'')),''),true);
  else
    update public.derslikler set mekan_adi=trim(p_mekan_adi),mekan_turu=nullif(trim(coalesce(p_mekan_turu,'')),''),kapasite=v_kapasite,aktif=v_aktif,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where derslik_id=p_derslik_id;
  end if;
  return jsonb_build_object('basarili',true,'derslik_id',p_derslik_id,'yeni',v_yeni,'aktif',v_aktif);
end;
$function$;

create or replace function public.drive_yukleme_yetkili_mi_v1()
returns boolean language sql security definer set search_path to '' as $function$
  select auth.uid() is not null and private.bs_ofis_yonetici_mi();
$function$;

create or replace function public.gider_kategorisi_kaydet_guvenli_v1(p_kategori_id text,p_kategori_adi text,p_grup text,p_sira_no integer,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_yeni boolean; v_aktif boolean:=coalesce(p_aktif,true); v_diger_aktif integer;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_kategori_id),'') is null then raise exception 'Gider kategorisi kimliği eksik.'; end if;
  if nullif(trim(p_kategori_adi),'') is null then raise exception 'Gider kategorisi adı boş bırakılamaz.'; end if;
  if p_sira_no is not null and p_sira_no<1 then raise exception 'Sıra numarası en az 1 olmalıdır.'; end if;
  if exists(select 1 from public.gider_kategorileri where lower(trim(kategori_adi))=lower(trim(p_kategori_adi)) and kategori_id<>p_kategori_id) then raise exception 'Aynı adla başka bir gider kategorisi zaten var.'; end if;
  v_yeni:=not exists(select 1 from public.gider_kategorileri where kategori_id=p_kategori_id);
  if not v_yeni and v_aktif=false then
    select count(*) into v_diger_aktif from public.gider_kategorileri where kategori_id<>p_kategori_id and aktif=true;
    if v_diger_aktif<1 then raise exception 'En az bir aktif gider kategorisi bulunmalıdır.'; end if;
  end if;
  if v_yeni then
    insert into public.gider_kategorileri(kategori_id,kategori_adi,grup,aktif,sira_no,aciklama,olusturan,olusturulma_zamani)
    values(trim(p_kategori_id),trim(p_kategori_adi),nullif(trim(coalesce(p_grup,'')),''),v_aktif,p_sira_no,nullif(trim(coalesce(p_aciklama,'')),''),auth.uid()::text,now());
  else
    update public.gider_kategorileri set kategori_adi=trim(p_kategori_adi),grup=nullif(trim(coalesce(p_grup,'')),''),aktif=v_aktif,sira_no=p_sira_no,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where kategori_id=p_kategori_id;
  end if;
  return jsonb_build_object('basarili',true,'kategori_id',p_kategori_id,'yeni',v_yeni,'aktif',v_aktif);
end;
$function$;

create or replace function public.kasa_hesabi_kaydet_guvenli_v1(p_hesap_id text,p_hesap_adi text,p_hesap_turu text,p_banka_adi text,p_iban text,p_acilis_bakiyesi numeric,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_yeni boolean; v_aktif boolean:=coalesce(p_aktif,true); v_mevcut_acilis numeric; v_yeni_acilis numeric; v_hareket_var boolean:=false; v_diger_aktif integer;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_hesap_id),'') is null then raise exception 'Hesap kimliği eksik.'; end if;
  if nullif(trim(p_hesap_adi),'') is null then raise exception 'Hesap adı boş bırakılamaz.'; end if;
  if exists(select 1 from public.kasa_hesaplari where lower(trim(hesap_adi))=lower(trim(p_hesap_adi)) and hesap_id<>p_hesap_id) then raise exception 'Aynı adla başka bir kasa veya banka hesabı zaten var.'; end if;
  select acilis_bakiyesi into v_mevcut_acilis from public.kasa_hesaplari where hesap_id=p_hesap_id;
  v_yeni:=not found;
  if v_yeni then v_yeni_acilis:=coalesce(p_acilis_bakiyesi,0); else
    v_yeni_acilis:=coalesce(p_acilis_bakiyesi,v_mevcut_acilis,0);
    select exists(select 1 from public.kasa_hareketleri where hesap_id=p_hesap_id) into v_hareket_var;
    if v_hareket_var and v_yeni_acilis is distinct from coalesce(v_mevcut_acilis,0) then raise exception 'Kasa hareketi bulunan hesabın açılış bakiyesi değiştirilemez.'; end if;
  end if;
  if not v_yeni and v_aktif=false then
    select count(*) into v_diger_aktif from public.kasa_hesaplari where hesap_id<>p_hesap_id and aktif=true;
    if v_diger_aktif<1 then raise exception 'En az bir aktif kasa veya banka hesabı bulunmalıdır.'; end if;
  end if;
  if v_yeni then
    insert into public.kasa_hesaplari(hesap_id,hesap_adi,hesap_turu,banka_adi,iban,acilis_bakiyesi,aktif,aciklama,olusturan,olusturulma_zamani,kaynakta_var)
    values(trim(p_hesap_id),trim(p_hesap_adi),nullif(trim(coalesce(p_hesap_turu,'')),''),nullif(trim(coalesce(p_banka_adi,'')),''),nullif(trim(coalesce(p_iban,'')),''),v_yeni_acilis,v_aktif,nullif(trim(coalesce(p_aciklama,'')),''),auth.uid()::text,now(),true);
  else
    update public.kasa_hesaplari set hesap_adi=trim(p_hesap_adi),hesap_turu=nullif(trim(coalesce(p_hesap_turu,'')),''),banka_adi=nullif(trim(coalesce(p_banka_adi,'')),''),iban=nullif(trim(coalesce(p_iban,'')),''),acilis_bakiyesi=v_yeni_acilis,aktif=v_aktif,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where hesap_id=p_hesap_id;
  end if;
  return jsonb_build_object('basarili',true,'hesap_id',p_hesap_id,'yeni',v_yeni,'aktif',v_aktif,'acilis_bakiyesi_kilitli',(not v_yeni and v_hareket_var));
end;
$function$;

create or replace function public.kullanici_kendi_profilini_guncelle_guvenli_v1(p_ad_soyad text,p_telefon text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Oturum bulunamadı.'; end if;
  if nullif(trim(p_ad_soyad),'') is null then raise exception 'Ad Soyad boş bırakılamaz.'; end if;
  update public.kullanici_profilleri set ad_soyad=trim(p_ad_soyad),telefon=nullif(trim(coalesce(p_telefon,'')),''),guncellenme_zamani=now() where auth_user_id=v_uid;
  if not found then raise exception 'Kullanıcı profili bulunamadı.'; end if;
  return jsonb_build_object('basarili',true,'auth_user_id',v_uid);
end;
$function$;

create or replace function public.kullanici_profili_guncelle_guvenli_v2(p_auth_user_id uuid,p_ad_soyad text,p_telefon text,p_aktif boolean)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_hedef_rol text; v_hedef_aktif boolean; v_yeni_aktif boolean; v_aktif_yonetici integer;
begin
  if v_uid is null then raise exception 'Oturum bulunamadı.'; end if;
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_auth_user_id is null then raise exception 'Kullanıcı kimliği eksik.'; end if;
  if nullif(trim(p_ad_soyad),'') is null then raise exception 'Ad Soyad boş bırakılamaz.'; end if;
  select rol,aktif into v_hedef_rol,v_hedef_aktif from public.kullanici_profilleri where auth_user_id=p_auth_user_id;
  if not found then raise exception 'Kullanıcı profili bulunamadı.'; end if;
  v_yeni_aktif:=coalesce(p_aktif,v_hedef_aktif);
  if p_auth_user_id=v_uid and v_yeni_aktif=false then raise exception 'Oturum açmış kendi kullanıcı hesabınızı pasifleştiremezsiniz.'; end if;
  if v_hedef_rol='Yönetici' and v_hedef_aktif=true and v_yeni_aktif=false then
    select count(*) into v_aktif_yonetici from public.kullanici_profilleri where rol='Yönetici' and aktif=true;
    if v_aktif_yonetici<=1 then raise exception 'Son aktif yönetici pasifleştirilemez.'; end if;
  end if;
  update public.kullanici_profilleri set ad_soyad=trim(p_ad_soyad),telefon=nullif(trim(coalesce(p_telefon,'')),''),aktif=v_yeni_aktif,guncellenme_zamani=now() where auth_user_id=p_auth_user_id;
  return jsonb_build_object('basarili',true,'auth_user_id',p_auth_user_id,'aktif',v_yeni_aktif);
end;
$function$;

create or replace function public.kurum_ayarlari_guncelle_guvenli_v1(p_kurum_adi text,p_marka_adi text,p_telefon text,p_email text,p_adres text,p_logo_url text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_kurum_adi),'') is null then raise exception 'Kurum adı boş bırakılamaz.'; end if;
  if nullif(trim(p_marka_adi),'') is null then raise exception 'Marka adı boş bırakılamaz.'; end if;
  update public.kurum_ayarlari set kurum_adi=trim(p_kurum_adi),marka_adi=trim(p_marka_adi),telefon=nullif(trim(coalesce(p_telefon,'')),''),email=nullif(trim(coalesce(p_email,'')),''),adres=nullif(trim(coalesce(p_adres,'')),''),logo_url=coalesce(nullif(trim(coalesce(p_logo_url,'')),''),logo_url),guncellenme_zamani=now(),guncelleyen=auth.uid() where kurum_id='ANA';
  return jsonb_build_object('basarili',true,'kurum_id','ANA');
end;
$function$;

create or replace function public.kurum_public_bilgisi_v1()
returns jsonb language sql stable security definer set search_path to '' as $function$
  select jsonb_build_object('kurum_id',kurum_id,'kurum_adi',kurum_adi,'marka_adi',marka_adi,'logo_url',logo_url) from public.kurum_ayarlari where kurum_id='ANA';
$function$;

create or replace function public.ogrenci_ekle_guvenli_v1(p_ogrenci_id text,p_ad_soyad text,p_veli_adi text default null::text,p_veli_telefon text default null::text,p_ogrenci_telefon text default null::text,p_email text default null::text,p_kayit_tarihi date default null::date,p_notlar text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_olusturan text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim'); v_mevcut public.ogrenciler%rowtype;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_ogrenci_id),'') is null then raise exception 'Öğrenci kimliği eksik.'; end if;
  if nullif(trim(p_ad_soyad),'') is null then raise exception 'Öğrenci adı zorunludur.'; end if;
  select * into v_mevcut from public.ogrenciler where ogrenci_id=p_ogrenci_id;
  if v_mevcut.ogrenci_id is not null then
    if lower(trim(v_mevcut.ad_soyad))=lower(trim(p_ad_soyad)) then return jsonb_build_object('basarili',true,'tekrar',true,'ogrenci_id',p_ogrenci_id); end if;
    raise exception 'Aynı öğrenci kimliği farklı bir kayıtta kullanılıyor.';
  end if;
  insert into public.ogrenciler(ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar)
  values(p_ogrenci_id,trim(p_ad_soyad),nullif(trim(coalesce(p_veli_adi,'')),''),nullif(trim(coalesce(p_veli_telefon,'')),''),nullif(trim(coalesce(p_ogrenci_telefon,'')),''),nullif(trim(coalesce(p_email,'')),''),coalesce(p_kayit_tarihi,current_date),'Aktif',nullif(trim(coalesce(p_notlar,'')),''));
  return jsonb_build_object('basarili',true,'tekrar',false,'ogrenci_id',p_ogrenci_id,'olusturan',v_olusturan);
end;
$function$;

create or replace function public.ogrenci_kaydet_guvenli_v2(p_ogrenci_id text,p_ad_soyad text,p_veli_adi text default null::text,p_veli_telefon text default null::text,p_ogrenci_telefon text default null::text,p_email text default null::text,p_kayit_tarihi date default null::date,p_notlar text default null::text,p_durum text default 'Aktif'::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_yeni boolean; v_durum text:=coalesce(nullif(trim(p_durum),''),'Aktif'); v_pasif_program integer:=0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_ogrenci_id),'') is null then raise exception 'Öğrenci kimliği eksik.'; end if;
  if nullif(trim(p_ad_soyad),'') is null then raise exception 'Öğrenci adı zorunludur.'; end if;
  if v_durum not in ('Aktif','Pasif') then raise exception 'Geçersiz öğrenci durumu.'; end if;
  v_yeni:=not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id);
  insert into public.ogrenciler(ogrenci_id,ad_soyad,veli_adi,veli_telefon,ogrenci_telefon,email,kayit_tarihi,durum,notlar)
  values(trim(p_ogrenci_id),trim(p_ad_soyad),nullif(trim(coalesce(p_veli_adi,'')),''),nullif(trim(coalesce(p_veli_telefon,'')),''),nullif(trim(coalesce(p_ogrenci_telefon,'')),''),nullif(trim(coalesce(p_email,'')),''),coalesce(p_kayit_tarihi,current_date),v_durum,nullif(trim(coalesce(p_notlar,'')),''))
  on conflict(ogrenci_id) do update set ad_soyad=excluded.ad_soyad,veli_adi=excluded.veli_adi,veli_telefon=excluded.veli_telefon,ogrenci_telefon=excluded.ogrenci_telefon,email=excluded.email,kayit_tarihi=excluded.kayit_tarihi,durum=excluded.durum,notlar=excluded.notlar;
  if v_durum='Pasif' then
    update public.sabit_ders_programi set aktif=false,program_durumu='Pasif',senkron_zamani=now() where ogrenci_id=p_ogrenci_id and coalesce(program_durumu,'Aktif')<>'Pasif';
    get diagnostics v_pasif_program=row_count;
  end if;
  return jsonb_build_object('basarili',true,'ogrenci_id',p_ogrenci_id,'yeni',v_yeni,'durum',v_durum,'pasife_alinan_program',v_pasif_program);
end;
$function$;

create or replace function public.ogrenci_sil_guvenli_v1(p_ogrenci_id text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_bagli integer;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_ogrenci_id),'') is null then raise exception 'Öğrenci kimliği eksik.'; end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id) then raise exception 'Öğrenci bulunamadı.'; end if;
  select (select count(*) from public.dersler where ogrenci_id=p_ogrenci_id)+(select count(*) from public.sabit_ders_programi where ogrenci_id=p_ogrenci_id)+(select count(*) from public.tahsilatlar where ogrenci_id=p_ogrenci_id)+(select count(*) from public.kasa_hareketleri where ogrenci_id=p_ogrenci_id)+(select count(*) from public.odevler where ogrenci_id=p_ogrenci_id) into v_bagli;
  if v_bagli>0 then raise exception 'Geçmiş işlem kaydı olan öğrenci silinemez. Kaydı Pasif yapın.'; end if;
  delete from public.ogrenciler where ogrenci_id=p_ogrenci_id;
  return jsonb_build_object('basarili',true,'ogrenci_id',p_ogrenci_id);
end;
$function$;

create or replace function public.ogretmen_kaydet_guvenli_v5(p_ogretmen_id text,p_ad_soyad text,p_brans_ids text[] default '{}'::text[],p_telefon text default null::text,p_email text default null::text,p_notlar text default null::text,p_durum text default 'Aktif'::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_brans_ids text[]:=coalesce(p_brans_ids,'{}'::text[]); v_branslar_text text; v_pasif_program integer:=0; v_durum text:=coalesce(nullif(trim(p_durum),''),'Aktif');
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_ogretmen_id),'') is null or nullif(trim(p_ad_soyad),'') is null then raise exception 'Öğretmen kimliği ve adı zorunludur.'; end if;
  if v_durum not in ('Aktif','Pasif') then raise exception 'Geçersiz öğretmen durumu.'; end if;
  if exists(select 1 from unnest(v_brans_ids) x(brans_id) left join public.branslar b on b.brans_id=x.brans_id where b.brans_id is null or coalesce(b.aktif,true)=false) then raise exception 'Seçilen branşlardan biri bulunamadı veya pasif.'; end if;
  select string_agg(b.brans_adi,' / ' order by b.brans_adi) into v_branslar_text from public.branslar b where b.brans_id=any(v_brans_ids) and coalesce(b.aktif,true);
  insert into public.ogretmenler(ogretmen_id,ad_soyad,branslar,telefon,email,durum,notlar,rol)
  values(p_ogretmen_id,trim(p_ad_soyad),v_branslar_text,nullif(trim(coalesce(p_telefon,'')),''),nullif(trim(coalesce(p_email,'')),''),v_durum,nullif(trim(coalesce(p_notlar,'')),''),'Öğretmen')
  on conflict(ogretmen_id) do update set ad_soyad=excluded.ad_soyad,branslar=excluded.branslar,telefon=excluded.telefon,email=excluded.email,durum=excluded.durum,notlar=excluded.notlar;
  update public.ogretmen_branslari set aktif=false,guncellenme_zamani=now() where ogretmen_id=p_ogretmen_id;
  if v_durum='Aktif' then
    insert into public.ogretmen_branslari(ogretmen_id,brans_id,aktif,olusturulma_zamani,guncellenme_zamani)
    select p_ogretmen_id,x.brans_id,true,now(),now() from (select distinct unnest(v_brans_ids) as brans_id) x
    on conflict(ogretmen_id,brans_id) do update set aktif=true,guncellenme_zamani=now();
  else
    update public.sabit_ders_programi set aktif=false,program_durumu='Pasif',senkron_zamani=now() where ogretmen_id=p_ogretmen_id and coalesce(program_durumu,'Aktif')<>'Pasif';
    get diagnostics v_pasif_program=row_count;
  end if;
  return jsonb_build_object('basarili',true,'ogretmen_id',p_ogretmen_id,'durum',v_durum,'branslar',coalesce(v_branslar_text,''),'brans_sayisi',coalesce(cardinality(v_brans_ids),0),'pasife_alinan_program',v_pasif_program);
end;
$function$;

create or replace function public.profil_fotografi_guncelle_guvenli_v1(p_kayit_turu text,p_kayit_id text,p_profil_fotografi text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.'; end if;
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(coalesce(p_kayit_id,'')),'') is null then raise exception 'Kayıt kimliği eksik.'; end if;
  if nullif(trim(coalesce(p_profil_fotografi,'')),'') is null then raise exception 'Profil fotoğrafı yolu eksik.'; end if;
  if p_kayit_turu='ogrenci' then update public.ogrenciler set profil_fotografi=trim(p_profil_fotografi) where ogrenci_id=p_kayit_id;
  elsif p_kayit_turu='ogretmen' then update public.ogretmenler set profil_fotografi=trim(p_profil_fotografi) where ogretmen_id=p_kayit_id;
  else raise exception 'Geçersiz kayıt türü.'; end if;
  if not found then raise exception 'Profil fotoğrafı güncellenecek kayıt bulunamadı.'; end if;
  return jsonb_build_object('basarili',true,'kayit_turu',p_kayit_turu,'kayit_id',p_kayit_id,'profil_fotografi',trim(p_profil_fotografi));
end;
$function$;

create or replace function public.program_ayarlari_guncelle_guvenli_v1(p_varsayilan_ders_birimi integer,p_takvim_baslangic_saati time without time zone,p_takvim_bitis_saati time without time zone)
returns jsonb language plpgsql security definer set search_path to '' as $function$
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_varsayilan_ders_birimi not between 1 and 2 then raise exception 'Varsayılan ders birimi 1 veya 2 olmalıdır.'; end if;
  if p_takvim_baslangic_saati is null or p_takvim_bitis_saati is null then raise exception 'Takvim başlangıç ve bitiş saati zorunludur.'; end if;
  if p_takvim_baslangic_saati>=p_takvim_bitis_saati then raise exception 'Takvim bitiş saati başlangıç saatinden sonra olmalıdır.'; end if;
  update public.kurum_ayarlari set varsayilan_ders_birimi=p_varsayilan_ders_birimi,takvim_baslangic_saati=p_takvim_baslangic_saati,takvim_bitis_saati=p_takvim_bitis_saati,guncellenme_zamani=now(),guncelleyen=auth.uid() where kurum_id='ANA';
  return jsonb_build_object('basarili',true,'varsayilan_ders_birimi',p_varsayilan_ders_birimi,'takvim_baslangic_saati',p_takvim_baslangic_saati,'takvim_bitis_saati',p_takvim_bitis_saati);
end;
$function$;
