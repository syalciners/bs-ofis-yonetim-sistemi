# BS Eğitim Yönetimi — Supabase Veri Sözlüğü

Son güncelleme: 12.08.2026

Bu belge yalnız **doğrulanmış / mevcut kaynaklardan teyit edilmiş** alanları içerir. Kesinliği teyit edilmeyen kolonlar varsayım olarak eklenmez. Yazma işlemleri açılmadan önce `supabase_yazma_onkontrol.sql` çıktısı ile tamamlanmalıdır.

## Mimari

- Frontend: GitHub Pages / PWA
- Kimlik: Supabase Auth + Google OAuth
- Veritabanı: Supabase PostgreSQL
- Browser içinde yalnız publishable key kullanılabilir.
- Service Role frontend içine konulmaz.
- Yönetici erişimi `kullanici_profilleri` üzerinden `auth_user_id`, `aktif`, `rol` ile kontrol edilir.

## Doğrulanmış tablolar

### `dersler`

Doğrulanmış ilgili alanlar:

- `ders_id`
- `program_id`
- `tarih`
- `ogrenci_id`
- `ogretmen_id`
- `brans_id`
- `derslik_id`
- `ders_sayisi`
- `ogrenci_birim_ucreti`
- `ogretmen_birim_hakedisi`
- `ogrenci_toplam_tutar`
- `ogretmen_toplam_hakedis`
- `ders_durumu`
- `baslangic_saati`
- `bitis_saati`
- `ders_turu`
- `ders_yeri`
- Zoom alanları mevcut; kesin kolon listesi yazma öncesi şema sorgusundan alınacak.

Finans kuralı:

- Ciro hesabında yalnız `ders_durumu = 'Yapıldı'` kayıtları kullanılır.
- Planlanan/iptal/ertelenen/yapılmayan dersler gerçekleşmiş gelir sayılmaz.
- Öğretmen hakedişinde de gerçekleşme kuralı merkezi iş mantığında korunmalıdır.

### `ogrenciler`

Doğrulanmış alanlar:

- `ogrenci_id`
- `ad_soyad`

Mevcut salt-okunur test ekranı, öğrenci borcunu gerçekleşmiş ders tutarı eksi iptal olmayan tahsilatlar olarak hesaplayabilir. Eğer tabloda gerçek `kalan_bakiye` alanı varsa mevcut değerin anlamı yazma öncesi ayrıca doğrulanmalıdır.

### `ogretmenler`

Doğrulanmış alanlar:

- `ogretmen_id`
- `ad_soyad`

### `branslar`

Doğrulanmış alanlar:

- `brans_id`
- `brans_adi`

### `derslikler`

Doğrulanmış alanlar:

- `derslik_id`
- `mekan_adi`

### `tahsilatlar`

Supabase frontend testlerinde kullanılan/doğrulanacak alanlar:

- tahsilat anahtarı: `tahsilat_id` (kesin gerçek isim önkontrol SQL'i ile teyit edilecek)
- `ogrenci_id`
- `hesap_id`
- `tahsilat_tarihi`
- `tutar`
- `odeme_yontemi`
- `aciklama`
- `iptal_mi`

Eski çalışan AppSheet iş kuralı açısından tahsilat ayrıca ilgili kasa/banka hesabına bir **Gelir / Tahsilat** kasa hareketi üretir. Yeni web arayüzünde bu iki kayıt istemci tarafında ayrı ayrı oluşturulmamalıdır; tek transaction/RPC hedeflenir.

Peşin/avans tahsilat kuralı korunmalıdır: tahsilat tek bir tahakkukun kalan borcunu aşabilir veya tahakkuk seçilmeden alınabilir. Bu nedenle genel `tutar <= tek tahakkuk kalan borcu` kısıtı uygulanmamalıdır.

### `kasa_hesaplari`

Salt-okunur testte kullanılan alanlar:

- `hesap_id`
- `hesap_adi`
- `acilis_bakiyesi`
- `aktif_mi`

Güncel bakiye kuralı:

`Açılış Bakiyesi + Gelir Hareketleri - Gider Hareketleri`

12.08.2026 doğrulamasında iki aktif hesabın toplamı **₺55.400** olarak kullanıcı ekranında kontrol edildi.

### `kasa_hareketleri`

Salt-okunur testte kullanılan/doğrulanacak alanlar:

- `hesap_id`
- `hareket_turu`
- `kaynak_turu`
- `kaynak_id`
- `tutar`
- iptal bilgisi

Tahsilat bağlantısında beklenen iş mantığı:

- `hareket_turu = 'Gelir'`
- `kaynak_turu = 'Tahsilat'`
- `kaynak_id = ilgili tahsilat anahtarı`
- `hesap_id = tahsilatın hesabı`
- `tutar = tahsilat tutarı`

### `ogretmen_odemeleri`

Tablo Supabase'e taşınmıştır. 12.08.2026 aktarım referansında 7 kayıt ve toplam **₺151.600** vardır. Kesin kolon sözlüğü yazma öncesi şema sorgusuyla çıkarılacaktır.

### `sabit_ders_programi`

Tablo Supabase'e taşınmıştır. 12.08.2026 aktarım referansında 18 kayıt vardır. Haftalık ders üretimi bu tablodan yapılacak; aynı program+tarih için çift ders üretmemek üzere idempotent iş anahtarı gereklidir.

### `kullanici_profilleri`

Frontend'de doğrulanan erişim alanları:

- `auth_user_id`
- `ad_soyad`
- `rol`
- `aktif`

Yalnız `aktif = true` ve `rol = 'Yönetici'` kullanıcı ana yönetim paneline alınır.

## 12.08.2026 aktarım referansı

Bu sayılar sabit constraint değildir; sonraki gerçek işlemlerle artabilir.

- `branslar`: 12
- `dersler`: 108
- `derslikler`: 5
- `gider_kategorileri`: 5
- `hakedis_donemleri`: 18
- `kasa_hareketleri`: 50
- `kasa_hesaplari`: 2
- `kullanici_profilleri`: 2
- `odevler`: 2
- `ogrenciler`: 12
- `ogretmen_odemeleri`: 7
- `ogretmenler`: 7
- `sabit_ders_programi`: 18
- `tahsilatlar`: 43

Ders durumları:

- Toplam: 108
- Yapıldı: 75
- Planlandı: 20
- İptal: 13

Finans referansları:

- Gerçekleşmiş öğrenci tutarı: **₺265.500**
- Gerçekleşmiş öğretmen hakedişi: **₺234.300**
- Tahsilat toplamı: **₺207.000**
- Öğretmen ödeme toplamı: **₺151.600**

## Yazma açılmadan önce tamamlanacak alanlar

1. Her kritik tablonun kesin kolon tipi/null/default bilgisi.
2. Primary key ve foreign key'ler.
3. Unique index'ler.
4. Mevcut RLS policy'leri.
5. Mevcut public RPC/fonksiyonlar.
6. Tahsilat ve kasa hareketi arasındaki kesin anahtar kolonları.
7. Öğrenci ekleme için gerçek zorunlu alanlar.
8. Ders oluşturma için gerçek zorunlu alanlar ve çakışma kontrolü.
9. Haftalık üretimde `program_id + hedef_tarih` tekillik/idempotency stratejisi.
10. Kritik finans yazmalarının istemci yerine RPC/transaction ile yapılması.
