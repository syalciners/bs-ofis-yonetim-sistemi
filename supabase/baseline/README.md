# BS Eğitim Yönetimi — Supabase Baseline

Tarih: **2026-08-16**  
Kaynak: canlı BS Eğitim Yönetimi Supabase veritabanı.

Bu klasör canlı veritabanının **şema checkpoint / denetim baseline** kaydıdır. Amaç çalışan sistemi değiştirmek değil, mevcut yapıyı GitHub üzerinde denetlenebilir biçimde sabitlemek ve ilerideki değişikliklerin hangi canlı yapıdan başladığını kesinleştirmektir.

> Bu klasör tek başına tam felaket kurtarma yedeği değildir. Tam kurtarma için Supabase'in yönetilen veritabanı yedeği/migration geçmişi ile güvenli runtime yapılandırmaları da gerekir.

## Kapsam

Baseline aşağıdaki canlı nesneleri kayıt altına alır:

- `public` ve `private` tablo yapıları
- constraint ve indeksler
- RLS durumu, policy'ler ve trigger'lar
- `public` ve `private` fonksiyonların **tam imzaları + canlı `pg_get_functiondef` çıktılarının SHA-256 parmak izleri** (`30_function_manifest.tsv`)
- API rolleri için tablo/fonksiyon ACL durumunun deterministik SHA-256 özeti (`50_permissions_manifest.txt`)
- kullanılan PostgreSQL eklentileri: `pgcrypto`, `pg_net`, `pg_cron`

Canlı kontrolde **23 tablo** ve **66 fonksiyon** bulunmuştur. Kataloglardan üretilen bütün şema metninin doğrulama SHA-256 değeri:

`97fc6c11ac626b391d82c1120a3005390cbbbc6f3ffffbc0581a4d6eca21c1fd`

API rol ACL manifesti:

`b6a8db268edef3ac86a1edac2e5c434af22801323b91dadfa36b47b47656b5ee`

## Neden eski migration'lar olduğu gibi kopyalanmadı?

Canlı migration geçmişinde geçmişte kullanılmış private Finance yapılandırma değeri bulunan bir migration tespit edildi. Repo public olduğu için 56 migration'ın SQL gövdelerini körlemesine GitHub'a kopyalamak güvenli değildir.

Bu nedenle bu bakım adımında:

- tablo/constraint/index/güvenlik yapısı kataloglardan güvenli biçimde kaydedildi,
- fonksiyonlar imza + SHA-256 ile eksiksiz envanterlendi,
- eski gizli runtime değerleri GitHub'a taşınmadı.

Bu yaklaşım bilerek seçildi; eksik veya elle değiştirilmiş bir fonksiyon dump'ını “tam yedek” diye saklamaktan daha güvenlidir.

## Bilerek dahil edilmeyenler

Bu baseline **iş verisi yedeği değildir** ve gizli bilgi içermez. Aşağıdakiler bilinçli olarak GitHub'a yazılmaz:

- öğrenci, öğretmen, ders, tahsilat vb. gerçek kayıtlar
- `private.finans_v18_edge_ayar` içindeki gerçek endpoint/token satırı
- Supabase Auth kullanıcıları
- Storage dosyaları
- Edge Function secret değerleri
- GitHub/Google/Apps Script gizli anahtarları

Finance senkronizasyonu tam geri kurulumda private ayar satırı güvenli kanaldan yeniden eklenip daha sonra 5 dakikalık cron işi etkinleştirilmelidir.

## Güvenlik doğrulaması

Canlı kataloglardan baseline oluşturulurken yapılan taramada:

- secret/service-role anahtar deseni: **yok**
- `private.finans_v18_edge_ayar` için veri INSERT'i: **yok**
- gerçek private trigger token: **yok**

Bu klasördeki SQL dosyaları canlı veritabanında uygulanmadı; baseline oluşturma işlemi yalnızca katalog okumasıdır ve canlı davranışı değiştirmez.
