# BS Eğitim Yönetimi — Geliştirme Notları

Son güncelleme: 13.08.2026

## Canlı sürüm güvenlik sınırı

- Canlı uygulama `index.html` korunmaktadır.
- Kullanıcı tarafından geri dönüş noktası olarak doğrulanan temel commit: `09552e4f048ec9696576fbdfa232944056d4e8b5`.
- Yeni modüler yapı kullanıcı kabulü tamamlanana kadar canlı `index.html` üzerine taşınmaz.
- Geliştirme ve kabul testi `operasyon-test.html` üzerinden yürütülür.
- Test kabuğu canlı Service Worker zincirini devralmaz; V269 test çalışmasında test SW kayıtları temizlenir ve canlı SW kaydı test kabuğunda devre dışı bırakılır.

## Güncel çalışır aday

**Sürüm: V269**

Test adresi:

`https://syalciners.github.io/bs-ofis-yonetim-sistemi/operasyon-test.html?v=269`

Uygulama `servisler/` ve `moduller/` katmanlarından oluşur. Supabase tarayıcı tarafında yalnız publishable key + authenticated kullanıcı ile kullanılır; service-role anahtarı tarayıcıya verilmez.

## Ana çalışma modeli

- AppSheet Supabase'e bağlı değildir; AppSheet yalnız Google Sheets'e yazar.
- Yeni PWA doğrudan Supabase üzerinde çalışır.
- Kullanıcı kabulü tamamlanana kadar AppSheet/Google Sheets eski operasyon kaynağı olarak korunur.
- Nihai geçişte Google Sheets ile Supabase son kez mutabık hale getirilecek ve günlük operasyon yeni PWA/Supabase üzerinden yürütülecektir.

## Kullanıcı deneyimi standardı

- Günlük işlemler mümkün olduğunca 1–3 dokunuşta tamamlanır.
- Sistem bildiği alanları otomatik doldurur.
- Teknik ID ve entegrasyon alanları günlük kullanıcı arayüzünde gösterilmez.
- Tablet öncelikli, telefon ve web uyumlu yapı korunur.
- Mobil alt formlar yatay kaymaz; yalnız dikey kaydırma kullanılır.
- Form sheet başlığı ve ana kaydet alanı uzun formlarda erişilebilir kalır.
- Saat alanları mobil saat çarkı yerine klavyeden `SS:DD` biçiminde girilir; `0930` gibi girişler `09:30` biçimine dönüştürülür.
- 1–5 seçenekli tekli seçimler açılır menü yerine küçük seçim butonlarıyla gösterilir; 6 ve üzeri seçenek açılır liste/arama olarak kalır.
- Kritik işlemlerde istemci ön kontrol yapar; sunucu kayıt sırasında aynı kuralları yeniden doğrular.
- Ana ekranlar aynı BS ürün ailesi görsel sistemini kullanır: açık zemin, beyaz kartlar, `#2563EB` ana vurgu, düşük gölge, durum bazlı yeşil/kırmızı vurgu ve mobilde kompakt bilgi hiyerarşisi.

## Ders ve program mimarisi

### Sabit Program

Sabit Program tekrar eden ders şablonudur. Bir kayıt şunları içerir:

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

`2 Haftada Bir` hesaplamasında başlangıç tarihinin haftası referans alınır. `Ayda Bir` için başlangıç tarihinin ay içindeki hafta sırası korunur.

Sabit Program listesindeki derse dokunulduğunda yalnız şablon düzenlenir; daha önce oluşturulmuş haftalık ders kayıtları geriye dönük değişmez.

### Haftalık Dersleri Oluştur

- Sabit Programdaki yalnız o haftaya düşen kayıtlar `dersler` tablosuna `Planlandı` olarak aktarılır.
- `program_id + tarih` bulunan kayıt tekrar oluşturulmaz.
- Başarılı üretimden sonra `haftalik_ders_uretimleri` tablosuna hafta kilidi yazılır.
- Aynı hafta ikinci üretim sunucu tarafından reddedilir.
- Sonraki Pazartesi yeni hafta için tekrar kullanılabilir.
- Geçiş döneminden kalan haftalarda kilit satırı yoksa `haftalik_ders_uretim_durumu_v1`, o haftaya düşen tüm Sabit Program kayıtlarının zaten ders tablosunda olup olmadığını kontrol eder. Tamamı varsa geçiş kilidi kabul edilir; eksik varsa üretim butonu eksikleri tamamlamak için açık kalır.
- Öğretmen-branş yetkisi, öğrenci/öğretmen zaman çakışması ve derslik kapasitesi sunucu tarafında doğrulanır.

### Haftalık Takvim / Öğretmen Takvimi / Bugünkü Dersler

Bu üç ekran aynı `dersler` kayıtlarını farklı filtrelerle gösterir ve aynı Ders Detayı panelini açar.

- Haftalık Takvim: haftanın tüm derslerini gösterir.
- Öğretmen Takvimi: seçilen öğretmenin aynı haftalık takvim görünümüdür.
- Bugünkü Dersler: yalnız bugünün derslerini gösterir.
- Haftalık ve Öğretmen Takvimlerinde `Önceki / Bu Hafta / Sonraki` gezinmesi vardır.
- Masaüstünde çok sütunlu takvim, telefonda dikey gün kartları kullanılır.

Planlanmış bir ders detayından `Düzenle` seçilirse yalnız ilgili `ders_id` güncellenir. Bağlı `program_id` referans olarak korunur ve Sabit Program değiştirilmez.

Ders sonucu günlük kullanımda iki seçenektir:

- `Yapıldı`
- `İptal`

`Yapıldı` olduğunda ders kaydındaki öğrenci toplam tutarı öğrenci tahakkuku, öğretmen toplam hakedişi öğretmen hakedişi olarak finansal hesaplara dahil edilir. `İptal` finansal tahakkuk/hakediş etkisi oluşturmaz.

## Öğretmen-branş kuralı

Branşın yetkili öğretmeni için **tek gerçek kaynak** `branslar.varsayilan_ogretmen_id` alanıdır.

V269 stabilizasyonunda:

- `ogretmen_kaydet_guvenli_v2` oluşturuldu.
- Öğretmen kaydı ve branş eşleştirmesi tek güvenli işlem mantığında yönetilir.
- Başka öğretmene bağlı branş sessizce devralınamaz.
- `ogretmenler.branslar` alanı artık yalnız görüntü/uyumluluk için merkezi branş eşleştirmesinden otomatik türetilir; kullanıcı serbest metinle branş yetkisi oluşturamaz.
- Eski öğretmen branş metinleri mevcut `branslar.varsayilan_ogretmen_id` ilişkileriyle yeniden eşitlendi.
- Öğretmen ekranındaki üst buton artık yalnız `+ Öğretmen Ekle` işlevindedir.
- Mevcut öğretmen düzenleme işlemi öğretmen kartı → detay → `Düzenle` yolundan yapılır.

## Çalışan gerçek yazma işlemleri

Yönetici kontrollü güvenli RPC katmanına bağlı işlemler:

1. Öğrenci ekleme / düzenleme
2. Öğretmen ekleme / düzenleme ve merkezi branş eşleştirmesi
3. Sabit program ekleme / düzenleme
4. Manuel / ek ders oluşturma
5. Haftalık tek ders düzenleme
6. Ders sonucunu Yapıldı / İptal olarak güncelleme
7. Haftalık dersleri Sabit Programdan toplu oluşturma
8. Tahsilat + kasa hareketini atomik kaydetme
9. Gider + kasa hareketini atomik kaydetme
10. Öğretmen ödemesi + kasa hareketini atomik kaydetme
11. Ödev ekleme / durum güncelleme
12. Geçmiş işlemi olmayan öğrenci/öğretmeni güvenli silme; geçmişi olan kayıt fiziksel silinmez, pasife alınmalıdır
13. Kullanıcı profilinin uygulama erişimini kaldırma

## Finans kuralları

- Takvim ve çakışma hesabı: **1 ders = 60 dakikalık rezervasyon slotu**.
- Finansal gerçekleşme kuralı: **50 dakikalık gerçekleşen ders = 1 finansal ders birimi**.
- Öğrenci borcu: `Yapıldı` derslerin öğrenci toplam tutarı − tahsilatlar.
- Kasa: açılış bakiyesi + iptal olmayan gelir hareketleri − iptal olmayan gider hareketleri.
- Tahsilat gerçek nakit gelir kaynağıdır; ders kaydı tahsilat değildir.
- Öğrenci ücreti ve öğretmen hakedişi yalnız `Yapıldı` derslerle gerçekleşir.
- Ders sonucu için ayrıca manuel tahakkuk veya hakediş girişi yapılmaz.
- Gider girişleri `giderler` tablosuna kategori ile, kasa çıkışı ise aynı işlemde `kasa_hareketleri` tablosuna yazılır.
- V269 itibarıyla Giderler ekranındaki dağılım, genel `kaynak_turu` yerine gerçek `gider_kategorileri` eşleştirmesini kullanır; öğretmen ödemeleri ayrı grup olarak kalır.

## V269 veri bütünlüğü stabilizasyonu

Genel kontrolde bulunan eski Temmuz mükerrerleri temizlendi:

- Aynı `program_id + tarih` için 10 eski mükerrer grup vardı.
- Tüm silinecek adaylar `Planlandı`, sonradan toplu oluşturulmuş ve ödev referansı 0 olan kayıtlardı.
- `Yapıldı` veya `İptal` durumundaki gerçek geçmiş kayıtlar korundu.
- İki `Planlandı` bulunan tek grupta daha eski/orijinal kayıt korundu.
- Temizlik öncesi teknik kimlik yedeği `yedekler/2026-08-13_mukerrer_ders_temizlik_yedegi.json` dosyasına kaydedildi.
- Temizlik sonrası kalan mükerrer `program_id + tarih` grubu: **0**.

Ayrıca genel kontrolde:

- aktif Sabit Program öğretmen-branş uyumsuzluğu: 0
- son dönem ders öğretmen-branş uyumsuzluğu: 0
- bu haftada öğrenci zaman çakışması: 0
- bu haftada öğretmen zaman çakışması: 0
- bu haftada derslik kapasite çakışması: 0
- ders sayısı geçersiz kayıt: 0
- öğrenci toplam ücret hesap hatası: 0
- öğretmen toplam hakediş hesap hatası: 0
- tahsilat olup kasa hareketi olmayan kayıt: 0
- öğretmen ödemesi olup kasa hareketi olmayan kayıt: 0
- Auth ↔ kullanıcı profili yetim kaydı: 0

## Görselleştirmeler ve V269 tasarım standardı

Ana Sayfa:

- Son 6 ay Tahsilat / Gerçekleşen Ciro / Öğretmen Hakedişi karşılaştırması
- Kasa hesaplarının bakiye dağılımı

Ders ekranları:

- Haftalık gerçek takvim kartları
- Öğretmen bazlı haftalık takvim
- Ders durumuna göre görsel durum işaretleri
- Ders detayında tahakkuk / hakediş finansal sonuç kartları

V269 tek aktif ürün görsel katmanı `urun-ailesi-gorsel-modulu-v1.js` üzerinden Dersler, Öğrenciler, Tahsilat, Sabit Program, Öğretmenler, Giderler, Raporlar, Kasa, Öğretmen Ödemeleri, Ödevler, Ayarlar ve Menü ekranlarını ortak kart/kenar/gölge/vurgu standardına getirir. Eski görsel modüller test yükleme zincirinde kullanılmaz.

## V269 stabilizasyon modülü

`v269-stabilizasyon-modulu-v1.js` yalnız kalan küçük uyumluluk düzenlemeleri için kullanılır:

- öğrenci detayındaki ilk KPI'yı gerçek `Ders Birimi` olarak gösterme
- sıradaki Planlandı dersi öğrenci detayında öne çıkarma
- öğrenci telefonu yoksa veli arama/WhatsApp kısayollarını erişilebilir hale getirme
- Ayarlar sürüm bilgisinin V269 ile uyumlu kalmasını güvenceye alma

Kaynak Ayarlar modülü de doğrudan V269'a güncellenmiştir; stabilizasyon düzeltmesi yedek güvence olarak kalır.

## Teknik doğrulama

`.github/workflows/pwa-dogrulama.yml` servis/modül JavaScript dosyalarını ve test kabuğunun inline JavaScript'ini `node --check` ile doğrular.

Her V269 kod değişikliğinden sonra GitHub Actions sonucu ve GitHub Pages yayını kontrol edilmeden aday sürüm tamamlandı kabul edilmez.

## Güncel öncelik sırası

1. V269 genel saha kullanımı: mobil / tablet / masaüstü
2. Bu haftanın eksik Sabit Program derslerinin `Haftalık Dersleri Oluştur` ile tamamlanması ve hafta kilidinin gerçek kullanıcı akışında doğrulanması
3. Yapıldı / İptal → öğrenci borcu → öğretmen hakedişi → rapor zincirinin uçtan uca kabul testi
4. Tahsilat → kasa, Gider → kasa ve Öğretmen Ödemesi → kasa gerçek işlem kabul testleri
5. Öğretmen branş ekleme/düzenleme akışının saha testi
6. Google Sheets ↔ Supabase son veri mutabakatı
7. Çalışan sürümün sabitlenmesi ve canlı PWA geçişi

## Kabul sonrası

1. Son çalışan commit sabitlenir.
2. Google Sheets ↔ Supabase son veri mutabakatı yapılır.
3. Canlı `index.html` kontrollü geçişle yeni modüler yapıya taşınır.
4. AppSheet günlük operasyon arayüzü olmaktan çıkarılır.
