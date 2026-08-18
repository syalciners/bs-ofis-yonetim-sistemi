create or replace function public.kasa_hesabi_kaydet_guvenli_v1(
  p_hesap_id text,
  p_hesap_adi text,
  p_hesap_turu text,
  p_banka_adi text,
  p_iban text,
  p_acilis_bakiyesi numeric,
  p_aktif boolean,
  p_aciklama text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yeni boolean;
  v_aktif boolean := coalesce(p_aktif, true);
  v_mevcut_acilis numeric;
  v_yeni_acilis numeric;
  v_hareket_var boolean := false;
  v_diger_aktif integer;
begin
  if not private.bs_ofis_yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if nullif(trim(p_hesap_id), '') is null then raise exception 'Hesap kimliği eksik.'; end if;
  if nullif(trim(p_hesap_adi), '') is null then raise exception 'Hesap adı boş bırakılamaz.'; end if;
  if exists(select 1 from public.kasa_hesaplari where lower(trim(hesap_adi))=lower(trim(p_hesap_adi)) and hesap_id<>p_hesap_id) then
    raise exception 'Aynı adla başka bir kasa veya banka hesabı zaten var.';
  end if;

  select acilis_bakiyesi into v_mevcut_acilis from public.kasa_hesaplari where hesap_id=p_hesap_id;
  v_yeni := not found;
  if v_yeni then
    v_yeni_acilis := coalesce(p_acilis_bakiyesi,0);
  else
    v_yeni_acilis := coalesce(p_acilis_bakiyesi,v_mevcut_acilis,0);
    select exists(select 1 from public.kasa_hareketleri where hesap_id=p_hesap_id) into v_hareket_var;
    if v_hareket_var and v_yeni_acilis is distinct from coalesce(v_mevcut_acilis,0) then
      raise exception 'Kasa hareketi bulunan hesabın açılış bakiyesi değiştirilemez.';
    end if;
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
$$;

create or replace function public.gider_kategorisi_kaydet_guvenli_v1(
  p_kategori_id text,
  p_kategori_adi text,
  p_grup text,
  p_sira_no integer,
  p_aktif boolean,
  p_aciklama text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yeni boolean;
  v_aktif boolean := coalesce(p_aktif,true);
  v_diger_aktif integer;
begin
  if not private.bs_ofis_yonetici_mi() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if nullif(trim(p_kategori_id),'') is null then raise exception 'Gider kategorisi kimliği eksik.'; end if;
  if nullif(trim(p_kategori_adi),'') is null then raise exception 'Gider kategorisi adı boş bırakılamaz.'; end if;
  if p_sira_no is not null and p_sira_no<1 then raise exception 'Sıra numarası en az 1 olmalıdır.'; end if;
  if exists(select 1 from public.gider_kategorileri where lower(trim(kategori_adi))=lower(trim(p_kategori_adi)) and kategori_id<>p_kategori_id) then raise exception 'Aynı adla başka bir gider kategorisi zaten var.'; end if;
  v_yeni := not exists(select 1 from public.gider_kategorileri where kategori_id=p_kategori_id);
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
$$;

revoke all on function public.kasa_hesabi_kaydet_guvenli_v1(text,text,text,text,text,numeric,boolean,text) from public, anon;
revoke all on function public.gider_kategorisi_kaydet_guvenli_v1(text,text,text,integer,boolean,text) from public, anon;
grant execute on function public.kasa_hesabi_kaydet_guvenli_v1(text,text,text,text,text,numeric,boolean,text) to authenticated, service_role;
grant execute on function public.gider_kategorisi_kaydet_guvenli_v1(text,text,text,integer,boolean,text) to authenticated, service_role;
