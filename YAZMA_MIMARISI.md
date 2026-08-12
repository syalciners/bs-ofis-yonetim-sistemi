# BS Eğitim Yönetimi — Güvenli Yazma Mimarisi

Durum: Tasarım / henüz canlı yazma açılmadı

## Amaç

Yeni web arayüzündeki butonları doğrudan tabloya rastgele `insert` yapan bir yapıyla açmamak. Özellikle tahsilat, kasa ve ders finansı gibi birden fazla kaydı etkileyen işlemler tek iş kuralı üzerinden, tekrar çalıştırıldığında çift kayıt üretmeyecek şekilde yürütülmelidir.

## Günlük operasyon önceliği — 12.08.2026

Kullanıcının en sık kullandığı ve ilk çalışan web sürümünde öncelikli olacak akışlar:

1. **Haftalık Dersleri Oluştur**
2. **Ders Takvimi**
3. **Öğretmen Takvimi**
4. **Tahsilat Gir**
5. **Manuel / Ek Ders Ekle**

Takvim ve öğretmen takvimi salt-okunur olarak erkenden açılabilir. Veri yazan üç akış ise aşağıdaki güvenlik kurallarına göre devreye alınacaktır.

## Temel karar

- Geçiş sürecinde **AppSheet / Google Sheets ana canlı yazma kaynağıdır**.
- Supabase, yeni web uygulamasının güncel okuma ve ileride güvenli yazma katmanıdır.
- AppSheet aktif kullanılırken Google Sheets → Supabase tek yönlü senkron idempotent çalışmalıdır.
- Salt-okunur ekranlar istemciden Supabase `select` kullanabilir.
- Basit tek-tablo kayıtları ancak RLS ve zorunlu kolonlar doğrulandıktan sonra açılabilir.
- Birden fazla tabloyu etkileyen finansal işlemler istemcide art arda iki `insert` ile yapılmamalıdır.
- Finansal işlemler için tercih edilen yapı: Supabase PostgreSQL RPC / transaction.
- Her kritik yazma işleminde benzersiz `idempotency_key` veya kaynak kayıt anahtarı bulunmalıdır.

## 1. Öğrenci Ekle

Risk seviyesi: düşük / orta.

İlk açılabilecek bağımsız yazma modüllerinden biridir; ancak günlük operasyon önceliğinde ilk beş işlem tamamlandıktan sonra ele alınabilir.

Gerekli kontroller:

1. `ogrenciler` tablosunun gerçek zorunlu kolonları ve varsayılanları doğrulanacak.
2. Yönetici rolü için INSERT RLS politikası doğrulanacak.
3. Aynı öğrenci için belirlenen tekillik kuralı netleştirilecek.
4. Form kısa tutulacak; yalnız gerçek zorunlu alanlar gösterilecek.
5. Başarılı kayıt sonrası liste yeniden okunacak.

## 2. Ders Oluştur / Manuel Ek Ders

Risk seviyesi: orta.

Ders kaydı oluşturulurken finansal gelir/hakediş doğrudan üretilmemelidir. Finans kuralı ders gerçekten `Yapıldı` olduğunda devreye girmelidir.

İlk sürüm kullanıcı formunda önde tutulacak alanlar:

- öğrenci
- öğretmen
- tarih
- başlangıç saati
- derslik / ders yeri
- ders süresi
- branş

Ders durumu varsayılan olarak `Planlandı` olacaktır. Ücret, hakediş ve teknik alanlar mümkün olduğunca otomatik doldurulacak veya ikincil bölümde tutulacaktır.

### Takvim süresi ile finansal ders birimi ayrımı

Mevcut AppSheet `Lessons.BitisSaati` formülü `BaslangicSaati + DersSayisiSaat` şeklindedir ve canlı takvimde 1 ders 13:00–14:00, 2 ders 13:00–15:00 gibi **60 dakikalık takvim slotları** olarak görünür.

Finans tarafında ise kurum iş kuralı **50 dakikalık gerçekleşen ders = 1 ders birimi** olarak korunur.

Bu nedenle yeni uygulamada iki kavram birbirine karıştırılmayacaktır:

- takvim/çakışma süresi: 1 ders = 60 dakikalık slot,
- finansal ders birimi: gerçekleşen 50 dakikalık ders = 1 birim.

Kullanıcı bu teknik ayrımı günlük formda görmeyecek; sistem arka planda doğru kuralı uygulayacaktır.

### Çakışma kontrolü

Yazma öncesi aynı tarih ve örtüşen saat aralığında aşağıdakiler kontrol edilir:

- öğrenci,
- öğretmen,
- derslik.

`İptal`, `Ertelendi` ve `Öğretmen İptali` durumundaki dersler çakışma hesabına dahil edilmez. Yalnız istemci kontrolüne güvenilmemeli; gerçek yazma açıldığında aynı kontrol veritabanı/RPC tarafında da yapılmalıdır.

## 3. Tahsilat Gir

Risk seviyesi: yüksek.

Tahsilat tek başına yalnız `tahsilatlar` tablosuna kayıt atmak değildir. Mevcut BS Ofis iş mantığında tahsilatın ilgili kasa/banka hesabına gelir hareketi oluşturması gerekir.

Hedef RPC örneği:

`public.tahsilat_kaydet(...)`

Tek transaction içinde:

1. Yönetici/yetkili kullanıcı doğrulanır.
2. `idempotency_key` daha önce kullanılmış mı kontrol edilir.
3. Tutar > 0 kontrol edilir.
4. Öğrenci ve hesap kayıtları doğrulanır.
5. `tahsilatlar` kaydı eklenir.
6. Aynı işlem içinde `kasa_hareketleri` kaydı oluşturulur:
   - hareket türü: `Gelir`
   - kaynak türü: `Tahsilat`
   - kaynak ID: oluşturulan tahsilat ID
   - hesap ID: tahsilatın hesap ID'si
   - tutar: tahsilat tutarı
7. Transaction tamamlanır ve oluşturulan kayıt döndürülür.

Herhangi bir adım hata verirse iki tablodan hiçbiri yarım durumda bırakılmamalıdır.

Ödeme yöntemi kullanıcı deneyiminde hesabı otomatik önerebilir:

- `Nakit` → Ofis Kasası
- `Havale/EFT` → banka hesabı
- `Kredi Kartı` → tanımlı banka/POS hesabı

Kesin hesap ID'si arayüzde kullanıcıya gösterilmez.

## 4. Tahsilat İptali

Tahsilat kaydını fiziksel olarak silmek yerine iptal akışı tercih edilmelidir.

Hedef:

- Tahsilat `iptal_mi = true` olur.
- Bağlı kasa hareketi aynı işlem içinde iptal edilir veya muhasebe yaklaşımına göre ters hareket üretilir.
- Aynı tahsilat ikinci kez iptal edilemez.
- Denetim bilgisi korunur.

Kesin yöntem mevcut Supabase kasa modelinin kolonları doğrulandıktan sonra seçilecektir.

## 5. Haftalık Dersleri Oluştur

Risk seviyesi: yüksek ve günlük kullanım açısından **birinci öncelik**.

### AppSheet'ten korunacak gerçek davranış

Kaynak: `DersProgrami`.

Bir program kaydı yalnız şu koşullarda hedef haftanın ilgili gününe ders üretebilir:

- `ProgramDurumu = "Aktif"`,
- programın `BaslangicTarihi` hedef tarihten sonra değildir,
- `BitisTarihi` boş veya hedef tarihe eşit/sonradır,
- aynı `ProgramID + hedef tarih` için daha önce `Lessons` kaydı yoktur.

Yeni dersin başlangıç durumu `Planlandı` olacaktır.

Önerilen benzersiz iş anahtarı:

`program_id + hedef_tarih`

Aynı sabit program kaydından aynı tarih için ders zaten oluşturulmuşsa ikinci kayıt üretilmemelidir.

### Dry-run zorunluluğu

Toplu işlem gerçek kayıt oluşturmadan önce kullanıcıya şu özeti göstermelidir:

- aktif/uygun sabit program sayısı,
- oluşturulacak ders sayısı,
- zaten mevcut ders sayısı,
- öğrenci çakışmaları,
- öğretmen çakışmaları,
- derslik çakışmaları,
- hatalı/eksik sabit program kayıtları.

Kullanıcı onayından sonra gerçek yazma yapılmalıdır.

### Kullanıcı dostu sonuç mesajı

Örnek:

`18 ders oluşturuldu · 2 ders zaten vardı · 1 çakışma nedeniyle oluşturulmadı`

Kullanıcı teknik `ProgramID`, `LessonID` veya SQL bilgisi görmemelidir.

## 6. Sabit program senkronu

AppSheet canlı kullanılmaya devam ettiği için `DersProgrami` değişiklikleri yeni web uygulamasına otomatik ulaşmalıdır.

Kaynak/hedef:

`Google Sheets DersProgrami` → `Supabase public.sabit_ders_programi`

Idempotency anahtarı:

`ProgramID` → `program_id` primary key

Hazırlanan dosyalar:

- `supabase_sabit_ders_programi_v1.sql`
- `BSOfisDersProgramiSenkron_V1.gs`

Kurulum protokolü:

1. Supabase tablo şeması hazırlanır.
2. Kaynak şema kuru raporu çalıştırılır.
3. Tüm kayıtlar için kuru payload kontrol edilir.
4. Tek ProgramID gerçek upsert testi yapılır.
5. Aynı ProgramID ikinci kez çalıştırılarak çift kayıt oluşmadığı doğrulanır.
6. İlk toplu senkron yapılır.
7. Sonrasında periyodik tetikleyici açılır.

## 7. Ders Durumu ve finans

Mevcut iş kuralı korunacaktır:

- `Yapıldı` + öğrenci katıldı: öğrenci ücreti ve öğretmen hakedişi oluşabilir.
- `Öğrenci Gelmedi`, `İptal`, `Ertelendi`, `Öğretmen İptali` ve yapılmamış ders: finansal tutar 0.

Yeni web arayüzünde bu kural istemci JavaScript'ine dağılmamalıdır. Tek merkezi veritabanı/RPC iş kuralı olarak tasarlanmalıdır.

## 8. UI davranışı

Yazma butonları açıldığında:

- çift tıklamaya karşı işlem sırasında buton kilitlenecek,
- kullanıcıya işlem sonucu açık Türkçe mesajla gösterilecek,
- başarı sonrası veri yeniden okunacak,
- ağ hatasında işlemin gerçekleşip gerçekleşmediği idempotency anahtarıyla sorgulanabilecek,
- kritik finansal işlemde sessiz hata olmayacak.

## Canlıya alma sırası

Günlük operasyon ihtiyacına göre:

1. Sabit program senkronu
2. Haftalık Dersleri Oluştur
3. Manuel / Ek Ders Ekle
4. Tahsilat Gir
5. Ders düzenleme / durum güncelleme
6. Öğrenci Ekle
7. Tahsilat iptali

Takvim ve Öğretmen Takvimi salt-okunur olarak bu sıradan bağımsız geliştirilebilir ve şu anda prototipte çalışmaktadır.

Her veri yazan modül ayrı test edilmeden sonraki yazma modülüne geçilmez.
