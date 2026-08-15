create or replace function public.tahsilat_guncelle_guvenli_v1(
  p_tahsilat_id text,
  p_tarih date,
  p_ogrenci_id text,
  p_tutar numeric,
  p_odeme_yontemi text,
  p_aciklama text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Ofis');
  v_t public.tahsilatlar%rowtype;
  v_h public.kasa_hareketleri%rowtype;
  v_hesap_id text;
  v_hesap_adi text;
  v_sync_istek_id bigint;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(pg_catalog.btrim(coalesce(p_tahsilat_id,'')),'') is null then raise exception 'Tahsilat kimliği zorunludur.'; end if;
  if p_tarih is null then raise exception 'Tahsilat tarihi eksik.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_ogrenci_id,'')),'') is null then raise exception 'Öğrenci seçilmedi.'; end if;
  if p_tutar is null or p_tutar<=0 then raise exception 'Tahsilat tutarı sıfırdan büyük olmalı.'; end if;
  if p_odeme_yontemi not in ('Havale/EFT','Nakit') then raise exception 'Geçersiz ödeme yöntemi.'; end if;
  if not exists(select 1 from public.ogrenciler o where o.ogrenci_id=p_ogrenci_id) then raise exception 'Öğrenci kaydı bulunamadı.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_tahsilat_guncelle:'||p_tahsilat_id));
  select * into v_t from public.tahsilatlar where tahsilat_id=p_tahsilat_id for update;
  if not found then raise exception 'Tahsilat bulunamadı.'; end if;
  if coalesce(v_t.iptal_mi,false) then raise exception 'İptal edilmiş tahsilat düzenlenemez.'; end if;

  begin
    select * into strict v_h
    from public.kasa_hareketleri
    where kaynak_turu='Tahsilat' and kaynak_id=p_tahsilat_id and coalesce(iptal_mi,false)=false
    for update;
  exception
    when no_data_found then raise exception 'Tahsilata bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.';
    when too_many_rows then raise exception 'Tahsilata bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.';
  end;

  if v_h.hareket_turu is distinct from 'Gelir'
     or v_h.ogrenci_id is distinct from v_t.ogrenci_id
     or v_h.hesap_id is distinct from v_t.hesap_id
     or pg_catalog.abs(v_h.tutar-v_t.tutar)>0.01 then
    raise exception 'Tahsilat ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.';
  end if;

  if p_odeme_yontemi='Nakit' then
    select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi
    from public.kasa_hesaplari h
    where h.aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(h.hesap_turu,'')))='nakit'
    order by h.hesap_id limit 1;
  else
    select h.hesap_id,h.hesap_adi into v_hesap_id,v_hesap_adi
    from public.kasa_hesaplari h
    where h.aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(h.hesap_turu,'')),'\s+','','g')='havale/eft'
    order by h.hesap_id limit 1;
  end if;
  if v_hesap_id is null then raise exception 'Ödeme yöntemi için aktif kasa hesabı bulunamadı.'; end if;

  update public.tahsilatlar
     set tarih=p_tarih,
         ogrenci_id=p_ogrenci_id,
         tutar=p_tutar,
         odeme_yontemi=p_odeme_yontemi,
         aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),
         hesap_id=v_hesap_id,
         guncelleyen=v_email,
         guncellenme_zamani=pg_catalog.now()
   where tahsilat_id=p_tahsilat_id;

  update public.kasa_hareketleri
     set tarih=p_tarih,
         hesap_id=v_hesap_id,
         tutar=p_tutar,
         aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),
         ogrenci_id=p_ogrenci_id,
         ogretmen_id=null,
         durum='Tamamlandı'
   where hareket_id=v_h.hareket_id;

  v_sync_istek_id := private.finans_v18_sync_tetikle();
  if v_sync_istek_id is null then raise exception 'Finans senkronizasyonu başlatılamadı. Düzenleme işlemi geri alındı.'; end if;

  return jsonb_build_object('basarili',true,'tahsilat_id',p_tahsilat_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'finans_sync_tetiklendi',true,'finans_sync_istek_id',v_sync_istek_id);
end;
$function$;

revoke all on function public.tahsilat_guncelle_guvenli_v1(text,date,text,numeric,text,text) from public, anon;
grant execute on function public.tahsilat_guncelle_guvenli_v1(text,date,text,numeric,text,text) to authenticated;

create or replace function public.gider_guncelle_guvenli_v1(
  p_gider_id text,
  p_tarih date,
  p_kategori_id text,
  p_tutar numeric,
  p_odeme_yontemi text,
  p_aciklama text default null,
  p_hesap_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Ofis');
  v_g public.giderler%rowtype;
  v_h public.kasa_hareketleri%rowtype;
  v_hesap_id text := nullif(pg_catalog.btrim(coalesce(p_hesap_id,'')),'');
  v_hesap_adi text;
  v_kategori_adi text;
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
    select * into strict v_h
    from public.kasa_hareketleri
    where kaynak_turu='Gider' and kaynak_id=p_gider_id and coalesce(iptal_mi,false)=false
    for update;
  exception
    when no_data_found then raise exception 'Gidere bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.';
    when too_many_rows then raise exception 'Gidere bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.';
  end;

  if v_h.hareket_turu is distinct from 'Gider'
     or v_h.hesap_id is distinct from v_g.hesap_id
     or pg_catalog.abs(v_h.tutar-v_g.tutar)>0.01
     or (v_g.kasa_hareket_id is not null and v_g.kasa_hareket_id is distinct from v_h.hareket_id) then
    raise exception 'Gider ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.';
  end if;

  if v_hesap_id is null then
    if pg_catalog.lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1;
    else
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1;
    end if;
  end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;

  update public.giderler
     set tarih=p_tarih,
         kategori_id=p_kategori_id,
         tutar=p_tutar,
         odeme_yontemi=p_odeme_yontemi,
         aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),
         hesap_id=v_hesap_id,
         odeme_durumu='Ödendi',
         guncelleyen=v_email,
         guncellenme_tarihi=pg_catalog.now()
   where gider_id=p_gider_id;

  update public.kasa_hareketleri
     set tarih=p_tarih,
         hesap_id=v_hesap_id,
         tutar=p_tutar,
         aciklama=coalesce(nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),v_kategori_adi),
         ogrenci_id=null,
         ogretmen_id=null,
         durum='Tamamlandı'
   where hareket_id=v_h.hareket_id;

  return jsonb_build_object('basarili',true,'gider_id',p_gider_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'kategori_adi',v_kategori_adi);
end;
$function$;

revoke all on function public.gider_guncelle_guvenli_v1(text,date,text,numeric,text,text,text) from public, anon;
grant execute on function public.gider_guncelle_guvenli_v1(text,date,text,numeric,text,text,text) to authenticated;

create or replace function public.ogretmen_odeme_guncelle_guvenli_v1(
  p_odeme_id text,
  p_tarih date,
  p_hakedis_donemi_id text,
  p_ogretmen_id text,
  p_tutar numeric,
  p_odeme_yontemi text,
  p_aciklama text default null,
  p_hesap_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email', v_uid::text, 'BS Ofis');
  v_o public.ogretmen_odemeleri%rowtype;
  v_h public.kasa_hareketleri%rowtype;
  v_hesap_id text := nullif(pg_catalog.btrim(coalesce(p_hesap_id,'')),'');
  v_hesap_adi text;
  v_ogretmen_adi text;
  v_bas date;
  v_bit date;
  v_hakedis numeric := 0;
  v_diger_odeme numeric := 0;
  v_kalan numeric := 0;
begin
  if v_uid is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(pg_catalog.btrim(coalesce(p_odeme_id,'')),'') is null then raise exception 'Ödeme kimliği zorunludur.'; end if;
  if p_tarih is null or p_tutar is null or p_tutar<=0 then raise exception 'Ödeme tarihi ve tutarı geçerli olmalıdır.'; end if;

  select baslangic_tarihi,bitis_tarihi into v_bas,v_bit from public.hakedis_donemleri where hakedis_donemi_id=p_hakedis_donemi_id;
  if not found then raise exception 'Hakediş dönemi bulunamadı.'; end if;
  select ad_soyad into v_ogretmen_adi from public.ogretmenler where ogretmen_id=p_ogretmen_id and coalesce(durum,'Aktif')<>'Pasif';
  if v_ogretmen_adi is null then raise exception 'Aktif öğretmen bulunamadı.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bs_ogretmen_odeme_guncelle:'||p_odeme_id));
  select * into v_o from public.ogretmen_odemeleri where ogretmen_odeme_id=p_odeme_id for update;
  if not found then raise exception 'Öğretmen ödemesi bulunamadı.'; end if;
  if coalesce(v_o.iptal_mi,false) then raise exception 'İptal edilmiş öğretmen ödemesi düzenlenemez.'; end if;

  begin
    select * into strict v_h
    from public.kasa_hareketleri
    where kaynak_turu='Öğretmen Ödemesi' and kaynak_id=p_odeme_id and coalesce(iptal_mi,false)=false
    for update;
  exception
    when no_data_found then raise exception 'Ödemeye bağlı aktif kasa hareketi bulunamadı. İşlem yapılmadı.';
    when too_many_rows then raise exception 'Ödemeye bağlı birden fazla aktif kasa hareketi bulundu. İşlem yapılmadı.';
  end;

  if v_h.hareket_turu is distinct from 'Gider'
     or v_h.ogretmen_id is distinct from v_o.ogretmen_id
     or v_h.hesap_id is distinct from v_o.hesap_id
     or pg_catalog.abs(v_h.tutar-v_o.tutar)>0.01
     or (v_o.kasa_hareket_id is not null and v_o.kasa_hareket_id is distinct from v_h.hareket_id) then
    raise exception 'Öğretmen ödemesi ve bağlı kasa hareketi mevcut durumda eşleşmiyor. İşlem yapılmadı.';
  end if;

  if v_hesap_id is null then
    if pg_catalog.lower(coalesce(p_odeme_yontemi,'')) like '%nakit%' then
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.lower(pg_catalog.btrim(coalesce(hesap_turu,'')))='nakit' order by hesap_id limit 1;
    else
      select hesap_id into v_hesap_id from public.kasa_hesaplari where aktif=true and pg_catalog.regexp_replace(pg_catalog.lower(coalesce(hesap_turu,'')),'\s+','','g')='havale/eft' order by hesap_id limit 1;
    end if;
  end if;
  select hesap_adi into v_hesap_adi from public.kasa_hesaplari where hesap_id=v_hesap_id and aktif=true;
  if v_hesap_adi is null then raise exception 'Aktif kasa hesabı bulunamadı.'; end if;

  select coalesce(sum(d.ogretmen_toplam_hakedis),0) into v_hakedis
  from public.dersler d
  where d.ogretmen_id=p_ogretmen_id and d.ders_durumu='Yapıldı' and d.tarih between v_bas and v_bit;

  select coalesce(sum(o.tutar),0) into v_diger_odeme
  from public.ogretmen_odemeleri o
  where o.ogretmen_id=p_ogretmen_id
    and o.hakedis_donemi_id=p_hakedis_donemi_id
    and coalesce(o.iptal_mi,false)=false
    and o.ogretmen_odeme_id<>p_odeme_id;

  v_kalan := greatest(v_hakedis-v_diger_odeme,0);
  if p_tutar>v_kalan+0.009 then raise exception 'Ödeme kalan hakedişi aşıyor. Düzenlenebilir azami tutar: % TL.',pg_catalog.btrim(pg_catalog.to_char(v_kalan,'FM999999990.00')); end if;

  update public.ogretmen_odemeleri
     set tarih=p_tarih,
         hakedis_donemi_id=p_hakedis_donemi_id,
         ogretmen_id=p_ogretmen_id,
         tutar=p_tutar,
         odeme_yontemi=p_odeme_yontemi,
         aciklama=nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),
         hesap_id=v_hesap_id,
         guncelleyen=v_email,
         guncelleme_tarihi=pg_catalog.now()::text
   where ogretmen_odeme_id=p_odeme_id;

  update public.kasa_hareketleri
     set tarih=p_tarih,
         hesap_id=v_hesap_id,
         tutar=p_tutar,
         aciklama=coalesce(nullif(pg_catalog.btrim(coalesce(p_aciklama,'')),''),v_ogretmen_adi||' - Öğretmen Ödemesi'),
         ogrenci_id=null,
         ogretmen_id=p_ogretmen_id,
         durum='Tamamlandı'
   where hareket_id=v_h.hareket_id;

  return jsonb_build_object('basarili',true,'odeme_id',p_odeme_id,'hareket_id',v_h.hareket_id,'hesap_id',v_hesap_id,'hesap_adi',v_hesap_adi,'hakedis',v_hakedis,'diger_odeme',v_diger_odeme,'kalan_sonrasi',greatest(v_kalan-p_tutar,0));
end;
$function$;

revoke all on function public.ogretmen_odeme_guncelle_guvenli_v1(text,date,text,text,numeric,text,text,text) from public, anon;
grant execute on function public.ogretmen_odeme_guncelle_guvenli_v1(text,date,text,text,numeric,text,text,text) to authenticated;
