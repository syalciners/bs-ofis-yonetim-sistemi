-- BS Eğitim Demo: Ayarlar Merkezi tanımlarını yalnız aktif anonim demo oturumunda güvenli yönetir.
-- Ana uygulamadaki iş kuralları korunur; tüm yeni kimlikler demo oturum önekiyle izole edilir.

create or replace function public.brans_kaydet_guvenli_v1(p_brans_id text,p_brans_adi text,p_aktif boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_prefix text;v_id text;v_yeni boolean;v_aktif boolean:=coalesce(p_aktif,true);
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.'; end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU'; end if;
  if nullif(trim(p_brans_id),'') is null then raise exception 'Branş kimliği eksik.'; end if;
  if nullif(trim(p_brans_adi),'') is null then raise exception 'Branş adı boş bırakılamaz.'; end if;
  v_prefix:='D'||substr(replace(v_uid::text,'-',''),1,10)||'-';
  v_id:=case when trim(p_brans_id) like v_prefix||'%' then trim(p_brans_id) else v_prefix||trim(p_brans_id) end;
  if exists(select 1 from public.branslar where demo_oturum_id=v_uid and lower(trim(brans_adi))=lower(trim(p_brans_adi)) and brans_id<>v_id) then raise exception 'Aynı adla başka bir branş zaten var.'; end if;
  if v_aktif=false and exists(select 1 from public.sabit_ders_programi where demo_oturum_id=v_uid and brans_id=v_id and coalesce(aktif,true)=true and coalesce(program_durumu,'Aktif')<>'Pasif') then raise exception 'Aktif sabit programlarda kullanılan branş pasifleştirilemez.'; end if;
  v_yeni:=not exists(select 1 from public.branslar where demo_oturum_id=v_uid and brans_id=v_id);
  if v_yeni then insert into public.branslar(brans_id,brans_adi,aktif,kaynakta_var,demo_oturum_id) values(v_id,trim(p_brans_adi),v_aktif,true,v_uid);
  else update public.branslar set brans_adi=trim(p_brans_adi),aktif=v_aktif where demo_oturum_id=v_uid and brans_id=v_id; end if;
  return jsonb_build_object('basarili',true,'brans_id',v_id,'yeni',v_yeni,'aktif',v_aktif);
end $$;

create or replace function public.derslik_kaydet_guvenli_v1(p_derslik_id text,p_mekan_adi text,p_mekan_turu text,p_kapasite integer,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_prefix text;v_id text;v_yeni boolean;v_aktif boolean:=coalesce(p_aktif,true);v_kapasite integer:=coalesce(p_kapasite,1);
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.'; end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU'; end if;
  if nullif(trim(p_derslik_id),'') is null then raise exception 'Derslik kimliği eksik.'; end if;
  if nullif(trim(p_mekan_adi),'') is null then raise exception 'Derslik adı boş bırakılamaz.'; end if;
  if v_kapasite<1 then raise exception 'Derslik kapasitesi en az 1 olmalıdır.'; end if;
  v_prefix:='D'||substr(replace(v_uid::text,'-',''),1,10)||'-';
  v_id:=case when trim(p_derslik_id) like v_prefix||'%' then trim(p_derslik_id) else v_prefix||trim(p_derslik_id) end;
  if exists(select 1 from public.derslikler where demo_oturum_id=v_uid and lower(trim(mekan_adi))=lower(trim(p_mekan_adi)) and derslik_id<>v_id) then raise exception 'Aynı adla başka bir derslik zaten var.'; end if;
  if v_aktif=false and exists(select 1 from public.sabit_ders_programi where demo_oturum_id=v_uid and derslik_id=v_id and coalesce(aktif,true)=true and coalesce(program_durumu,'Aktif')<>'Pasif') then raise exception 'Aktif sabit programlarda kullanılan derslik pasifleştirilemez.'; end if;
  v_yeni:=not exists(select 1 from public.derslikler where demo_oturum_id=v_uid and derslik_id=v_id);
  if v_yeni then insert into public.derslikler(derslik_id,mekan_adi,mekan_turu,kapasite,aktif,aciklama,kaynakta_var,demo_oturum_id) values(v_id,trim(p_mekan_adi),nullif(trim(coalesce(p_mekan_turu,'')),''),v_kapasite,v_aktif,nullif(trim(coalesce(p_aciklama,'')),''),true,v_uid);
  else update public.derslikler set mekan_adi=trim(p_mekan_adi),mekan_turu=nullif(trim(coalesce(p_mekan_turu,'')),''),kapasite=v_kapasite,aktif=v_aktif,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where demo_oturum_id=v_uid and derslik_id=v_id; end if;
  return jsonb_build_object('basarili',true,'derslik_id',v_id,'yeni',v_yeni,'aktif',v_aktif);
end $$;

create or replace function public.kasa_hesabi_kaydet_guvenli_v1(p_hesap_id text,p_hesap_adi text,p_hesap_turu text,p_banka_adi text,p_iban text,p_acilis_bakiyesi numeric,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_prefix text;v_id text;v_yeni boolean;v_aktif boolean:=coalesce(p_aktif,true);v_mevcut_acilis numeric;v_yeni_acilis numeric;v_hareket_var boolean:=false;v_diger_aktif integer;
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.'; end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU'; end if;
  if nullif(trim(p_hesap_id),'') is null then raise exception 'Hesap kimliği eksik.'; end if;
  if nullif(trim(p_hesap_adi),'') is null then raise exception 'Hesap adı boş bırakılamaz.'; end if;
  v_prefix:='D'||substr(replace(v_uid::text,'-',''),1,10)||'-';
  v_id:=case when trim(p_hesap_id) like v_prefix||'%' then trim(p_hesap_id) else v_prefix||trim(p_hesap_id) end;
  if exists(select 1 from public.kasa_hesaplari where demo_oturum_id=v_uid and lower(trim(hesap_adi))=lower(trim(p_hesap_adi)) and hesap_id<>v_id) then raise exception 'Aynı adla başka bir kasa veya banka hesabı zaten var.'; end if;
  select acilis_bakiyesi into v_mevcut_acilis from public.kasa_hesaplari where demo_oturum_id=v_uid and hesap_id=v_id;
  v_yeni:=not found;
  if v_yeni then v_yeni_acilis:=coalesce(p_acilis_bakiyesi,0);
  else v_yeni_acilis:=coalesce(p_acilis_bakiyesi,v_mevcut_acilis,0);select exists(select 1 from public.kasa_hareketleri where demo_oturum_id=v_uid and hesap_id=v_id) into v_hareket_var;if v_hareket_var and v_yeni_acilis is distinct from coalesce(v_mevcut_acilis,0) then raise exception 'Kasa hareketi bulunan hesabın açılış bakiyesi değiştirilemez.'; end if;end if;
  if not v_yeni and v_aktif=false then select count(*) into v_diger_aktif from public.kasa_hesaplari where demo_oturum_id=v_uid and hesap_id<>v_id and aktif=true;if v_diger_aktif<1 then raise exception 'En az bir aktif kasa veya banka hesabı bulunmalıdır.';end if;end if;
  if v_yeni then insert into public.kasa_hesaplari(hesap_id,hesap_adi,hesap_turu,banka_adi,iban,acilis_bakiyesi,aktif,aciklama,olusturan,olusturulma_zamani,kaynakta_var,demo_oturum_id) values(v_id,trim(p_hesap_adi),nullif(trim(coalesce(p_hesap_turu,'')),''),nullif(trim(coalesce(p_banka_adi,'')),''),nullif(trim(coalesce(p_iban,'')),''),v_yeni_acilis,v_aktif,nullif(trim(coalesce(p_aciklama,'')),''),v_uid::text,now(),true,v_uid);
  else update public.kasa_hesaplari set hesap_adi=trim(p_hesap_adi),hesap_turu=nullif(trim(coalesce(p_hesap_turu,'')),''),banka_adi=nullif(trim(coalesce(p_banka_adi,'')),''),iban=nullif(trim(coalesce(p_iban,'')),''),acilis_bakiyesi=v_yeni_acilis,aktif=v_aktif,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where demo_oturum_id=v_uid and hesap_id=v_id;end if;
  return jsonb_build_object('basarili',true,'hesap_id',v_id,'yeni',v_yeni,'aktif',v_aktif,'acilis_bakiyesi_kilitli',(not v_yeni and v_hareket_var));
end $$;

create or replace function public.gider_kategorisi_kaydet_guvenli_v1(p_kategori_id text,p_kategori_adi text,p_grup text,p_sira_no integer,p_aktif boolean,p_aciklama text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_prefix text;v_id text;v_yeni boolean;v_aktif boolean:=coalesce(p_aktif,true);v_diger_aktif integer;
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.'; end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU'; end if;
  if nullif(trim(p_kategori_id),'') is null then raise exception 'Gider kategorisi kimliği eksik.'; end if;
  if nullif(trim(p_kategori_adi),'') is null then raise exception 'Gider kategorisi adı boş bırakılamaz.'; end if;
  if p_sira_no is not null and p_sira_no<1 then raise exception 'Sıra numarası en az 1 olmalıdır.'; end if;
  v_prefix:='D'||substr(replace(v_uid::text,'-',''),1,10)||'-';
  v_id:=case when trim(p_kategori_id) like v_prefix||'%' then trim(p_kategori_id) else v_prefix||trim(p_kategori_id) end;
  if exists(select 1 from public.gider_kategorileri where demo_oturum_id=v_uid and lower(trim(kategori_adi))=lower(trim(p_kategori_adi)) and kategori_id<>v_id) then raise exception 'Aynı adla başka bir gider kategorisi zaten var.'; end if;
  v_yeni:=not exists(select 1 from public.gider_kategorileri where demo_oturum_id=v_uid and kategori_id=v_id);
  if not v_yeni and v_aktif=false then select count(*) into v_diger_aktif from public.gider_kategorileri where demo_oturum_id=v_uid and kategori_id<>v_id and aktif=true;if v_diger_aktif<1 then raise exception 'En az bir aktif gider kategorisi bulunmalıdır.';end if;end if;
  if v_yeni then insert into public.gider_kategorileri(kategori_id,kategori_adi,grup,aktif,sira_no,aciklama,olusturan,olusturulma_zamani,demo_oturum_id) values(v_id,trim(p_kategori_adi),nullif(trim(coalesce(p_grup,'')),''),v_aktif,p_sira_no,nullif(trim(coalesce(p_aciklama,'')),''),v_uid::text,now(),v_uid);
  else update public.gider_kategorileri set kategori_adi=trim(p_kategori_adi),grup=nullif(trim(coalesce(p_grup,'')),''),aktif=v_aktif,sira_no=p_sira_no,aciklama=nullif(trim(coalesce(p_aciklama,'')),'') where demo_oturum_id=v_uid and kategori_id=v_id;end if;
  return jsonb_build_object('basarili',true,'kategori_id',v_id,'yeni',v_yeni,'aktif',v_aktif);
end $$;

revoke all on function public.brans_kaydet_guvenli_v1(text,text,boolean) from public,anon;
revoke all on function public.derslik_kaydet_guvenli_v1(text,text,text,integer,boolean,text) from public,anon;
revoke all on function public.kasa_hesabi_kaydet_guvenli_v1(text,text,text,text,text,numeric,boolean,text) from public,anon;
revoke all on function public.gider_kategorisi_kaydet_guvenli_v1(text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.brans_kaydet_guvenli_v1(text,text,boolean) to authenticated,service_role;
grant execute on function public.derslik_kaydet_guvenli_v1(text,text,text,integer,boolean,text) to authenticated,service_role;
grant execute on function public.kasa_hesabi_kaydet_guvenli_v1(text,text,text,text,text,numeric,boolean,text) to authenticated,service_role;
grant execute on function public.gider_kategorisi_kaydet_guvenli_v1(text,text,text,integer,boolean,text) to authenticated,service_role;
