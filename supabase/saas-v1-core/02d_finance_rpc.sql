-- BS Eğitim SaaS V1 — Finans RPC paketi
-- Finance Asistanı Core zorunluluğu değildir. Tahsilat düzenleme/silme response uyumluluğunu korur.

create or replace function public.gider_guncelle_guvenli_v1(p_gider_id text,p_tarih date,p_kategori_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text,p_hesap_id text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_g public.giderler%rowtype; v_h public.kasa_hareketleri%rowtype; v_hesap_id text:=nullif(pg_catalog.btrim(coalesce(p_hesap_id,'')),''); v_hesap_adi text; v_kategori_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_gider_id,'')),'') is null then raise exception 'Gider kimliği zorunludur.'; end if;
  if p_tarih is null then raise exception 'Gider tarihi eksik.'; end if;
  if p_tutar is null or p_tutar<=0 then raise exception 'Gider tutarı sıfırdan büyük olmalı.'; end if;
  select kategori_adi into v_kategori_adi from public.gider_kategorileri where kategori_id=p_kategori_id and coalesce(aktif,true);
  if v_kategori_adi is null then raise exception 'Gider kategorisi bulunamadı.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_gider_guncelle:'||p_gider_id));
  select * into v_g from public.giderler where gider_id=p_gider_id for update;
  if not found then raise exception 'Gider bulunamadı.'; end if;
  if coalesce(v_g.iptal_mi,false) then raise exception 'İptal edilmiş gider düzenlenemez.'; end if;
  begin
    select * into strict v_h from public.kasa_hareketleri where kaynak_turu='Gider' and kaynak_id=p_gider_id and coalesce(iptal_mi,false)=false for update;
  exception when no_data_found then raise exception 'Gidere bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.'; when too_many_rows then raise exception 'Gidere bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.'; end;
  if v_h.hareket_turu is distinct from 'Gider' or v_h.hesap_id is distinct from v_g.hesap_id or pg_catalog.abs(v_h.tutar-v_g.tutar)>0.01 or (v_g.kasa_hareket_id is not null and v_g.kasa_hareket_id is distinct from v_h.hareket_id) then raise exception 'Gider ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.'; end if;
  if v_hesap_id is null then
    if pg_catalog.lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1;
    else select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1; end if;
  end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  update public.giderler set tarih=p_tarih,kategori_id=p_kategori_id,tutar=p_tutar,odeme_yontemi=p_odeme_yontemi,aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),hesap_id=v_hesap_id,odeme_durumu='Ödendi',guncelleyen=v_email,guncellenme_tarihi=pg_catalog.now() where gider_id=p_gider_id;
  update public.kasa_hareketleri set tarih=p_tarih,hesap_id=v_hesap_id,tutar=p_tutar,aciklama=coalesce(nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),v_kategori_adi),ogrenci_id=null,ogretmen_id=null,durum='Tamamlandı' where hareket_id=v_h.hareket_id;
  return jsonb_build_object('basarili',true,'gider_id',p_gider_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'kategori_adi',v_kategori_adi);
end;
$function$;

create or replace function public.gider_iptal_guvenli_v1(p_gider_id text,p_aciklama text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_g public.giderler%rowtype; v_hareket_sayisi integer:=0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(coalesce(p_gider_id,'')),'') is null then raise exception 'Gider kimliği zorunludur.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_gider_iptal:'||p_gider_id));
  select * into v_g from public.giderler where gider_id=p_gider_id for update;
  if not found then raise exception 'Gider bulunamadı.'; end if;
  if coalesce(v_g.iptal_mi,false) then return jsonb_build_object('basarili',true,'tekrar',true,'gider_id',p_gider_id); end if;
  select count(*) into v_hareket_sayisi from public.kasa_hareketleri k where k.kaynak_turu='Gider' and k.kaynak_id=p_gider_id and coalesce(k.iptal_mi,false)=false;
  if v_hareket_sayisi<>1 then raise exception 'Gidere bağlı aktif kasa hareketi tekil değil (% kayıt). İşlem yapılmadı.',v_hareket_sayisi; end if;
  update public.giderler set iptal_mi=true,odeme_durumu='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'İptal edildi'),guncelleyen=v_email,guncellenme_tarihi=now() where gider_id=p_gider_id;
  update public.kasa_hareketleri set iptal_mi=true,durum='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'Kaynak gider iptal edildi') where kaynak_turu='Gider' and kaynak_id=p_gider_id and coalesce(iptal_mi,false)=false;
  return jsonb_build_object('basarili',true,'tekrar',false,'gider_id',p_gider_id);
end;
$function$;

create or replace function public.gider_kaydet_guvenli_v1(p_gider_id text,p_hareket_id text,p_tarih date,p_kategori_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text,p_hesap_id text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_hesap_id text:=nullif(trim(coalesce(p_hesap_id,'')),''); v_hesap_adi text; v_kategori_adi text; v_olusturan text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim'); v_gider public.giderler%rowtype; v_hareket public.kasa_hareketleri%rowtype;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_gider_id),'') is null or nullif(trim(p_hareket_id),'') is null then raise exception 'İşlem kimlikleri eksik.'; end if;
  if p_tarih is null then raise exception 'Gider tarihi eksik.'; end if;
  if p_tutar is null or p_tutar<=0 then raise exception 'Gider tutarı sıfırdan büyük olmalı.'; end if;
  select kategori_adi into v_kategori_adi from public.gider_kategorileri where kategori_id=p_kategori_id and coalesce(aktif,true);
  if v_kategori_adi is null then raise exception 'Gider kategorisi bulunamadı.'; end if;
  if v_hesap_id is null then if lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and lower(trim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1; else select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and lower(coalesce(hesap_turu,'')) like '%havale%' order by hesap_id limit 1; end if; end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  select * into v_gider from public.giderler where gider_id=p_gider_id; select * into v_hareket from public.kasa_hareketleri where hareket_id=p_hareket_id;
  if v_gider.gider_id is not null or v_hareket.hareket_id is not null then
    if v_gider.gider_id is not null and v_hareket.hareket_id is not null and v_gider.tarih=p_tarih and v_gider.kategori_id=p_kategori_id and v_gider.tutar=p_tutar and v_gider.hesap_id=v_hesap_id and v_hareket.kaynak_turu='Gider' and v_hareket.kaynak_id=p_gider_id and v_hareket.hareket_turu='Gider' and v_hareket.tutar=p_tutar and v_hareket.hesap_id=v_hesap_id then return jsonb_build_object('basarili',true,'tekrar',true,'gider_id',p_gider_id,'hareket_id',p_hareket_id); end if;
    raise exception 'Aynı işlem kimliğiyle farklı veya eksik kayıt bulundu.';
  end if;
  insert into public.giderler(gider_id,tarih,kategori_id,tutar,odeme_yontemi,aciklama,olusturan,olusturulma_zamani,hesap_id,odeme_durumu,kasa_hareket_id,iptal_mi) values(p_gider_id,p_tarih,p_kategori_id,p_tutar,p_odeme_yontemi,nullif(trim(coalesce(p_aciklama,'')),''),v_olusturan,now(),v_hesap_id,'Ödendi',p_hareket_id,false);
  insert into public.kasa_hareketleri(hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,olusturan,olusturulma_zamani,iptal_mi,durum) values(p_hareket_id,p_tarih,'Gider','Gider',p_gider_id,v_hesap_id,p_tutar,coalesce(nullif(trim(coalesce(p_aciklama,'')),''),v_kategori_adi),v_olusturan,now(),false,'Tamamlandı');
  return jsonb_build_object('basarili',true,'tekrar',false,'gider_id',p_gider_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'kategori_adi',v_kategori_adi);
end;
$function$;

create or replace function public.ogretmen_odeme_iptal_guvenli_v1(p_odeme_id text,p_aciklama text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_o public.ogretmen_odemeleri%rowtype; v_hareket_sayisi integer:=0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(coalesce(p_odeme_id,'')),'') is null then raise exception 'Ödeme kimliği zorunludur.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ogretmen_odeme_iptal:'||p_odeme_id));
  select * into v_o from public.ogretmen_odemeleri where ogretmen_odeme_id=p_odeme_id for update;
  if not found then raise exception 'Öğretmen ödemesi bulunamadı.'; end if;
  if coalesce(v_o.iptal_mi,false) then return jsonb_build_object('basarili',true,'tekrar',true,'ogretmen_odeme_id',p_odeme_id); end if;
  select count(*) into v_hareket_sayisi from public.kasa_hareketleri k where k.kaynak_turu='Öğretmen Ödemesi' and k.kaynak_id=p_odeme_id and coalesce(k.iptal_mi,false)=false;
  if v_hareket_sayisi<>1 then raise exception 'Ödemeye bağlı aktif kasa hareketi tekil değil (% kayıt). İşlem yapılmadı.',v_hareket_sayisi; end if;
  update public.ogretmen_odemeleri set iptal_mi=true,aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'İptal edildi'),guncelleyen=v_email,guncelleme_tarihi=now()::text where ogretmen_odeme_id=p_odeme_id;
  update public.kasa_hareketleri set iptal_mi=true,durum='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'Kaynak öğretmen ödemesi iptal edildi') where kaynak_turu='Öğretmen Ödemesi' and kaynak_id=p_odeme_id and coalesce(iptal_mi,false)=false;
  return jsonb_build_object('basarili',true,'tekrar',false,'ogretmen_odeme_id',p_odeme_id);
end;
$function$;

create or replace function public.ogretmen_odeme_kaydet_guvenli_v2(p_odeme_id text,p_hareket_id text,p_tarih date,p_hakedis_donemi_id text,p_ogretmen_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text,p_hesap_id text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_hesap_id text:=nullif(trim(coalesce(p_hesap_id,'')),''); v_hesap_adi text; v_ogretmen_adi text; v_olusturan text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim'); v_odeme public.ogretmen_odemeleri%rowtype; v_hareket public.kasa_hareketleri%rowtype; v_bas date; v_bit date; v_hakedis numeric:=0; v_onceki_odeme numeric:=0; v_kalan numeric:=0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_tarih is null or p_tutar is null or p_tutar<=0 then raise exception 'Ödeme tarihi ve tutarı geçerli olmalıdır.'; end if;
  if nullif(trim(p_odeme_id),'') is null or nullif(trim(p_hareket_id),'') is null then raise exception 'İşlem kimlikleri eksik.'; end if;
  select baslangic_tarihi,bitis_tarihi into v_bas,v_bit from public.hakedis_donemleri where hakedis_donemi_id=p_hakedis_donemi_id; if not found then raise exception 'Hakediş dönemi bulunamadı.'; end if;
  select ad_soyad into v_ogretmen_adi from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif'; if v_ogretmen_adi is null then raise exception 'Aktif öğretmen bulunamadı.'; end if;
  if v_hesap_id is null then if lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and lower(trim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1; else select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and regexp_replace(lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1; end if; end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true; if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  select * into v_odeme from public.ogretmen_odemeleri where ogretmen_odeme_id=p_odeme_id; select * into v_hareket from public.kasa_hareketleri where hareket_id=p_hareket_id;
  if v_odeme.ogretmen_odeme_id is not null or v_hareket.hareket_id is not null then
    if v_odeme.ogretmen_odeme_id is not null and v_hareket.hareket_id is not null and v_odeme.ogretmen_id=p_ogretmen_id and v_odeme.hakedis_donemi_id=p_hakedis_donemi_id and v_odeme.tarih=p_tarih and v_odeme.tutar=p_tutar and coalesce(v_odeme.odeme_yontemi,'')=coalesce(p_odeme_yontemi,'') and v_odeme.hesap_id=v_hesap_id and v_hareket.kaynak_turu='Öğretmen Ödemesi' and v_hareket.kaynak_id=p_odeme_id and v_hareket.hareket_turu='Gider' and v_hareket.ogretmen_id=p_ogretmen_id and v_hareket.tutar=p_tutar and v_hareket.hesap_id=v_hesap_id then return jsonb_build_object('basarili',true,'tekrar',true,'odeme_id',p_odeme_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi); end if;
    raise exception 'Aynı işlem kimliğiyle farklı veya eksik kayıt bulundu.';
  end if;
  select coalesce(sum(d.ogretmen_toplam_hakedis),0) into v_hakedis from public.dersler d where d.ogretmen_id=p_ogretmen_id and d.ders_durumu='Yapıldı' and d.tarih between v_bas and v_bit;
  select coalesce(sum(o.tutar),0) into v_onceki_odeme from public.ogretmen_odemeleri o where o.ogretmen_id=p_ogretmen_id and o.hakedis_donemi_id=p_hakedis_donemi_id and coalesce(o.iptal_mi,false)=false;
  v_kalan:=greatest(v_hakedis-v_onceki_odeme,0); if p_tutar>v_kalan+0.009 then raise exception 'Ödeme kalan hakedişi aşıyor. Kalan hakediş: % TL.',trim(to_char(v_kalan,'FM999999990.00')); end if;
  insert into public.kasa_hareketleri(hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,ogretmen_id,olusturan,olusturulma_zamani,iptal_mi,durum) values(p_hareket_id,p_tarih,'Gider','Öğretmen Ödemesi',p_odeme_id,v_hesap_id,p_tutar,coalesce(nullif(trim(coalesce(p_aciklama,'')),''),v_ogretmen_adi||' - Öğretmen Ödemesi'),p_ogretmen_id,v_olusturan,now(),false,'Tamamlandı');
  insert into public.ogretmen_odemeleri(ogretmen_odeme_id,tarih,hakedis_donemi_id,ogretmen_id,tutar,odeme_yontemi,aciklama,olusturan,olusturulma_zamani,hesap_id,kasa_hareket_id,iptal_mi) values(p_odeme_id,p_tarih,p_hakedis_donemi_id,p_ogretmen_id,p_tutar,p_odeme_yontemi,nullif(trim(coalesce(p_aciklama,'')),''),v_olusturan,now(),v_hesap_id,p_hareket_id,false);
  return jsonb_build_object('basarili',true,'tekrar',false,'odeme_id',p_odeme_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'hakedis',v_hakedis,'onceki_odeme',v_onceki_odeme,'kalan_sonrasi',greatest(v_kalan-p_tutar,0));
end;
$function$;

create or replace function public.ogretmen_odeme_guncelle_guvenli_v1(p_odeme_id text,p_tarih date,p_hakedis_donemi_id text,p_ogretmen_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text,p_hesap_id text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_o public.ogretmen_odemeleri%rowtype; v_h public.kasa_hareketleri%rowtype; v_hesap_id text:=nullif(pg_catalog.btrim(coalesce(p_hesap_id,'')),''); v_hesap_adi text; v_ogretmen_adi text; v_bas date; v_bit date; v_hakedis numeric:=0; v_diger_odeme numeric:=0; v_kalan numeric:=0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_odeme_id,'')),'') is null then raise exception 'Ödeme kimliği zorunludur.'; end if;
  if p_tarih is null or p_tutar is null or p_tutar<=0 then raise exception 'Ödeme tarihi ve tutarı geçerli olmalıdır.'; end if;
  select baslangic_tarihi,bitis_tarihi into v_bas,v_bit from public.hakedis_donemleri where hakedis_donemi_id=p_hakedis_donemi_id; if not found then raise exception 'Hakediş dönemi bulunamadı.'; end if;
  select ad_soyad into v_ogretmen_adi from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif'; if v_ogretmen_adi is null then raise exception 'Aktif öğretmen bulunamadı.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ogretmen_odeme_guncelle:'||p_odeme_id)); select * into v_o from public.ogretmen_odemeleri where ogretmen_odeme_id=p_odeme_id for update; if not found then raise exception 'Öğretmen ödemesi bulunamadı.'; end if; if coalesce(v_o.iptal_mi,false) then raise exception 'İptal edilmiş öğretmen ödemesi düzenlenemez.'; end if;
  begin select * into strict v_h from public.kasa_hareketleri where kaynak_turu='Öğretmen Ödemesi' and kaynak_id=p_odeme_id and coalesce(iptal_mi,false)=false for update; exception when no_data_found then raise exception 'Ödemeye bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.'; when too_many_rows then raise exception 'Ödemeye bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.'; end;
  if v_h.hareket_turu is distinct from 'Gider' or v_h.ogretmen_id is distinct from v_o.ogretmen_id or v_h.hesap_id is distinct from v_o.hesap_id or pg_catalog.abs(v_h.tutar-v_o.tutar)>0.01 or (v_o.kasa_hareket_id is not null and v_o.kasa_hareket_id is distinct from v_h.hareket_id) then raise exception 'Öğretmen ödemesi ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.'; end if;
  if v_hesap_id is null then if pg_catalog.lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1; else select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1; end if; end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true; if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;
  select coalesce(sum(d.ogretmen_toplam_hakedis),0) into v_hakedis from public.dersler d where d.ogretmen_id=p_ogretmen_id and d.ders_durumu='Yapıldı' and d.tarih between v_bas and v_bit;
  select coalesce(sum(o.tutar),0) into v_diger_odeme from public.ogretmen_odemeleri o where o.ogretmen_id=p_ogretmen_id and o.hakedis_donemi_id=p_hakedis_donemi_id and coalesce(o.iptal_mi,false)=false and o.ogretmen_odeme_id<>p_odeme_id;
  v_kalan:=greatest(v_hakedis-v_diger_odeme,0); if p_tutar>v_kalan+0.009 then raise exception 'Ödeme kalan hakedişi aşıyor. Düzenlenebilir azami tutar: % TL.',pg_catalog.btrim(pg_catalog.to_char(v_kalan,'FM999999990.00')); end if;
  update public.ogretmen_odemeleri set tarih=p_tarih,hakedis_donemi_id=p_hakedis_donemi_id,ogretmen_id=p_ogretmen_id,tutar=p_tutar,odeme_yontemi=p_odeme_yontemi,aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),hesap_id=v_hesap_id,guncelleyen=v_email,guncelleme_tarihi=pg_catalog.now()::text where ogretmen_odeme_id=p_odeme_id;
  update public.kasa_hareketleri set tarih=p_tarih,hesap_id=v_hesap_id,tutar=p_tutar,aciklama=coalesce(nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),v_ogretmen_adi||' - Öğretmen Ödemesi'),ogrenci_id=null,ogretmen_id=p_ogretmen_id,durum='Tamamlandı' where hareket_id=v_h.hareket_id;
  return jsonb_build_object('basarili',true,'odeme_id',p_odeme_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'hakedis',v_hakedis,'diger_odeme',v_diger_odeme,'kalan_sonrasi',greatest(v_kalan-p_tutar,0));
end;
$function$;

create or replace function public.tahsilat_kaydet_guvenli_v1(p_tahsilat_id text,p_hareket_id text,p_tarih date,p_ogrenci_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_hesap_id text; v_hesap_adi text; v_olusturan text; v_tahsilat public.tahsilatlar%rowtype; v_hareket public.kasa_hareketleri%rowtype;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_tahsilat_id),'') is null or nullif(trim(p_hareket_id),'') is null then raise exception 'İşlem kimlikleri eksik.'; end if; if p_tarih is null then raise exception 'Tahsilat tarihi eksik.'; end if; if nullif(trim(p_ogrenci_id),'') is null then raise exception 'Öğrenci seçilmedi.'; end if; if p_tutar is null or p_tutar<=0 then raise exception 'Tahsilat tutarı sıfırdan büyük olmalı.'; end if; if p_odeme_yontemi not in ('Havale/EFT','Nakit') then raise exception 'Geçersiz ödeme yöntemi.'; end if;
  if not exists(select 1 from public.ogrenciler o where o.ogrenci_id=p_ogrenci_id) then raise exception 'Öğrenci kaydı bulunamadı.'; end if;
  if p_odeme_yontemi='Nakit' then select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi from public.kasa_hesaplari h where h.aktif=true and lower(trim(coalesce(h.hesap_turu,'')))='nakit' order by h.hesap_id limit 1; else select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi from public.kasa_hesaplari h where h.aktif=true and regexp_replace(lower(coalesce(h.hesap_turu,'')),'\s+','','g')='havale/eft' order by h.hesap_id limit 1; end if; if v_hesap_id is null then raise exception 'Ödeme yöntemi için aktif kasa hesabı bulunamadı.'; end if;
  select * into v_tahsilat from public.tahsilatlar where tahsilat_id=p_tahsilat_id; select * into v_hareket from public.kasa_hareketleri where hareket_id=p_hareket_id;
  if v_tahsilat.tahsilat_id is not null or v_hareket.hareket_id is not null then
    if v_tahsilat.tahsilat_id is not null and v_hareket.hareket_id is not null and v_tahsilat.ogrenci_id=p_ogrenci_id and v_tahsilat.tarih=p_tarih and v_tahsilat.tutar=p_tutar and coalesce(v_tahsilat.odeme_yontemi,'')=p_odeme_yontemi and v_tahsilat.hesap_id=v_hesap_id and v_hareket.kaynak_turu='Tahsilat' and v_hareket.kaynak_id=p_tahsilat_id and v_hareket.hareket_turu='Gelir' and v_hareket.ogrenci_id=p_ogrenci_id and v_hareket.tutar=p_tutar and v_hareket.hesap_id=v_hesap_id then return jsonb_build_object('basarili',true,'tekrar',true,'tahsilat_id',p_tahsilat_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi); end if;
    raise exception 'Aynı işlem kimliğiyle farklı veya eksik kayıt bulundu.';
  end if;
  v_olusturan:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
  insert into public.tahsilatlar(tahsilat_id,tarih,ogrenci_id,tutar,odeme_yontemi,aciklama,olusturan,olusturulma_zamani,hesap_id) values(p_tahsilat_id,p_tarih,p_ogrenci_id,p_tutar,p_odeme_yontemi,nullif(trim(coalesce(p_aciklama,'')),''),v_olusturan,now(),v_hesap_id);
  insert into public.kasa_hareketleri(hareket_id,tarih,hareket_turu,kaynak_turu,kaynak_id,hesap_id,tutar,aciklama,ogrenci_id,ogretmen_id,olusturan,olusturulma_zamani,iptal_mi,durum) values(p_hareket_id,p_tarih,'Gelir','Tahsilat',p_tahsilat_id,v_hesap_id,p_tutar,nullif(trim(coalesce(p_aciklama,'')),''),p_ogrenci_id,null,v_olusturan,now(),false,'Tamamlandı');
  return jsonb_build_object('basarili',true,'tekrar',false,'tahsilat_id',p_tahsilat_id,'hareket_id',p_hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi);
end;
$function$;

create or replace function public.tahsilat_iptal_guvenli_v1(p_tahsilat_id text,p_aciklama text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_t public.tahsilatlar%rowtype; v_hareket_sayisi integer:=0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if; if nullif(trim(coalesce(p_tahsilat_id,'')),'') is null then raise exception 'Tahsilat kimliği zorunludur.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_tahsilat_iptal:'||p_tahsilat_id)); select * into v_t from public.tahsilatlar where tahsilat_id=p_tahsilat_id for update; if not found then raise exception 'Tahsilat bulunamadı.'; end if; if coalesce(v_t.iptal_mi,false) then return jsonb_build_object('basarili',true,'tekrar',true,'tahsilat_id',p_tahsilat_id); end if;
  select count(*) into v_hareket_sayisi from public.kasa_hareketleri k where k.kaynak_turu='Tahsilat' and k.kaynak_id=p_tahsilat_id and coalesce(k.iptal_mi,false)=false; if v_hareket_sayisi<>1 then raise exception 'Tahsilata bağlı aktif kasa hareketi tekil değil (% kayıt). İşlem yapılmadı.',v_hareket_sayisi; end if;
  update public.tahsilatlar set iptal_mi=true,aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'İptal edildi'),guncelleyen=v_email,guncellenme_zamani=now() where tahsilat_id=p_tahsilat_id;
  update public.kasa_hareketleri set iptal_mi=true,durum='İptal',aciklama=concat_ws(' · ',nullif(aciklama,''),nullif(trim(coalesce(p_aciklama,'')),''),'Kaynak tahsilat iptal edildi') where kaynak_turu='Tahsilat' and kaynak_id=p_tahsilat_id and coalesce(iptal_mi,false)=false;
  return jsonb_build_object('basarili',true,'tekrar',false,'tahsilat_id',p_tahsilat_id);
end;
$function$;

create or replace function public.tahsilat_guncelle_guvenli_v1(p_tahsilat_id text,p_tarih date,p_ogrenci_id text,p_tutar numeric,p_odeme_yontemi text,p_aciklama text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_email text:=coalesce(auth.jwt()->>'email',v_uid::text,'BS Ofis'); v_t public.tahsilatlar%rowtype; v_h public.kasa_hareketleri%rowtype; v_hesap_id text; v_hesap_adi text;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_tahsilat_id,'')),'') is null then raise exception 'Tahsilat kimliği zorunludur.'; end if; if p_tarih is null then raise exception 'Tahsilat tarihi eksik.'; end if; if nullif(pg_catalog.btrim(coalesce(p_ogrenci_id,'')),'') is null then raise exception 'Öğrenci seçilmedi.'; end if; if p_tutar is null or p_tutar<=0 then raise exception 'Tahsilat tutarı sıfırdan büyük olmalı.'; end if; if p_odeme_yontemi not in ('Havale/EFT','Nakit') then raise exception 'Geçersiz ödeme yöntemi.'; end if; if not exists(select 1 from public.ogrenciler o where o.ogrenci_id=p_ogrenci_id) then raise exception 'Öğrenci kaydı bulunamadı.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_tahsilat_guncelle:'||p_tahsilat_id)); select * into v_t from public.tahsilatlar where tahsilat_id=p_tahsilat_id for update; if not found then raise exception 'Tahsilat bulunamadı.'; end if; if coalesce(v_t.iptal_mi,false) then raise exception 'İptal edilmiş tahsilat düzenlenemez.'; end if;
  begin select * into strict v_h from public.kasa_hareketleri where kaynak_turu='Tahsilat' and kaynak_id=p_tahsilat_id and coalesce(iptal_mi,false)=false for update; exception when no_data_found then raise exception 'Tahsilata bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.'; when too_many_rows then raise exception 'Tahsilata bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.'; end;
  if v_h.hareket_turu is distinct from 'Gelir' or v_h.ogrenci_id is distinct from v_t.ogrenci_id or v_h.hesap_id is distinct from v_t.hesap_id or pg_catalog.abs(v_h.tutar-v_t.tutar)>0.01 then raise exception 'Tahsilat ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.'; end if;
  if p_odeme_yontemi='Nakit' then select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi from public.kasa_hesaplari h where h.aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(h.hesap_turu,'')))='nakit' order by h.hesap_id limit 1; else select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi from public.kasa_hesaplari h where h.aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(h.hesap_turu,'')),'\s+','','g')='havale/eft' order by h.hesap_id limit 1; end if; if v_hesap_id is null then raise exception 'Ödeme yöntemi için aktif kasa hesabı bulunamadı.'; end if;
  update public.tahsilatlar set tarih=p_tarih,ogrenci_id=p_ogrenci_id,tutar=p_tutar,odeme_yontemi=p_odeme_yontemi,aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),hesap_id=v_hesap_id,guncelleyen=v_email,guncellenme_zamani=pg_catalog.now() where tahsilat_id=p_tahsilat_id;
  update public.kasa_hareketleri set tarih=p_tarih,hesap_id=v_hesap_id,tutar=p_tutar,aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),ogrenci_id=p_ogrenci_id,ogretmen_id=null,durum='Tamamlandı' where hareket_id=v_h.hareket_id;
  return jsonb_build_object('basarili',true,'tahsilat_id',p_tahsilat_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'finans_sync_tetiklendi',false,'finans_sync_istek_id',null);
end;
$function$;

create or replace function public.tahsilat_sil_guvenli_v1(p_tahsilat_id text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_tahsilat public.tahsilatlar%rowtype; v_hareket public.kasa_hareketleri%rowtype; v_silinen_hareket integer:=0; v_silinen_tahsilat integer:=0;
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_tahsilat_id,'')),'') is null then raise exception 'Tahsilat kimliği zorunludur.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_tahsilat_sil:'||p_tahsilat_id)); select * into v_tahsilat from public.tahsilatlar where tahsilat_id=p_tahsilat_id for update; if not found then raise exception 'Tahsilat bulunamadı.'; end if; if not coalesce(v_tahsilat.iptal_mi,false) then raise exception 'Aktif tahsilat kalıcı olarak silinemez. Önce kaydı iptal edin.'; end if;
  begin select * into strict v_hareket from public.kasa_hareketleri where kaynak_turu='Tahsilat' and kaynak_id=p_tahsilat_id for update; exception when no_data_found then raise exception 'Tahsilata bağlı kasa hareketi bulunamadı. Hiçbir kayıt silinmedi.'; when too_many_rows then raise exception 'Tahsilata bağlı birden fazla kasa hareketi bulundu. Hiçbir kayıt silinmedi.'; end;
  if not coalesce(v_hareket.iptal_mi,false) then raise exception 'Bağlı kasa hareketi iptal edilmemiş. Hiçbir kayıt silinmedi.'; end if;
  if v_hareket.ogrenci_id is distinct from v_tahsilat.ogrenci_id or v_hareket.hesap_id is distinct from v_tahsilat.hesap_id or pg_catalog.abs(v_hareket.tutar-v_tahsilat.tutar)>0.01 then raise exception 'Tahsilat ve kasa hareketi bilgileri eşleşmiyor. Hiçbir kayıt silinmedi.'; end if;
  delete from public.kasa_hareketleri where hareket_id=v_hareket.hareket_id; get diagnostics v_silinen_hareket=row_count;
  if v_silinen_hareket<>1 or exists(select 1 from public.kasa_hareketleri where kaynak_turu='Tahsilat' and kaynak_id=p_tahsilat_id) then raise exception 'Bağlı kasa hareketi güvenli biçimde silinemedi. İşlem geri alındı.'; end if;
  delete from public.tahsilatlar where tahsilat_id=p_tahsilat_id and iptal_mi=true; get diagnostics v_silinen_tahsilat=row_count; if v_silinen_tahsilat<>1 then raise exception 'İptal tahsilat güvenli biçimde silinemedi. İşlem geri alındı.'; end if;
  return jsonb_build_object('basarili',true,'tahsilat_id',p_tahsilat_id,'silinen_tahsilat',v_silinen_tahsilat,'silinen_kasa_hareketi',v_silinen_hareket,'finans_sync_tetiklendi',false,'finans_sync_istek_id',null);
end;
$function$;
