# BS Müzik & Dans Yönetimi — Tasarım Sistemi V1

## 1. Marka sınırı

Bu ürün bağımsız bir marka değildir. **BS Eğitim Yönetimi ürün ailesinin müzik ve dans kursları dikeyidir.**

- Ana marka: **BS**
- Ürün: **BS Müzik & Dans Yönetimi**
- Alt varyantlar: **BS Müzik Kursu Yönetimi**, **BS Dans Kursu Yönetimi**
- BS logosu korunur.
- Yeni marka adı, yeni bağımsız logo veya ürün ailesinden kopuk görsel kimlik üretilmez.

## 2. Tasarım karakteri

Hedef: günlük işletme yazılımının okunabilirliğini korurken müzik, dans, ritim ve sahne disiplinlerinden gelen zarif bir sanat hissi oluşturmak.

Tasarım şu beş kelimeyle filtrelenir:

**Sade · Ritmik · Zarif · Premium · İşlevsel**

Sanatsal tasarım dekorasyon değildir. Hiyerarşi, boşluk, ritim, kart oranı, hareket, tipografi ve vurgu kullanımıyla oluşur.

## 3. Ana renk sistemi

BS ürün ailesinin omurgası değişmez:

- BS Lacivert: `#0B1F3A`
- BS Mavi: `#168BFF`
- BS Gümüş: `#B8C1CC`

Müzik/dans için yalnız ikincil sanat vurguları kullanılır:

- Sanat Moru: `#7657D9`
- Mercan: `#E66A72`
- Sıcak Altın: `#C9963E`
- Gül Vurgusu: `#C65187`

Bu tonlar ana markanın önüne geçemez. Ekranın baskın kimliği BS lacivert/mavi ve açık yüzeylerdir.

## 4. Yüzey ve atmosfer

- Ana arka plan açık ve ferah kalır.
- Kartlar beyaz veya çok açık soğuk yüzeylerdir.
- Çok hafif nota çizgisi / ritim izi gibi soyut katmanlara izin verilir.
- Koyu gece kulübü, neon ağırlıklı veya sahne afişi görünümü kullanılmaz.
- Sanat vurguları bilgi yoğun ekranlarda okunabilirliği azaltamaz.

## 5. Tipografi

- Ürün ailesinin mevcut sans-serif sistemi korunur.
- Büyük başlıklarda daha sıkı harf aralığı ve editoryal ağırlık kullanılır.
- Teknik veriler, para ve saat alanları yüksek okunabilirlikte kalır.
- Dekoratif font kullanılmaz.

## 6. Bileşen dili

### KPI kartları

- İnce ritim çizgisi / üst vurgu
- Tek ana metrik
- Küçük yardımcı açıklama
- Finansal anlamı olan renkler korunur; sanat rengi anlamı bozamaz.

### Branş Nabzı

Ana sayfada aktif sanat alanlarını gösteren salt-okunur görsel katmandır.

Her kart:
- branş adı,
- aktif kursiyer sayısı,
- varsa bugünkü ders saati

gösterir.

Amaç, kurumu salt finans tablosu gibi değil, çalışan bir sanat organizasyonu gibi hissettirmektir.

### Grup kartları

Grup dersleri “liste satırı” yerine stüdyo/ensemble kartı olarak sunulur.

Her kart:
- grup adı,
- branş,
- seviye / yaş grubu,
- kontenjan ve doluluk,
- eğitmen,
- stüdyo / salon

gösterir.

Doluluk görsel olarak ilerleme çizgisiyle okunur.

## 7. Hareket

- Hover/touch geri bildirimi kısa ve sakin olmalıdır.
- Kart hareketleri 1–2 px düzeyinde tutulur.
- Büyük animasyon, parallax veya sürekli hareket kullanılmaz.
- `prefers-reduced-motion` desteklenir.

## 8. Tablet önceliği

Birincil çalışma yüzeyi tablet kabul edilir.

- Dokunma hedefleri yeterince büyük olmalı.
- Alt navigasyon tek elle kullanılabilir kalmalı.
- KPI ve branş kartları tablette dengeli grid oluşturmalı.
- Telefon görünümünde grid tek sütuna kadar sadeleşebilir.

## 9. Ürün sözlüğü

Teknik veri modeli değiştirilmeden kullanıcı dili ürün profiline göre değişir.

Birleşik sürüm:
- Öğrenci → **Kursiyer**
- Öğretmen → **Eğitmen**
- Derslik → **Stüdyo / Salon**
- Branş → **Branş**

Müzik sürümü:
- Eğitmen
- Enstrüman / Alan
- Stüdyo / Oda

Dans sürümü:
- Katılımcı
- Eğitmen
- Dans Türü
- Stüdyo

## 10. Yasaklar

- “Armoni” veya başka yeni marka adı kullanılmaz.
- BS logosu yeniden tasarlanmaz.
- Mevcut canlı BS Eğitim / Koçluk / Portal tasarımı bu alt kimlik nedeniyle değiştirilmez.
- Sanatsal görünüm adına finans renk semantiği bozulmaz.
- İş ekranları gereksiz görsellerle doldurulmaz.
- Her ekranın günlük işi en az tıklamayla yaptırma ilkesi korunur.

## 11. Teknik izolasyon

Sanatsal stil yalnız şu ürün profillerinde çalışır:

- `muzik-dans`
- `muzik`
- `dans`

`egitim` profilinde bu stil katmanı etkin değildir.

HTML kökünde `data-product-profile` kullanılır. Böylece aynı kod ailesi içinde görsel alt kimlik diğer ürünlere sızmaz.

## 12. Tasarım kalite filtresi

Yeni her ekran için şu sorular sorulur:

1. BS ürün ailesi olduğu ilk bakışta belli mi?
2. Sanat hissi işlevi destekliyor mu, yoksa yalnız süs mü?
3. Tablet üzerinde hızlı kullanılabilir mi?
4. Ana işlem üç tıklamayı aşıyor mu?
5. Renkler bilgi anlamını koruyor mu?
6. Kullanıcı teknik veri modelini görmek zorunda kalıyor mu?
7. Bu ekran hem müzik hem dans kurumunda doğal görünüyor mu?

Bu sorulardan biri olumsuzsa tasarım yeniden değerlendirilir.
