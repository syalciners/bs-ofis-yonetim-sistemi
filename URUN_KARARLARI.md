# BS Ofis Yönetim Sistemi — V1 ürün kararları

Bu dosya V1 geliştirmesinde değişmez filtre olarak kullanılır.

## Kullanıcı deneyimi
- Kullanıcı programcı değildir; teknik tablo, ID, RPC ve arka plan kayıtlarını görmez.
- Günlük işler mümkün olduğunca 1–3 dokunuşta tamamlanır.
- Ana sayfa rapor ekranı değil, "şimdi ne yapmalıyım?" çalışma ekranıdır.
- Büyük dekoratif grafikler ana sayfada kullanılmaz.
- Özet/KPI kartları pasif bilgi kutusu değil, ilgili iş akışına açılan aktif girişlerdir.
- Liste kartları ayrıntı ve bağlama uygun eylemlere açılır.
- Birincil işlem büyük ve net; ikincil işlemler ayrıntı panelinde bulunur.
- Telefon başlangıç takvimi günlük liste; tablet/masaüstü başlangıç takvimi haftalıktır.
- Tasarım BS Finans ürün ailesiyle akrabadır ama ekranları kopyalamaz.

## Navigasyon
1. Özet
2. Takvim
3. Öğrenciler
4. Finans
5. Menü

Menü: Öğretmenler, Ödevler, Raporlar, Ayarlar, Sistem Durumu.

## Finansal anlamlar
- Yapılan ders → öğrenci hizmet tutarı / gerçekleşen ciro ve öğretmen hakedişi.
- Tahsilat → gerçek nakit girişi.
- Öğretmen ödemesi → hakediş borcunu ve kasayı azaltır.
- Gider → kasa çıkışıdır.
- Kasa hareketleri otomatik/atomik kayıt zincirinden gelir.
- Aynı kavram farklı kaynaklardan hesaplanmaz.

## Teknik mimari
- React + TypeScript + Vite + PWA.
- Supabase PostgreSQL + Auth + RLS.
- Kritik yazmalar mevcut güvenli RPC fonksiyonlarından yapılır.
- Uygulama veri erişimi service katmanında merkezileştirilir.
- Realtime güncellemeler tek veri sağlayıcı üzerinden yenilenir.
- Zoom sırları frontend'e girmez; mevcut güvenli servis sınırında kalır.
- AppSheet mevcut işlevsel referanstır; frontend mimarisi olarak kopyalanmaz.

## BS Eğitim Ürün Ekosistemi
- Bağlayıcı prensip: **Tek çekirdek ≠ tek uygulama.** BS Eğitim Yönetimi, BS Koçluk ve ileride bağımsız satılabilecek ürünler aynı ekosistemin ayrı uygulamalarıdır.
- Ortak çekirdek; kurum kimliği, kullanıcı/kimlik, roller, ürün lisansları, ortak temel varlıklar, bildirim altyapısı ve tasarım sistemini kapsar.
- Ürünler kendi ekran akışlarına, URL'lerine ve günlük operasyonlarına sahip olabilir; aynı işi iki uygulamada gereksiz yere tekrar etmez.
- Bir veri ortak çekirdekte tutulabilir ancak ürünlerdeki kullanım amacı farklı olabilir. Örneğin aynı deneme verisi Yönetim'de kurumsal analiz, Koçluk'ta öğrenci gelişim planı için kullanılabilir.
- Günlük koçluk operasyonları BS Koçluk'ta yaşar. Yönetim uygulaması yalnız gerekli kurum seviyesi özetleri ve yönetimsel görünümü taşır.

### Ürün erişimi ve lisans
- Nihai erişim kuralı: **kurumun ürün lisansı ∩ kullanıcının rol/yetkisi = ürün erişimi**.
- İlk sürümde en sade model kullanılır: `urunler` + `kurum_urunleri` + mevcut kullanıcı rolleri.
- Gerçek bir kullanıcı bazlı istisna ihtiyacı doğmadan `kullanici_urun_yetkileri` gibi ayrı bir yetki matrisi eklenmez.
- Bir ürün kartının arayüzde gizlenmesi güvenlik sayılmaz. Kullanıcı URL'yi doğrudan açsa bile backend/RLS/RPC/servis katmanı yetkisiz erişimi reddetmelidir.
- Her modül ayrı ürün yapılmaz. Yalnız bağımsız değer önerisi ve satış modeli olan uygulamalar ürün değiştiricide yer alır.

### Ürün Değiştirici
- Ortak üst barda BS logosunun yanında kullanıcının erişebildiği ürünler gösterilir; örnek: `YÖNETİM | KOÇLUK`.
- Aktif uygulama görsel olarak seçili olur; diğer yetkili ürünler aynı sekmede açılır.
- Ürün listesi ve URL'ler bileşen içine dağınık biçimde sabit yazılmaz; merkezi ürün tanımı/yetki modelinden beslenir.
- Kurum yalnız bir ürüne sahipse yalnız o ürün gösterilir.
- Ürün sayısı büyürse üst bardaki kart dizisi yerine tek bir “Uygulamalar” seçicisine geçilebilir.

### Ortak kimlik / SSO hedefi
- Hedef deneyim: **BS hesabıyla bir kez giriş → yetkili BS uygulamalarına geçişte tekrar giriş yok**.
- Aynı Supabase projesini kullanmak farklı origin/domainlerde otomatik SSO garantisi değildir. Ortak kimlik ve oturum aktarımı ayrıca güvenli biçimde tasarlanacaktır.
- Kimlik/SSO çözümü ürün değiştirici bağlantısından bağımsız bir güvenlik katmanıdır; token veya servis sırları frontend'e gömülmez.

### Yeni özellik karar filtresi
Her yeni özellikte şu sorular cevaplanır:
1. Bu özellik ortak çekirdeğe mi ait?
2. Yönetim ürününe mi ait?
3. Koçluk ürününe mi ait?
4. Aynı işi iki üründe tekrar mı yapıyoruz?

Dördüncü sorunun cevabı evetse mimari yeniden değerlendirilir.

## Marka
- Yalnız kullanıcının yüklediği gerçek BS logo/ikon dosyaları kullanılır.
- Yeni logo, sembol veya marka varyasyonu üretilmez.
- V1 uygulama ikonu: kullanıcının yüklediği `bs-app-icon` seti.
