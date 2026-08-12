# BS Eğitim Yönetimi — Güvenli Yazma Mimarisi

Durum: Tasarım / henüz canlı yazma açılmadı

## Amaç

Yeni web arayüzündeki butonları doğrudan tabloya rastgele `insert` yapan bir yapıyla açmamak. Özellikle tahsilat, kasa ve ders finansı gibi birden fazla kaydı etkileyen işlemler tek iş kuralı üzerinden, tekrar çalıştırıldığında çift kayıt üretmeyecek şekilde yürütülmelidir.

## Temel karar

- Salt-okunur ekranlar istemciden Supabase `select` kullanabilir.
- Basit tek-tablo kayıtları ancak RLS ve zorunlu kolonlar doğrulandıktan sonra açılabilir.
- Birden fazla tabloyu etkileyen finansal işlemler istemcide art arda iki `insert` ile yapılmamalıdır.
- Finansal işlemler için tercih edilen yapı: Supabase PostgreSQL RPC / transaction.
- Her kritik yazma işleminde benzersiz `idempotency_key` veya kaynak kayıt anahtarı bulunmalıdır.

## 1. Öğrenci Ekle

Risk seviyesi: düşük / orta.

İlk açılabilecek yazma modülüdür.

Gerekli kontroller:

1. `ogrenciler` tablosunun gerçek zorunlu kolonları ve varsayılanları doğrulanacak.
2. Yönetici rolü için INSERT RLS politikası doğrulanacak.
3. Aynı öğrenci için belirlenen tekillik kuralı netleştirilecek.
4. Form kısa tutulacak; yalnız gerçek zorunlu alanlar gösterilecek.
5. Başarılı kayıt sonrası liste yeniden okunacak.

## 2. Ders Oluştur

Risk seviyesi: orta.

Ders kaydı oluşturulurken finansal gelir/hakediş doğrudan üretilmemelidir. Finans kuralı ders gerçekten `Yapıldı` olduğunda devreye girmelidir.

İlk sürüm form alanları doğrulandıktan sonra:

- tarih
- başlangıç / bitiş saati
- öğrenci
- öğretmen
- branş
- derslik / ders yeri
- ders durumu = `Planlandı`

Çakışma kontrolü yazma öncesi yapılmalıdır. Yalnız istemci kontrolüne güvenilmemeli; mümkünse veritabanı/RPC tarafında da doğrulanmalıdır.

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

## 4. Tahsilat İptali

Tahsilat kaydını fiziksel olarak silmek yerine iptal akışı tercih edilmelidir.

Hedef:

- Tahsilat `iptal_mi = true` olur.
- Bağlı kasa hareketi aynı işlem içinde iptal edilir veya muhasebe yaklaşımına göre ters hareket üretilir.
- Aynı tahsilat ikinci kez iptal edilemez.
- Denetim bilgisi korunur.

Kesin yöntem mevcut Supabase kasa modelinin kolonları doğrulandıktan sonra seçilecektir.

## 5. Haftalık Dersleri Oluştur

Risk seviyesi: yüksek.

Toplu kayıt olduğu için idempotent olmak zorundadır.

Önerilen benzersiz iş anahtarı:

`program_kaydi + hedef_tarih`

Aynı sabit program kaydından aynı tarih için ders zaten oluşturulmuşsa ikinci kayıt üretilmemelidir.

Toplu işlem önce `dry-run` sonucu döndürebilmelidir:

- oluşturulacak ders sayısı
- zaten mevcut ders sayısı
- öğrenci çakışmaları
- öğretmen çakışmaları
- derslik kapasite/çakışmaları
- hatalı/eksik sabit program kayıtları

Kullanıcı onayından sonra gerçek yazma yapılmalıdır.

## 6. Ders Durumu ve finans

Mevcut iş kuralı korunacaktır:

- `Yapıldı` + öğrenci katıldı: öğrenci ücreti ve öğretmen hakedişi oluşabilir.
- `Öğrenci Gelmedi`, `İptal`, `Ertelendi`, `Öğretmen İptali` ve yapılmamış ders: finansal tutar 0.

Yeni web arayüzünde bu kural istemci JavaScript'ine dağılmamalıdır. Tek merkezi veritabanı/RPC iş kuralı olarak tasarlanmalıdır.

## 7. UI davranışı

Yazma butonları açıldığında:

- çift tıklamaya karşı işlem sırasında buton kilitlenecek,
- kullanıcıya işlem sonucu açık Türkçe mesajla gösterilecek,
- başarı sonrası veri yeniden okunacak,
- ağ hatasında işlemin gerçekleşip gerçekleşmediği idempotency anahtarıyla sorgulanabilecek,
- kritik finansal işlemde sessiz hata olmayacak.

## Canlıya alma sırası

1. Öğrenci Ekle
2. Ders Oluştur
3. Ders düzenleme / durum güncelleme
4. Tahsilat Gir
5. Tahsilat iptali
6. Haftalık Dersleri Oluştur

Her modül ayrı test edilmeden sonraki yazma modülüne geçilmez.
