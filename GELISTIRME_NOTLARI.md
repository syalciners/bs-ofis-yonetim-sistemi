# BS Eğitim Yönetimi — Geliştirme Notları

Son güncelleme: 13.08.2026

## Canlı sürüm güvenlik sınırı

- Canlı uygulama `index.html` korunmaktadır.
- Kullanıcı tarafından geri dönüş noktası olarak doğrulanan temel commit: `09552e4f048ec9696576fbdfa232944056d4e8b5`.
- Yeni yapı kullanıcı doğrulaması tamamlanana kadar canlı `index.html` üzerine taşınmaz.
- Geliştirme ve kabul testi `operasyon-test.html` üzerinden yürütülür.

## Güncel çalışır aday

**Sürüm: V250**

Test adresi:

`https://syalciners.github.io/bs-ofis-yonetim-sistemi/operasyon-test.html?v=250`

Mimari artık eski Vxxx overlay dosyalarına bağlı değildir. Uygulama `servisler/` ve `moduller/` katmanlarından oluşur. Supabase tarayıcı tarafında yalnız publishable key + authenticated kullanıcı ile kullanılır; service-role anahtarı tarayıcıya verilmez.

## Kullanıcı deneyimi standardı

- Günlük işlemler mümkün olduğunca 1–3 dokunuşta tamamlanır.
- Sistem bildiği alanları otomatik doldurur.
- Teknik ID ve entegrasyon alanları günlük kullanıcı arayüzünde gösterilmez.
- Tablet öncelikli, telefon ve web uyumlu yapı korunur.
- İleri tarih, hesap, açıklama gibi ikincil alanlar gerektiğinde açılır.
- Kritik işlemlerde kullanıcı ön kontrol görür; sunucu kayıt sırasında aynı kuralları yeniden doğrular.

Hedef kısa akışlar:

- Ders Oluştur → Öğrenci → gerekirse Saat → Dersi Oluştur
- Tahsilat Gir → Öğrenci → Tutar → Tahsilatı Kaydet
- Haftalık Dersleri Oluştur → Özet → X Dersi Oluştur
- Giderler → Gider Ekle → Kategori → Tutar → Kaydet
- Öğretmen Ödemeleri → Ödeme Gir → Öğretmen → Kaydet

## Çalışan okuma / yönetim ekranları

- Ana Sayfa ve KPI'lar
- Bugünkü Dersler
- Öğretmen Takvimi
- Genel Takvim
- Ders detay paneli
- Öğrenciler, öğrenci 360° detay ve düzenleme
- Sabit Program
- Öğretmenler ve öğretmen detay/hakediş ekranı
- Tahsilatlar
- Kasa
- Giderler
- Öğretmen Ödemeleri
- Ödevler
- Raporlar
- Ayarlar / sistem durumu

## Çalışan gerçek yazma işlemleri

Aşağıdaki işlemler Supabase'deki yönetici kontrollü güvenli RPC katmanına bağlanmıştır:

1. Öğrenci ekleme
2. Öğrenci düzenleme (mevcut RLS kontrollü modül)
3. Öğretmen ekleme / düzenleme
4. Sabit program ekleme / düzenleme
5. Manuel / ek ders oluşturma
6. Ders durumu güncelleme
7. Haftalık dersleri sabit programdan toplu oluşturma
8. Tahsilat + kasa hareketini tek atomik işlemde kaydetme
9. Gider + kasa hareketini tek atomik işlemde kaydetme
10. Öğretmen ödemesi + kasa hareketini tek atomik işlemde kaydetme
11. Ödev ekleme
12. Ödev durumunu güncelleme

## Güvenli yazma ilkeleri

- RPC'ler yalnız authenticated yönetici erişimine açıktır; `anon` çalıştırma yetkisi kaldırılmıştır.
- Finansal çift kayıt üretebilecek işlemler tek transaction içinde yapılır.
- Tahsilat, gider ve öğretmen ödemesinde istemci tarafından üretilen işlem kimlikleri yeniden denemede korunur; aynı işlem ikinci kez gönderilse çift kayıt oluşmaz.
- Haftalık ders üretiminde aynı `program_id + tarih` varsa yeni kayıt oluşturulmaz.
- Ders oluştururken öğrenci/öğretmen çakışması ve derslik kapasitesi sunucu tarafında yeniden kontrol edilir.
- Sabit program kayıtlarında öğrenci/öğretmen çakışması ve derslik kapasitesi 60 dakikalık takvim slotu üzerinden kontrol edilir.

## Doğrulanan iş kuralları

### Takvim / ders süresi

- Takvim ve çakışma hesabı: **1 ders = 60 dakikalık rezervasyon slotu**.
- Finansal gerçekleşme kuralı: **50 dakikalık gerçekleşen ders = 1 finansal ders birimi**.
- `İptal`, `Ertelendi` ve `Öğretmen İptali` durumları takvim çakışma hesabına dahil edilmez.

### Finans

- Öğrenci borcu: `Yapıldı` derslerin öğrenci toplam tutarı − tahsilatlar.
- Kasa: açılış bakiyesi + iptal olmayan gelir hareketleri − iptal olmayan gider hareketleri.
- Tahsilat gerçek nakit gelir kaynağıdır; ders kaydı tek başına tahsilat değildir.
- Öğrenci ücreti ve öğretmen hakedişi raporlarda yalnız `Yapıldı` derslerle gerçekleşir.

## Test ve veri bütünlüğü

Güvenli RPC'ler transaction + rollback ile sınanmıştır. Testlerde:

- öğrenci ekleme,
- manuel ders oluşturma,
- ders durumu değiştirme,
- tahsilat + kasa,
- gider + kasa,
- öğretmen ödemesi + kasa,
- öğretmen kaydı,
- sabit program kaydı,
- ödev kaydı ve durum değişikliği

işlemleri doğrulanmış ve rollback sonrasında test kaydı bırakılmamıştır.

İdempotency testlerinde aynı işlem kimliğiyle tekrar çağrılan öğrenci, ders, tahsilat, gider ve öğretmen ödeme işlemlerinin ikinci kayıt üretmediği doğrulanmıştır. Haftalık ders üretimi aynı hafta ikinci çağrıda mevcut dersleri tekrar oluşturmamıştır.

## Görselleştirmeler

Ana Sayfa'ya responsive yönetim görselleri eklenmiştir:

- Son 6 ay Tahsilat / Gerçekleşen Ciro / Öğretmen Hakedişi karşılaştırmalı grafiği
- Kasa hesaplarının bakiye dağılımı

Görseller aynı merkezi rapor ve finans servislerinden veri alır; ayrı finans hesabı üretmez.

## Teknik doğrulama

`.github/workflows/pwa-dogrulama.yml` ile her servis/modül JavaScript dosyası ve test kabuğunun inline JavaScript'i `node --check` ile doğrulanır. V250 aday zincirinin GitHub Actions JavaScript doğrulaması başarıyla tamamlanmıştır.

## Geçiş notu

V250 yeni PWA'nın Supabase-merkezli çalışır aday sürümüdür. Kullanıcı kabul testi tamamlanmadan canlı `index.html` değiştirilmez. Geçiş süresince aynı gerçek işlemin hem AppSheet hem PWA üzerinden çift girilmemesi gerekir. Nihai hedef günlük operasyonun yeni PWA üzerinden yürütülmesidir.

## Kabul sonrası

Kullanıcı V250'nin telefon, tablet ve web kullanımını doğruladıktan sonra:

1. son çalışan commit sabitlenir,
2. veri senkron/otorite geçişi son kez kontrol edilir,
3. canlı `index.html` güvenli geçiş planıyla yeni modüler yapıya taşınır,
4. AppSheet günlük arayüz olmaktan çıkarılır.
