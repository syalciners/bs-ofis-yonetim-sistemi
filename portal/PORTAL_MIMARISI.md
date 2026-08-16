# BS Eğitim Portalı — Mimari Sözleşme

## Amaç
Öğrenci ve öğretmenlerin BS Eğitim verilerini güvenli biçimde yalnız görüntüleyebildiği, mevcut yönetim PWA'sından bağımsız çalışan ikinci bir PWA oluşturmak.

## Değişmez kurallar
- Mevcut BS Eğitim Yönetimi root uygulaması portal geliştirmeleri nedeniyle değiştirilmez.
- Portal aynı Supabase projesini kullanır; ikinci bir veritabanı oluşturulmaz.
- Öğrenci ve öğretmen portalı hiçbir kayıt üzerinde INSERT, UPDATE veya DELETE yapamaz.
- Portal istemcisi ana tablolara doğrudan sorgu atmaz.
- Tüm portal verileri yalnız `portal_*` salt-okunur RPC fonksiyonlarından gelir.
- RPC fonksiyonları `auth.uid()` ile `portal_kullanicilari` eşleşmesini doğrular ve yalnız ilgili öğrenci/öğretmenin satırlarını döndürür.
- Hassas finans tabloları portal RPC'lerinde kullanılmaz.
- Yeni özellikler önce bu sözleşmeye göre güvenlik açısından değerlendirilir.

## V1 ekranları
1. Bugün
2. Program
3. Ödevler
4. Profil

## V1 veri kapsamı
### Öğretmen
- Kendi dersleri
- Kendi verdiği ödevler
- Derslerindeki öğrenci adları
- Ders yeri / branş / Zoom katılım bağlantısı

### Öğrenci
- Kendi dersleri
- Kendi ödevleri
- Ders öğretmeni / branş / ders yeri / Zoom katılım bağlantısı

## V1'de kesinlikle yok
- Tahsilat
- Gider
- Kasa
- Hakediş
- Öğretmen ödemeleri
- Ders veya ödev düzenleme
- Ders durumu değiştirme
- Dosya yükleme
- Profil düzenleme

## Branch ve sürüm kuralı
- `main`: mevcut yönetim uygulamasının çalışan sürümü
- `portal-v1-gelistirme`: portal geliştirme alanı
- Portal doğrulanmadan `main`e birleştirilmez.
