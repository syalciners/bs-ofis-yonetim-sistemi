# BS Eğitim Portalı — Geliştirme Durumu

Tarih: 16.08.2026

## Tamamlanan
- `portal-v1-gelistirme` branch'i `main` üzerinden oluşturuldu.
- Mevcut yönetim uygulamasının root koduna dokunulmadı.
- Portalın salt-okunur güvenlik modeli tasarlandı ve canlı Supabase'e uygulandı.
- `portal_kullanicilari` eşleştirme tablosu oluşturuldu; RLS aktif edildi.
- `anon` ve `authenticated` rollerinin `portal_kullanicilari` tablosuna doğrudan erişimleri tamamen kaldırıldı.
- Dört salt-okunur RPC oluşturuldu: oturum bilgisi, bugün, 30 günlük program, ödevler.
- Portal RPC'lerinde `public` ve `anon` EXECUTE yetkisi kaldırıldı; yalnız `authenticated` çağırabilir.
- Her portal RPC'si `auth.uid()` ve aktif `portal_kullanicilari` kaydını doğrulayıp yalnız ilgili öğrenci/öğretmenin verisini döndürüyor.
- Portal UI V1 tamamlandı: Bugün, Program, Ödevler, Profil.
- GitHub Actions Portal CI kuruldu ve portal build'i başarılı geçti.
- `package-lock.json` branch'e kalıcı olarak eklendi; bağımlılık sürümleri sabitlendi.
- Supabase Security Advisor çalıştırıldı; portal için anonim erişim açığı bulunmadı.
- Yönetim ve portal kimlikleri çift taraflı trigger ile birbirinden ayrıldı. Aynı `auth_user_id` iki sistemde aynı anda kullanılamaz.
- Kimlik izolasyonu kontrollü negatif testten geçti: mevcut yönetim hesabının portal kullanıcısı olarak eklenmesi veritabanı tarafından engellendi.
- Gerçek portal kullanıcısı henüz oluşturulmadı; `portal_kullanicilari` tablosu boş tutuluyor.
- BS ana marka standardı portal için kabul edildi. Portal marka adı `BS Eğitim Portalı`; finans ürününe ait `Bütçe Yönetimi` alt adı kullanılmayacak.
- Portal renk standardı: Deep Navy `#0B1F3A`, Satin Silver `#B8C1CC`, Growth Blue `#168BFF`.
- Geçici CSS marka işareti gerçek BS app icon ile değiştirildi; 192 px ve 512 px PWA ikonları portal paketine eklendi.
- PWA theme color `#0B1F3A`, açık yüzey rengi `#F7F9FC` olarak sabitlendi.
- Supabase modern publishable key ve proje URL'si istemci fallback'i olarak tanımlandı; `service_role` veya başka gizli anahtar portal kodunda bulunmuyor.
- Mevcut authenticated SECURITY DEFINER RPC'leri tarandı. Yönetim yazma RPC'lerinin tamamında yönetici kontrolü bulundu. Yönetici kontrolü olmayan tek eski profil fonksiyonu yalnız mevcut kullanıcının kendi yönetim profilini UPDATE ediyor; portal kullanıcısının yönetim profili olamayacağı için yazma kapısı oluşturmuyor.
- Portal RPC fonksiyon tanımları tek tek incelendi; dört portal RPC'si yalnız veri okuyor ve DML yazma işlemi yapmıyor.
- Supabase portal değişikliklerinden sonra canlı `bs-egitim-yonetimi-v2` Vercel projesinin son 1 saat runtime hataları kontrol edildi; hata bulunmadı.
- CI'den geçen commit `1fa460e08930721d1c224932564f0f8fee9908b5` güvenli referans olarak `portal-v1-golden-master` branch'ine donduruldu.

## Marka ve tasarım kararı
BS monogramı aynen korunacak; portal için yeni veya benzer bir logo türetilmeyecek. Eğitim ürünü aynı ana marka ailesinde kalacak. Arayüzde lacivert ana kurumsal renk, Growth Blue yalnız vurgu/aktif durumlarda, Satin Silver ise ikincil yüzey ve ayırıcı tonlarda kullanılacak. Neon, yoğun glow, aşırı gradient ve dekoratif 3D efekt kullanılmayacak.

## Güvenlik kararı
Portal kullanıcılarına ana tablolarda doğrudan SELECT policy açılmayacak. Ana tabloların mevcut yönetici RLS modeli korunacak. Portal yalnız sınırlı veri döndüren `portal_*` SECURITY DEFINER RPC'lerini çağıracak. Portal tarafında INSERT, UPDATE, DELETE RPC'si bulunmayacak.

Yönetim hesabı ile portal hesabı kesin olarak ayrı kimliklerdir. Yönetim kullanıcısı portal kullanıcısı olamaz; portal kullanıcısı daha sonra yönetim profiline eklenemez. Rol değişimi gerekirse eski profil önce bilinçli olarak kaldırılmalıdır.

## Vercel durumu
Bağlı Vercel aracı mevcut projeleri ve deployment'ları okuyup yönetebiliyor ancak bu oturumdaki tool şeması yeni proje oluşturma parametrelerini expose etmiyor. Bu nedenle mevcut `bs-egitim-yonetimi-v1` veya `bs-egitim-yonetimi-v2` projelerine portal deploy edilmeyecek. Yeni proje adı `bs-egitim-portali`, kaynak branch `portal-v1-golden-master`, uygulama kökü `portal` olmalı.

## Sıradaki doğrulama
1. Vercel'de mevcut eğitim projelerinden bağımsız `bs-egitim-portali` projesini oluştur ve `portal-v1-golden-master` / `portal` kaynağını deploy et.
2. Oluşan kesin portal adresini Supabase Google OAuth Redirect URLs listesine ekle.
3. Yönetim profiline bağlı olmayan yeni bir öğretmen Google hesabıyla ilk girişi yap.
4. Oluşan Auth kullanıcısını doğru `ogretmen_id` ile `portal_kullanicilari` tablosuna bağla.
5. Öğretmen hesabıyla yalnız kendi dersleri/ödevleri geldiğini ve hiçbir yazma işlemi yapılamadığını doğrula.
6. Öğretmen pilotu başarılı olduktan sonra aynı protokolü tek öğrenci hesabıyla uygula.
