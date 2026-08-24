export type Id = string

export interface Ogrenci {
  ogrenci_id: Id
  ad_soyad: string
  veli_adi?: string | null
  veli_telefon?: string | null
  ogrenci_telefon?: string | null
  email?: string | null
  kayit_tarihi?: string | null
  durum?: string | null
  notlar?: string | null
  profil_fotografi?: string | null
}

export interface Ogretmen {
  ogretmen_id: Id
  ad_soyad: string
  branslar?: string | null
  telefon?: string | null
  email?: string | null
  durum?: string | null
  notlar?: string | null
  rol?: string | null
  profil_fotografi?: string | null
}

export interface Brans { brans_id: Id; brans_adi: string; aktif?: boolean | null }
export interface OgretmenBransi { ogretmen_id: Id; brans_id: Id; aktif: boolean }
export interface Derslik { derslik_id: Id; mekan_adi: string; mekan_turu?: string | null; kapasite?: number | null; aktif?: boolean | null; aciklama?: string | null }

export interface SabitProgram {
  program_id: Id
  ogrenci_id?: Id | null
  ogretmen_id?: Id | null
  brans_id?: Id | null
  derslik_id?: Id | null
  haftanin_gunu?: string | null
  baslangic_saati?: string | null
  ders_sayisi?: number | null
  ogrenci_birim_ucreti?: number | null
  ogretmen_birim_hakedisi?: number | null
  baslangic_tarihi?: string | null
  bitis_tarihi?: string | null
  aktif?: boolean | null
  program_durumu?: string | null
  aciklama?: string | null
  tekrar_sikligi: string
}

export interface Ders {
  ders_id: Id
  program_id?: Id | null
  tarih?: string | null
  ogrenci_id?: Id | null
  ogretmen_id?: Id | null
  brans_id?: Id | null
  derslik_id?: Id | null
  ders_sayisi?: number | null
  ogrenci_birim_ucreti?: number | null
  ogretmen_birim_hakedisi?: number | null
  ogrenci_toplam_tutar?: number | null
  ogretmen_toplam_hakedis?: number | null
  ders_durumu?: string | null
  aciklama?: string | null
  baslangic_saati?: string | null
  bitis_saati?: string | null
  ders_turu?: string | null
  ders_yeri?: string | null
  zoom_toplanti_id?: string | null
  zoom_katilim_baglantisi?: string | null
  zoom_sifre?: string | null
  zoom_islem_durumu?: string | null
  zoom_hata_mesaji?: string | null
}

export interface Tahsilat {
  tahsilat_id: Id
  tarih: string
  ogrenci_id: Id
  tutar: number
  odeme_yontemi?: string | null
  aciklama?: string | null
  hesap_id?: Id | null
  iptal_mi?: boolean | null
  guncelleyen?: string | null
  guncellenme_zamani?: string | null
}

export interface Gider {
  gider_id: Id
  tarih: string
  kategori_id?: Id | null
  tutar: number
  odeme_yontemi?: string | null
  aciklama?: string | null
  hesap_id?: Id | null
  odeme_durumu?: string | null
  iptal_mi: boolean
}

export interface GiderKategori { kategori_id: Id; kategori_adi: string; grup?: string | null; aktif?: boolean | null; sira_no?: number | null; aciklama?: string | null }

export interface OgretmenOdeme {
  ogretmen_odeme_id: Id
  tarih?: string | null
  hakedis_donemi_id?: Id | null
  ogretmen_id?: Id | null
  tutar?: number | null
  odeme_yontemi?: string | null
  aciklama?: string | null
  hesap_id?: Id | null
  iptal_mi?: boolean | null
}

export interface HakedisDonemi { hakedis_donemi_id: Id; donem_adi: string; baslangic_tarihi: string; bitis_tarihi: string; aktif?: boolean | null }
export interface KasaHesabi { hesap_id: Id; hesap_adi: string; hesap_turu?: string | null; banka_adi?: string | null; iban?: string | null; acilis_bakiyesi?: number | null; aktif?: boolean | null; aciklama?: string | null }
export interface KasaHareketi { hareket_id: Id; tarih: string; hareket_turu?: string | null; kaynak_turu?: string | null; kaynak_id?: Id | null; hesap_id?: Id | null; tutar: number; aciklama?: string | null; ogrenci_id?: Id | null; ogretmen_id?: Id | null; iptal_mi?: boolean | null; durum?: string | null }

export interface Odev {
  odev_id: Id
  ogrenci_id: Id
  ogretmen_id?: Id | null
  ders_id?: Id | null
  verilme_tarihi?: string | null
  verilis_tarihi?: string | null
  son_teslim_tarihi?: string | null
  teslim_tarihi?: string | null
  baslik?: string | null
  aciklama?: string | null
  durum?: string | null
  whatsapp_gonderildi_mi?: boolean | null
  whatsapp_gonderim_tarihi?: string | null
}

export interface KullaniciProfili {
  auth_user_id: string
  email?: string | null
  ad_soyad?: string | null
  rol?: string | null
  ogretmen_id?: string | null
  aktif?: boolean | null
  telefon?: string | null
}

export interface AppData {
  ogrenciler: Ogrenci[]
  ogretmenler: Ogretmen[]
  branslar: Brans[]
  ogretmenBranslari: OgretmenBransi[]
  derslikler: Derslik[]
  sabitProgramlar: SabitProgram[]
  dersler: Ders[]
  tahsilatlar: Tahsilat[]
  giderler: Gider[]
  giderKategorileri: GiderKategori[]
  ogretmenOdemeleri: OgretmenOdeme[]
  hakedisDonemleri: HakedisDonemi[]
  kasaHesaplari: KasaHesabi[]
  kasaHareketleri: KasaHareketi[]
  odevler: Odev[]
}
