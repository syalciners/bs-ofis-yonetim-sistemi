-- Öğrenci Portalı - Bugün V1
-- Kimlik her çağrıda doğrulanmış Google e-postasından sunucu tarafında çözülür.
-- İstemci hiçbir zaman ogrenci_id göndermez.

create or replace function public.portal_ogrenci_bugun_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
  left join public.branslar b on b.brans_id = d.brans_id
  left join public.derslikler dl on dl.derslik_id = d.derslik_id
  left join public.ogretmenler ogt on ogt.ogretmen_id = d.ogretmen_id
  where d.tarih = v_bugun
    and d.kaynakta_var = true
    and d.ogrenci_id = v_ogrenci_id;

  select
    count(*) filter (where o.son_teslim_tarihi < v_bugun)::integer,
    count(*) filter (where o.son_teslim_tarihi = v_bugun)::integer,
    count(*) filter (where o.son_teslim_tarihi > v_bugun and o.son_teslim_tarihi <= v_bugun + 7)::integer
    into v_geciken, v_bugun_sayisi, v_yaklasan
  from public.odevler o
  where o.ogrenci_id = v_ogrenci_id
    and o.kaynakta_var = true
    and o.durum not in ('Tamamlandı', 'İptal')
    and o.son_teslim_tarihi is not null
    and o.son_teslim_tarihi <= v_bugun + 7;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'odev_id', q.odev_id,
        'grup', q.grup,
        'odev_basligi', q.odev_basligi,
        'aciklama', q.odev_aciklamasi,
        'son_teslim_tarihi', q.son_teslim_tarihi,
        'durum', q.durum,
        'oncelik', q.oncelik,
        'ogretmen_adi', q.ogretmen_adi,
        'kitap_adi', q.kitap_adi,
        'calisma_turu', q.calisma_turu,
        'baslangic_no', q.baslangic_no,
        'bitis_no', q.bitis_no,
        'calisma_detayi', q.calisma_detayi
      ) order by q.grup_sira, q.son_teslim_tarihi, q.odev_id
    ),
    '[]'::jsonb
  ) into v_calismalar
  from (
    select
      o.odev_id,
      case
        when o.son_teslim_tarihi < v_bugun then 'Geciken'
        when o.son_teslim_tarihi = v_bugun then 'Bugün'
        else 'Yaklaşan'
      end as grup,
      case
        when o.son_teslim_tarihi < v_bugun then 1
        when o.son_teslim_tarihi = v_bugun then 2
        else 3
      end as grup_sira,
      coalesce(nullif(trim(o.odev_basligi), ''), nullif(trim(o.konu), ''), 'Çalışma') as odev_basligi,
      o.odev_aciklamasi,
      o.son_teslim_tarihi,
      o.durum,
      o.oncelik,
      ogt.ad_soyad as ogretmen_adi,
      kk.kitap_adi,
      o.calisma_turu,
      o.baslangic_no,
      o.bitis_no,
      o.calisma_detayi
    from public.odevler o
    left join public.ogretmenler ogt on ogt.ogretmen_id = o.ogretmen_id
    left join public.ogrenci_kitaplari ok on ok.ogrenci_kitap_id = o.ogrenci_kitap_id
    left join public.kitap_katalogu kk on kk.kitap_id = ok.kitap_id
    where o.ogrenci_id = v_ogrenci_id
      and o.kaynakta_var = true
      and o.durum not in ('Tamamlandı', 'İptal')
      and o.son_teslim_tarihi is not null
      and o.son_teslim_tarihi <= v_bugun + 7
  ) q;

  return jsonb_build_object(
    'rol', v_rol,
    'ogrenci_adi', v_ad_soyad,
    'tarih', v_bugun,
    'ozet', jsonb_build_object(
      'geciken', v_geciken,
      'bugun', v_bugun_sayisi,
      'yaklasan', v_yaklasan
    ),
    'dersler', v_dersler,
    'calismalar', v_calismalar
  );
end;
$$;

create or replace function public.portal_ogrenci_odev_tamamla_v1(p_odev_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_ogrenci_id text;
  v_durum text;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;
  if nullif(trim(coalesce(p_odev_id, '')), '') is null then
    raise exception 'Çalışma kimliği eksik.';
  end if;

  select k.rol, k.ogrenci_id
    into v_rol, v_ogrenci_id
  from private.portal_kimligi_epostadan_v2() k;

  if v_rol <> 'Öğrenci' or v_ogrenci_id is null then
    raise exception 'Bu işlem yalnız öğrenci hesapları içindir.';
  end if;

  select o.durum
    into v_durum
  from public.odevler o
  where o.odev_id = p_odev_id
    and o.ogrenci_id = v_ogrenci_id
    and o.kaynakta_var = true;

  if not found then
    raise exception 'Bu çalışma size ait değil veya artık erişilebilir değil.';
  end if;

  if v_durum = 'İptal' then
    raise exception 'İptal edilmiş çalışma tamamlanamaz.';
  end if;

  if v_durum = 'Tamamlandı' then
    return jsonb_build_object(
      'basarili', true,
      'odev_id', p_odev_id,
      'durum', 'Tamamlandı',
      'tekrar', true
    );
  end if;

  update public.odevler
     set durum = 'Tamamlandı',
         tamamlanma_tarihi = coalesce(tamamlanma_tarihi, v_bugun),
         son_guncelleyen = 'Portal Öğrenci:' || v_uid::text,
         son_guncellenme_zamani = now()
   where odev_id = p_odev_id
     and ogrenci_id = v_ogrenci_id
     and kaynakta_var = true
     and durum <> 'İptal';

  if not found then
    raise exception 'Çalışma tamamlanamadı.';
  end if;

  return jsonb_build_object(
    'basarili', true,
    'odev_id', p_odev_id,
    'durum', 'Tamamlandı',
    'tamamlanma_tarihi', v_bugun,
    'tekrar', false
  );
end;
$$;

revoke execute on function public.portal_ogrenci_bugun_v1() from public, anon;
revoke execute on function public.portal_ogrenci_odev_tamamla_v1(text) from public, anon;
grant execute on function public.portal_ogrenci_bugun_v1() to authenticated;
grant execute on function public.portal_ogrenci_odev_tamamla_v1(text) to authenticated;
