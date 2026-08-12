# BS Eğitim Yönetimi — Geliştirme Notları

Son güncelleme: 12.08.2026

## Canlı sürüm

- Canlı uygulama: `index.html`
- Çalıştığı kullanıcı tarafından doğrulanan temel sürüm: `09552e4f048ec9696576fbdfa232944056d4e8b5`
- Canlı ana uygulama yeni modüller doğrulanmadan değiştirilmemelidir.
- Ana ekranda doğrulanan değerler: Bugünkü Dersler 4, Bu Ay Tahsilat ₺72.000, Bu Ay Ciro ₺96.000.

## Salt okunur test ekranları

- `gelistirme.html`: ilk doğrulama ekranı. Kasa ve öğrenci bakiye hesabı kullanıcı tarafından kontrol edildi.
- `gelistirme-v2.html`: yeni modüler salt-okunur geliştirme ekranı. Canlı veriyi okur; insert/update/delete işlemi içermez.
- `onizleme-v2.html`: eski önizleme sorunu nedeniyle geliştirme ekranına yönlendirme amacıyla tutulur.

## Doğrulanan finans hesapları

### Kasa

`Güncel Bakiye = Açılış Bakiyesi + Gelir Hareketleri - Gider Hareketleri`

İlk salt-okunur testte doğrulanan toplam: ₺55.400.

- Ofis Kasası: ₺16.000
- Yeter Bank: ₺39.400

### Öğrenci bakiyesi

`Kalan Bakiye = Yapıldı durumundaki derslerin öğrenci toplam tutarı - iptal olmayan tahsilatlar`

Öğrenci tablosunda doğrudan `kalan_bakiye` alanı varsa salt-okunur test ekranı bu değeri öncelikli kullanabilir.

İlk testte borçlu öğrenci sayısı: 5.

## Salt-okunur geliştirme ekranının hedefi

1. Yönetim özeti ve KPI'lar
2. Ders listesi + tarih/durum/arama filtreleri
3. Öğrenci listesi + borç/alacak filtresi
4. Tahsilat geçmişi + ay/öğrenci/ödeme yöntemi filtreleri
5. Kasa hesapları
6. RLS/tablo okuma tanılama ekranı

## Veri güvenliği kuralları

- Canlı `index.html` toplu geliştirme için kullanılmayacak.
- Önce salt-okunur ekranda veri okuma ve hesaplar doğrulanacak.
- Yazma işlemleri açılmadan önce ilgili Supabase tablo kolonları, RLS politikaları ve eski AppSheet/Apps Script iş kuralları karşılaştırılacak.
- Finansal kayıt üreten işlemler idempotent olmadan canlıya alınmayacak.
- Tahsilat, ders, kasa ve öğrenci verilerinde rastgele test kaydı oluşturulmayacak.
- Her canlı geçiş öncesi geri dönüş için son çalışan commit SHA kaydedilecek.

## Sıradaki geliştirme sırası

1. `gelistirme-v2.html` kullanıcı testi
2. Salt-okunur Dersler ekranının doğrulanması
3. Salt-okunur Öğrenciler / bakiye ekranının doğrulanması
4. Salt-okunur Tahsilatlar ekranının doğrulanması
5. Salt-okunur Kasa ekranının doğrulanması
6. Yazma mimarisi: önce Öğrenci Ekle, sonra Ders Oluştur, en son Tahsilat Gir ve Haftalık Dersleri Oluştur

Tahsilat ve kasa gibi finansal yazma akışları, veri bütünlüğü ve çift kayıt önleme kuralları tamamlanmadan açılmamalıdır.
