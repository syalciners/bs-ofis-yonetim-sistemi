# BS Eğitim SaaS V1 — Kütüphane & Çalışma Alanı

## Durum

Bu belge ürün tasarım kararıdır. Modül henüz Core kurulum paketine eklenmez.
Uygulama kodlaması, SaaS Core hosted smoke/security kabulü tamamlanıp `installable:true` olduktan sonra başlar.

Modül kimliği: `kutuphane`
Dağıtım tipi: opsiyonel modül
Varsayılan: kapalı

## Ürün ilkesi

Kütüphane hizmeti öğrencinin kimlik kaydının parçası değildir. Öğrenci bir kez Core'da kayıtlı olur; ders, kütüphane, koçluk gibi hizmetler bu öğrenciye ayrı ilişkili kayıtlar olarak tanımlanır.

Bu nedenle Öğrenci Ekle formuna masa, paket, kiralama süresi veya ücret alanları eklenmez.

## Öğrenci kayıt ekranı

### Kimlik
- Ad Soyad — zorunlu
- Öğrenci ID — sistem üretir, kullanıcı düzenlemez
- Durum — yeni kayıtta varsayılan Aktif; düzenlemede değiştirilebilir

### İletişim
- Öğrenci Telefon
- E-posta
- E-posta, portal etkinse Google ile giriş eşleşmesinde kullanılabilir

### Veli
- Veli Ad Soyad
- Veli Telefon
- İki alan da opsiyoneldir; yetişkin veya yalnız kütüphane kullanan öğrencide veli zorunlu değildir

### Kayıt
- Kayıt Tarihi — varsayılan bugün
- Notlar

### Bilerek bu formda olmayanlar
- Kütüphane paketi
- Masa
- Saat/gün/ay/sezon
- Kütüphane ücreti
- Ders paketi/programı
- Koçluk hedefi
- Deneme bilgileri

Bunlar öğrencinin kimliği değil, satın aldığı hizmet veya operasyon kayıtlarıdır.

## Kayıt sonrası hızlı akış

Öğrenci kaydedildikten sonra öğrenci detayında mevcut hızlı işlemlere göre hizmete özel aksiyonlar sunulur.

Core:
- Tahsilat Al
- Ders Ekle
- Ödev Ekle
- Kaydı Düzenle

Kütüphane modülü açıksa ek olarak:
- Kütüphane Paketi Tanımla

Kütüphane modülü kapalıysa bu aksiyon ve Kütüphane menüsü görünmez.

Hedef onboarding:
1. Öğrenciyi kaydet
2. Kütüphane Paketi Tanımla
3. Paket sabit masalıysa masa seç / esnekse masa seçmeden kaydet

## Kütüphane kullanım modelleri

### Sabit Masa
Öğrencinin kiralama süresi boyunca belirli bir masası vardır.
Örnek: Masa 12, 1–30 Eylül.

### Esnek Masa
Öğrencinin kullanım hakkı vardır; geldiğinde boş masa atanır.
Örnek: Aylık sınırsız paket, her gelişte uygun masa.

## Paket türleri

V1 aşağıdaki ticari süreleri destekleyecek şekilde tasarlanır:
- Saatlik
- Günlük
- Aylık
- Sezonluk

Veri modeli daha sonra 10 giriş, 100 saat, yalnız hafta içi, yalnız hafta sonu veya saat aralıklı paketleri eklemeyi engellemeyecek şekilde kurulmalıdır.

## V1 veri modeli

### `kutuphane_masalari`
Fiziksel çalışma kaynakları.
Temel alanlar:
- masa_id
- masa_kodu
- masa_adi
- alan_bolum
- aktif
- sira
- notlar

### `kutuphane_paketleri`
Satılan kütüphane ürünleri.
Temel alanlar:
- paket_id
- paket_adi
- fiyatlandirma_turu: Saatlik / Günlük / Aylık / Sezonluk
- kullanim_modeli: Sabit Masa / Esnek Masa
- sure_degeri
- liste_fiyati
- aktif
- kullanim_kurali / notlar

### `kutuphane_kiralamalari`
Öğrencinin satın aldığı kullanım hakkı.
Temel alanlar:
- kiralama_id
- ogrenci_id
- paket_id
- masa_id — esnek pakette null olabilir
- baslangic_zamani / tarihi
- bitis_zamani / tarihi
- net_tutar
- durum: Planlandı / Aktif / Tamamlandı / İptal
- olusturma ve güncelleme denetim alanları

### `kutuphane_kullanimlari`
Gerçek giriş/çıkış ve masa kullanım kayıtları.
Temel alanlar:
- kullanim_id
- kiralama_id
- ogrenci_id
- masa_id
- giris_zamani
- cikis_zamani
- kullanim_dakikasi
- durum
- notlar

## Finans kuralı

Kütüphane için ikinci tahsilat veya kasa sistemi kurulmaz.

- Kütüphane kiralamasının net ücreti öğrencinin mevcut finansal bakiyesine ek bir borç kaynağı olarak dahil edilir.
- Ödeme mevcut `tahsilatlar` ve `kasa_hareketleri` altyapısından geçer.
- Avans ödeme mevcut öğrenci bakiyesi mantığıyla kütüphane borcunu da karşılayabilmelidir.
- Kütüphane modülü kapalı kurumlarda finans hesapları mevcut Core davranışıyla aynı kalır.

Bu entegrasyon kodlanmadan önce ücretin oluşma anı, iptal/iade ve dönem uzatma kuralları ayrıca kabul testiyle sabitlenmelidir.

## Çakışma kuralları

Sabit masa için aynı zaman aralığında ikinci aktif kiralamaya izin verilmez.
Saatlik/günlük sabit masa kullanımında masa-zaman çakışması sunucuda tekrar doğrulanır.
Esnek pakette kiralama masa bloke etmez; masa yalnız gerçek kullanım/giriş sırasında atanır.

## Ana Kütüphane ekranı

Menü, yalnız `kutuphane` modülü açıksa görünür.

Kütüphane:
- Bugün
- Masalar
- Kiralamalar
- Paketler

`Bugün` ekranı ilk satış sürümünün ana operasyon ekranıdır:
- Toplam masa
- Dolu
- Boş
- Yakında başlayacak kullanım
- Masa kartlarında öğrenci ve kullanım bitişi
- Yeni Kiralama
- Giriş Yap / Boş Masa Ata
- Çıkış Yap

## V1 dışı / sonraki sürüm

İlk sürüme eklenmeyecek ancak veri modeli engellemeyecek:
- QR ile giriş/çıkış
- öğrenci portalından rezervasyon
- turnike entegrasyonu
- paket dondurma
- otomatik yenileme
- kota/saat bakiyesi
- yoğunluk tahmini
- WhatsApp paket bitiş uyarısı
- çok şubeli alan/masa yönetimi

## Uygulama sırası

1. SaaS Core hosted smoke/security kabulü
2. Core `installable:true` ve paid-pilot golden master
3. Kütüphane SQL/RLS sözleşmesi ayrı opsiyonel migration paketi
4. Paket + masa + kiralama servisleri
5. Kütüphane Bugün ekranı
6. Öğrenci detayına koşullu `Kütüphane Paketi Tanımla` hızlı işlemi
7. Finans bakiye entegrasyonu ve iptal/iade kabul testleri
8. İzole modül build/test
9. Pilot kütüphane müşterisi
