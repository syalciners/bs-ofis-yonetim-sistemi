export type MdUrunProfili = 'muzik-dans' | 'muzik' | 'dans'
export type MdKullaniciRolu = 'Yönetici' | 'Ofis' | 'Eğitmen'
export type MdProgramTuru = 'Bireysel' | 'Grup'
export type MdDersDurumu = 'Planlandı' | 'Yapıldı' | 'İptal' | 'Ertelendi' | 'Eğitmen İptali'
export type MdKatilimDurumu = 'Planlandı' | 'Katıldı' | 'Gelmedi' | 'Mazeretli' | 'İptal'

export interface MdKurumSecenegi {
  kurum_id: string
  kurum_adi: string
  urun_profili: MdUrunProfili
  rol: MdKullaniciRolu
}

export interface MdSube {
  sube_id: string
  kurum_id: string
  sube_adi: string
  aktif: boolean
}

export interface MdMekan {
  mekan_id: string
  kurum_id: string
  sube_id?: string | null
  mekan_adi: string
  mekan_turu: 'Stüdyo' | 'Salon' | 'Online' | 'Diğer'
  kapasite: number
  aktif: boolean
}

export interface MdBrans {
  brans_id: string
  kurum_id: string
  brans_adi: string
  kategori: 'Müzik' | 'Dans' | 'Diğer'
  varsayilan_sure_dk: number
  bireysel_uygun: boolean
  grup_uygun: boolean
  aktif: boolean
}

export interface MdKursiyer {
  kursiyer_id: string
  kurum_id: string
  ad_soyad: string
  dogum_tarihi?: string | null
  telefon?: string | null
  email?: string | null
  seviye?: string | null
  notlar?: string | null
  durum: 'Aktif' | 'Pasif'
}

export interface MdEgitmen {
  egitmen_id: string
  kurum_id: string
  ad_soyad: string
  telefon?: string | null
  email?: string | null
  notlar?: string | null
  durum: 'Aktif' | 'Pasif'
}

export interface MdEgitmenBransi {
  egitmen_brans_id: string
  kurum_id: string
  egitmen_id: string
  brans_id: string
  aktif: boolean
}

export interface MdKursGrubu {
  grup_id: string
  kurum_id: string
  grup_adi: string
  brans_id?: string | null
  varsayilan_egitmen_id?: string | null
  varsayilan_mekan_id?: string | null
  kapasite?: number | null
  seviye?: string | null
  yas_grubu?: string | null
  aciklama?: string | null
  durum: 'Aktif' | 'Pasif'
}

export interface MdKursGrupUyesi {
  grup_uye_id: string
  kurum_id: string
  grup_id: string
  kursiyer_id: string
  baslangic_tarihi: string
  bitis_tarihi?: string | null
  birim_ucret?: number | null
  durum: 'Aktif' | 'Pasif'
}

export interface MdSabitProgram {
  program_id: string
  kurum_id: string
  program_turu: MdProgramTuru
  kursiyer_id?: string | null
  grup_id?: string | null
  egitmen_id: string
  brans_id: string
  mekan_id?: string | null
  haftanin_gunu: number
  baslangic_saati: string
  sure_dk: number
  baslangic_tarihi: string
  bitis_tarihi?: string | null
  durum: 'Aktif' | 'Pasif'
  aciklama?: string | null
}

export interface MdDers {
  ders_id: string
  kurum_id: string
  program_id?: string | null
  ders_turu: MdProgramTuru
  grup_id?: string | null
  egitmen_id: string
  brans_id: string
  mekan_id?: string | null
  tarih: string
  baslangic_saati: string
  sure_dk: number
  ders_durumu: MdDersDurumu
  aciklama?: string | null
}

export interface MdDersKatilim {
  katilim_id: string
  kurum_id: string
  ders_id: string
  kursiyer_id: string
  katilim_durumu: MdKatilimDurumu
  notlar?: string | null
}

export interface MdHaftaUretimHatasi {
  program_id: string
  tarih: string
  mesaj: string
}

export interface MdHaftaUretimSonucu {
  hafta_baslangici: string
  olusturulan: number
  mevcut: number
  hata: number
  hatalar: MdHaftaUretimHatasi[]
}

export interface MdHaftaVerisi {
  dersler: MdDers[]
  katilimlar: MdDersKatilim[]
}

export interface MusicDanceData {
  subeler: MdSube[]
  mekanlar: MdMekan[]
  branslar: MdBrans[]
  kursiyerler: MdKursiyer[]
  egitmenler: MdEgitmen[]
  egitmenBranslari: MdEgitmenBransi[]
  gruplar: MdKursGrubu[]
  grupUyeleri: MdKursGrupUyesi[]
  programlar: MdSabitProgram[]
}
