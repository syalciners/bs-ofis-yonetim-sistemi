# BS Eğitim Yönetimi — Ürün Mimarisi V1

Tarih: 13.08.2026

## 1. Ürün amacı

BS Eğitim Yönetimi yalnız BS Ofis'e özel bir uygulama olarak geliştirilmez. Aynı çekirdekle aşağıdaki küçük ve orta ölçekli kurumların günlük operasyonunu yönetebilecek standart bir ürün hedeflenir:

- özel ders ofisleri,
- bağımsız öğretmen/eğitmen ekipleri,
- kurs merkezleri,
- butik eğitim kurumları,
- dans kursları ve stüdyoları,
- spor kursları ve akademileri,
- müzik merkezleri ve atölyeleri.

Ana karar filtresi: **Bu özellik farklı kurum tiplerinin çoğunda aynı çekirdekle kullanılabilir mi?** Kullanılamıyorsa çekirdeğe doğrudan sabitlenmez; kurum ayarı, sözlük ayarı, opsiyonel modül veya gelecek sürüm olarak ele alınır.

## 2. Değişmeyecek çekirdek kavramlar

Veritabanındaki mevcut teknik adlar V1'de korunur. Gereksiz şema değişikliği yapılmaz.

- `ogrenciler`: hizmet alan kişi / katılımcı kaydı
- `ogretmenler`: hizmet veren personel / uzman kaydı
- `dersler`: gerçekleşmesi planlanan hizmet / seans kaydı
- `branslar`: hizmet alanı / branş / program
- `derslikler`: hizmetin gerçekleştiği fiziksel veya çevrimiçi alan
- `sabit_ders_programi`: tekrar eden program şablonu
- `tahsilatlar`: müşteriden/katılımcıdan alınan ödeme
- `ogretmen_odemeleri`: personele yapılan ödeme
- `kasa_hesaplari` ve `kasa_hareketleri`: kurum para hareketleri
- `giderler`: kurum giderleri

Teknik veri modeli Türkçe karakter içermeyen tanımlayıcılarla devam eder. Kullanıcıya gösterilen terimler ileride kurum profiline göre değişebilir; bunun için çekirdek tablo adları değiştirilmez.

## 3. Kurum profiline göre değişebilecek sözlük

İleride merkezi ve senkronize bir kurum ayarı/sözlük yapısı oluşturulduğunda aynı teknik kavram farklı kurumlarda farklı etiketle gösterilebilir.

| Çekirdek kavram | Özel ders / kurs | Dans | Spor | Müzik |
|---|---|---|---|---|
| Öğrenci | Öğrenci / Kursiyer | Katılımcı | Sporcu / Üye | Öğrenci |
| Öğretmen | Öğretmen / Eğitmen | Eğitmen | Antrenör / Koç | Eğitmen / Öğretmen |
| Ders | Ders / Seans | Ders / Seans | Antrenman / Seans | Ders / Atölye |
| Branş | Ders Alanı / Branş | Dans Türü | Branş | Enstrüman / Alan |
| Derslik | Derslik / Salon | Stüdyo / Salon | Salon / Saha | Oda / Stüdyo |

**V265 itibarıyla Supabase public şemasında kurum ayarı/sözlük tablosu doğrulanmamıştır.** Bu nedenle kalıcı profil seçimi için henüz yeni tablo eklenmemiştir. Çok cihazlı ve çok kullanıcılı yapıda localStorage tabanlı sahte kurum ayarı kullanılmayacaktır.

## 4. Çekirdek operasyon kuralları

1. Sabit Program tekrar eden program/hizmet şablonudur.
2. Haftalık takvim gerçek planlanan kayıtları gösterir; haftalık kaydın değiştirilmesi Sabit Program şablonunu değiştirmez.
3. Gerçekleşmemiş hizmet finansal sonuç üretmez.
4. `Yapıldı` sonucu, kayıtlı öğrenci ücretini ve personel hakedişini finansal sonuca dönüştürür.
5. Tahsilat gerçek nakit girişidir; aynı işlem ayrıca ikinci kez gelir yaratmaz.
6. Tahsilat, kasa hareketi, gider ve personel ödemesi kritik yazmaları güvenli sunucu RPC/transaction mantığında yapılır.
7. Aynı işlemin tekrar gönderilmesi mümkün olduğunca çift kayıt üretmemelidir.
8. Günlük işler az dokunuşla tamamlanmalı, teknik alanlar son kullanıcıya gösterilmemelidir.
9. Mobilde yatay kaydırma günlük kullanım modeli değildir; ana ekranlar yalnız dikey akış kullanır.
10. Beş veya daha az seçenekli sık kullanılan seçimlerde doğrudan buton/chip tercih edilir; uzun listelerde select/arama kullanılır.

## 5. Zorunlu ana modüller

- Ana Sayfa
- Program / Takvim
- Katılımcı kayıtları (`ogrenciler`)
- Personel kayıtları (`ogretmenler`)
- Tahsilatlar
- Kasa
- Giderler
- Personel hakediş ve ödemeleri
- Raporlar
- Ayarlar

## 6. Opsiyonel modüller

Her kurumda gerekli olmayan özellikler çekirdeği zorunlu olarak kalabalıklaştırmamalıdır.

- Ödevler: akademik eğitim kurumlarında açık; dans/spor gibi profillerde isteğe bağlı olabilir.
- Zoom/çevrimiçi ders: ihtiyaç varsa açılır.
- Veli alanları: çocuk/öğrenci odaklı kurumlarda kullanılır; yetişkin katılımcı modelinde zorunlu değildir.
- Puan/not/değerlendirme alanları: kurum tipine göre opsiyoneldir.

Opsiyonel modüller kapatıldığında veri modeli bozulmamalı ve ana navigasyon gereksiz öğeler göstermemelidir.

## 7. Tasarım standardı

BS Finans Asistanı ile aynı ürün ailesi hissi korunur fakat iş akışları kopyalanmaz.

Ortak görsel dil:

- açık `#F5F7FB` zemin,
- beyaz kartlar,
- `#2563EB` ana mavi,
- `#0F172A` ana metin,
- `#64748B` ikincil metin,
- `#E2E8F0` ince kenarlar,
- düşük gölge ve sade yüzeyler,
- sabit üst uygulama barı,
- sabit 5 öğeli ana alt navigasyon,
- mobilde 16 px form kontrol fontu,
- modal/sheet başlıklarının erişilebilir kalması,
- uzun formlarda ana kayıt eyleminin erişilebilir kalması.

Eğitim Yönetimi'ne özgü olarak program ve takvim ana operasyon omurgasıdır. Finans Asistanı'ndaki borç/ödeme merkezli bilgi mimarisi buraya taşınmaz.

## 8. V265 sonrası geliştirme sırası

1. Mevcut ekranlarda görsel tutarlılık ve mobil kullanılabilirlik.
2. Çalışan modüllerde hata ve veri bütünlüğü kontrolleri.
3. Kurum profili ve sözlük için merkezi, çok cihazlı ayar mimarisi tasarımı.
4. Opsiyonel modül görünürlüğü.
5. Kurum profiline göre ekran metinlerinin ve terimlerin uyarlanması.
6. Pilot kurum testleri.
7. Gerekirse sonraki aşamada multi-tenant SaaS mimarisi.

Yeni tablo veya kolon ancak bu ürün mimarisini gerçekten gerektiriyorsa ve mevcut şema içinde daha basit bir çözüm yoksa eklenir.
