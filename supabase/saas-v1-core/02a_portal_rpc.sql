-- BS Eğitim SaaS V1 — Portal RPC paketi
-- Koçluk kitap tablolarına bağımlılık içermez; response şekli mevcut portal ile uyumludur.

create or replace function public.portal_bugun_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ders_id', d.ders_id,
        'tarih', d.tarih,
        'baslangic_saati', d.baslangic_saati,
        'bitis_saati', d.bitis_saati,
        'ders_durumu', d.ders_durumu,
        'brans_adi', b.brans_adi,
        'derslik_adi', dl.mekan_adi,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'zoom_katilim_baglantisi', d.zoom_katilim_baglantisi
      ) order by d.baslangic_saati, d.ders_id
    ),
    '[]'::jsonb
  ) into v_result
  from public.dersler d
  left join public.branslar b on b.brans_id = d.brans_id
  left join public.derslikler dl on dl.derslik_id = d.derslik_id
  left join public.ogrenciler ogr on ogr.ogrenci_id = d.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = d.ogretmen_id
  where d.tarih = v_bugun
    and d.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and d.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and d.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$function$;

create or replace function public.portal_odevler_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_result jsonb;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'odev_id', o.odev_id,
        'odev_basligi', o.odev_basligi,
        'odev_aciklamasi', o.odev_aciklamasi,
        'verilis_tarihi', o.verilis_tarihi,
        'son_teslim_tarihi', o.son_teslim_tarihi,
        'durum', o.durum,
        'oncelik', o.oncelik,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'odev_dosya_linki', o.odev_dosya_linki,
        'odev_fotograf_linki', o.odev_fotograf_linki,
        'ogretmen_notu', o.ogretmen_notu,
        'puan', o.puan
      ) order by o.verilis_tarihi desc, o.odev_id
    ),
    '[]'::jsonb
  ) into v_result
  from public.odevler o
  left join public.ogrenciler ogr on ogr.ogrenci_id = o.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = o.ogretmen_id
  where o.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and o.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and o.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$function$;

create or replace function public.portal_ogrenci_bugun_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ad_soyad text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_dersler jsonb;
  v_calismalar jsonb;
  v_geciken integer := 0;
  v_bugun_sayisi integer := 0;
  v_yaklasan integer := 0;
begin
  select k.rol, k.ogrenci_id, k.ad_soyad
    into v_rol, v_ogrenci_id, v_ad_soyad
  from private.portal_kimligi_epostadan_v2() k;

  if v_rol <> 'Öğrenci' or v_ogrenci_id is null then
    raise exception 'Bu ekran yalnız öğrenci hesapları içindir.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ders_id', d.ders_id,
        'tarih', d.tarih,
        'baslangic_saati', d.baslangic_saati,
        'bitis_saati', d.bitis_saati,
        'ders_durumu', d.ders_durumu,
        'brans_adi', b.brans_adi,
        'derslik_adi', dl.mekan_adi,
        'ogretmen_adi', ogt.ad_soyad,
        'zoom_katilim_baglantisi', d.zoom_katilim_baglantisi
      ) order by d.baslangic_saati, d.ders_id
    ),
    '[]'::jsonb
  ) into v_dersler
  from public.dersler d
  left join public.branslar b on b.brans_id=d.brans_id
  left join public.derslikler dl on dl.derslik_id=d.derslik_id
  left join public.ogretmenler ogt on ogt.ogretmen_id=d.ogretmen_id
  where d.tarih=v_bugun
    and d.kaynakta_var=true
    and d.ogrenci_id=v_ogrenci_id;

  select
    count(*) filter (where o.son_teslim_tarihi < v_bugun)::integer,
    count(*) filter (where o.son_teslim_tarihi = v_bugun)::integer,
    count(*) filter (where o.son_teslim_tarihi > v_bugun and o.son_teslim_tarihi <= v_bugun + 7)::integer
    into v_geciken,v_bugun_sayisi,v_yaklasan
  from public.odevler o
  where o.ogrenci_id=v_ogrenci_id
    and o.kaynakta_var=true
    and o.durum not in ('Tamamlandı','İptal')
    and o.son_teslim_tarihi is not null
    and o.son_teslim_tarihi <= v_bugun+7;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'odev_id',q.odev_id,
        'grup',q.grup,
        'odev_basligi',q.odev_basligi,
        'aciklama',q.odev_aciklamasi,
        'son_teslim_tarihi',q.son_teslim_tarihi,
        'durum',q.durum,
        'oncelik',q.oncelik,
        'ogretmen_adi',q.ogretmen_adi,
        'kitap_adi',null,
        'calisma_turu',null,
        'baslangic_no',null,
        'bitis_no',null,
        'calisma_detayi',null
      ) order by q.grup_sira,q.son_teslim_tarihi,q.odev_id
    ),
    '[]'::jsonb
  ) into v_calismalar
  from (
    select
      o.odev_id,
      case when o.son_teslim_tarihi<v_bugun then 'Geciken' when o.son_teslim_tarihi=v_bugun then 'Bugün' else 'Yaklaşan' end as grup,
      case when o.son_teslim_tarihi<v_bugun then 1 when o.son_teslim_tarihi=v_bugun then 2 else 3 end as grup_sira,
      coalesce(nullif(trim(o.odev_basligi),''),nullif(trim(o.konu),''),'Çalışma') as odev_basligi,
      o.odev_aciklamasi,
      o.son_teslim_tarihi,
      o.durum,
      o.oncelik,
      ogt.ad_soyad as ogretmen_adi
    from public.odevler o
    left join public.ogretmenler ogt on ogt.ogretmen_id=o.ogretmen_id
    where o.ogrenci_id=v_ogrenci_id
      and o.kaynakta_var=true
      and o.durum not in ('Tamamlandı','İptal')
      and o.son_teslim_tarihi is not null
      and o.son_teslim_tarihi<=v_bugun+7
  ) q;

  return jsonb_build_object(
    'rol',v_rol,
    'ogrenci_adi',v_ad_soyad,
    'tarih',v_bugun,
    'ozet',jsonb_build_object('geciken',v_geciken,'bugun',v_bugun_sayisi,'yaklasan',v_yaklasan),
    'dersler',v_dersler,
    'calismalar',v_calismalar
  );
end;
$function$;

create or replace function public.portal_ogrenci_odev_tamamla_v1(p_odev_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid:=auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_durum text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if v_uid is null then raise exception 'Oturum bulunamadı.'; end if;
  if nullif(trim(coalesce(p_odev_id,'')),'') is null then raise exception 'Çalışma kimliği eksik.'; end if;

  select k.rol,k.ogrenci_id
    into v_rol,v_ogrenci_id
  from private.portal_kimligi_epostadan_v2() k;

  if v_rol<>'Öğrenci' or v_ogrenci_id is null then
    raise exception 'Bu işlem yalnız öğrenci hesapları içindir.';
  end if;

  select o.durum into v_durum
  from public.odevler o
  where o.odev_id=p_odev_id and o.ogrenci_id=v_ogrenci_id and o.kaynakta_var=true;

  if not found then raise exception 'Bu çalışma size ait değil veya artık erişilebilir değil.'; end if;
  if v_durum='İptal' then raise exception 'İptal edilmiş çalışma tamamlanamaz.'; end if;
  if v_durum='Tamamlandı' then
    return jsonb_build_object('basarili',true,'odev_id',p_odev_id,'durum','Tamamlandı','tekrar',true);
  end if;

  update public.odevler
  set durum='Tamamlandı',
      tamamlanma_tarihi=coalesce(tamamlanma_tarihi,v_bugun),
      son_guncelleyen='Portal Öğrenci:'||v_uid::text,
      son_guncellenme_zamani=now()
  where odev_id=p_odev_id
    and ogrenci_id=v_ogrenci_id
    and kaynakta_var=true
    and durum<>'İptal';

  if not found then raise exception 'Çalışma tamamlanamadı.'; end if;

  return jsonb_build_object('basarili',true,'odev_id',p_odev_id,'durum','Tamamlandı','tamamlanma_tarihi',v_bugun,'tekrar',false);
end;
$function$;

create or replace function public.portal_oturum_bilgisi_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_ad_soyad text;
  v_email text;
begin
  select k.rol, k.ogrenci_id, k.ogretmen_id, k.ad_soyad, k.email
    into v_rol, v_ogrenci_id, v_ogretmen_id, v_ad_soyad, v_email
  from private.portal_kimligi_epostadan_v2() k;

  return jsonb_build_object('rol',v_rol,'ad_soyad',v_ad_soyad,'email',v_email);
end;
$function$;

create or replace function public.portal_program_v2(p_gun integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rol text;
  v_ogrenci_id text;
  v_ogretmen_id text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  if p_gun is null or p_gun < 1 or p_gun > 60 then
    raise exception 'Program aralığı 1 ile 60 gün arasında olmalıdır.';
  end if;

  select k.rol, k.ogrenci_id, k.ogretmen_id
    into v_rol, v_ogrenci_id, v_ogretmen_id
  from private.portal_kimligi_epostadan_v2() k;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ders_id', d.ders_id,
        'tarih', d.tarih,
        'baslangic_saati', d.baslangic_saati,
        'bitis_saati', d.bitis_saati,
        'ders_durumu', d.ders_durumu,
        'brans_adi', b.brans_adi,
        'derslik_adi', dl.mekan_adi,
        'ogrenci_adi', ogr.ad_soyad,
        'ogretmen_adi', ogt.ad_soyad,
        'zoom_katilim_baglantisi', d.zoom_katilim_baglantisi
      ) order by d.tarih, d.baslangic_saati, d.ders_id
    ),
    '[]'::jsonb
  ) into v_result
  from public.dersler d
  left join public.branslar b on b.brans_id = d.brans_id
  left join public.derslikler dl on dl.derslik_id = d.derslik_id
  left join public.ogrenciler ogr on ogr.ogrenci_id = d.ogrenci_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = d.ogretmen_id
  where d.tarih >= v_bugun
    and d.tarih <= (v_bugun + p_gun)
    and d.kaynakta_var = true
    and (
      (v_rol = 'Öğrenci' and d.ogrenci_id = v_ogrenci_id)
      or
      (v_rol = 'Öğretmen' and d.ogretmen_id = v_ogretmen_id)
    );

  return v_result;
end;
$function$;

revoke all on function public.portal_bugun_v2() from public, anon, authenticated;
revoke all on function public.portal_odevler_v2() from public, anon, authenticated;
revoke all on function public.portal_ogrenci_bugun_v1() from public, anon, authenticated;
revoke all on function public.portal_ogrenci_odev_tamamla_v1(text) from public, anon, authenticated;
revoke all on function public.portal_oturum_bilgisi_v2() from public, anon, authenticated;
revoke all on function public.portal_program_v2(integer) from public, anon, authenticated;

grant execute on function public.portal_bugun_v2() to authenticated;
grant execute on function public.portal_odevler_v2() to authenticated;
grant execute on function public.portal_ogrenci_bugun_v1() to authenticated;
grant execute on function public.portal_ogrenci_odev_tamamla_v1(text) to authenticated;
grant execute on function public.portal_oturum_bilgisi_v2() to authenticated;
grant execute on function public.portal_program_v2(integer) to authenticated;
