# BS Ofis AppSheet → Supabase Senkron V1

Tarih: 12.08.2026

## Amaç

AppSheet hâlâ günlük canlı operasyon aracı olarak kullanılırken Google Sheets üzerinde oluşan güncel kayıtların BS Eğitim Yönetimi Supabase veritabanına güvenli, idempotent ve denetlenebilir şekilde aktarılması.

## Canlı veri sahipliği

Geçiş sürecinde:

**AppSheet / Google Sheets = ana yazma kaynağı**

**Supabase = yeni web uygulamasının güncel okuma/veri hizmeti**

Web uygulamasındaki gerçek yazma akışları doğrulanana kadar AppSheet'ten gelen kayıtların üzerine web tarafından bağımsız finans kaydı üretilmez.

## İlk senkron kapsamı

1. `Students` → `ogrenciler`
2. `Teachers` → `ogretmenler`
3. `Lessons` → `dersler`
4. `StudentPayments` → `tahsilatlar`
5. `KasaHesaplari` → `kasa_hesaplari`
6. `KasaHareketleri` → `kasa_hareketleri`

## Tahsilat ve gelir kuralı

- Gerçek nakit/gelir kaynağı yalnız `StudentPayments` / `tahsilatlar` kayıtlarıdır.
- `Lessons` / `dersler` kendi başına yeni nakit gelir üretmez.
- Ders kayıtları tahsilatın gelir sahibini dağıtmak için kullanılır.
- Başak Atilla'nın `Yapıldı` derslerine karşılık gelen tahsilat kısmı → Başak.
- Süleyman Yalçıner'in `Yapıldı` derslerine karşılık gelen tahsilat kısmı → Süleyman.
- Diğer öğretmenlerin `Yapıldı` derslerine karşılık gelen tahsilat kısmı → Kurum Kasası.
- Aynı öğrencinin tahsilatı farklı öğretmenlere ait dersleri karşılıyorsa tek tahsilat tutarı ders ücretleri üzerinden parçalara ayrılır.
- Bu dağıtım `TahsilatDagitimlari` ile karıştırılmaz. `TahsilatDagitimlari` tahsilatın tahakkuk/borç dağıtımına aittir; gelir sahipliği ayrı iş kuralıdır.

## Mevcut doğrulama

Kurum Finans Asistanı V1.7'de doğrulanmış örnek:

Efe Bulut tahsilatı: **₺8.000**

- Süleyman dersleri: **₺4.000** → Süleyman
- Diğer öğretmen dersleri: **₺4.000** → Kurum Kasası

Bu iş kuralı yeni BS Eğitim Yönetimi tarafında da korunacaktır.

## Neden yeni BS uygulamasında tahsilat gecikiyor?

Yeni PWA doğrudan Supabase `tahsilatlar` tablosunu okuyor. AppSheet ise Google Sheets `StudentPayments` sayfasına yazıyor. Google Sheets → BS Eğitim Supabase sürekli senkronu henüz kurulmadığı için AppSheet'e eklenen yeni tahsilat Supabase'e otomatik ulaşmıyor.

Bu bir PWA cache problemi değil; veri kaynağı senkron eksikliğidir.

## Güvenli kurulum protokolü

1. Kaynak Google Sheet şeması kuru raporla doğrulanır.
2. Her tablonun Supabase gerçek PK/unique/FK/kolon adları `supabase_yazma_onkontrol.sql` ile doğrulanır.
3. Gerçek upsert fonksiyonları hazırlanır.
4. Önce yalnız bir yeni kayıt için kuru çalışma yapılır.
5. Tek kayıt Supabase upsert testi yapılır.
6. Sheet ve Supabase sayıları/alanları karşılaştırılır.
7. Güncelleme testi yapılır; aynı kaynak ID ikinci kayıt oluşturmamalıdır.
8. Silme/iptal davranışı ayrıca test edilir; fiziksel silme varsayılan değildir.
9. Tüm tablolar doğrulanınca toplu ilk senkron yapılır.
10. Son aşamada 5 dakikalık veya uygun zamanlı tetikleyici kurulur.

## Hazırlanan güvenli kod

`BSOfisSupabaseSenkron_V1_KuruCalisma.gs`

Bu dosya yalnız Google Sheets'i okur ve Supabase payload önizlemesi üretir. Hiçbir Supabase yazma çağrısı içermez.

İlk çalıştırılacak fonksiyon:

`bsSenkronKaynakSemaRaporuV1()`

Ardından:

`bsSenkronKuruCalismaV1()`

Tek bir tahsilat payload testi:

`bsSenkronTekTahsilatKuruTestV1("PaymentID")`

## Script Property

Kaynak Apps Script projesinde var olan/korunan özellik:

`ERP_SPREADSHEET_ID`

Değer yalnız Google Sheet dosya ID'si olmalıdır; tam URL olmamalıdır.

Gerçek Supabase yazma aşamasında Service Role anahtarı GitHub'a veya frontend'e kesinlikle yazılmayacak; yalnız Apps Script Script Properties içinde tutulacaktır.
