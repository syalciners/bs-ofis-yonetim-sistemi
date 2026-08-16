-- BS Eğitim Yönetimi — 2026-08-16 canlı tablo baseline
-- Gerçek veri ve gizli ayar değeri içermez.

create schema if not exists private;
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists private.finans_v18_edge_ayar (
  id boolean default true not null,
  endpoint text not null,
  trigger_token text not null,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null
);

create table if not exists public.aylik_snapshotlar (
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

create table if not exists public.branslar (
  brans_id text not null,
  brans_adi text not null,
  varsayilan_ogretmen_id text,
  aktif boolean default true,
  kaynakta_var boolean default true not null
);

create table if not exists public.dersler (
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

create table if not exists public.derslikler (
  derslik_id text not null,
  mekan_adi text not null,
  mekan_turu text,
  kapasite integer,
  aktif boolean default true,
  aciklama text,
  kaynakta_var boolean default true not null
);

create table if not exists public.gider_kategorileri (
  kategori_id text not null,
  kategori_adi text not null,
  grup text,
  aktif boolean default true,
  sira_no integer,
  aciklama text,
  olusturan text,
  olusturulma_zamani timestamp with time zone
);

create table if not exists public.giderler (
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

create table if not exists public.haftalik_ders_uretimleri (
  hafta_baslangici date not null,
  olusturulan integer default 0 not null,
  zaten_mevcut integer default 0 not null,
  cakisma integer default 0 not null,
  hatali integer default 0 not null,
  olusturan text,
  olusturulma_zamani timestamp with time zone default now() not null
);

create table if not exists public.hakedis_donemleri (
  hakedis_donemi_id text not null,
  donem_adi text not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  aktif boolean default true,
  aciklama text
);

create table if not exists public.kasa_hareketleri (
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

create table if not exists public.kasa_hesaplari (
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

create table if not exists public.krediler (
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

create table if not exists public.kullanici_profilleri (
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

create table if not exists public.odevler (
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

create table if not exists public.ogrenciler (
  ogrenci_id text not null,
  ad_soyad text not null,
  veli_adi text,
  veli_telefon text,
  ogrenci_telefon text,
  email text,
  kayit_tarihi date,
  durum text,
  notlar text,
  kaynakta_var boolean default true not null
);

create table if not exists public.ogretmen_branslari (
  ogretmen_id text not null,
  brans_id text not null,
  aktif boolean default true not null,
  olusturulma_zamani timestamp with time zone default now() not null,
  guncellenme_zamani timestamp with time zone default now() not null
);

create table if not exists public.ogretmen_odemeleri (
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

create table if not exists public.ogretmenler (
  ogretmen_id text not null,
  ad_soyad text not null,
  branslar text,
  telefon text,
  email text,
  durum text,
  notlar text,
  rol text,
  kaynakta_var boolean default true not null
);

create table if not exists public.rapor_talepleri (
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

create table if not exists public.sabit_ders_programi (
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

create table if not exists public.sabit_program_istisnalari (
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

create table if not exists public.tahsilatlar (
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

create table if not exists public.tarifeler (
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
