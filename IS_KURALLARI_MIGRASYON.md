# BS Eğitim Yönetimi — AppSheet → PWA İş Kuralı Migrasyon Notları

Son güncelleme: 12.08.2026

Amaç: Eski çalışan AppSheet davranışını körlemesine kopyalamak değil; çalışan iş kurallarını kaybetmeden yeni Supabase/PWA mimarisine taşımak. Bu belge `appsheet dokuman 11.08.2026.pdf` teknik referansı ile mevcut ürün kararlarının birleşimidir.

## 1. Öğrenci kaydı

Eski `Students` tablosunda kullanıcıya ait temel fiziksel alanlar:

- StudentID — `UNIQUEID()`
- AdSoyad — Öğrenci Adı Soyadı
- VeliAdi
- VeliTelefon
- OgrenciTelefon
- Email
- KayitTarihi — varsayılan `TODAY()`
- Durum — `Aktif | Pasif | Donduruldu`
- Not

Yeni PWA için minimum form yaklaşımı:

- zorunlu: Ad Soyad
- varsayılan: Durum = Aktif, Kayıt Tarihi = bugün
- veli/telefon/e-posta/not: ihtiyaca göre opsiyonel
- teknik ID kullanıcıya gösterilmez

Gerçek Supabase kolon isimleri ve NOT NULL constraint'leri `supabase_yazma_onkontrol.sql` ile teyit edilmeden INSERT açılmaz.

## 2. Ders oluşturma

Eski `Lessons` tablosunda temel alanlar:

- LessonID
- ProgramID
- Tarih
- StudentID
- TeacherID
- BranchID
- LocationID
- DersSayisiSaat
- OgrenciBirimUcreti
- OgretmenBirimHakedisi
- OgrenciToplamTutar
- OgretmenToplamHakedis
- DersDurumu
- Aciklama
- BaslangicSaati
- BitisSaati
- DersTuru
- DersYeri
- audit ve Zoom alanları

### Ders durumu

Eski enum'un temel değerleri:

- Yapıldı
- Planlandı
- İptal

Proje genelinde ayrıca gerçekleşme/iptal iş mantığında kullanılan durumlar korunmalıdır:

- Öğrenci Gelmedi
- Ertelendi
- Öğretmen İptali

Yeni ders ilk oluşturulduğunda varsayılan durum **Planlandı** olmalıdır.

### Finans

Eski AppSheet'te:

- `OgrenciToplamTutar = DersSayisiSaat × OgrenciBirimUcreti`
- `OgretmenToplamHakedis = DersSayisiSaat × OgretmenBirimHakedisi`

Ancak yeni PWA'da gerçekleşmiş finans etkisi yalnız ders gerçekten gerçekleştiğinde değerlendirilir. Planlı bir dersin tutar alanlarının dolu olması, o tutarın gerçekleşmiş ciro/hakediş olduğu anlamına gelmez.

### Saat doğrulaması

Eski kural:

- bitiş > başlangıç
- bitiş en geç 21:00

Bu kural kurum çalışma saati ayarları merkezileştirilene kadar güvenli varsayılan olarak korunabilir.

### Çakışma

Eski AppSheet doğrulaması aynı tarih/saat aralığında şunları engeller:

- aynı öğretmenin başka aktif dersi
- aynı öğrencinin başka aktif dersi
- aynı dersliğin başka aktif dersi

İptal/ertelenmiş kayıtlar çakışma hesabından çıkarılır.

Yeni PWA'da öğretmen ve öğrenci için eşzamanlı kapasite 1 kalır. Derslik tarafında eski `LocationID` tek kayıt engeli doğrudan kopyalanmamalıdır; gerçek derslik kapasitesi dikkate alınmalıdır. BS Eğitim referans kurumundaki kapasite kararı:

- Başak Derslik: 4
- Yalçıner Derslik: 4
- Salon: 10

Birebir ders modelinde her ders kapasiteden 1 öğrenci tüketir. Aynı zaman aralığındaki ders sayısı kapasiteye ulaştığında yeni ders reddedilmelidir.

Çakışma kontrolü yalnız frontend JavaScript'inde bırakılmamalıdır. Gerçek yazmada PostgreSQL RPC/transaction içinde yeniden doğrulanmalıdır.

## 3. Tahsilat

Eski `StudentPayments` alanları:

- PaymentID
- Tarih
- StudentID
- Tutar
- OdemeYontemi
- Aciklama
- CreatedBy
- CreatedAt
- HesapID

Eski ödeme yöntemi enum'u:

- Nakit
- Havale/EFT
- Kredi Kartı

Eski otomatik hesap eşleştirmesi:

- Nakit → `KASA-001`
- Havale/EFT → `KASA-002`
- Kredi Kartı → `KASA-002`

Yeni PWA'da ID'leri arayüzde göstermemek ve hesap seçimini gerçek `kasa_hesaplari` verisi üzerinden yönetmek tercih edilir. Ödeme yöntemi varsayılan hesap önerebilir fakat kullanıcıya anlaşılır hesap adı gösterilmelidir.

### Peşin/avans kuralı

Tahsilat:

- tek bir tahakkuka bağlı olmak zorunda değildir,
- tek bir tahakkukun kalan borcunu aşabilir,
- öğrenci/veli bakiyesi olarak tutulabilir.

Bu nedenle `tutar <= tek tahakkuk kalan borcu` türünde genel kısıt yeni sisteme taşınmamalıdır.

### Tahsilat → Kasa

Eski AppSheet otomasyonu tahsilattan bir kasa hareketi üretir:

- HareketTuru = Gelir
- KaynakTuru = Tahsilat
- KaynakID = PaymentID
- HesapID = tahsilat hesabı
- Tutar = tahsilat tutarı
- Aciklama = tahsilat açıklaması
- öğrenci referansı
- oluşturma/audit alanları
- iptal = false
- durum = Tamamlandı

Yeni PWA'da bu işlem iki ayrı frontend INSERT olarak uygulanmayacaktır. Hedef `tahsilat_kaydet(...)` RPC'sidir; tahsilat ve kasa hareketi aynı transaction içinde oluşur.

## 4. Haftalık ders üretimi

Eski yapı iki seviyelidir:

1. `Haftalık Dersleri Oluştur` aktif `DersProgrami` kayıtlarının tümüne `Dersi Oluştur` aksiyonunu uygular.
2. `Dersi Oluştur`, haftanın gününü hedef haftadaki tarihe dönüştürerek `Lessons` kaydı ekler ve durumu `Planlandı` yapar.

Eski duplicate önleme kuralının özü:

- Program aktif olmalı.
- Program başlangıç tarihi geçerli olmalı.
- Bitiş tarihi boş veya hedef tarihi kapsıyor olmalı.
- Aynı `ProgramID + hedef Tarih` için ders zaten varsa ikinci ders oluşturulmamalı.

Bu iş anahtarı yeni PWA'da da temel idempotency kuralı olmalıdır:

`program_id + hedef_tarih`

### Yeni mimaride gerekli iyileştirme

Eski AppSheet toplu aksiyonu doğrudan kayıt üretir. Yeni sistemde önce **dry-run**, sonra kullanıcı onayı, sonra transaction/RPC olmalıdır.

Dry-run sonucu en az:

- aktif program sayısı
- oluşturulacak kayıt sayısı
- zaten var olan kayıt sayısı
- eksik program alanları
- öğrenci çakışmaları
- öğretmen çakışmaları
- derslik kapasite sorunları

vermelidir.

## 5. Yapıldı sonrası kilitleme

Eski AppSheet'te öğrenci, öğretmen, süre ve fiyat gibi kritik ders alanları `DersDurumu = Yapıldı` olduktan sonra düzenlenemez veya sınırlandırılır.

Yeni PWA'da da gerçekleşmiş/finans etkisi oluşmuş bir ders serbestçe yeniden yazılmamalıdır. Düzeltme gerekiyorsa denetimli bir düzeltme/geri alma iş akışı tasarlanmalıdır.

## 6. Güvenlik ve rol

Eski AppSheet'te birçok yönetim aksiyonu `Yönetici` veya `Personel` rolüne bağlıdır. Mevcut PWA ilk aşamada yalnız yönetici profillerini içeri alıyor.

Yeni yazma RPC'leri frontend'deki buton görünürlüğüne güvenmemelidir; veritabanı tarafında da yetkili kullanıcı kontrolü olmalıdır.

## 7. Teknik uygulama sırası

1. Salt okunur veri ve bütünlük testleri
2. Supabase gerçek kolon/constraint/RLS önkontrolü
3. Öğrenci Ekle
4. Ders Oluştur + veritabanı tarafı çakışma doğrulaması
5. Tahsilat Gir + transaction + idempotency
6. Tahsilat iptali/geri alma
7. Haftalık Dersleri Oluştur dry-run
8. Haftalık gerçek toplu yazma
9. Ders durumu → finans/hakediş merkezi iş komutu
10. Öğretmen ödeme/gider/rapor gibi sonraki finans modülleri
