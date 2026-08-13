# BS Eğitim Yönetimi — Geliştirme Notları

Son güncelleme: 13.08.2026

## Canlı sürüm güvenlik sınırı

- Canlı uygulama `index.html` korunmaktadır.
- Kullanıcı tarafından geri dönüş noktası olarak doğrulanan temel commit: `09552e4f048ec9696576fbdfa232944056d4e8b5`.
- Yeni yapı kullanıcı doğrulaması tamamlanana kadar canlı `index.html` üzerine taşınmaz.
- Geliştirme ve kabul testi `operasyon-test.html` üzerinden yürütülür.

## Güncel çalışır aday

**Sürüm: V253**

Test adresi:

`https://syalciners.github.io/bs-ofis-yonetim-sistemi/operasyon-test.html?v=253`

Uygulama `servisler/` ve `moduller/` katmanlarından oluşur. Supabase tarayıcı tarafında yalnız publishable key + authenticated kullanıcı ile kullanılır; service-role anahtarı tarayıcıya verilmez.

## Kullanıcı deneyimi standardı

- Günlük işlemler mümkün olduğunca 1–3 dokunuşta tamamlanır.
- Sistem bildiği alanları otomatik doldurur.
- Teknik ID ve entegrasyon alanları günlük kullanıcı arayüzünde gösterilmez.
- Tablet öncelikli, telefon ve web uyumlu yapı korunur.
- Mobil alt formlar yatay kaymaz; yalnız dikey kaydırma kullanılır.
- Kritik işlemlerde istemci ön kontrol yapar; sunucu kayıt sırasında aynı kuralları yeniden doğrular.

## Ders ve program mimarisi

### Sabit Program

Sabit Program haftalık takvimin şablonudur. Bir kayıt şunları içerir:

- Öğrenci
- Öğretmen
- Branş
- Derslik
- Haftanın günü
- Başlangıç saati
- Ders sayısı
- Öğrenci birim ücreti
- Öğretmen birim hakedişi
- Tekrar sıklığı
- Başlangıç / bitiş tarihi
- Durum ve açıklama

Tekrar sıklığı değerleri:

- `Her Hafta`
- `2 Haftada Bir`
- `Ayda Bir`

`2 Haftada Bir` hesaplamasında başlangıç tarihinin haftası referans alınır. `Ayda Bir` için başlangıç tarihinin ay içindeki hafta sırası korunur; örneğin ikinci Salı seçilmişse sonraki aylarda ikinci Salı hedeflenir.

Sabit Program listesindeki derse dokunulduğunda aynı program doğrudan düzenleme formunda açılır.

### Haftalık Dersleri Oluştur

- Sabit Programdaki yalnız o haftaya düşen kayıtlar `dersler` tablosuna `Planlandı` olarak aktarılır.
- `program_id + tarih` bulunan kayıt tekrar oluşturulmaz.
- Aynı hafta için başarılı üretim yalnız bir kez çalışır.
- Başarılı çalışmanın ardından `haftalik_ders_uretimleri` tablosuna hafta kilidi yazılır.
- Aynı haftadaki ikinci sunucu çağrısı reddedilir; sonraki hafta Pazartesi yeni hafta için tekrar kullanılabilir.
- Öğretmen-branş yetkisi, öğrenci/öğretmen zaman çakışması ve derslik kapasitesi sunucu tarafında doğrulanır.

### Haftalık Takvim / Öğretmen Takvimi / Bugünkü Dersler

Bu üç ekran aynı `dersler` kayıtlarını farklı filtrelerle gösterir ve aynı Ders Detayı panelini açar.

- Haftalık Takvim: haftanın tüm dersleri.
- Öğretmen Takvimi: seçilen öğretmene ait dersler.
- Bugünkü Dersler: yalnız bugünün dersleri.

Planlanmış bir ders detayından `Düzenle` seçilirse yalnız ilgili `ders_id` güncellenir. Bağlı `program_id` referans olarak korunur ve Sabit Program değiştirilmez. Düzenlemede tarih, öğrenci, öğretmen, branş, derslik, saat, ders sayısı, birim ücretler ve not değiştirilebilir; sunucu çakışma ve öğretmen-branş kurallarını tekrar denetler.

Ders sonucu günlük kullanımda iki seçenektir:

- `Yapıldı`
- `İptal`

`Yapıldı` olduğunda ders kaydındaki öğrenci toplam tutarı ve öğretmen toplam hakedişi finansal hesaplara dahil edilir. `İptal` finansal tahakkuk/hakediş etkisi oluşturmaz.

## Öğretmen-branş kuralı

Branşın yetkili öğretmeni `branslar.varsayilan_ogretmen_id` alanından belirlenir. Arayüz yalnız seçilen öğretmene tanımlı aktif branşları gösterir. Aynı kural Supabase güvenli RPC katmanında da zorunludur; arayüz atlanarak uyumsuz öğretmen-branş kaydı oluşturulamaz.

## Çalışan gerçek yazma işlemleri

Yönetici kontrollü güvenli RPC katmanına bağlı işlemler:

1. Öğrenci ekleme / düzenleme
2. Öğretmen ekleme / düzenleme
3. Sabit program ekleme / düzenleme
4. Manuel / ek ders oluşturma
5. Haftalık tek ders düzenleme
6. Ders sonucunu Yapıldı / İptal olarak güncelleme
7. Haftalık dersleri sabit programdan toplu oluşturma
8. Tahsilat + kasa hareketini atomik kaydetme
9. Gider + kasa hareketini atomik kaydetme
10. Öğretmen ödemesi + kasa hareketini atomik kaydetme
11. Ödev ekleme / durum güncelleme

## Takvim ve finans kuralları

- Takvim ve çakışma hesabı: **1 ders = 60 dakikalık rezervasyon slotu**.
- Finansal gerçekleşme kuralı: **50 dakikalık gerçekleşen ders = 1 finansal ders birimi**.
- Öğrenci borcu: `Yapıldı` derslerin öğrenci toplam tutarı − tahsilatlar.
- Kasa: açılış bakiyesi + iptal olmayan gelir hareketleri − iptal olmayan gider hareketleri.
- Tahsilat gerçek nakit gelir kaynağıdır; ders kaydı tahsilat değildir.
- Öğrenci ücreti ve öğretmen hakedişi raporlarda yalnız `Yapıldı` derslerle gerçekleşir.

## Test ve veri bütünlüğü

- Mevcut 18 Sabit Program kaydı migration sonrası `Her Hafta` olarak korunmuştur.
- Tekrar hesaplayıcısı `Her Hafta`, `2 Haftada Bir` ve `Ayda Bir` örnekleriyle doğrulanmıştır.
- V253 haftalık üretim RPC'si transaction + rollback testiyle mevcut hafta üzerinde sınanmıştır: 18 bu haftaya düşen program, 16 mevcut ders, 2 oluşturulacak, 0 çakışma, 0 hatalı program sonucu alınmış; rollback sonrasında veri ve hafta kilidi bırakılmamıştır.
- Kritik finansal yazmalar idempotent/transaction kurallarıyla korunmaya devam eder.

## Görselleştirmeler

Ana Sayfa responsive yönetim görselleri:

- Son 6 ay Tahsilat / Gerçekleşen Ciro / Öğretmen Hakedişi karşılaştırması
- Kasa hesaplarının bakiye dağılımı

## Teknik doğrulama

`.github/workflows/pwa-dogrulama.yml` her servis/modül JavaScript dosyasını ve test kabuğunun inline JavaScript'ini `node --check` ile doğrular. V253 zinciri GitHub Actions doğrulamasından başarıyla geçmiştir.

## Geçiş notu

AppSheet Supabase'e bağlı değildir; AppSheet yalnız Google Sheets'e kayıt yapar. Yeni PWA doğrudan Supabase üzerinde çalışır. Kullanıcı kabulü tamamlanana kadar AppSheet/Google Sheets eski operasyon kaynağı olarak korunur. Nihai geçişte Google Sheets ile Supabase son kez mutabık hale getirilecek ve günlük operasyon yeni PWA/Supabase üzerinden yürütülecektir.

## Kabul sonrası

1. Son çalışan commit sabitlenir.
2. Google Sheets ↔ Supabase son veri mutabakatı yapılır.
3. Canlı `index.html` kontrollü geçişle yeni modüler yapıya taşınır.
4. AppSheet günlük operasyon arayüzü olmaktan çıkarılır.
