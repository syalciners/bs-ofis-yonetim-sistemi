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

## Marka
- Yalnız kullanıcının yüklediği gerçek BS logo/ikon dosyaları kullanılır.
- Yeni logo, sembol veya marka varyasyonu üretilmez.
- V1 uygulama ikonu: kullanıcının yüklediği `bs-app-icon` seti.
