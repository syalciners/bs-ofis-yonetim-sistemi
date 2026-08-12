# BS Eğitim Yönetimi — Geliştirme Notları

Son güncelleme: 13.08.2026

## Canlı sürüm güvenlik sınırı

- Canlı uygulama: `index.html`
- Kullanıcı tarafından geri dönüş noktası olarak doğrulanan temel commit: `09552e4f048ec9696576fbdfa232944056d4e8b5`
- Canlı `index.html` test modülleri doğrulanmadan değiştirilmez.
- Yeni geliştirmeler `operasyon-test.html` üzerinden izole test PWA içinde yürütülür.

## Güncel test PWA

Güncel test sürümü: **V226**

Aktif servisler:

- `servisler/referans-servisi-v1.js`
- `servisler/ders-program-servisi-v1.js`
- `servisler/ogrenci-servisi-v1.js`
- `servisler/finans-servisi-v1.js`
- `servisler/ogretmen-servisi-v1.js`

Aktif modüller:

- Dersler: bugün, öğretmen takvimi, genel takvim
- Ders detay paneli
- Ders oluştur kısa akışı + otomatik sabit program doldurma + çakışma ön kontrolü
- Öğrenci listesi, öğrenci 360° detay ve düzenleme
- Haftalık Dersleri Oluştur kuru çalışma ekranı
- Tahsilat listesi ve finans KPI'ları
- Tahsilat Gir kısa formu
- Öğretmenler ekranı: kişi bazında bu ay hakediş, ders birimi, haftalık program ve yapılan dersler

Eski `operasyon-test-v207.js`, `v208.js`, `v209.js`, `v212.js` katmanları aktif yükleme zincirinden çıkarılmıştır. Yeni geliştirmelerde yeni Vxxx overlay dosyaları oluşturulmaz; `servisler/` ve `moduller/` yapısı kullanılır.

## Kullanıcı deneyimi standardı

- Günlük işlem hedefi en fazla 3 dokunuş.
- Sistem bildiği alanları kullanıcıya tekrar seçtirmez.
- Teknik ID ve entegrasyon alanları kullanıcıya gösterilmez.
- Tablet öncelikli, telefon ve web uyumlu tasarım korunur.
- Formlarda yalnız zorunlu günlük alanlar önde tutulur; detaylar gerektiğinde açılır.

Örnek hedef akışlar:

- Ders Oluştur → Öğrenci → Oluştur
- Tahsilat Gir → Öğrenci → Tutar → Kaydet
- Haftalık Dersleri Oluştur → Özet → Oluştur

## Doğrulanan iş kuralları

### Takvim / ders süresi

- Takvim ve çakışma hesabı: **1 ders = 60 dakikalık slot**.
- Finansal gerçekleşme kuralı: **50 dakikalık gerçekleşen ders = 1 finansal ders birimi**.
- Bu ayrım kullanıcı arayüzüne teknik detay olarak yansıtılmaz.

### Ders çakışmaları

Aynı saat aralığında öğrenci, öğretmen ve derslik kapasitesi kontrol edilir. `İptal`, `Ertelendi` ve `Öğretmen İptali` durumları çakışma hesabına dahil edilmez.

### Finans

- Öğrenci borcu: `Yapıldı` derslerin öğrenci toplam tutarı - tahsilatlar.
- Kasa: açılış bakiyesi + iptal olmayan gelir hareketleri - iptal olmayan gider hareketleri.
- Tahsilat gerçek nakit gelir kaynağıdır; ders kaydı tek başına tahsilat oluşturmaz.

## Güvenli yazma altyapısı

### Tahsilat

Supabase'de `tahsilat_kaydet_guvenli_v1` RPC kurulmuştur.

- Tahsilat ve kasa hareketini tek transaction içinde oluşturur.
- Yönetici yetkisini veritabanı tarafında kontrol eder.
- Nakit → `KASA-001`, Havale/EFT → `KASA-002` eşlemesi doğrulanmıştır.
- Transaction/rollback testinde iki kayıt birlikte oluşmuş ve rollback sonrası test verisi kalmamıştır.
- Frontend gerçek tahsilat yazması henüz açılmamıştır.

### Haftalık Dersleri Oluştur

Supabase'de `haftalik_dersleri_olustur_guvenli_v1` RPC kurulmuştur.

- Sabit programdan güncel ücret/hakediş değerlerini kullanır.
- `program_id + hedef tarih` mevcutsa ikinci kayıt üretmez.
- Öğrenci/öğretmen/derslik çakışmalarını transaction içinde yeniden doğrular.
- Yeni dersler `Planlandı` olarak oluşturulur.
- 10.08.2026 haftası rollback test sonucu: 18 aktif program, 2 oluşturulabilir, 16 zaten mevcut, 0 çakışma, 0 hata.
- Rollback sonrası gerçek ders sayısı değişmemiştir.
- Frontend toplu gerçek yazma henüz açılmamıştır.

## Geçiş / veri otoritesi

AppSheet hâlâ günlük kullanımda olduğundan geçiş döneminde veri otoritesi dikkatle korunmalıdır. Supabase'e açılan yeni yazmaların Google Sheets/AppSheet tarafından sonradan ezilmemesi veya iki sistemde farklı kayıt oluşmaması için gerçek yazma butonları modül bazında kontrollü açılacaktır.

Final hedefte günlük kullanıcı işlemleri yeni PWA üzerinden yürütülecek; AppSheet günlük arayüz olarak kullanılmayacaktır.

## Sıradaki odak

1. Öğretmenler V226 ekranının kullanım doğrulaması
2. Haftalık Dersleri Oluştur gerçek yazma için geçiş otoritesi ve tek kayıt testi
3. Manuel / Ek Ders gerçek yazma RPC'si
4. Tahsilat gerçek yazma butonunun RPC'ye bağlanması
5. Ders durumu güncelleme ve merkezi finans kuralı
6. Öğrenci Ekle kısa akışı
7. Kasa, Giderler, Öğretmen Ödemeleri ve Raporlar modülleri

Her kritik yazma: **kuru çalışma → tek kayıt testi → gerçek kullanım → yedek/sabitleme** sırasıyla ilerler.
