# BS Eğitim Portalı — Geliştirme Durumu

Tarih: 16.08.2026

## Tamamlanan
- `portal-v1-gelistirme` branch'i `main` üzerinden oluşturuldu.
- Mevcut yönetim uygulamasının koduna dokunulmaması kararlaştırıldı.
- Portalın salt-okunur güvenlik modeli tasarlandı.
- `portal_kullanicilari` eşleştirme tablosu tasarlandı.
- Dört salt-okunur RPC tasarlandı: oturum bilgisi, bugün, 30 günlük program, ödevler.
- Portal UI V1 tasarlandı: Bugün, Program, Ödevler, Profil.
- PWA manifesti ve portal marka işareti hazırlandı.

## Güvenlik kararı
Portal kullanıcılarına ana tablolarda SELECT policy açılmayacak. Ana tabloların mevcut yönetici RLS modeli korunacak. Portal yalnız sınırlı veri döndüren SECURITY DEFINER RPC'lerini çağıracak; fonksiyonlar `public` ve `anon` rollerinden revoke edilip yalnız `authenticated` rolüne verilecek ve her çağrıda portal hesabı kontrol edilecek.

## Sıradaki doğrulama
1. Salt-okunur Supabase migration'ını kontrollü uygula.
2. Security Advisor çalıştır.
3. Bir öğretmen test hesabını `portal_kullanicilari` tablosuna bağla.
4. Öğretmen hesabıyla Google giriş ve veri izolasyonu testi yap.
5. Sonra tek öğrenci hesabıyla aynı izolasyon testini yap.
