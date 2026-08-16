# BS Eğitim Portalı — Geliştirme Durumu

Tarih: 16.08.2026

## Tamamlanan
- `portal-v1-gelistirme` branch'i `main` üzerinden oluşturuldu; mevcut yönetim uygulamasının root koduna dokunulmadı.
- Portalın salt-okunur güvenlik modeli canlı Supabase'e uygulandı.
- `portal_kullanicilari` eşleştirme tablosu oluşturuldu; RLS aktif edildi.
- `anon` ve `authenticated` rollerinin `portal_kullanicilari` tablosuna doğrudan erişimleri tamamen kaldırıldı.
- Dört salt-okunur RPC oluşturuldu: `portal_oturum_bilgisi_v1`, `portal_bugun_v1`, `portal_program_v1`, `portal_odevler_v1`.
- Portal RPC'lerinde `public` ve `anon` EXECUTE yetkisi kaldırıldı; yalnız `authenticated` çağırabilir.
- Her portal RPC'si `auth.uid()` ve aktif `portal_kullanicilari` kaydını doğrulayıp yalnız ilgili öğrenci/öğretmenin verisini döndürüyor.
- Portal UI V1 tamamlandı: Bugün, Program, Ödevler, Profil.
- GitHub Actions Portal CI kuruldu; `package-lock.json` sabitlendi ve build başarılı geçti.
- Supabase Security Advisor çalıştırıldı; portal için anonim erişim açığı bulunmadı.
- Yönetim ve portal kimlikleri çift taraflı trigger ile birbirinden ayrıldı. Aynı `auth_user_id` iki sistemde aynı anda kullanılamaz.
- Kimlik izolasyonu kontrollü negatif testten geçti: mevcut yönetim hesabının portal kullanıcısı olarak eklenmesi veritabanı tarafından engellendi.
- Gerçek portal kullanıcısı henüz oluşturulmadı; `portal_kullanicilari` tablosu boş tutuluyor.
- BS ana marka standardı portal için kabul edildi. Portal marka adı `BS Eğitim Portalı`; finans ürününe ait `Bütçe Yönetimi` alt adı kullanılmıyor.
- Portal renk standardı: Deep Navy `#0B1F3A`, Satin Silver `#B8C1CC`, Growth Blue `#168BFF`.
- Gerçek BS app icon 192 px ve 512 px PWA ikonları olarak eklendi; PWA theme color `#0B1F3A`, açık yüzey `#F7F9FC`.
- Supabase modern publishable key ve proje URL'si istemci fallback'i olarak tanımlandı; `service_role` veya başka gizli anahtar portal kodunda bulunmuyor.
- Mevcut authenticated SECURITY DEFINER RPC'leri tarandı; yönetim yazma RPC'lerinin tamamında yönetici kontrolü bulundu.
- Portal RPC fonksiyon tanımları tek tek incelendi; dört portal RPC'si yalnız veri okuyor ve DML yazma işlemi yapmıyor.
- Negatif privilege testi tekrarlandı: `anon` dört portal RPC'sinin hiçbirini çalıştıramıyor; `anon` ve `authenticated` rolleri `portal_kullanicilari` tablosunda doğrudan SELECT/INSERT/UPDATE/DELETE yapamıyor.
- Supabase portal değişikliklerinden sonra canlı `bs-egitim-yonetimi-v2` Vercel projesinin runtime hataları kontrol edildi; hata bulunmadı.
- CI'den geçen commit `1fa460e08930721d1c224932564f0f8fee9908b5` güvenli referans olarak `portal-v1-golden-master` branch'ine donduruldu.
- Golden master'dan yalnız deployment CI farkı taşıyan `portal-v1-deploy` branch'i oluşturuldu; GitHub Actions `portal-dist` artifact'ı başarıyla üretildi.

## Marka ve tasarım kararı
BS monogramı aynen korunacak; portal için yeni veya benzer bir logo türetilmeyecek. Eğitim ürünü aynı ana marka ailesinde kalacak. Arayüzde lacivert ana kurumsal renk, Growth Blue yalnız vurgu/aktif durumlarda, Satin Silver ikincil yüzey ve ayırıcı tonlarda kullanılacak. Neon, yoğun glow, aşırı gradient ve dekoratif 3D efekt kullanılmayacak.

## Güvenlik kararı
Portal kullanıcılarına ana tablolarda doğrudan SELECT policy açılmayacak. Ana tabloların mevcut yönetici RLS modeli korunacak. Portal yalnız sınırlı veri döndüren `portal_*` SECURITY DEFINER RPC'lerini çağıracak. Portal tarafında INSERT, UPDATE, DELETE RPC'si bulunmayacak.

Yönetim hesabı ile portal hesabı kesin olarak ayrı kimliklerdir. Yönetim kullanıcısı portal kullanıcısı olamaz; portal kullanıcısı daha sonra yönetim profiline eklenemez. Rol değişimi gerekirse eski profil önce bilinçli olarak kaldırılmalıdır.

## Vercel production durumu
- Yeni ve bağımsız Vercel projesi: `bs-egitim-portali`
- Vercel Project ID: `prj_WTCzIweta6c9XIpQT8pKGC9xBPrB`
- Production URL: `https://bs-egitim-portali.vercel.app`
- Production deployment ID: `dpl_EwDPgNGpL3LjSSTgX4zXx5m39Nf5`
- Production deployment durumu: READY / HTTP 200.
- Mevcut `bs-egitim-yonetimi-v1` ve `bs-egitim-yonetimi-v2` projelerine dokunulmadı.
- Vercel deployment harness GitHub'daki sabit commit `1fa460e08930721d1c224932564f0f8fee9908b5` kaynağını indiriyor, `portal/` içinde `npm ci` + `npm run build` çalıştırıyor ve yalnız `dist` çıktısını yayınlıyor.
- Build logunda kaynak commit doğrulandı; Vite production build ve PWA generateSW başarılı tamamlandı.
- Supabase Google OAuth authorize negatif/uyumluluk kontrolü production portal adresiyle yapıldı. Auth servisi `redirect_to=https://bs-egitim-portali.vercel.app` değerini aynen Google authorize akışına taşıdı; mevcut redirect allowlist portal production adresini kabul ediyor.

## İlk öğretmen pilotu için mevcut durum
Yönetim profiline bağlı hesaplar pilotta kullanılmayacak. Yönetim hesabı olmayan aktif öğretmen kayıtları arasında portal pilotuna uygun Google hesabı olan bir öğretmen seçilecek. Yetki, öğretmen Google ile portala ilk kez giriş yaptıktan ve `auth.users` kaydı oluştuktan sonra doğru `ogretmen_id` ile tek kayıt olarak verilecek. Toplu öğretmen yetkilendirmesi yapılmayacak.

## Sıradaki doğrulama
1. `https://bs-egitim-portali.vercel.app` adresini yönetim profiline bağlı olmayan seçilmiş tek öğretmen Google hesabıyla aç ve Google ile giriş yap.
2. İlk girişte portal hesabı henüz bağlı olmadığı için `Portal erişimi tanımlı değil` ekranının görülmesini doğrula.
3. Oluşan yeni `auth.users` kaydını doğru `ogretmen_id` ile `portal_kullanicilari` tablosuna tek kayıt olarak bağla.
4. Aynı öğretmen hesabıyla yeniden giriş yap; yalnız kendi dersleri ve ödevlerinin geldiğini doğrula.
5. Yönetim/finans verilerinin görünmediğini ve hiçbir yazma işleminin mümkün olmadığını uçtan uca test et.
6. Öğretmen pilotu başarılı olduktan sonra aynı protokolü tek öğrenci hesabıyla uygula.
