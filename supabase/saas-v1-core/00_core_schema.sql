-- BS Eğitim SaaS V1 Core schema
-- Kaynak: çalışan canlı katalogdan sanitize edilmiş dedicated-instance baseline.
-- Koçluk / md_* / Finans Asistanı nesneleri içermez.
-- Bu dosya boş bir Supabase instance üzerinde uygulanmak üzere tasarlanır.

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table public.aylik_snapshotlar (
  snapshot_id text not null,
  snapshot_tarihi timestamp with time zone not null,
  yil integer not null,
  ay integer not null,
  kayit_turu text not null,
  ogrenci_id text,
  ogretmen_id text,
  toplam_ders_borcu numeric default 0,
  toplam_odeme numeric default 0,
  kalan_bakiye numeric default 0,
  toplam_hakedis numeric default 0,
  toplam_ogretmen_odeme numeric default 0,
  kalan_hakedis numeric default 0
);

create table public.bildirim_okumalari (
  bildirim_id uuid not null,
  auth_user_id uuid not null,
  okunma_zamani timestamp with time zone default now() not null
);

create table public.bildirimler (
  bildirim_id uuid default gen_random_uuid() not null,
  kategori text not null,
  baslik text not null,
  icerik text not null,
  oncelik text default 'Normal'::text not null,
  kaynak text default 'Sistem'::text not null,
  alici_turu text not null,
  alici_id text,
  ilgili_kayit_turu text,
  ilgili_kayit_id text,
  eylem_yolu text,
  meta jsonb default '{}'::jsonb not null,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  son_gecerlilik_zamani timestamp with time zone
);

create table public.branslar (
  brans_id text not null,
  brans_adi text not null,
  varsayilan_ogretmen_id text,
  aktif boolean default true,
  kaynakta_var boolean default true not null
);

create table public.dersler (
  ders_id text not null,
  program_id text,
  tarih date,
  ogrenci_id text,
  ogretmen_id text,
  brans_id text,
  derslik_id text,
  ders_sayisi numeric(8,2),
  ogrenci_birim_ucreti numeric(12,2),
  ogretmen_birim_hakedisi numeric(12,2),
  ogrenci_toplam_tutar numeric(12,2),
  ogretmen_toplam_hakedis numeric(12,2),
  ders_durumu text,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  baslangic_saati time without time zone,
  bitis_saati time without time zone,
  ders_turu text,
  ders_yeri text,
  akademik_yil text,
  ders_ayi text,
  hafta_no text,
  son_degistiren text,
  son_degistirme_zamani timestamp with time zone,
  zoom_toplanti_id text,
  zoom_katilim_baglantisi text,
  zoom_sifre text,
  zoom_islem_durumu text,
  zoom_hata_mesaji text,
  zoom_olusturulma_zamani timestamp with time zone,
  zoom_guncellenme_zamani timestamp with time zone,
  kaynakta_var boolean default true not null
);

create table public.derslikler (
  derslik_id text not null,
  mekan_adi text not null,
  mekan_turu text,
  kapasite integer,
  aktif boolean default true,
  aciklama text,
  kaynakta_var boolean default true not null
);

create table public.gider_kategorileri (
  kategori_id text not null,
  kategori_adi text not null,
  grup text,
  aktif boolean default true,
  sira_no integer,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone
);

create table public.giderler (
  gider_id text not null,
  tarih date not null,
  kategori_id text,
  tutar numeric not null,
  odeme_yontemi text,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone default now() not null,
  hesap_id text,
  odeme_durumu text default 'Ödendi'::text not null,
  kasa_hareket_id text,
  iptal_mi boolean default false not null,
  guncelleyen text,
  guncellenme_tarihi timestamp with time zone,
  kaynakta_var boolean default true not null
);

create table public.haftalik_ders_uretimleri (
  hafta_baslangici date not null,
  olusturulan integer default 0 not null,
  zaten_mevcut integer default 0 not null,
  cakisma integer default 0 not null,
  hatali integer default 0 not null,
  olusturan text,
  olusturulma_zamani timestamp with time zone default now() not null
);

create table public.hakedis_donemleri (
  hakedis_donemi_id text not null,
  donem_adi text not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  aktif boolean default true,
  aciklama text
);

create table public.kasa_hareketleri (
  hareket_id text not null,
  tarih date not null,
  hareket_turu text,
  kaynak_turu text,
  kaynak_id text,
  hesap_id text,
  tutar numeric(12,2) not null,
  aciklama text,
  ogrenci_id text,
  ogretmen_id text,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  iptal_mi boolean default false,
  durum text default 'Tamamlandı'::text,
  kaynakta_var boolean default true not null
);

create table public.kasa_hesaplari (
  hesap_id text not null,
  hesap_adi text not null,
  hesap_turu text,
  banka_adi text,
  iban text,
  acilis_bakiyesi numeric(12,2) default 0,
  aktif boolean default true,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  kaynakta_var boolean default true not null
);

create table public.krediler (
  kredi_id text not null,
  kredi_adi text not null,
  kredi_sahibi text,
  banka_adi text,
  toplam_taksit integer,
  odenen_taksit integer default 0,
  aylik_taksit_tutari numeric,
  baslangic_tarihi date,
  aktif boolean default true not null,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null
);

create table public.kullanici_profilleri (
  auth_user_id uuid not null,
  email text not null,
  ad_soyad text not null,
  rol text not null,
  ogretmen_id text,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null,
  telefon text
);

create table public.kurum_ayarlari (
  kurum_id text not null,
  kurum_adi text not null,
  marka_adi text not null,
  telefon text,
  email text,
  adres text,
  logo_url text,
  guncellenme_zamani timestamp with time zone default now() not null,
  guncelleyen uuid,
  varsayilan_ders_birimi smallint default 1 not null,
  takvim_baslangic_saati time without time zone default '08:00:00'::time without time zone not null,
  takvim_bitis_saati time without time zone default '21:00:00'::time without time zone not null
);

create table public.odevler (
  odev_id text not null,
  ogrenci_id text not null,
  ogretmen_id text not null,
  ders_id text,
  konu text,
  odev_basligi text,
  odev_aciklamasi text,
  verilis_tarihi date not null,
  son_teslim_tarihi date,
  durum text default 'Verildi'::text not null,
  oncelik text,
  odev_fotografi text,
  odev_dosyasi text,
  teslim_dosyasi text,
  ogretmen_notu text,
  puan text,
  tamamlanma_tarihi date,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  son_guncelleyen text,
  son_guncellenme_zamani timestamp with time zone,
  odev_dosya_linki text,
  odev_fotograf_linki text,
  kaynakta_var boolean default true not null
);

create table public.ogrenciler (
  ogrenci_id text not null,
  ad_soyad text not null,
  veli_adi text,
  veli_telefon text,
  ogrenci_telefon text,
  email text,
  kayit_tarihi date,
  durum text,
  notlar text,
  kaynakta_var boolean default true not null,
  profil_fotografi text
);

create table public.ogretmen_branslari (
  ogretmen_id text not null,
  brans_id text not null,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null
);

create table public.ogretmen_odemeleri (
  ogretmen_odeme_id text not null,
  tarih date,
  hakedis_donemi_id text,
  ogretmen_id text,
  tutar numeric(12,2),
  odeme_yontemi text,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  hesap_id text,
  kasa_hareket_id text,
  iptal_mi boolean default false,
  guncelleyen text,
  guncelleme_tarihi text,
  kaynakta_var boolean default true not null
);

create table public.ogretmenler (
  ogretmen_id text not null,
  ad_soyad text not null,
  branslar text,
  telefon text,
  email text,
  durum text,
  notlar text,
  rol text,
  kaynakta_var boolean default true not null,
  profil_fotografi text
);

create table public.portal_kullanicilari (
  auth_user_id uuid not null,
  rol text not null,
  ogrenci_id text,
  ogretmen_id text,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null
);

create table public.rapor_talepleri (
  rapor_talep_id text not null,
  rapor_turu text not null,
  ogrenci_id text,
  ogretmen_id text,
  baslangic_tarihi date,
  bitis_tarihi date,
  rapor_tarihi date,
  talep_eden_email text,
  durum text,
  pdf_dosyasi text,
  pdf_link text,
  olusturulma_zamani timestamp with time zone,
  kaynak_sistem text default 'AppSheet'::text not null
);

create table public.sabit_ders_programi (
  program_id text not null,
  ogrenci_id text,
  ogretmen_id text,
  brans_id text,
  derslik_id text,
  haftanin_gunu text,
  baslangic_saati time without time zone,
  ders_sayisi numeric(8,2),
  ogrenci_birim_ucreti numeric(12,2),
  ogretmen_birim_hakedisi numeric(12,2),
  baslangic_tarihi date,
  bitis_tarihi date,
  aktif boolean default true,
  program_durumu text default 'Aktif'::text,
  aciklama text,
  kaynak_sistem text default 'AppSheet'::text,
  kaynak_hash text,
  senkron_zamani timestamp with time zone default now(),
  tekrar_sikligi text default 'Her Hafta'::text not null,
  kaynakta_var boolean default true not null
);

create table public.sabit_program_istisnalari (
  istisna_id uuid default gen_random_uuid() not null,
  program_id text not null,
  orijinal_tarih date not null,
  tur text not null,
  orijinal_ders_id text,
  yeni_ders_id text,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone default now() not null,
  iptal_mi boolean default false not null,
  guncelleyen text,
  guncellenme_zamani timestamp with time zone
);

create table public.tahsilatlar (
  tahsilat_id text not null,
  tarih date not null,
  ogrenci_id text not null,
  tutar numeric(12,2) not null,
  odeme_yontemi text,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone,
  hesap_id text,
  kaynakta_var boolean default true not null,
  iptal_mi boolean default false not null,
  guncelleyen text,
  guncellenme_zamani timestamp with time zone
);

create table public.tarifeler (
  tarife_id text not null,
  ogrenci_id text,
  ogrenci_adi text,
  ogretmen_id text,
  ogretmen_adi text,
  brans_id text,
  brans_adi text,
  ogrenci_birim_ucreti numeric,
  ogretmen_birim_hakedisi numeric,
  baslangic_tarihi date,
  bitis_tarihi date,
  aktif boolean default true not null
);

-- Constraints
alter table public.aylik_snapshotlar add constraint aylik_snapshotlar_ay_check check (ay >= 1 and ay <= 12);
alter table public.aylik_snapshotlar add constraint aylik_snapshotlar_ogrenci_id_fkey foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id);
alter table public.aylik_snapshotlar add constraint aylik_snapshotlar_ogretmen_id_fkey foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id);
alter table public.aylik_snapshotlar add constraint aylik_snapshotlar_pkey primary key (snapshot_id);
alter table public.bildirim_okumalari add constraint bildirim_okumalari_bildirim_id_fkey foreign key (bildirim_id) references public.bildirimler(bildirim_id) on delete cascade;
alter table public.bildirim_okumalari add constraint bildirim_okumalari_pkey primary key (bildirim_id, auth_user_id);
alter table public.bildirimler add constraint bildirimler_alici_turu_check check (alici_turu = any (array['Yönetici'::text, 'Öğretmen'::text, 'Öğrenci'::text, 'Veli'::text, 'Tüm Kullanıcılar'::text]));
alter table public.bildirimler add constraint bildirimler_oncelik_check check (oncelik = any (array['Düşük'::text, 'Normal'::text, 'Yüksek'::text, 'Kritik'::text]));
alter table public.bildirimler add constraint bildirimler_pkey primary key (bildirim_id);
alter table public.branslar add constraint branslar_pkey primary key (brans_id);
alter table public.branslar add constraint fk_branslar_varsayilan_ogretmen foreign key (varsayilan_ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.dersler add constraint dersler_pkey primary key (ders_id);
alter table public.dersler add constraint fk_dersler_brans foreign key (brans_id) references public.branslar(brans_id) on delete restrict;
alter table public.dersler add constraint fk_dersler_derslik foreign key (derslik_id) references public.derslikler(derslik_id) on delete restrict;
alter table public.dersler add constraint fk_dersler_ogrenci foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.dersler add constraint fk_dersler_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.dersler add constraint fk_dersler_program foreign key (program_id) references public.sabit_ders_programi(program_id) on delete restrict;
alter table public.derslikler add constraint derslikler_pkey primary key (derslik_id);
alter table public.gider_kategorileri add constraint gider_kategorileri_pkey primary key (kategori_id);
alter table public.giderler add constraint giderler_hesap_id_fkey foreign key (hesap_id) references public.kasa_hesaplari(hesap_id);
alter table public.giderler add constraint giderler_kategori_id_fkey foreign key (kategori_id) references public.gider_kategorileri(kategori_id);
alter table public.giderler add constraint giderler_pkey primary key (gider_id);
alter table public.giderler add constraint giderler_tutar_check check (tutar > 0::numeric);
alter table public.haftalik_ders_uretimleri add constraint haftalik_ders_uretimleri_pkey primary key (hafta_baslangici);
alter table public.hakedis_donemleri add constraint hakedis_donemleri_pkey primary key (hakedis_donemi_id);
alter table public.kasa_hareketleri add constraint fk_kasa_hareketleri_hesap foreign key (hesap_id) references public.kasa_hesaplari(hesap_id) on delete restrict;
alter table public.kasa_hareketleri add constraint fk_kasa_hareketleri_ogrenci foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.kasa_hareketleri add constraint fk_kasa_hareketleri_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.kasa_hareketleri add constraint kasa_hareketleri_pkey primary key (hareket_id);
alter table public.kasa_hesaplari add constraint kasa_hesaplari_pkey primary key (hesap_id);
alter table public.krediler add constraint krediler_aylik_taksit_tutari_check check (aylik_taksit_tutari is null or aylik_taksit_tutari >= 0::numeric);
alter table public.krediler add constraint krediler_odenen_taksit_check check (odenen_taksit is null or odenen_taksit >= 0);
alter table public.krediler add constraint krediler_pkey primary key (kredi_id);
alter table public.krediler add constraint krediler_toplam_taksit_check check (toplam_taksit is null or toplam_taksit >= 0);
alter table public.kullanici_profilleri add constraint fk_kullanici_profilleri_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.kullanici_profilleri add constraint kullanici_profilleri_auth_user_id_fkey foreign key (auth_user_id) references auth.users(id) on delete restrict;
alter table public.kullanici_profilleri add constraint kullanici_profilleri_email_key unique (email);
alter table public.kullanici_profilleri add constraint kullanici_profilleri_pkey primary key (auth_user_id);
alter table public.kullanici_profilleri add constraint kullanici_profilleri_rol_check check (rol = any (array['Yönetici'::text, 'Personel'::text, 'Öğretmen'::text]));
alter table public.kurum_ayarlari add constraint kurum_ayarlari_pkey primary key (kurum_id);
alter table public.kurum_ayarlari add constraint kurum_ayarlari_takvim_saatleri_check check (takvim_baslangic_saati < takvim_bitis_saati);
alter table public.kurum_ayarlari add constraint kurum_ayarlari_tek_kayit check (kurum_id = 'ANA'::text);
alter table public.kurum_ayarlari add constraint kurum_ayarlari_varsayilan_ders_birimi_check check (varsayilan_ders_birimi >= 1 and varsayilan_ders_birimi <= 2);
alter table public.odevler add constraint fk_odevler_ders foreign key (ders_id) references public.dersler(ders_id) on delete restrict;
alter table public.odevler add constraint fk_odevler_ogrenci foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.odevler add constraint fk_odevler_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.odevler add constraint odevler_pkey primary key (odev_id);
alter table public.ogrenciler add constraint ogrenciler_pkey primary key (ogrenci_id);
alter table public.ogretmen_branslari add constraint ogretmen_branslari_pkey primary key (ogretmen_id, brans_id);
alter table public.ogretmen_odemeleri add constraint fk_ogretmen_odemeleri_donem foreign key (hakedis_donemi_id) references public.hakedis_donemleri(hakedis_donemi_id) on delete restrict;
alter table public.ogretmen_odemeleri add constraint fk_ogretmen_odemeleri_hesap foreign key (hesap_id) references public.kasa_hesaplari(hesap_id) on delete restrict;
alter table public.ogretmen_odemeleri add constraint fk_ogretmen_odemeleri_kasa_hareketi foreign key (kasa_hareket_id) references public.kasa_hareketleri(hareket_id) on delete restrict;
alter table public.ogretmen_odemeleri add constraint fk_ogretmen_odemeleri_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.ogretmen_odemeleri add constraint ogretmen_odemeleri_pkey primary key (ogretmen_odeme_id);
alter table public.ogretmenler add constraint ogretmenler_pkey primary key (ogretmen_id);
alter table public.portal_kullanicilari add constraint portal_kullanicilari_auth_user_id_fkey foreign key (auth_user_id) references auth.users(id) on delete cascade;
alter table public.portal_kullanicilari add constraint portal_kullanicilari_ogrenci_id_fkey foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.portal_kullanicilari add constraint portal_kullanicilari_ogretmen_id_fkey foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.portal_kullanicilari add constraint portal_kullanicilari_pkey primary key (auth_user_id);
alter table public.portal_kullanicilari add constraint portal_kullanicilari_rol_baglanti_ck check (rol = 'Öğretmen'::text and ogretmen_id is not null and ogrenci_id is null or rol = 'Öğrenci'::text and ogrenci_id is not null and ogretmen_id is null);
alter table public.portal_kullanicilari add constraint portal_kullanicilari_rol_check check (rol = any (array['Öğretmen'::text, 'Öğrenci'::text]));
alter table public.rapor_talepleri add constraint rapor_talepleri_ogrenci_id_fkey foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id);
alter table public.rapor_talepleri add constraint rapor_talepleri_ogretmen_id_fkey foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id);
alter table public.rapor_talepleri add constraint rapor_talepleri_pkey primary key (rapor_talep_id);
alter table public.sabit_ders_programi add constraint fk_sabit_program_brans foreign key (brans_id) references public.branslar(brans_id) on delete restrict;
alter table public.sabit_ders_programi add constraint fk_sabit_program_derslik foreign key (derslik_id) references public.derslikler(derslik_id) on delete restrict;
alter table public.sabit_ders_programi add constraint fk_sabit_program_ogrenci foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.sabit_ders_programi add constraint fk_sabit_program_ogretmen foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id) on delete restrict;
alter table public.sabit_ders_programi add constraint sabit_ders_programi_pkey primary key (program_id);
alter table public.sabit_ders_programi add constraint sabit_ders_programi_tekrar_sikligi_ck check (tekrar_sikligi = any (array['Her Hafta'::text, '2 Haftada Bir'::text, 'Ayda Bir'::text]));
alter table public.sabit_program_istisnalari add constraint sabit_program_istisnalari_orijinal_ders_id_fkey foreign key (orijinal_ders_id) references public.dersler(ders_id) on delete set null;
alter table public.sabit_program_istisnalari add constraint sabit_program_istisnalari_pkey primary key (istisna_id);
alter table public.sabit_program_istisnalari add constraint sabit_program_istisnalari_program_id_fkey foreign key (program_id) references public.sabit_ders_programi(program_id) on delete restrict;
alter table public.sabit_program_istisnalari add constraint sabit_program_istisnalari_tur_check check (tur = any (array['Atla'::text, 'Taşı'::text]));
alter table public.sabit_program_istisnalari add constraint sabit_program_istisnalari_yeni_ders_id_fkey foreign key (yeni_ders_id) references public.dersler(ders_id) on delete set null;
alter table public.tahsilatlar add constraint fk_tahsilatlar_hesap foreign key (hesap_id) references public.kasa_hesaplari(hesap_id) on delete restrict;
alter table public.tahsilatlar add constraint fk_tahsilatlar_ogrenci foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id) on delete restrict;
alter table public.tahsilatlar add constraint tahsilatlar_pkey primary key (tahsilat_id);
alter table public.tarifeler add constraint tarifeler_brans_id_fkey foreign key (brans_id) references public.branslar(brans_id);
alter table public.tarifeler add constraint tarifeler_ogrenci_id_fkey foreign key (ogrenci_id) references public.ogrenciler(ogrenci_id);
alter table public.tarifeler add constraint tarifeler_ogretmen_id_fkey foreign key (ogretmen_id) references public.ogretmenler(ogretmen_id);
alter table public.tarifeler add constraint tarifeler_pkey primary key (tarife_id);

-- Secondary indexes
create index aylik_snapshotlar_ogrenci_idx on public.aylik_snapshotlar using btree (ogrenci_id);
create index aylik_snapshotlar_ogretmen_idx on public.aylik_snapshotlar using btree (ogretmen_id);
create index aylik_snapshotlar_yil_ay_idx on public.aylik_snapshotlar using btree (yil, ay);
create index bildirim_okumalari_kullanici_idx on public.bildirim_okumalari using btree (auth_user_id, okunma_zamani desc);
create index bildirimler_alici_idx on public.bildirimler using btree (alici_turu, alici_id, olusturulma_zamani desc);
create index bildirimler_kategori_idx on public.bildirimler using btree (kategori, olusturulma_zamani desc);
create index idx_branslar_varsayilan_ogretmen on public.branslar using btree (varsayilan_ogretmen_id);
create index idx_dersler_brans on public.dersler using btree (brans_id);
create index idx_dersler_derslik on public.dersler using btree (derslik_id);
create index idx_dersler_durum on public.dersler using btree (ders_durumu);
create index idx_dersler_ogrenci on public.dersler using btree (ogrenci_id);
create index idx_dersler_ogretmen on public.dersler using btree (ogretmen_id);
create index idx_dersler_program on public.dersler using btree (program_id);
create index idx_dersler_tarih on public.dersler using btree (tarih);
create unique index ux_dersler_program_tarih on public.dersler using btree (program_id, tarih) where program_id is not null;
create index idx_gider_kategorileri_aktif on public.gider_kategorileri using btree (aktif);
create index idx_gider_kategorileri_grup on public.gider_kategorileri using btree (grup);
create index idx_gider_kategorileri_sira on public.gider_kategorileri using btree (sira_no);
create index giderler_hesap_idx on public.giderler using btree (hesap_id);
create index giderler_kategori_idx on public.giderler using btree (kategori_id);
create index giderler_tarih_idx on public.giderler using btree (tarih desc);
create index idx_hakedis_donemleri_aktif on public.hakedis_donemleri using btree (aktif);
create index idx_hakedis_donemleri_tarih on public.hakedis_donemleri using btree (baslangic_tarihi, bitis_tarihi);
create index idx_kasa_hareketleri_hesap on public.kasa_hareketleri using btree (hesap_id);
create index idx_kasa_hareketleri_kaynak on public.kasa_hareketleri using btree (kaynak_turu, kaynak_id);
create index idx_kasa_hareketleri_ogrenci on public.kasa_hareketleri using btree (ogrenci_id);
create index idx_kasa_hareketleri_ogretmen on public.kasa_hareketleri using btree (ogretmen_id);
create index idx_kasa_hareketleri_tarih on public.kasa_hareketleri using btree (tarih);
create index idx_kasa_hareketleri_tur on public.kasa_hareketleri using btree (hareket_turu);
create index idx_kasa_hesaplari_aktif on public.kasa_hesaplari using btree (aktif);
create index idx_kasa_hesaplari_tur on public.kasa_hesaplari using btree (hesap_turu);
create index krediler_aktif_idx on public.krediler using btree (aktif);
create index idx_kullanici_profilleri_aktif on public.kullanici_profilleri using btree (aktif);
create index idx_kullanici_profilleri_ogretmen on public.kullanici_profilleri using btree (ogretmen_id);
create index idx_kullanici_profilleri_rol on public.kullanici_profilleri using btree (rol);
create index idx_odevler_ders on public.odevler using btree (ders_id);
create index idx_odevler_durum on public.odevler using btree (durum);
create index idx_odevler_ogrenci on public.odevler using btree (ogrenci_id);
create index idx_odevler_ogretmen on public.odevler using btree (ogretmen_id);
create index idx_odevler_son_teslim_tarihi on public.odevler using btree (son_teslim_tarihi);
create index idx_odevler_verilis_tarihi on public.odevler using btree (verilis_tarihi);
create index idx_ogretmen_odemeleri_donem on public.ogretmen_odemeleri using btree (hakedis_donemi_id);
create index idx_ogretmen_odemeleri_hesap on public.ogretmen_odemeleri using btree (hesap_id);
create index idx_ogretmen_odemeleri_kasa_hareket on public.ogretmen_odemeleri using btree (kasa_hareket_id);
create index idx_ogretmen_odemeleri_ogretmen on public.ogretmen_odemeleri using btree (ogretmen_id);
create index idx_ogretmen_odemeleri_tarih on public.ogretmen_odemeleri using btree (tarih);
create unique index portal_kullanicilari_ogrenci_uniq on public.portal_kullanicilari using btree (ogrenci_id) where ogrenci_id is not null;
create unique index portal_kullanicilari_ogretmen_uniq on public.portal_kullanicilari using btree (ogretmen_id) where ogretmen_id is not null;
create index rapor_talepleri_ogrenci_idx on public.rapor_talepleri using btree (ogrenci_id);
create index rapor_talepleri_ogretmen_idx on public.rapor_talepleri using btree (ogretmen_id);
create index rapor_talepleri_tarih_idx on public.rapor_talepleri using btree (rapor_tarihi desc);
create index idx_sabit_program_brans on public.sabit_ders_programi using btree (brans_id);
create index idx_sabit_program_derslik on public.sabit_ders_programi using btree (derslik_id);
create index idx_sabit_program_ogrenci on public.sabit_ders_programi using btree (ogrenci_id);
create index idx_sabit_program_ogretmen on public.sabit_ders_programi using btree (ogretmen_id);
create index ix_sabit_program_istisna_tarih on public.sabit_program_istisnalari using btree (orijinal_tarih) where iptal_mi = false;
create unique index ux_sabit_program_istisna_aktif on public.sabit_program_istisnalari using btree (program_id, orijinal_tarih) where iptal_mi = false;
create index idx_tahsilatlar_hesap on public.tahsilatlar using btree (hesap_id);
create index idx_tahsilatlar_ogrenci on public.tahsilatlar using btree (ogrenci_id);
create index idx_tahsilatlar_tarih on public.tahsilatlar using btree (tarih);
create index tarifeler_aktif_tarih_idx on public.tarifeler using btree (aktif, baslangic_tarihi, bitis_tarihi);
create index tarifeler_brans_idx on public.tarifeler using btree (brans_id);
create index tarifeler_ogrenci_idx on public.tarifeler using btree (ogrenci_id);
create index tarifeler_ogretmen_idx on public.tarifeler using btree (ogretmen_id);
