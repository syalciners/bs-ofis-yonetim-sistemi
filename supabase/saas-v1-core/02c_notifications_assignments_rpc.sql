-- BS Eğitim SaaS V1 — Bildirim ve ödev RPC paketi

create or replace function public.bildirim_okundu_v1(p_bildirim_id uuid,p_okundu boolean default true)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_rol text; v_alici_id text; v_yetkili boolean:=false;
begin
  if v_uid is null then raise exception 'Oturum bulunamadı.'; end if;
  if p_bildirim_id is null then raise exception 'Bildirim kimliği eksik.'; end if;
  select kp.rol into v_rol from public.kullanici_profilleri kp where kp.auth_user_id=v_uid and kp.aktif=true;
  if found then
    if v_rol<>'Yönetici' then raise exception 'Bu kullanıcı rolü bildirim merkezi için desteklenmiyor.'; end if;
    v_alici_id:=null;
  else
    select k.rol,case when k.rol='Öğrenci' then k.ogrenci_id else k.ogretmen_id end into v_rol,v_alici_id from private.portal_kimligi_epostadan_v2() k;
  end if;
  select exists(select 1 from public.bildirimler b where b.bildirim_id=p_bildirim_id and b.aktif=true and (b.son_gecerlilik_zamani is null or b.son_gecerlilik_zamani>now()) and (b.alici_turu='Tüm Kullanıcılar' or (v_rol='Yönetici' and b.alici_turu='Yönetici') or (v_rol in ('Öğrenci','Öğretmen') and b.alici_turu=v_rol and (b.alici_id is null or b.alici_id=v_alici_id)))) into v_yetkili;
  if not v_yetkili then raise exception 'Bu bildirime erişim yetkiniz yok.'; end if;
  if coalesce(p_okundu,true) then
    insert into public.bildirim_okumalari(bildirim_id,auth_user_id,okunma_zamani) values(p_bildirim_id,v_uid,now()) on conflict(bildirim_id,auth_user_id) do update set okunma_zamani=excluded.okunma_zamani;
  else
    delete from public.bildirim_okumalari where bildirim_id=p_bildirim_id and auth_user_id=v_uid;
  end if;
  return jsonb_build_object('basarili',true,'bildirim_id',p_bildirim_id,'okundu',coalesce(p_okundu,true));
end;
$function$;

create or replace function public.bildirimlerim_v1(p_limit integer default 100)
returns table(bildirim_id uuid,kategori text,baslik text,icerik text,oncelik text,kaynak text,alici_turu text,alici_id text,ilgili_kayit_turu text,ilgili_kayit_id text,eylem_yolu text,meta jsonb,olusturulma_zamani timestamp with time zone,okundu boolean,okunma_zamani timestamp with time zone)
language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid:=auth.uid(); v_rol text; v_alici_id text;
begin
  if v_uid is null then raise exception 'Oturum bulunamadı.'; end if;
  select kp.rol into v_rol from public.kullanici_profilleri kp where kp.auth_user_id=v_uid and kp.aktif=true;
  if found then
    if v_rol<>'Yönetici' then raise exception 'Bu kullanıcı rolü bildirim merkezi için desteklenmiyor.'; end if;
    v_alici_id:=null;
  else
    select k.rol,case when k.rol='Öğrenci' then k.ogrenci_id else k.ogretmen_id end into v_rol,v_alici_id from private.portal_kimligi_epostadan_v2() k;
  end if;
  if p_limit is null or p_limit<1 or p_limit>200 then p_limit:=100; end if;
  return query
  select b.bildirim_id,b.kategori,b.baslik,b.icerik,b.oncelik,b.kaynak,b.alici_turu,b.alici_id,b.ilgili_kayit_turu,b.ilgili_kayit_id,b.eylem_yolu,b.meta,b.olusturulma_zamani,(bo.auth_user_id is not null) as okundu,bo.okunma_zamani
  from public.bildirimler b left join public.bildirim_okumalari bo on bo.bildirim_id=b.bildirim_id and bo.auth_user_id=v_uid
  where b.aktif=true and (b.son_gecerlilik_zamani is null or b.son_gecerlilik_zamani>now()) and (b.alici_turu='Tüm Kullanıcılar' or (v_rol='Yönetici' and b.alici_turu='Yönetici') or (v_rol in ('Öğrenci','Öğretmen') and b.alici_turu=v_rol and (b.alici_id is null or b.alici_id=v_alici_id)))
  order by b.olusturulma_zamani desc limit p_limit;
end;
$function$;

create or replace function public.bildirim_okunmamis_sayisi_v1()
returns integer language sql stable security definer set search_path to '' as $function$
  select count(*)::integer from public.bildirimlerim_v1(200) b where b.okundu=false;
$function$;

create or replace function public.odev_drive_eklerini_guncelle_guvenli_v1(p_odev_id text,p_odev_dosyasi text default null::text,p_odev_dosya_linki text default null::text,p_odev_fotografi text default null::text,p_odev_fotograf_linki text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_kullanici text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  update public.odevler set odev_dosyasi=case when p_odev_dosyasi is null then odev_dosyasi else nullif(trim(p_odev_dosyasi),'') end,odev_dosya_linki=case when p_odev_dosya_linki is null then odev_dosya_linki else nullif(trim(p_odev_dosya_linki),'') end,odev_fotografi=case when p_odev_fotografi is null then odev_fotografi else nullif(trim(p_odev_fotografi),'') end,odev_fotograf_linki=case when p_odev_fotograf_linki is null then odev_fotograf_linki else nullif(trim(p_odev_fotograf_linki),'') end,son_guncelleyen=v_kullanici,son_guncellenme_zamani=now() where odev_id=p_odev_id;
  if not found then raise exception 'Ödev bulunamadı.'; end if;
  return jsonb_build_object('basarili',true,'odev_id',p_odev_id);
end;
$function$;

create or replace function public.odev_durumu_guncelle_guvenli_v1(p_odev_id text,p_durum text,p_ogretmen_notu text default null::text,p_puan text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_kullanici text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_durum not in ('Verildi','Tamamlandı','Eksik','İptal') then raise exception 'Geçersiz ödev durumu.'; end if;
  update public.odevler set durum=p_durum,ogretmen_notu=coalesce(nullif(trim(coalesce(p_ogretmen_notu,'')),''),ogretmen_notu),puan=coalesce(nullif(trim(coalesce(p_puan,'')),''),puan),tamamlanma_tarihi=case when p_durum='Tamamlandı' then coalesce(tamamlanma_tarihi,current_date) else null end,son_guncelleyen=v_kullanici,son_guncellenme_zamani=now() where odev_id=p_odev_id;
  if not found then raise exception 'Ödev bulunamadı.'; end if;
  return jsonb_build_object('basarili',true,'odev_id',p_odev_id,'durum',p_durum);
end;
$function$;

create or replace function public.odev_eklerini_guncelle_guvenli_v1(p_odev_id text,p_odev_dosyasi text default null::text,p_odev_fotografi text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_kullanici text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  update public.odevler set odev_dosyasi=nullif(trim(coalesce(p_odev_dosyasi,'')),''),odev_fotografi=nullif(trim(coalesce(p_odev_fotografi,'')),''),son_guncelleyen=v_kullanici,son_guncellenme_zamani=now() where odev_id=p_odev_id;
  if not found then raise exception 'Ödev bulunamadı.'; end if;
  return jsonb_build_object('basarili',true,'odev_id',p_odev_id);
end;
$function$;

create or replace function public.odev_kaydet_guvenli_v1(p_odev_id text,p_ogrenci_id text,p_ogretmen_id text,p_konu text default null::text,p_aciklama text default null::text,p_verilis_tarihi date default null::date,p_son_teslim_tarihi date default null::date,p_ders_id text default null::text,p_oncelik text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_kullanici text:=coalesce(auth.jwt()->>'email',auth.uid()::text,'BS Eğitim');
begin
  if auth.uid() is null or not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_odev_id),'') is null then raise exception 'Ödev kimliği eksik.'; end if;
  if not exists(select 1 from public.ogrenciler where ogrenci_id=p_ogrenci_id) then raise exception 'Öğrenci bulunamadı.'; end if;
  if not exists(select 1 from public.ogretmenler where ogretmen_id=p_ogretmen_id) then raise exception 'Öğretmen bulunamadı.'; end if;
  if nullif(trim(coalesce(p_konu,'')),'') is null and nullif(trim(coalesce(p_aciklama,'')),'') is null then raise exception 'Konu veya ödev açıklaması girilmelidir.'; end if;
  insert into public.odevler(odev_id,ogrenci_id,ogretmen_id,ders_id,konu,odev_aciklamasi,verilis_tarihi,son_teslim_tarihi,durum,oncelik,olusturan,olusturulma_zamani,son_guncelleyen,son_guncellenme_zamani)
  values(p_odev_id,p_ogrenci_id,p_ogretmen_id,nullif(trim(coalesce(p_ders_id,'')),''),nullif(trim(coalesce(p_konu,'')),''),nullif(trim(coalesce(p_aciklama,'')),''),coalesce(p_verilis_tarihi,current_date),p_son_teslim_tarihi,'Verildi',nullif(trim(coalesce(p_oncelik,'')),''),v_kullanici,now(),v_kullanici,now())
  on conflict(odev_id) do update set ogrenci_id=excluded.ogrenci_id,ogretmen_id=excluded.ogretmen_id,ders_id=excluded.ders_id,konu=excluded.konu,odev_aciklamasi=excluded.odev_aciklamasi,verilis_tarihi=excluded.verilis_tarihi,son_teslim_tarihi=excluded.son_teslim_tarihi,oncelik=excluded.oncelik,son_guncelleyen=v_kullanici,son_guncellenme_zamani=now();
  return jsonb_build_object('basarili',true,'odev_id',p_odev_id);
end;
$function$;
