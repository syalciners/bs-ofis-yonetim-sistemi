create table if not exists public.bildirimler (
  bildirim_id uuid primary key default gen_random_uuid(),
  kategori text not null,
  baslik text not null,
  icerik text not null,
  oncelik text not null default 'Normal' check (oncelik in ('Düşük','Normal','Yüksek','Kritik')),
  kaynak text not null default 'Sistem',
  alici_turu text not null check (alici_turu in ('Yönetici','Öğretmen','Öğrenci','Veli','Tüm Kullanıcılar')),
  alici_id text,
  ilgili_kayit_turu text,
  ilgili_kayit_id text,
  eylem_yolu text,
  meta jsonb not null default '{}'::jsonb,
  aktif boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  son_gecerlilik_zamani timestamptz
);

create index if not exists bildirimler_alici_idx
  on public.bildirimler (alici_turu, alici_id, olusturulma_zamani desc);

create index if not exists bildirimler_kategori_idx
  on public.bildirimler (kategori, olusturulma_zamani desc);

create table if not exists public.bildirim_okumalari (
  bildirim_id uuid not null references public.bildirimler(bildirim_id) on delete cascade,
  auth_user_id uuid not null,
  okunma_zamani timestamptz not null default now(),
  primary key (bildirim_id, auth_user_id)
);

create index if not exists bildirim_okumalari_kullanici_idx
  on public.bildirim_okumalari (auth_user_id, okunma_zamani desc);

alter table public.bildirimler enable row level security;
alter table public.bildirim_okumalari enable row level security;

revoke all on table public.bildirimler from anon, authenticated;
revoke all on table public.bildirim_okumalari from anon, authenticated;
grant all on table public.bildirimler to service_role;
grant all on table public.bildirim_okumalari to service_role;

create or replace function public.bildirimlerim_v1(p_limit integer default 100)
returns table(
  bildirim_id uuid,
  kategori text,
  baslik text,
  icerik text,
  oncelik text,
  kaynak text,
  alici_turu text,
  alici_id text,
  ilgili_kayit_turu text,
  ilgili_kayit_id text,
  eylem_yolu text,
  meta jsonb,
  olusturulma_zamani timestamptz,
  okundu boolean,
  okunma_zamani timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_alici_id text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select kp.rol
    into v_rol
  from public.kullanici_profilleri kp
  where kp.auth_user_id = v_uid
    and kp.aktif = true;

  if found then
    if v_rol <> 'Yönetici' then
      raise exception 'Bu kullanıcı rolü bildirim merkezi için desteklenmiyor.';
    end if;
    v_alici_id := null;
  else
    select k.rol,
           case when k.rol = 'Öğrenci' then k.ogrenci_id else k.ogretmen_id end
      into v_rol, v_alici_id
    from private.portal_kimligi_epostadan_v2() k;
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    p_limit := 100;
  end if;

  return query
  select
    b.bildirim_id,
    b.kategori,
    b.baslik,
    b.icerik,
    b.oncelik,
    b.kaynak,
    b.alici_turu,
    b.alici_id,
    b.ilgili_kayit_turu,
    b.ilgili_kayit_id,
    b.eylem_yolu,
    b.meta,
    b.olusturulma_zamani,
    (bo.auth_user_id is not null) as okundu,
    bo.okunma_zamani
  from public.bildirimler b
  left join public.bildirim_okumalari bo
    on bo.bildirim_id = b.bildirim_id
   and bo.auth_user_id = v_uid
  where b.aktif = true
    and (b.son_gecerlilik_zamani is null or b.son_gecerlilik_zamani > now())
    and (
      b.alici_turu = 'Tüm Kullanıcılar'
      or (v_rol = 'Yönetici' and b.alici_turu = 'Yönetici')
      or (v_rol in ('Öğrenci','Öğretmen') and b.alici_turu = v_rol and (b.alici_id is null or b.alici_id = v_alici_id))
    )
  order by b.olusturulma_zamani desc
  limit p_limit;
end;
$$;

create or replace function public.bildirim_okundu_v1(p_bildirim_id uuid, p_okundu boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_alici_id text;
  v_yetkili boolean := false;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;
  if p_bildirim_id is null then
    raise exception 'Bildirim kimliği eksik.';
  end if;

  select kp.rol
    into v_rol
  from public.kullanici_profilleri kp
  where kp.auth_user_id = v_uid
    and kp.aktif = true;

  if found then
    if v_rol <> 'Yönetici' then
      raise exception 'Bu kullanıcı rolü bildirim merkezi için desteklenmiyor.';
    end if;
    v_alici_id := null;
  else
    select k.rol,
           case when k.rol = 'Öğrenci' then k.ogrenci_id else k.ogretmen_id end
      into v_rol, v_alici_id
    from private.portal_kimligi_epostadan_v2() k;
  end if;

  select exists (
    select 1
    from public.bildirimler b
    where b.bildirim_id = p_bildirim_id
      and b.aktif = true
      and (b.son_gecerlilik_zamani is null or b.son_gecerlilik_zamani > now())
      and (
        b.alici_turu = 'Tüm Kullanıcılar'
        or (v_rol = 'Yönetici' and b.alici_turu = 'Yönetici')
        or (v_rol in ('Öğrenci','Öğretmen') and b.alici_turu = v_rol and (b.alici_id is null or b.alici_id = v_alici_id))
      )
  ) into v_yetkili;

  if not v_yetkili then
    raise exception 'Bu bildirime erişim yetkiniz yok.';
  end if;

  if coalesce(p_okundu, true) then
    insert into public.bildirim_okumalari(bildirim_id, auth_user_id, okunma_zamani)
    values(p_bildirim_id, v_uid, now())
    on conflict (bildirim_id, auth_user_id)
    do update set okunma_zamani = excluded.okunma_zamani;
  else
    delete from public.bildirim_okumalari
    where bildirim_id = p_bildirim_id
      and auth_user_id = v_uid;
  end if;

  return jsonb_build_object('basarili', true, 'bildirim_id', p_bildirim_id, 'okundu', coalesce(p_okundu, true));
end;
$$;

create or replace function public.bildirim_okunmamis_sayisi_v1()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.bildirimlerim_v1(200) b
  where b.okundu = false;
$$;

revoke all on function public.bildirimlerim_v1(integer) from public, anon;
revoke all on function public.bildirim_okundu_v1(uuid, boolean) from public, anon;
revoke all on function public.bildirim_okunmamis_sayisi_v1() from public, anon;
grant execute on function public.bildirimlerim_v1(integer) to authenticated, service_role;
grant execute on function public.bildirim_okundu_v1(uuid, boolean) to authenticated, service_role;
grant execute on function public.bildirim_okunmamis_sayisi_v1() to authenticated, service_role;
