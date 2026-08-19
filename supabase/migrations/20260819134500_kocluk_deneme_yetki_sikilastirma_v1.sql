revoke all on table public.kocluk_deneme_sinavlari from public, anon, authenticated;
revoke all on table public.kocluk_deneme_bolum_sonuclari from public, anon, authenticated;

grant select on table public.kocluk_deneme_sinavlari to authenticated;
grant select on table public.kocluk_deneme_bolum_sonuclari to authenticated;
grant all on table public.kocluk_deneme_sinavlari to service_role;
grant all on table public.kocluk_deneme_bolum_sonuclari to service_role;
