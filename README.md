# BS Ofis Yönetim Sistemi — Yalçıner Ofis

Yalçıner Ofis'in günlük öğrenci, öğretmen, ders, sabit program, tahsilat, hakediş, gider, kasa, ödev ve rapor süreçlerini tek PWA içinde yöneten yeni frontend.

## Ürün yaklaşımı

- Ana sayfa rapor panosu değil, günlük çalışma ekranıdır.
- Her özet kartı ilgili iş alanına gider.
- Günlük işler mümkün olduğunca üç dokunuş veya daha az sürer.
- Teknik ID, tablo ve arka plan finans kayıtları kullanıcıya gösterilmez.
- Finansal kavramlar ayrıdır: ders geliri/tahakkuk, tahsilat, hakediş, öğretmen ödemesi, gider ve kasa hareketi birbirine karıştırılmaz.
- Kritik yazma işlemleri doğrudan tablo insert'i yerine mevcut Supabase güvenli RPC katmanını kullanır.
- Arayüz Türkçe, tablet öncelikli, telefon ve masaüstü uyumludur.

## Ana navigasyon

1. Özet
2. Takvim
3. Öğrenciler
4. Finans
5. Menü

## Teknoloji

- React + TypeScript + Vite
- PWA
- Supabase PostgreSQL + Auth + RLS + güvenli RPC
- GitHub Actions + GitHub Pages

## Kullanılan mevcut backend

Supabase proje ref: `igmtuouhdozkgwmdxlme`

Frontend yalnız public/publishable Supabase anahtarını içerir. Zoom secret veya başka servis sırları frontend'e konulmaz.

## Önemli UX kararları

- Ana ekranda büyük grafik yoktur.
- KPI kartları aktiftir: Bugünkü Dersler → Takvim, Bu Ay Tahsilat → Finans, Açık Alacak → Borçlu öğrenciler, Öğretmen Borcu → Öğretmen ödemeleri.
- Öğrenci kartı tek dokunuşla profile açılır; Tahsilat Al, Ders Ekle, Ara, WhatsApp ve Düzenle işlemleri profil içindedir.
- Ders kartı tek dokunuşla sonuç/düzenleme paneline açılır.
- Tablet/masaüstünde haftalık takvim, telefonda günlük liste başlangıç görünümüdür.
- Sabit program ile tarihli gerçek ders kaydı ayrıdır.
- Haftayı Oluştur işlemi mevcut idempotent RPC üzerinden çalışır.

## V1 kapsamı
- Öğrenci ekle/düzenle; profilden tahsilat, ders ve ödev işlemleri
- Öğretmen ekle/düzenle; profilden ödeme ve takvim
- Gün/hafta takvimi; ders sonucu, düzenleme, tek seferlik ders
- Sabit program ekle/düzenle; önizleme, tek tarih atlama, bu haftaya özel taşıma, aktif/pasif
- Tahsilat, öğretmen ödemesi, gider ve kasa kayıtları
- Ödev ekleme/düzenleme/durum yönetimi
- Kurum, öğrenci ve öğretmen raporları / yazdır-PDF
- Sistem ve program sağlık kontrolü

<!-- pages-refresh: 2026-08-17T18:03+03:00 -->
