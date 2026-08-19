# BS Eğitim — Koçluk Modülü V1

## Ana karar

Koçluk modülü önce BS Ofis'in kendi kullandığı mevcut BS Eğitim Yönetimi uygulaması içinde kurulacak ve gerçek günlük kullanımda doğrulanacaktır.

Bu aşamada:
- Demo ürün üzerinde geliştirme yapılmaz.
- Satış / multi-tenant / sektör genelleştirmesi yapılmaz.
- Spor, dans ve müzik ürünlerine entegrasyon yapılmaz.
- Çalışan BS Eğitim ders, finans, tahsilat, kasa, portal ve rapor akışları korunur.

Koçluk modülü BS Ofis'te gerçek kullanımda güvenilir hale geldikten sonra ürünleştirme ve diğer dikey ürünlere entegrasyon ayrı faz olarak ele alınacaktır.

## V1 amacı

Koçun öğrencilerini tek ekrandan takip etmesi; haftalık çalışma planı, koçluk görüşmeleri, hedefler ve deneme sonuçlarını aynı öğrenci profili altında yönetmesi.

## V1 ana ekranları

1. Koç Masası
2. Öğrenci 360
3. Haftalık Plan
4. Koçluk Görüşmeleri
5. Deneme Merkezi
6. Takip / Risk
7. Öğrenci Portalı Koçluk alanları

## Mevcut BS Eğitim verilerinden yeniden kullanılacaklar

- `ogrenciler`
- `ogretmenler`
- `odevler`
- `dersler`
- `tahsilatlar`
- `portal_kullanicilari`
- mevcut kullanıcı / yetki altyapısı

Yeni paralel kayıt yalnız gerçekten yeni bir kavram için açılır.

## Ödevler ↔ Koçluk ortak takip kuralı

- `odevler` tek görev motorudur; aynı görev ikinci kez Koçluk için kopyalanmaz.
- Aktif koçluk profili olan öğrencinin bütün ödevleri Koç Masası tarafından izlenir.
- Ders öğretmeninin normal **Ödev Ekle** akışından verdiği ödev, öğrenci koçluk alıyorsa Koç Masasına otomatik yansır.
- Koçun kitap üzerinden verdiği Sayfa / Test / Konu çalışması da aynı `odevler` kaynağına yazılır.
- Koçluk ekranında varsayılan görünüm öğrencinin **tüm** çalışmalarını birlikte gösterir; gerektiğinde Ders Ödevleri ve Koçluk Çalışmaları ayrı filtrelenebilir.
- Koçluk çalışması mevcut `ogrenci_kitap_id` / `calisma_turu` alanlarıyla ayırt edilir; yalnız kaynak etiketi için yeni tablo veya yeni kolon açılmaz.
- Öğrenci yalnız ders alan, ders + koçluk alan veya yalnız koçluk alan olabilir. Koçluk görünürlüğünü aktif koçluk profili belirler; ders kaydı zorunlu değildir.

## Aday yeni veri alanları

- `ogrenci_hedefleri`
- `kocluk_atamalari`
- `kocluk_gorusmeleri`
- `denemeler`
- `deneme_bolum_sonuclari`

Haftalık görevlerde mevcut `odevler` tablosunun genişletilmesi önceliklidir; gereksiz ikinci görev tablosu açılmaz.

## Geliştirme sırası

1. Koçluk ekran kabuğunu mevcut BS Eğitim'e ekle.
2. Mevcut veri modelinin koçluk için uygunluk analizini tamamla.
3. Yeni tabloları izole ve eklemeli migration ile kur.
4. Koç atama + öğrenci hedefi.
5. Koçluk görüşmeleri.
6. Haftalık plan.
7. Deneme merkezi.
8. Açıklanabilir takip/risk sistemi.
9. Öğrenci portalı entegrasyonu.
10. BS Ofis'te gerçek kullanım testi.
11. Yalnız bundan sonra satış/demo/genelleştirme fazı.

## İlk gerçek kayıt testi — 19.08.2026

- Öğrenci: Asır Yalçıner (`OGR-353498CF`)
- Koç: Süleyman Yalçıner (`TCH-001`)
- Durum: Aktif
- Başlangıç: 19.08.2026
- Sınav/hedef alanları: ilk kayıt testinde bilinçli olarak boş bırakıldı.
- Kayıt güvenli `kocluk_profili_kaydet_guvenli_v1` RPC'si üzerinden oluşturuldu.
- Kayıt sonrası öğrenci/koç ilişkisi ve audit kullanıcı alanları doğrulandı.

## Güvenlik kuralı

Her Koçluk geliştirmesi güncel `main` sürümünden açılan izole bir `kocluk-v1-*` branch'inde yürütülür. `main` doğrudan değiştirilmez. Supabase tarafındaki değişiklikler mevcut tablolara zarar vermeyen eklemeli migration olarak hazırlanır ve kontrol edilmeden canlıya uygulanmaz.
