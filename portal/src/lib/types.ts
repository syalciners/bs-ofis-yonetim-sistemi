export type PortalRole = 'Öğretmen' | 'Öğrenci'

export interface PortalProfile {
  rol: PortalRole
  ad_soyad: string
  email: string | null
}

export interface PortalLesson {
  ders_id: string
  tarih: string
  baslangic_saati: string | null
  bitis_saati: string | null
  ders_durumu: string | null
  brans_adi: string | null
  derslik_adi: string | null
  ogrenci_adi: string | null
  ogretmen_adi: string | null
  zoom_katilim_baglantisi: string | null
}

export interface PortalAssignment {
  odev_id: string
  odev_basligi: string | null
  odev_aciklamasi: string | null
  verilis_tarihi: string
  son_teslim_tarihi: string | null
  durum: string
  oncelik: string | null
  ogrenci_adi: string | null
  ogretmen_adi: string | null
  odev_dosya_linki: string | null
  odev_fotograf_linki: string | null
  ogretmen_notu: string | null
  puan: string | null
}
