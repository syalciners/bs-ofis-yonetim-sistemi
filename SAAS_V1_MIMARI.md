# BS Eğitim SaaS V1 — Dedicated-Instance Mimarisi

Bu belge BS Eğitim Yönetimi ürününün satış sonrası kurumlara kurulma, işletilme ve güncellenme modelini tanımlar. V1 için bağlayıcı dağıtım mimarisidir.

## 1. Temel karar

BS Eğitim V1 klasik çok kiracılı (multi-tenant) veritabanı modeliyle kurulmayacaktır.

Her müşteri kurum için ayrı bir uygulama instance'ı oluşturulacaktır:

- ayrı Supabase projesi,
- ayrı Vercel projesi,
- tercihen ayrı müşteri repository'si / dağıtım repository'si,
- ayrı ortam değişkenleri,
- ayrı Auth kullanıcıları,
- ayrı Storage ve veritabanı,
- ayrı domain veya subdomain.

Buna rağmen ürün kodu müşteri bazında çatallanmayacaktır. Bütün kurumlar aynı **BS Eğitim Core** sürümünü kullanacaktır.

**Kural:** Müşteri farkı kodla değil; ortam ayarı, kurum ayarı, lisans ve veri ile oluşur.

## 2. Neden dedicated-instance?

V1'de hedef:

- kurum verisini fiziksel olarak başka kurumlardan ayırmak,
- ilk müşteriyi multi-tenant dönüşümünü beklemeden kurabilmek,
- RLS modelini kurumlar arası izolasyon yerine kullanıcı rolleri üzerinde sade tutmak,
- kurum taşıma/yedekleme/kapatma işlemlerini bağımsız yapabilmek,
- mevcut çalışan BS Eğitim mimarisini minimum riskle ürünleştirmek.

Bu nedenle bütün operasyon tablolarına `kurum_id` eklenmeyecektir.

Mevcut tek-kurum mantığındaki `kurum_id = 'ANA'` yaklaşımı V1 dedicated instance içinde korunabilir. Her Supabase projesi yalnız bir gerçek kurumu temsil eder.

## 3. Ortak çekirdek ve müşteri instance'ı

### BS Eğitim Core

Tek ana ürün kaynağıdır. Şunları içerir:

- React / TypeScript / Vite uygulaması,
- ortak UI ve ekranlar,
- service katmanı,
- Supabase migration'ları,
- RLS politikaları,
- RPC fonksiyonları,
- Storage kuralları,
- standart seed / başlangıç verileri,
- deployment kontrolleri,
- sürüm numarası ve release notları.

### Kurum instance'ı

Core'un yayımlanmış bir sürümünü kullanır. Kuruma özel değişebilecek alanlar:

- Supabase URL / publishable key,
- portal URL,
- kurum adı,
- kısa marka adı,
- logo,
- telefon / e-posta / adres,
- çalışma saatleri,
- varsayılan ders birimi,
- lisanslanan ürün ve modüller,
- kurumun gerçek verileri,
- kurum kullanıcıları.

Kuruma özel `.tsx`, SQL iş kuralı veya ayrı özellik dalı oluşturulmaz.

## 4. Mevcut kodun hazır olan kısmı

Mevcut uygulamada kurum ayar katmanının önemli bölümü zaten vardır:

- `kurum_ayarlari`,
- kurum adı,
- marka adı,
- logo,
- iletişim alanları,
- varsayılan ders birimi,
- takvim başlangıç / bitiş saatleri,
- güvenli kurum ayarı RPC'leri.

`AppHeader` kurum markasını dinamik olarak kullanmaktadır. Bu yapı korunacak ve genişletilecektir.

## 5. İlk teknik borçlar

Dedicated-instance dağıtım öncesi aşağıdakiler kaynak koddan ayrılmalıdır.

### 5.1 Supabase bağlantısı

Şu anda Supabase URL ve publishable key kaynak kod içinde sabittir.

Hedef:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Uygulama bu değerler yoksa **fail-fast** davranmalı; yanlış veya boş ortamla sessizce açılmamalıdır.

### 5.2 Portal URL

Yönetim uygulamasındaki portal adresi sabit olmamalıdır.

Hedef V1:

```env
VITE_PORTAL_URL=https://...
```

İleride portal adresi kurum ürün lisansı / merkezi ürün tanımı üzerinden yönetilebilir.

### 5.3 Uygulama modu

Açık bir ortam değişkeni kullanılacaktır:

```env
VITE_APP_MODE=production
```

Demo ayrı `demo`, müşteri production instance'ı `production` çalışır.

## 6. Kurum ayarları

`kurum_ayarlari` tek kurum için merkezi konfigürasyon kaynağı olarak korunacaktır.

V1 çekirdek alanları:

- `kurum_adi`
- `marka_adi`
- `telefon`
- `email`
- `adres`
- `logo_url`
- `varsayilan_ders_birimi`
- `takvim_baslangic_saati`
- `takvim_bitis_saati`

Yeni ayar ancak gerçekten kurum genelinde değişiyorsa bu katmana eklenir. Öğrenciye, öğretmene veya derse özel alanlar kurum ayarına taşınmaz.

## 7. RLS güvenlik modeli

Ayrı Supabase projesi nedeniyle RLS'nin görevi Kurum A'yı Kurum B'den ayırmak değildir. Bunun görevi aynı kurum içindeki rol ve kişi erişimini sınırlandırmaktır.

V1 güvenlik prensibi: **default deny**.

Hedef roller:

- Yönetici
- Ofis Personeli
- Öğretmen
- Öğrenci
- Veli (ürün kararı netleştiğinde)

Genel ilke:

- Yönetici kurum yönetim işlemlerine erişir.
- Ofis personeli yalnız günlük operasyon için gerekli yetkilere sahip olur.
- Öğretmen portalı yalnız bağlı öğretmene ait kayıtları açar.
- Öğrenci portalı yalnız bağlı öğrenciye ait kayıtları açar.
- UI'da buton gizlemek güvenlik sayılmaz; RLS/RPC aynı erişimi backend'de de reddetmelidir.

## 8. Paket / lisans modeli

Her küçük özellik ayrı ürün yapılmayacaktır.

Ürün erişimi mevcut ürün kararına uygun biçimde:

**kurumun ürün lisansı ∩ kullanıcının rol/yetkisi = erişim**

V1'de merkezi yapı:

- `urunler`
- `kurum_urunleri`

Örnek bağımsız ürünler:

- BS Eğitim Yönetimi
- BS Koçluk

Yönetim içindeki küçük ekranlar için gereksiz lisans tablosu üretilmez. Gerçek satış ihtiyacı oluşursa feature flag / modül katmanı ayrıca eklenir.

## 9. Müşteri kurulum standardı

Yeni kurum kurulumu V1'de aşağıdaki sırayı izler:

1. Müşteri kaydı ve sözleşme/paket kararı.
2. Müşteri için GitHub dağıtım alanı hazırlanır.
3. Supabase projesi oluşturulur.
4. Onaylı Core migration seti çalıştırılır.
5. Storage bucket/policy'leri kurulur.
6. İlk seed ve `kurum_ayarlari` oluşturulur.
7. İlk Yönetici Auth kullanıcısı tanımlanır.
8. Vercel projesi oluşturulur.
9. Ortam değişkenleri girilir.
10. Domain/subdomain bağlanır.
11. Core production build alınır.
12. Güvenlik ve smoke testleri çalıştırılır.
13. Kurum logosu / marka ayarları yapılır.
14. Varsa mevcut Excel/CSV verisi kontrollü aktarılır.
15. Kurum canlı kullanıma açılır.

Amaç: bu akış ilk pilotta kontrollü-manuel; daha sonra otomatik provisioning olacak.

## 10. Sürüm ve güncelleme modeli

Her müşteri instance'ı hangi Core sürümünde olduğunu bilmelidir.

Örnek:

```text
BS Eğitim Core v1.0.0
ABC Eğitim -> v1.0.0
XYZ Kurs -> v1.0.0
```

Yeni sürüm akışı:

1. Core branch'inde geliştirme.
2. Test / CI.
3. Core release.
4. Migration varsa önce migration uyumluluk kontrolü.
5. Pilot instance güncellemesi.
6. Smoke test.
7. Diğer kurumlara kontrollü dağıtım.

Bir müşteri için doğrudan production kodu değiştirilmez.

## 11. Müşteriye özel istek filtresi

Bir kurum bir özellik istediğinde şu sırayla değerlendirilir:

1. Bütün müşterilere uygun çekirdek özellik mi?
2. Kurum ayarıyla çözülebilir mi?
3. Ürün / lisans ayarıyla çözülebilir mi?
4. Opsiyonel modül olabilir mi?
5. Yalnız tek müşteriye özgüyse gerçekten stratejik mi?

İlk dört seçenekten biri değilse V1 çekirdeğine alınmaz.

## 12. SaaS yönetim paneli

Müşteri uygulamalarından ayrı bir iç yönetim paneli daha sonra kurulacaktır.

Bizim göreceğimiz minimum alanlar:

- kurum adı,
- paket / lisans,
- durum,
- başlangıç tarihi,
- yenileme tarihi,
- GitHub repository,
- Supabase proje referansı,
- Vercel proje referansı,
- domain,
- Core sürümü,
- son başarılı deployment,
- son yedek / sağlık durumu,
- notlar.

Bu panel müşteri verisini toplu şekilde işletmek için değil; müşteri instance'larının yaşam döngüsünü yönetmek içindir.

## 13. Faz sırası

### FAZ 0 — Tamamlandı
Satış Demo V1 sabitlendi.

Golden Master branch:

`demo-satis-golden-master-2026-08-25`

### FAZ 1 — Instance konfigürasyonunu koddan ayır

- Supabase URL -> env
- Supabase publishable key -> env
- Portal URL -> env
- production/demo mode -> env
- fail-fast konfigürasyon doğrulaması

### FAZ 2 — Kurulum paketi

- migration standardı
- seed standardı
- Storage kurulumu
- ilk yönetici kurulumu
- örnek `.env` şablonu
- kurulum kontrol listesi

### FAZ 3 — RLS ve rol matrisi

- Yönetici
- Ofis Personeli
- Öğretmen
- Öğrenci
- portal erişimleri

### FAZ 4 — Lisans / ürün sistemi

- `urunler`
- `kurum_urunleri`
- ürün değiştirici ve backend kontrolü

### FAZ 5 — SaaS iç yönetim paneli

Kurum instance kayıtları ve operasyon takibi.

### FAZ 6 — Otomatik provisioning

Yeni kurum oluşturma işlemlerinin GitHub / Supabase / Vercel tarafında mümkün olduğunca otomatikleştirilmesi.

### FAZ 7 — İlk pilot müşteri

Gerçek kurumla kurulum, kullanım ve destek sürecinin test edilmesi.

## 14. İlk kod değişikliği

Mimari onaylandıktan sonraki ilk teknik değişiklik yalnız şudur:

**Supabase bağlantısını kaynak koddan environment değişkenlerine taşımak ve eksik konfigürasyonda güvenli fail-fast kontrolü eklemek.**

Bu değişiklik ayrı branch'te yapılacak, mevcut `main` production değerleri bozulmadan build testi yapılacaktır.
