# BS Eğitim Yönetimi — RPC İş Sözleşmeleri

Durum: Tasarım sözleşmesi. Henüz Supabase'e fonksiyon kurulmaz ve canlı yazma açılmaz.

Amaç: Gerçek şema/RLS çıktısı geldiğinde SQL fonksiyonlarını hızlı ve kontrollü biçimde üretmek; frontend JavaScript'ine finans ve operasyon iş kurallarını dağıtmamak.

## Ortak ilkeler

Her kritik iş komutu:

- oturum açmış kullanıcıyı doğrular,
- yetkili rolü veritabanı tarafında kontrol eder,
- girdileri doğrular,
- gerekli referans kayıtlarını kontrol eder,
- mümkün olan her yerde tek transaction içinde tamamlanır,
- tekrar gelen aynı isteğin ikinci sonuç üretmesini engeller,
- hata durumunda yarım kayıt bırakmaz,
- teknik hata ile kullanıcı mesajını ayırır,
- oluşturulan/değiştirilen kayıt anahtarlarını sonuç olarak döndürür.

Kritik işlemlerde ortak `istek_anahtari` / idempotency yaklaşımı kullanılacaktır. Kesin fiziksel kolon veya yardımcı tablo ihtiyacı gerçek Supabase şeması görüldükten sonra belirlenecektir; gereksiz tablo eklenmeyecektir.

## 1. `ogrenci_kaydet`

Amaç: Yeni öğrenci oluşturmak.

Girdi sözleşmesi:

- `p_ad_soyad`
- `p_veli_adi` — opsiyonel
- `p_veli_telefon` — opsiyonel
- `p_ogrenci_telefon` — opsiyonel
- `p_email` — opsiyonel
- `p_durum` — varsayılan `Aktif`
- `p_not` — opsiyonel
- `p_istek_anahtari`

Kontroller:

- ad soyad boş olamaz,
- durum izin verilen değerdir,
- e-posta varsa biçim/uzunluk kontrolü,
- RLS/rol yetkisi,
- varsa gerçek sistemde kararlaştırılan tekillik kuralı.

Dönüş örneği:

```json
{
  "basarili": true,
  "ogrenci_id": "...",
  "tekrar_istek": false
}
```

## 2. `ders_kaydet`

Amaç: Tek planlı ders oluşturmak.

Girdi sözleşmesi:

- `p_program_id` — opsiyonel
- `p_tarih`
- `p_ogrenci_id`
- `p_ogretmen_id`
- `p_brans_id`
- `p_derslik_id`
- `p_baslangic_saati`
- `p_bitis_saati` veya gerçek şemaya göre ders sayısı/süre
- birim ücret/hakediş alanları gerçek şemaya göre
- `p_aciklama` — opsiyonel
- `p_istek_anahtari`

Kontroller:

- tüm referanslar geçerli ve aktif,
- bitiş > başlangıç,
- çalışma saati sınırı,
- aynı öğrenci için zaman çakışması yok,
- aynı öğretmen için zaman çakışması yok,
- derslikte aynı aralıktaki eşzamanlı ders sayısı kapasiteyi aşmıyor,
- aynı program+tarih zaten mevcutsa toplu üretim senaryosunda ikinci kayıt oluşmuyor.

Yeni dersin başlangıç durumu `Planlandı` olur. Planlı ders oluşturulması gerçekleşmiş ciro veya hakediş üretmez.

## 3. `tahsilat_kaydet`

Amaç: Tahsilatı ve bağlı kasa hareketini atomik oluşturmak.

Girdi sözleşmesi:

- `p_ogrenci_id`
- `p_tarih`
- `p_tutar`
- `p_odeme_yontemi`
- `p_hesap_id`
- `p_aciklama` — opsiyonel
- tahakkuk/veli gibi gerçek şemada mevcut opsiyonel referanslar
- `p_istek_anahtari`

Kontroller:

- tutar > 0,
- öğrenci geçerli,
- hesap geçerli ve aktif,
- ödeme yöntemi izin verilen değer,
- aynı `p_istek_anahtari` daha önce işlenmemiş.

Tek transaction içinde:

1. tahsilat kaydı oluşturulur,
2. bağlı kasa hareketi oluşturulur:
   - hareket = Gelir
   - kaynak = Tahsilat
   - kaynak ID = tahsilat anahtarı
   - hesap ID = seçilen hesap
   - tutar = tahsilat tutarı
3. sonuç döndürülür.

Peşin/avans kuralı nedeniyle tutar tek bir tahakkukun kalan borcuyla genel olarak sınırlandırılmaz.

## 4. `tahsilat_iptal`

Amaç: Tahsilatı denetlenebilir biçimde geri almak.

Girdi:

- `p_tahsilat_id`
- `p_neden`
- `p_istek_anahtari`

Kurallar:

- fiziksel silme varsayılan yöntem değildir,
- zaten iptal olan kayıt tekrar iptal edilemez,
- bağlı kasa etkisi aynı transaction içinde iptal/ters kayıt yaklaşımıyla düzeltilir,
- geçmiş/audit korunur.

Kesin ters kayıt mı yoksa bağlı hareketi `iptal_mi` yapmak mı daha doğru olduğu mevcut Supabase kasa şeması görüldükten sonra seçilecektir.

## 5. `haftalik_ders_kuru_calisma`

Amaç: Hiç kayıt oluşturmadan hedef hafta için sonucu hesaplamak.

Girdi:

- `p_hafta_baslangici`

Çıktı:

- aktif program sayısı,
- oluşturulabilir dersler,
- zaten var olanlar,
- eksik programlar,
- öğrenci çakışmaları,
- öğretmen çakışmaları,
- derslik kapasite sorunları,
- toplam hata/uyarı sayısı.

Bu fonksiyon salt-okunur olabilir ve kullanıcı onayı öncesi çalıştırılır.

## 6. `haftalik_dersleri_olustur`

Amaç: Onaylanmış dry-run sonucuna göre toplu ders üretmek.

Girdi:

- `p_hafta_baslangici`
- `p_istek_anahtari`

Kurallar:

- dry-run kuralları transaction içinde tekrar doğrulanır,
- `program_id + hedef_tarih` aynıysa ikinci kayıt üretilmez,
- tüm yeni dersler `Planlandı` olur,
- mümkünse toplu işlem tek transaction olur,
- kısmi başarı yerine kontrollü bütünlük tercih edilir,
- sonuçta oluşturulan/mevcut/atlanan/hatalı sayıları döner.

## 7. `ders_durumu_degistir`

Amaç: Ders gerçekleşmesini merkezi iş kuralıyla yönetmek.

Girdi:

- `p_ders_id`
- `p_yeni_durum`
- gerekliyse katılım bilgisi/açıklama
- `p_istek_anahtari`

Kurallar:

- `Yapıldı` ve geçerli katılım koşulu finans etkisini doğurabilir,
- `Öğrenci Gelmedi`, `İptal`, `Ertelendi`, `Öğretmen İptali` ve yapılmamış derslerde öğrenci ücreti/öğretmen hakedişi gerçekleşmiş finans olarak kabul edilmez,
- gerçekleşmiş finans etkisi frontend formüllerine bırakılmaz,
- Yapıldı sonrası kritik alanlar serbestçe yeniden yazılmaz; düzeltme denetimli bir iş akışıyla yapılır.

## Uygulama sırası

Gerçek Supabase önkontrol çıktısı geldikten sonra önerilen uygulama sırası:

1. `ogrenci_kaydet`
2. `ders_kaydet`
3. `tahsilat_kaydet`
4. `tahsilat_iptal`
5. `haftalik_ders_kuru_calisma`
6. `haftalik_dersleri_olustur`
7. `ders_durumu_degistir`

Her fonksiyon önce test ortamı/dry-run protokolünde doğrulanır; ardından canlı frontend butonuna bağlanır.
