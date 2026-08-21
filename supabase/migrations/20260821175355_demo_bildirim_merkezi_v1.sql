-- BS Eğitim Demo Bildirim Merkezi V1
-- Bildirimler yalnız anonim aktif demo oturumuna aittir ve oturum silinince cascade ile temizlenir.

create table if not exists public.bildirimler(
  bildirim_id uuid primary key default gen_random_uuid(),
  demo_oturum_id uuid not null references public.demo_oturumlari(auth_user_id) on delete cascade,
  demo_anahtar text not null,
  kategori text not null,
  baslik text not null,
  icerik text not null,
  oncelik text not null default 'Normal' check(oncelik in('Düşük','Normal','Yüksek','Kritik')),
  kaynak text not null default 'Sistem',
  alici_turu text not null default 'Yönetici',
  alici_id text,
  ilgili_kayit_turu text,
  ilgili_kayit_id text,
  eylem_yolu text,
  meta jsonb not null default '{}'::jsonb,
  aktif boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  son_gecerlilik_zamani timestamptz,
  unique(demo_oturum_id,demo_anahtar)
);
create index if not exists demo_bildirimler_oturum_idx on public.bildirimler(demo_oturum_id,olusturulma_zamani desc);
create index if not exists demo_bildirimler_kategori_idx on public.bildirimler(demo_oturum_id,kategori,olusturulma_zamani desc);

create table if not exists public.bildirim_okumalari(
  bildirim_id uuid not null references public.bildirimler(bildirim_id) on delete cascade,
  auth_user_id uuid not null references public.demo_oturumlari(auth_user_id) on delete cascade,
  okunma_zamani timestamptz not null default now(),
  primary key(bildirim_id,auth_user_id)
);

alter table public.bildirimler enable row level security;
alter table public.bildirim_okumalari enable row level security;
revoke all on table public.bildirimler from anon,authenticated;
revoke all on table public.bildirim_okumalari from anon,authenticated;
grant all on table public.bildirimler to service_role;
grant all on table public.bildirim_okumalari to service_role;

create or replace function private.demo_bildirim_seed_v1(p_uid uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_program integer;v_ogrenci integer;v_finans integer;
begin
  if p_uid is null then return;end if;
  select count(*)::integer into v_program from public.sabit_ders_programi where demo_oturum_id=p_uid and coalesce(aktif,true)=true and coalesce(program_durumu,'Aktif')<>'Pasif';
  select count(*)::integer into v_ogrenci from public.ogrenciler where demo_oturum_id=p_uid and coalesce(durum,'Aktif')<>'Pasif';
  select count(*)::integer into v_finans from public.kasa_hesaplari where demo_oturum_id=p_uid and coalesce(aktif,true)=true;
  insert into public.bildirimler(demo_oturum_id,demo_anahtar,kategori,baslik,icerik,oncelik,kaynak,alici_turu,eylem_yolu,meta) values
    (p_uid,'hosgeldin','Sistem','Demo ortamı hazır','Bu iki saatlik demo oturumu yalnız size aittir. Yaptığınız değişiklikler diğer ziyaretçileri ve canlı BS Eğitim verilerini etkilemez.','Normal','BS Eğitim Demo','Yönetici','/',jsonb_build_object('oturum','İzole Demo')),
    (p_uid,'program','Program','Program verileri hazır',format('%s aktif öğrenci ve %s aktif sabit program ile takvim akışını deneyebilirsiniz.',v_ogrenci,v_program),'Normal','BS Eğitim Demo','Yönetici','/takvim',jsonb_build_object('ogrenci_sayisi',v_ogrenci,'program_sayisi',v_program)),
    (p_uid,'ayarlar','Sistem','Ayarlar Merkezi kullanıma hazır','Branş, derslik, kasa/banka ve gider kategorisi tanımlarını bu demo oturumunda güvenle değiştirebilirsiniz.','Yüksek','BS Eğitim Demo','Yönetici','/ayarlar',jsonb_build_object('guvenlik','Yalnız bu demo oturumu')),
    (p_uid,'finans','Finans','Finans örnekleri hazır',format('%s aktif kasa/banka hesabı ile tahsilat, gider ve kasa akışlarını inceleyebilirsiniz.',v_finans),'Normal','BS Eğitim Demo','Yönetici','/finans',jsonb_build_object('hesap_sayisi',v_finans))
  on conflict(demo_oturum_id,demo_anahtar) do nothing;
end $$;
revoke all on function private.demo_bildirim_seed_v1(uuid) from public,anon,authenticated;

create or replace function public.bildirimlerim_v1(p_limit integer default 100)
returns table(bildirim_id uuid,kategori text,baslik text,icerik text,oncelik text,kaynak text,alici_turu text,alici_id text,ilgili_kayit_turu text,ilgili_kayit_id text,eylem_yolu text,meta jsonb,olusturulma_zamani timestamptz,okundu boolean,okunma_zamani timestamptz)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.';end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU';end if;
  if p_limit is null or p_limit<1 or p_limit>200 then p_limit:=100;end if;
  perform private.demo_bildirim_seed_v1(v_uid);
  return query select b.bildirim_id,b.kategori,b.baslik,b.icerik,b.oncelik,b.kaynak,b.alici_turu,b.alici_id,b.ilgili_kayit_turu,b.ilgili_kayit_id,b.eylem_yolu,b.meta,b.olusturulma_zamani,(bo.auth_user_id is not null),bo.okunma_zamani
    from public.bildirimler b left join public.bildirim_okumalari bo on bo.bildirim_id=b.bildirim_id and bo.auth_user_id=v_uid
    where b.demo_oturum_id=v_uid and b.aktif=true and(b.son_gecerlilik_zamani is null or b.son_gecerlilik_zamani>now()) order by b.olusturulma_zamani desc limit p_limit;
end $$;

create or replace function public.bildirim_okundu_v1(p_bildirim_id uuid,p_okundu boolean default true)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Geçerli demo oturumu bulunamadı.';end if;
  if not exists(select 1 from public.demo_oturumlari where auth_user_id=v_uid and durum='Aktif' and bitis_zamani>now()) then raise exception 'DEMO_SURE_DOLDU';end if;
  if p_bildirim_id is null then raise exception 'Bildirim kimliği eksik.';end if;
  if not exists(select 1 from public.bildirimler where bildirim_id=p_bildirim_id and demo_oturum_id=v_uid and aktif=true and(son_gecerlilik_zamani is null or son_gecerlilik_zamani>now())) then raise exception 'Bu bildirime erişim yetkiniz yok.';end if;
  if coalesce(p_okundu,true) then insert into public.bildirim_okumalari(bildirim_id,auth_user_id,okunma_zamani) values(p_bildirim_id,v_uid,now()) on conflict(bildirim_id,auth_user_id) do update set okunma_zamani=excluded.okunma_zamani;
  else delete from public.bildirim_okumalari where bildirim_id=p_bildirim_id and auth_user_id=v_uid;end if;
  return jsonb_build_object('basarili',true,'bildirim_id',p_bildirim_id,'okundu',coalesce(p_okundu,true));
end $$;

create or replace function public.bildirim_okunmamis_sayisi_v1()
returns integer language plpgsql security definer set search_path=''
as $$
declare v_count integer;begin select count(*)::integer into v_count from public.bildirimlerim_v1(200) b where b.okundu=false;return coalesce(v_count,0);end $$;

revoke all on function public.bildirimlerim_v1(integer) from public,anon;
revoke all on function public.bildirim_okundu_v1(uuid,boolean) from public,anon;
revoke all on function public.bildirim_okunmamis_sayisi_v1() from public,anon;
grant execute on function public.bildirimlerim_v1(integer) to authenticated,service_role;
grant execute on function public.bildirim_okundu_v1(uuid,boolean) to authenticated,service_role;
grant execute on function public.bildirim_okunmamis_sayisi_v1() to authenticated,service_role;
