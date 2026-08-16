# BS Eğitim Yönetimi — Supabase Baseline

Tarih: **2026-08-16**
Kaynak: canlı BS Eğitim Yönetimi Supabase veritabanı.

Bu klasör canlı veritabanının **şema baseline** kaydıdır. Amaç çalışan sistemi değiştirmek değil, mevcut yapıyı GitHub üzerinde denetlenebilir ve geri kurulum için referans alınabilir biçimde sabitlemektir.

## Kapsam

Baseline aşağıdaki canlı nesneleri kayıt altına alır:

- `public` ve `private` tabloları
- constraint ve indeksler
- `public` ve `private` fonksiyonları
- trigger'lar
- RLS durumu ve policy'ler
- API rolleri için tablo/fonksiyon yetkileri
- kullanılan PostgreSQL eklentileri: `pgcrypto`, `pg_net`, `pg_cron`

Canlı kontrolde **23 tablo** ve **66 fonksiyon** bulunmuştur. Şema metninin canlı kataloglardan üretilen doğrulama SHA-256 değeri:

`97fc6c11ac626b391d82c1120a3005390cbbbc6f3ffffbc0581a4d6eca21c1fd`

## Bilerek dahil edilmeyenler

Bu baseline **iş verisi yedeği değildir** ve gizli bilgi içermez. Aşağıdakiler bilinçli olarak GitHub'a yazılmaz:

- öğrenci, öğretmen, ders, tahsilat vb. gerçek kayıtlar
- `private.finans_v18_edge_ayar` içindeki gerçek endpoint/token satırı
- Supabase Auth kullanıcıları
- Storage dosyaları
- Edge Function secret değerleri
- GitHub/Google/Apps Script gizli anahtarları

Finance senkronizasyonu geri kurulumda private ayar satırı güvenli kanaldan yeniden eklenip daha sonra 5 dakikalık cron işi etkinleştirilmelidir.

## Güvenlik doğrulaması

Canlı kataloglardan baseline oluşturulurken yapılan taramada:

- secret/service-role anahtar deseni: **yok**
- `private.finans_v18_edge_ayar` için veri INSERT'i: **yok**
- gerçek private trigger token: **yok**

Bu klasördeki dosyalar canlı veritabanında uygulanmadı; baseline oluşturma işlemi yalnızca katalog okumasıdır ve canlı davranışı değiştirmez.
