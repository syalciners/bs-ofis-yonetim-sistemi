create or replace function private.bs_program_tarih_kontrol_v1(p_program_id text, p_tarih date, p_baslangic_saati time without time zone, p_derslik_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_program public.sabit_ders_programi%rowtype;
  v_bas timestamp;
  v_bit timestamp;
  v_kapasite integer;
  v_ogrenci boolean:=false;
  v_ogretmen boolean:=false;
  v_eszamanli integer:=0;
begin
  select * into v_program from public.sabit_ders_programi where program_id=p_program_id and program_durumu='Aktif';
  if not found then raise exception 'Aktif sabit program bulunamadı.'; end if;
  select greatest(coalesce(kapasite,1),1) into v_kapasite from public.derslikler where derslik_id=p_derslik_id and coalesce(aktif,true);
  if v_kapasite is null then raise exception 'Aktif derslik bulunamadı.'; end if;
  v_bas:=p_tarih::timestamp+p_baslangic_saati;
  v_bit:=v_bas+(coalesce(v_program.ders_sayisi,1)*interval '1 hour');
  if v_bit::date<>p_tarih then return jsonb_build_object('uygun',false,'gun_siniri',true,'ogrenci_cakisma',false,'ogretmen_cakisma',false,'derslik_dolu',false); end if;

  with kaynak as (
    select d.ogrenci_id,d.ogretmen_id,d.derslik_id,
           p_tarih::timestamp+d.baslangic_saati as bas,
           p_tarih::timestamp+d.bitis_saati as bit
    from public.dersler d
    where d.tarih=p_tarih
      and d.program_id is distinct from p_program_id
      and coalesce(d.ders_durumu,'') not in ('İptal','Ertelendi','Öğretmen İptali')
      and d.baslangic_saati is not null and d.bitis_saati is not null
    union all
    select p.ogrenci_id,p.ogretmen_id,p.derslik_id,
           p_tarih::timestamp+p.baslangic_saati as bas,
           p_tarih::timestamp+p.baslangic_saati+(coalesce(p.ders_sayisi,1)*interval '1 hour') as bit
    from public.sabit_ders_programi p
    where p.program_durumu='Aktif'
      and p.program_id<>p_program_id
      and private.sabit_program_tarih_uygun_mu(p.program_id,p_tarih)
      and not exists(select 1 from public.sabit_program_istisnalari i where i.program_id=p.program_id and i.orijinal_tarih=p_tarih and i.iptal_mi=false)
      and not exists(select 1 from public.dersler d where d.program_id=p.program_id and d.tarih=p_tarih)
  ), cakisan as (
    select * from kaynak where bas<v_bit and v_bas<bit
  )
  select coalesce(bool_or(ogrenci_id=v_program.ogrenci_id),false),
         coalesce(bool_or(ogretmen_id=v_program.ogretmen_id),false),
         count(*) filter(where derslik_id=p_derslik_id)
  into v_ogrenci,v_ogretmen,v_eszamanli
  from cakisan;

  return jsonb_build_object(
    'uygun',not v_ogrenci and not v_ogretmen and v_eszamanli<v_kapasite,
    'ogrenci_cakisma',v_ogrenci,
    'ogretmen_cakisma',v_ogretmen,
    'derslik_dolu',v_eszamanli>=v_kapasite,
    'derslik_kapasite',v_kapasite,
    'derslik_eszamanli',v_eszamanli,
    'gun_siniri',false
  );
end;
$function$;
