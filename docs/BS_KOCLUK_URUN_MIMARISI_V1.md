# BS Koçluk — Ürün Mimarisi V1

## Ürün kararı

BS Koçluk, BS Eğitim Yönetimi'nin içinden erişilebilen koçluk modülünü kaybetmeden, ayrıca bağımsız olarak açılabilen ayrı bir uygulama yüzü olacaktır.

Temel ilke:

**Bir veri çekirdeği, iki uygulama yüzü.**

- BS Eğitim Yönetimi: kurum operasyonu, ders, öğretmen, finans, ödev, rapor ve koçluk.
- BS Koçluk: koçun günlük işi; öğrenci, plan, kitap, ödev, deneme, görüşme, risk ve veli iletişimi.
- Veriler iki sisteme kopyalanmaz. Aynı Supabase tabloları ve güvenli RPC'ler kullanılır.

## Neden ayrı uygulama?

Koçun günlük işinde finans, kasa, hakediş, derslik ve kurum operasyonu görünmemelidir. Koç yalnızca karar vermesi gereken bilgiye ulaşmalıdır.

Hedef kullanım:

1. Koç uygulamayı açar.
2. Bugün yapılacakları ve dikkat gereken öğrencileri görür.
3. Öğrenci 360 ekranından plan, ödev, kitap ve deneme durumunu inceler.
4. Görüşmede karar verir.
5. Karar mümkün olduğunca tek dokunuşla çalışmaya dönüşür.

## Ortak veri çekirdeği

V1'de yeni paralel öğrenci, ödev, kitap veya deneme tabloları oluşturulmayacaktır.

Ortak kaynaklar:

- `ogrenciler`
- `odevler`
- `kocluk_ogrenci_profilleri`
- `kocluk_gorusmeleri`
- `kitap_katalogu`
- `ogrenci_kitaplari`
- `kocluk_deneme_sinavlari`
- `kocluk_deneme_bolum_sonuclari`
- mevcut güvenli koçluk / kitap / deneme RPC'leri

Bu sayede BS Eğitim Yönetimi'nde öğretmenin verdiği bir ödev, öğrenci aktif koçluk alıyorsa BS Koçluk'ta da aynı kayıt olarak görünür.

## Yetki modeli

İlk güvenli sürümde BS Koçluk yalnız mevcut aktif yönetici profilleriyle açılır. Yeni bir geniş kullanıcı yetkisi bu ilk ayrıştırma adımında eklenmez.

Sonraki aşamada ayrı Koç rolü / kapsamlı öğretmen erişimi tasarlanacaktır. Öğrenci portalı bu uygulamadan ayrı kalır ve öğrenci yalnız kendi verisine güvenli RPC üzerinden yazabilir.

## Uygulama yüzü

İlk ayrı uygulama navigasyonu:

- Koç Masası
- Öğrenciler
- Plan
- Denemeler
- Görüşmeler

Premium UX ilkeleri:

- teknik tablo veya ID görünmez,
- varsayılan ekran istisna odaklıdır,
- normal öğrenciler dikkat listesini kalabalıklaştırmaz,
- bir görev yalnız bir kez kaydedilir,
- grafik yalnız karar verdiriyorsa kullanılır,
- kullanıcıya veri tekrar yazdırılmaz,
- tablet öncelikli, telefon uyumlu tasarım.

## Ayrı uygulama, ortak backend

BS Koçluk kodu `apps/bs-kocluk` altında ayrı Vite/PWA uygulaması olarak başlatılır. Bu, mevcut BS Eğitim Yönetimi build'ini değiştirmeden bağımsız geliştirme ve daha sonra ayrı alan adı / Vercel projesiyle yayınlama imkânı verir.

İlk aşamada mevcut üretim Supabase projesi kullanılır. Yeni veritabanı oluşturulmaz ve veri senkronizasyonu yapılmaz.

## Geliştirme sırası

1. Ayrı uygulama kabuğu ve oturum güvenliği
2. Koç Masası
3. Öğrenci 360
4. Plan / Ödev / Kitap birleşik akışı
5. Deneme Merkezi
6. Görüşme hazırlığı ve karar → görev
7. Açıklanabilir risk
8. Veli özeti
9. AI Koç Asistanı
10. Ayrı ticari tenant / lisanslama modeli

## Kalite kapısı

Her aşama için:

**tasarla → oluştur → build/test → kullanıcı görsel doğrulaması → sabitle**

Üretim verisi üzerinde sahte koçluk verisi oluşturulmayacaktır.