# BS Müzik & Dans — Grup Ders Mimarisi V1

Bu belge yalnız `muzik-dans-demo-v1` geliştirme dalı içindir. Canlı `main`, `demo-hazirlik`, BS Koçluk ve mevcut birebir ders/finans motoru değiştirilmez.

## 1. Temel karar

Grup dersleri mevcut `dersler` ve `sabit_ders_programi` tablolarına zorlanmayacaktır.

Neden:
- Mevcut `dersler` kaydı tek bir `ogrenci_id` taşır.
- Mevcut ders ücreti ve öğretmen hakedişi tek öğrenci–tek öğretmen ilişkisine göre hesaplanır.
- Aynı grup dersini her katılımcı için ayrı `dersler` kaydı olarak çoğaltmak, eğitmen hakedişini yanlışlıkla katılımcı sayısı kadar çoğaltabilir.
- Mevcut öğretmen/derslik çakışma RPC'leri tek ders kaydı varsayımıyla çalışır.

Bu nedenle grup dersi, birebir ders motoruna paralel fakat bağımsız bir operasyon katmanı olacaktır.

## 2. Asgari veri modeli

### `kurs_gruplari`
Bir sınıf/kohort tanımıdır.

- `grup_id` text PK
- `grup_adi` text
- `brans_id` text FK → `branslar`
- `varsayilan_ogretmen_id` text FK → `ogretmenler`
- `varsayilan_derslik_id` text FK → `derslikler`
- `kapasite` integer
- `seviye` text nullable
- `yas_grubu` text nullable
- `durum` text (`Aktif`, `Pasif`)
- `aciklama` text nullable
- audit alanları

### `kurs_grup_uyeleri`
Bir kursiyerin bir gruba üyeliğidir.

- `grup_uye_id` text PK
- `grup_id` text FK → `kurs_gruplari`
- `ogrenci_id` text FK → `ogrenciler`
- `baslangic_tarihi` date
- `bitis_tarihi` date nullable
- `birim_ucret` numeric nullable
- `durum` text (`Aktif`, `Pasif`)
- audit alanları

Aynı kursiyer aynı aktif gruba iki kez eklenemez.
Aktif üye sayısı grup kapasitesini aşamaz.

### `grup_programlari`
Bir grubun haftalık tekrar eden zaman dilimidir. Bir grubun haftada birden fazla program satırı olabilir.

- `grup_program_id` text PK
- `grup_id` text FK → `kurs_gruplari`
- `ogretmen_id` text FK → `ogretmenler`
- `derslik_id` text FK → `derslikler`
- `haftanin_gunu` text
- `baslangic_saati` time
- `ders_sayisi` numeric
- `tekrar_sikligi` text
- `baslangic_tarihi` date
- `bitis_tarihi` date nullable
- `egitmen_hakedis_modeli` text (`Sabit`, `Katılımcı Başına`, `Yüzde`)
- `egitmen_hakedis_degeri` numeric
- `durum` text (`Aktif`, `Pasif`)
- audit alanları

### `grup_dersleri`
Gerçekleşen veya planlanan tek bir grup oturumudur.

- `grup_ders_id` text PK
- `grup_program_id` text nullable FK → `grup_programlari`
- `grup_id` text FK → `kurs_gruplari`
- `tarih` date
- `ogretmen_id` text FK → `ogretmenler`
- `brans_id` text FK → `branslar`
- `derslik_id` text FK → `derslikler`
- `baslangic_saati` time
- `bitis_saati` time
- `ders_sayisi` numeric
- `ders_durumu` text
- `ogretmen_toplam_hakedis` numeric
- `aciklama` text nullable
- audit alanları

Eğitmen hakedişi bu tabloda **oturum başına yalnız bir kez** tutulur.

### `grup_ders_katilimlari`
Her katılımcının o grup dersindeki yoklama ve finans sonucudur.

- `grup_katilim_id` text PK
- `grup_ders_id` text FK → `grup_dersleri`
- `ogrenci_id` text FK → `ogrenciler`
- `katilim_durumu` text (`Katıldı`, `Gelmedi`, `Mazeretli`, `İptal`)
- `ogrenci_birim_ucreti` numeric
- `ogrenci_toplam_tutar` numeric
- `aciklama` text nullable
- audit alanları

Bir `grup_ders_id + ogrenci_id` çifti yalnız bir kez bulunabilir.

## 3. Finans kuralı

V1 için güvenli varsayılan:
- Katılımcı ücreti yalnız grup dersi `Yapıldı` ve kişi `Katıldı` olduğunda oluşur.
- `Gelmedi`, `Mazeretli`, `İptal` gibi durumlar V1'de ücret üretmez; bu kural daha sonra kurum ayarına taşınabilir.
- Eğitmen hakedişi grup oturumu için yalnız bir kez hesaplanır.
- Eğitmen hakediş modeli grup programında seçilir: `Sabit`, `Katılımcı Başına`, `Yüzde`.
- Tahsilat sistemi değişmez; kursiyerin toplam borcu birebir ders borcu + grup dersi katılım borcunun toplamı olarak raporlanır.

## 4. Çakışma kuralı

Grup programı/dersi kaydedilirken birlikte kontrol edilmelidir:
- aynı eğitmenin birebir dersi,
- aynı eğitmenin başka grup dersi,
- aynı derslik/stüdyonun birebir dersi,
- aynı derslik/stüdyonun başka grup dersi,
- grup üyelerinin aynı saatte başka birebir/grup programı.

Derslik kapasitesi ayrıca aktif grup üye sayısına göre doğrulanır.

## 5. Güvenlik

Yeni tablolar `public` şemasında oluşturulursa:
- RLS ilk anda etkinleştirilir.
- Yönetim erişimi mevcut `private.bs_ofis_yonetici_mi()` modeliyle sınırlandırılır.
- Yeni Supabase Data API davranışı nedeniyle gerekli `GRANT` ifadeleri açıkça yazılır.
- Kritik kayıt işlemleri doğrudan frontend insert yerine güvenli RPC katmanına taşınır.
- Canlı Supabase projesine bu dal üzerinden migration uygulanmaz; önce ayrı demo/test veritabanında doğrulanır.

## 6. Aşamalı teslim

1. Ürün profili ve görünür Grup modülü.
2. Backend hazır mı kontrolü; tablo yoksa uygulama kırılmadan hazırlık durumu gösterilir.
3. Grup/üye CRUD RPC'leri.
4. Grup programı ve çakışma kontrolü.
5. Grup ders üretimi.
6. Yoklama + katılımcı ücretleri + tekil eğitmen hakedişi.
7. Tahsilat/bakiye ve raporlara grup borçlarının eklenmesi.

Bu sıralama tamamlanmadan mevcut birebir ders RPC'leri değiştirilmez.
