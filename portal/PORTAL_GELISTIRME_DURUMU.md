# BS Eğitim Portalı — Geliştirme Durumu

Tarih: 16.08.2026

## Güncel güvenli sürüm
- Portal geliştirme branch'i: `portal-v1-gelistirme`
- Portal golden master: `portal-v1-golden-master`
- Çalışan runtime commit: `8af27eb3ff430bd32e9e64428febd66dfbf5b178`
- Production: `https://bs-egitim-portali.vercel.app`
- Vercel Project ID: `prj_WTCzIweta6c9XIpQT8pKGC9xBPrB`
- Güncel production deployment: `dpl_4vKTDxUE6iisScEAnDwieJhmpmqF` — READY
- Mevcut BS Eğitim Yönetimi uygulamasının root koduna ve Vercel V1/V2 projelerine dokunulmadı.

## Portal erişim modeli — V2
Portal artık günlük erişim için `portal_kullanicilari` tablosunu kullanmaz. Bu tablo ve V1 RPC'leri yalnız rollback amacıyla korunur.

Yetki kaynağı doğrudan aktif öğrenci/öğretmen kaydındaki `email` alanıdır:
1. Kullanıcı Google ile giriş yapar.
2. Sunucu `auth.uid()` üzerinden Supabase Auth kaydını bulur.
3. Yalnız `email_confirmed_at` dolu doğrulanmış Auth e-postası kullanılır; istemciden e-posta parametresi kabul edilmez.
4. E-posta `lower(trim(email))` ile normalize edilerek aktif `ogrenciler.email` ve `ogretmenler.email` kayıtlarında aranır.
5. Tam bir aktif eşleşme varsa kişi Öğrenci veya Öğretmen olarak otomatik tanınır; ayrıca manuel portal yetkisi verilmez.
6. 0 eşleşmede erişim reddedilir.
7. Aynı e-posta 2 veya daha fazla aktif kişi kaydıyla eşleşirse sistem tahmin yapmaz ve güvenlik nedeniyle erişimi reddeder.
8. Aktif `kullanici_profilleri` kaydı bulunan yönetim/personel hesapları portal kimliği olarak kesin olarak reddedilir. Böylece yönetim JWT yetkileri salt-okunur portal oturumuna taşınmaz.

## V2 salt-okunur RPC'ler
- `private.portal_kimligi_epostadan_v2()` — yalnız iç kimlik çözümleyici; `public`, `anon` ve `authenticated` için doğrudan EXECUTE kapalı.
- `public.portal_oturum_bilgisi_v2()`
- `public.portal_bugun_v2()`
- `public.portal_program_v2(integer)`
- `public.portal_odevler_v2()`

Public V2 RPC'lerinde `public` ve `anon` EXECUTE kapalı, yalnız `authenticated` çağırabilir. Portal istemcisi production'da yalnız bu V2 RPC'lerini çağırır.

## Güvenlik doğrulamaları
- Anonim kullanıcı V2 portal RPC'lerini çalıştıramıyor.
- `portal_kullanicilari` tablosunda `anon` ve `authenticated` doğrudan SELECT/INSERT/UPDATE/DELETE yapamıyor.
- V2 fonksiyonlarında INSERT/UPDATE/DELETE yok.
- V2 fonksiyonlarında tahsilat, gider, kasa veya hakediş tablolarına referans yok.
- Aktif öğrenci + öğretmen e-postaları arasında güncel veride normalize edilmiş mükerrer e-posta bulunmadı.
- Aktif Yönetici hesabı kontrollü `auth.uid()` simülasyonunda V2 tarafından beklenen şekilde reddedildi.
- Authenticated SECURITY DEFINER yazma RPC'leri tekrar tarandı. Yönetim yazma RPC'leri yönetici kontrolü içeriyor. Yönetici kontrolü olmayan `kullanici_kendi_profilini_guncelle_guvenli_v1` yalnız kullanıcının kendi aktif `kullanici_profilleri` satırını günceller; portal kullanıcılarının böyle bir satırı olmadığı için portal için yazma kapısı oluşturmaz.
- Supabase Security Advisor çalıştırıldı. Portal V2 SECURITY DEFINER fonksiyonları authenticated çağrı nedeniyle genel uyarıda görünür; bu bilinçli salt-okunur RPC tasarımıdır ve fonksiyon içi kimlik sınırları ayrıca test edilmiştir.
- GitHub Portal CI, runtime commit `8af27eb3ff430bd32e9e64428febd66dfbf5b178` için başarıyla tamamlandı.
- Production JS paketi kontrol edildi; `portal_oturum_bilgisi_v2`, `portal_bugun_v2`, `portal_program_v2`, `portal_odevler_v2` çağrılarını içeriyor.

## Marka standardı
Portal yalnız root `public` klasöründeki mevcut BS Eğitim V2 marka ailesini kullanır. Yeni/benzer logo üretmek veya başka ikon seçmek yasaktır:
- `bs-egitim-icon-192-v2.png`
- `bs-egitim-icon-512-v2.png`
- `bs-egitim-apple-touch-v2.png`
- `bs-egitim-favicon-16-v2.png`
- `bs-egitim-favicon-32-v2.png`
- `bs-egitim-favicon-48-v2.png`

Renk standardı: Deep Navy `#0B1F3A`, Satin Silver `#B8C1CC`, Growth Blue `#168BFF`.

## Kullanıcı deneyimi
Portal yalnız görüntüleme içindir. Öğrenci ve öğretmenler ders/program/ödev verilerini okuyabilir; portalda veri değiştiren buton veya RPC bulunmaz. Yönetim, finans, tahsilat, gider, kasa ve hakediş verileri portala verilmez.

## Sıradaki tek doğrulama
Production altyapısı V2'ye geçti. Pozitif uçtan uca test için henüz yönetim hesabı olmayan gerçek bir öğrenci veya öğretmen Google hesabıyla giriş yapılmadı. İlk testte:
1. Aktif öğrenci veya öğretmen kaydındaki `email` alanına kişinin gerçek Google e-postasının yazılı olduğunu doğrula.
2. Aynı kişi `https://bs-egitim-portali.vercel.app` adresinde aynı Google hesabıyla giriş yapsın.
3. Manuel yetki/eşleştirme yapmadan otomatik içeri alınması beklenir.
4. Yalnız kendi programı ve ödevleri görülmeli; başka kişi ve finans verileri görünmemeli.
5. İlk gerçek kullanıcı testi geçmeden toplu kullanım başlatılmamalıdır.
