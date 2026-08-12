# BS Eğitim Yönetimi — Sabah Durumu

Tarih: 12.08.2026

## 1. Canlı uygulama korundu

Canlı `index.html` üzerinde gece toplu geliştirme yapılmadı.

Kullanıcı tarafından son doğrulanan canlı ekran:

- açılıyor
- Google oturumu çalışıyor
- Bugünkü Dersler: 4
- Bu Ay Tahsilat: ₺72.000
- Bu Ay Ciro: ₺96.000
- marka/logosu: BS Eğitim Yönetimi

Doğrulanmış temel geri dönüş commit'i:

`09552e4f048ec9696576fbdfa232944056d4e8b5`

Ayrıca bu commit için geri dönüşü kolaylaştırmak amacıyla şu branch oluşturuldu:

`canli-yedek-09552`

## 2. Gece hazırlanan salt-okunur geliştirme alanları

### `gelistirme-v2.html`

Amaç:

- Yönetim Özeti
- 5 KPI
- Dersler + filtre
- Öğrenciler + bakiye filtresi
- Tahsilatlar + ay/öğrenci/yöntem filtresi
- Kasa
- Tanılama

Canlı veriyi yalnızca okur. Kullanıcı tarafından henüz son ekran testi yapılmadı.

### `veri-denetimi.html`

Amaç:

- ID tekilliği
- ders referans bütünlüğü
- tahsilat öğrenci/hesap referansı
- kasa hareketi hesap referansı
- aktif tahsilatlarda pozitif tutar kontrolü
- tahsilat → kasa hareketi bağlantısı
- aynı tahsilata birden fazla kasa hareketi riski
- finans özetleri
- 12.08 aktarım snapshot karşılaştırması

Hiçbir yazma işlemi yoktur.

### `yazma-onizleme.html`

Gelecekteki gerçek formların dry-run prototipidir.

Bölümler:

1. Öğrenci Ekle — isim/mükerrer/e-posta kuru kontrolü
2. Ders Oluştur — öğrenci/öğretmen çakışması + derslik kapasitesi kuru kontrolü
3. Tahsilat Gir — tahsilat ve kasa hareketi transaction önizlemesi
4. Haftalık Dersler — program+tarih idempotency ve çakışma dry-run

Bu ekran `insert`, `update`, `delete` veya RPC çağrısı yapmaz.

### `gelistirme-merkezi.html`

Yukarıdaki güvenli test sayfalarını tek yerde toplar.

## 3. Hazırlanan teknik dokümanlar

### `GELISTIRME_NOTLARI.md`

Canlı durum, doğrulanan kasa/öğrenci bakiye sonuçları ve geliştirme sırası.

### `YAZMA_MIMARISI.md`

Kritik yazmalar için:

- RPC/transaction
- idempotency
- yarım finans kaydı bırakmama
- tahsilat + kasa hareketini tek iş komutu olarak ele alma
- haftalık üretimde dry-run + onay

### `SUPABASE_VERI_SOZLUGU.md`

Doğrulanmış Supabase alanları ve 12.08 aktarım referans toplamları.

### `IS_KURALLARI_MIGRASYON.md`

Eski AppSheet teknik dokümanından PWA'ya taşınması gereken iş kuralları:

- öğrenci alanları
- ders durumları
- ders saat kontrolü
- öğrenci/öğretmen çakışması
- derslik kapasitesi
- tahsilat alanları
- ödeme yöntemi / hesap mantığı
- tahsilat → kasa hareketi
- peşin/avans kuralı
- haftalık ders üretimi
- program_id + tarih duplicate önleme

### `supabase_yazma_onkontrol.sql`

Tamamen salt okunur SQL'dir. Gerçek yazma açılmadan önce:

- kolonlar
- veri tipleri
- NOT NULL/default
- constraint'ler
- foreign key'ler
- index'ler
- RLS policy'leri
- mevcut RPC/fonksiyonlar

çıktısını almak için hazırlandı.

## 4. AppSheet'ten gece teyit edilen önemli kurallar

### Ders

Eski Lessons yapısında:

- yeni ders varsayılan `Planlandı`
- bitiş > başlangıç
- bitiş en geç 21:00
- öğrenci çakışması engelleniyor
- öğretmen çakışması engelleniyor
- eski sistem derslik çakışmasını da tek kayıt olarak engelliyordu

Yeni sistemde derslik tarafı gerçek kapasiteyle ele alınacak:

- Başak Derslik 4
- Yalçıner Derslik 4
- Salon 10

### Tahsilat

Eski ödeme yöntemleri:

- Nakit
- Havale/EFT
- Kredi Kartı

Eski sistemde ödeme yöntemi hesabı otomatik seçebiliyordu:

- Nakit → KASA-001
- Havale/EFT / Kredi Kartı → KASA-002

Yeni PWA'da kullanıcı teknik ID görmeyecek; anlaşılır hesap adı gösterilecek.

Tahsilat aynı zamanda kasa hareketi üretir:

- Gelir
- Kaynak = Tahsilat
- KaynakID = tahsilat kaydı
- HesapID
- Tutar

### Haftalık üretim

Eski `Haftalık Dersleri Oluştur` aksiyonu aktif programlara `Dersi Oluştur` uygular.

Duplicate önleme özü:

`ProgramID + hedef tarih`

aynıysa ikinci ders oluşturulmaz.

Yeni PWA'da bunun önüne dry-run + veritabanı idempotency katmanı eklenecek.

## 5. Sabah önerilen tek test sırası

Önce yalnız:

`gelistirme-merkezi.html`

sayfası açılacak.

Ardından sırayla:

1. Modüler Geliştirme V2
2. Veri Denetimi
3. Yazma Kuru Kontrolü

kontrol edilecek.

Bu üç ekran doğrulanmadan canlı `index.html` içine yeni modül taşınmayacak.

## 6. Yazma için henüz kullanıcı müdahalesi gereken sınır

Gerçek INSERT/RPC geliştirmesine geçmeden önce `supabase_yazma_onkontrol.sql` çıktısına ihtiyaç vardır. Çünkü gerçek Supabase kolon tipi, constraint, unique index ve RLS policy'leri teyit edilmeden güvenli yazma açılmamalıdır.

Bu noktaya kadar kullanıcı müdahalesi gerektirmeyen mimari, test ekranı, dry-run ve dokümantasyon çalışmaları tamamlanmıştır.
