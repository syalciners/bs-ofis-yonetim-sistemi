# BS Eğitim — Premium Deneme Merkezi V1

## Ürün amacı

Deneme Merkezi yalnızca deneme sonucu saklayan bir ekran olmayacak. Amaç, koçun veri girişi ve manuel analiz yükünü azaltarak deneme verisini doğrudan aksiyona dönüştürmektir.

Ana prensip:

> Öğrenci sonucu sisteme getirir; sistem veriyi işler, değişimi açıklar ve koça yalnız karar vermesi gereken noktayı gösterir.

## Pazar farkı

V1'in farkı daha fazla grafik değil, daha az koç emeğidir.

Deneme sonucu -> otomatik net hesabı -> önceki denemeyle karşılaştırma -> düşüş/yükseliş sinyali -> haftalık plana öneri -> görüşme gündemine öneri -> veli özetine veri.

Aynı veri tekrar yazılmaz.

## Kullanıcı akışı

### Öğrenci tarafı

1. Deneme Sonucu Ekle
2. Sınav türünü seç: LGS / TYT / AYT / diğer
3. İlk V1'de hızlı manuel giriş; sonraki katmanda fotoğraf/optik yükleme
4. Ders/bölüm bazında Doğru / Yanlış / Boş gir
5. Sistem neti otomatik hesaplar
6. Öğrenci sonucu onaylar

### Koç tarafı

Koç Masasında yalnız aksiyon gerektiren sinyaller görünür:
- Son denemede anlamlı net düşüşü
- Aynı derste art arda düşüş
- Hedef net ile mevcut net arasındaki fark
- Deneme yapılması beklenirken veri gelmemesi
- Güçlü yükseliş / olumlu ilerleme

Koç tüm denemeleri tek tek açmak zorunda kalmaz.

## Premium akış

### 1. Deneme kaydı

Deneme başlığı:
- öğrenci
- sınav türü
- deneme adı
- tarih
- kaynak/yayın
- toplam doğru
- toplam yanlış
- toplam boş
- toplam net
- puan (opsiyonel)
- sıralama/yüzdelik (opsiyonel)
- veri kaynağı: Manuel / Fotoğraf / Optik / Entegrasyon
- onay durumu

Toplam doğru / yanlış / boş / net değerleri bölüm sonuçlarından türetilir; aynı veri ikinci kez saklanmaz.

### 2. Bölüm / ders sonuçları

Her deneme için ders veya bölüm bazında:
- ders/bölüm
- doğru
- yanlış
- boş
- net
- toplam soru

Net hesabı kural tabanlı olmalı. Yanlış götürme böleni deneme kaydında açıkça tutulur; bu nedenle LGS, TYT, AYT veya kurum içi farklı kurallar sabit koda gömülmeden kullanılabilir.

### 3. Trend

Grafik gösterme amacı dekorasyon değil karar desteğidir.

Sistem son 3 / 5 / 10 denemede:
- toplam net değişimi
- ders bazlı değişim
- en çok yükselen alan
- en çok düşen alan
- istikrarlı alan
- dalgalı alan

üretir.

### 4. Açıklanabilir risk

Kara kutu risk puanı kullanılmaz.

Örnek:

Dikkat — Türkçe
- son 3 denemede 28,5 -> 26,0 -> 23,75
- 3 denemede toplam -4,75 net
- haftalık Türkçe çalışmaları %54 tamamlandı

Sistem bu nedenle uyarı verdiğini açıkça gösterir.

### 5. Tek dokunuş aksiyon

Her sinyalden doğrudan:
- Haftalık plana çalışma ekle
- Görüşme gündemine ekle
- Koç notu oluştur
- Veli özetine dahil et

aksiyonları bulunur.

Koç aynı bilgiyi ikinci kez yazmaz.

## Koç Masası entegrasyonu

Koç Masasında yeni bölüm:

### Deneme Sinyalleri

Kart örnekleri:
- Asır — Matematik +4,25 net — yükseliş
- Ayşe — Türkçe son 3 denemede düşüyor — dikkat
- Mehmet — 14 gündür deneme sonucu yok — takip

Varsayılan olarak yalnız aksiyon gerektiren sinyaller gösterilir.

## Öğrenci 360 entegrasyonu

Öğrenci kartında:
- son deneme
- önceki denemeye fark
- hedefe kalan net
- en güçlü ders
- en çok dikkat gereken ders
- son 5 deneme trendi

bulunur.

## Öğrenci portalı

Öğrenci yalnız kendi verisini görür.

Ana deneyim:
- Son Denemem
- Önceki denemeye göre değişim
- Ders bazında netler
- Yeni Sonuç Ekle
- Koçun önerdiği çalışma

Karmaşık kurum/ERP alanları gösterilmez.

## Veli özeti

Haftalık veli raporu deneme verisini otomatik kullanır:
- son deneme neti
- önceki denemeye fark
- güçlü gelişim
- dikkat gereken alan
- koçun haftalık hedefi

Koç raporu tekrar yazmaz; yalnız onaylar/gönderir.

## Fotoğraf / optik / AI katmanı

Bu özellik V1 çekirdeği doğrulandıktan sonra eklenir.

AI rolü:
- fotoğraftan deneme adı ve sonuçları çıkarmaya yardımcı olmak
- OCR/optik veriyi eşlemek
- hatalı veya eksik olabilecek alanları işaretlemek
- trend açıklaması taslağı üretmek

AI sonucu otomatik kesin kabul edilmez. Öğrenci veya koç onayı olmadan kritik eğitim verisine sessiz yazma yapılmaz.

## Veri modeli ilkesi

İlk teknik tasarım iki yeni kavramla sınırlı tutulmuştur:

1. `kocluk_deneme_sinavlari`
2. `kocluk_deneme_bolum_sonuclari`

Mevcut `ogrenciler`, `kocluk_ogrenci_profilleri`, `odevler`, `kocluk_gorusmeleri` yeniden kullanılır.

Yeni tablo ancak yeni bir iş kavramı varsa açılır.

## Güvenlik

- RLS zorunlu
- anon erişimi yok
- authenticated kullanıcı doğrudan INSERT / UPDATE yapamaz
- yönetici yazmaları güvenli SECURITY DEFINER RPC üzerinden
- aktif koçluk profili kontrolü
- sayısal alanlarda negatif değer engeli
- D/Y/B toplamı soru sayısını aşamaz
- idempotent kayıt/güncelleme
- audit alanları

Öğrenci portalı için ayrı ve daha dar erişim politikası sonraki portal fazında tasarlanır.

## Teknik uygulama durumu — 19.08.2026

Tamamlananlar:
- `20260819133000_kocluk_deneme_merkezi_v1.sql` migration oluşturuldu ve canlı BS Eğitim Supabase projesine uygulandı.
- Deneme ana kaydı ve bölüm sonuçları tabloları kuruldu.
- `kocluk_deneme_kaydet_guvenli_v1` ve `kocluk_deneme_bolum_kaydet_guvenli_v1` güvenli RPC'leri kuruldu.
- Net hesabı bölüm RPC'sinde denemenin `yanlis_boleni` değerine göre hesaplanıyor.
- Onaylı deneme için en az bir bölüm sonucu zorunlu.
- Transaction/rollback kuru çalışma Asır Yalçıner üzerinde başarıyla geçti: 10 doğru, 4 yanlış, 6 boş / 20 soru ve 4 yanlış böleni ile Matematik neti 9,00 hesaplandı; işlem rollback edildi.
- Rollback sonrası kuru çalışma kaydı sayısı 0 olarak doğrulandı.
- İlk yetki kontrolünde authenticated rolünde doğrudan tablo yazma yetkisi görüldüğü için ayrıca `20260819134500_kocluk_deneme_yetki_sikilastirma_v1.sql` uygulandı.
- Son kontrolde authenticated yalnız SELECT yapabiliyor; doğrudan INSERT / UPDATE kapalı, anon SELECT kapalı, güvenli RPC authenticated için açık ve anon için kapalı.

Henüz yapılmayan ve bilinçli olarak bekletilen:
- Kalıcı gerçek deneme kaydı. Sahte operasyon verisi yazılmadı.
- UI ve trend ekranı. Önce tek gerçek deneme verisiyle veri çekirdeği doğrulanacak.
- Öğrenci portalı yazma yetkisi. Daha dar, öğrenci-kimliği doğrulayan ayrı RPC fazında kurulacak.

## Test sırası

1. Migration tasarla — tamamlandı
2. Transaction/rollback kuru çalışma — tamamlandı
3. Şema ve RLS kontrolü — tamamlandı
4. Tek gerçek öğrenci için gerçek deneme verisi — sıradaki adım
5. Okuma doğrulaması
6. UI
7. CI/build
8. PR
9. Canlı görsel kontrol
10. Sabitle

Sahte gerçek operasyon verisi kalıcı olarak yazılmaz.

## V1 kapsam dışı

- gamification / XP
- Pomodoro
- soru çözüm sosyal ağı
- dev video kütüphanesi
- tam otomatik AI koç
- optik cihaz entegrasyonları

Bunlar çekirdek deneyim doğrulandıktan sonra değerlendirilir.

## Premium ürün filtresi

Her yeni özellik şu sorudan geçer:

> Bu özellik koçun işini azaltıyor mu veya öğrencinin takip kalitesini ölçülebilir biçimde artırıyor mu?

Cevap hayırsa V1 çekirdeğine alınmaz.
