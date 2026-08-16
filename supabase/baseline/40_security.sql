-- BS Eğitim Yönetimi — 2026-08-16 canlı güvenlik baseline
-- Canlı veritabanında UYGULANMAMIŞTIR; mevcut katalog durumunun kaydıdır.

alter table private.finans_v18_edge_ayar disable row level security;
alter table public.aylik_snapshotlar enable row level security;
alter table public.branslar enable row level security;
alter table public.dersler enable row level security;
alter table public.derslikler enable row level security;
alter table public.gider_kategorileri enable row level security;
alter table public.giderler enable row level security;
alter table public.haftalik_ders_uretimleri enable row level security;
alter table public.hakedis_donemleri enable row level security;
alter table public.kasa_hareketleri enable row level security;
alter table public.kasa_hesaplari enable row level security;
alter table public.krediler enable row level security;
alter table public.kullanici_profilleri enable row level security;
alter table public.odevler enable row level security;
alter table public.ogrenciler enable row level security;
alter table public.ogretmen_branslari enable row level security;
alter table public.ogretmen_odemeleri enable row level security;
alter table public.ogretmenler enable row level security;
alter table public.rapor_talepleri enable row level security;
alter table public.sabit_ders_programi enable row level security;
alter table public.sabit_program_istisnalari enable row level security;
alter table public.tahsilatlar enable row level security;
alter table public.tarifeler enable row level security;

-- haftalik_ders_uretimleri bilinçli olarak doğrudan kullanıcı policy'si taşımaz;
-- erişim SECURITY DEFINER RPC katmanı üzerinden yürür.

drop policy if exists yonetici_tam_erisim on public.aylik_snapshotlar;
create policy yonetici_tam_erisim on public.aylik_snapshotlar as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.branslar;
create policy yonetici_tam_erisim on public.branslar as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.dersler;
create policy yonetici_tam_erisim on public.dersler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.derslikler;
create policy yonetici_tam_erisim on public.derslikler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.gider_kategorileri;
create policy yonetici_tam_erisim on public.gider_kategorileri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.giderler;
create policy yonetici_tam_erisim on public.giderler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.hakedis_donemleri;
create policy yonetici_tam_erisim on public.hakedis_donemleri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.kasa_hareketleri;
create policy yonetici_tam_erisim on public.kasa_hareketleri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.kasa_hesaplari;
create policy yonetici_tam_erisim on public.kasa_hesaplari as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.krediler;
create policy yonetici_tam_erisim on public.krediler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.kullanici_profilleri;
create policy yonetici_tam_erisim on public.kullanici_profilleri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.odevler;
create policy yonetici_tam_erisim on public.odevler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.ogrenciler;
create policy yonetici_tam_erisim on public.ogrenciler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.ogretmen_branslari;
create policy yonetici_tam_erisim on public.ogretmen_branslari as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.ogretmen_odemeleri;
create policy yonetici_tam_erisim on public.ogretmen_odemeleri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.ogretmenler;
create policy yonetici_tam_erisim on public.ogretmenler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.rapor_talepleri;
create policy yonetici_tam_erisim on public.rapor_talepleri as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.sabit_ders_programi;
create policy yonetici_tam_erisim on public.sabit_ders_programi as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.sabit_program_istisnalari;
create policy yonetici_tam_erisim on public.sabit_program_istisnalari as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.tahsilatlar;
create policy yonetici_tam_erisim on public.tahsilatlar as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));
drop policy if exists yonetici_tam_erisim on public.tarifeler;
create policy yonetici_tam_erisim on public.tarifeler as permissive for all to authenticated using ((select private.bs_ofis_yonetici_mi())) with check ((select private.bs_ofis_yonetici_mi()));

drop trigger if exists trg_dersler_ogretmen_brans on public.dersler;
CREATE TRIGGER trg_dersler_ogretmen_brans BEFORE INSERT OR UPDATE OF ogretmen_id, brans_id ON public.dersler FOR EACH ROW EXECUTE FUNCTION private.bs_ofis_ogretmen_brans_dogrula_v1();

drop trigger if exists trg_sabit_program_ogretmen_brans on public.sabit_ders_programi;
CREATE TRIGGER trg_sabit_program_ogretmen_brans BEFORE INSERT OR UPDATE OF ogretmen_id, brans_id ON public.sabit_ders_programi FOR EACH ROW EXECUTE FUNCTION private.bs_ofis_ogretmen_brans_dogrula_v1();
