# BS Eğitim SaaS V1 — Kurulum Envanteri

Tarih: 2026-08-25  
Durum: **Envanter sabitlendi — henüz kurulabilir paket değildir.**

Bu belge `SAAS_V1_MIMARI.md` içindeki Faz 2 — Kurulum Paketi çalışmasının ilk bağlayıcı çıktısıdır.

## 1. Güvenlik kararı

Mevcut `supabase/baseline` klasörü kurulum paketi değildir; canlı şemanın denetim/checkpoint kaydıdır. Eski migration geçmişinin tamamı repo içinde bulunmadığı ve baseline fonksiyonların tamamını SQL gövdesi olarak taşımadığı için yeni müşteri Supabase'ine körlemesine uygulanmayacaktır.

Bu nedenle yeni kurum kurulumu için ayrı, sanitize edilmiş ve boş Supabase üzerinde doğrulanmış bir **BS Eğitim Core başlangıç şeması** üretilecektir.

## 2. Canlı proje envanteri

Kaynak canlı Supabase projesinde kataloglar salt okunur sorgularla incelendi. Veri yazma veya DDL yapılmadı.

Gözlenen güncel yapı:

- 56 public tablo
- 1 private tablo
- 127 public/private fonksiyon
- 141 policy
- 56 RLS açık tablo
- 8 kullanıcı trigger'ı
- 3 Storage bucket
- 1 cron işi
- `pgcrypto`, `pg_net`, `pg_cron`

Canlı proje artık yalnız BS Eğitim Yönetimi nesnelerini içermediği için tamamı yeni müşteriye kopyalanmayacaktır.

## 3. BS Eğitim Yönetimi Core tabloları

Yeni BS Eğitim Yönetimi instance'ına ait Core tablo seti 26 public tablodur:

1. `aylik_snapshotlar`
2. `bildirim_okumalari`
3. `bildirimler`
4. `branslar`
5. `dersler`
6. `derslikler`
7. `gider_kategorileri`
8. `giderler`
9. `haftalik_ders_uretimleri`
10. `hakedis_donemleri`
11. `kasa_hareketleri`
12. `kasa_hesaplari`
13. `krediler`
14. `kullanici_profilleri`
15. `kurum_ayarlari`
16. `odevler`
17. `ogrenciler`
18. `ogretmen_branslari`
19. `ogretmen_odemeleri`
20. `ogretmenler`
21. `portal_kullanicilari`
22. `rapor_talepleri`
23. `sabit_ders_programi`
24. `sabit_program_istisnalari`
25. `tahsilatlar`
26. `tarifeler`

Bu liste tablo düzeyindeki ürün sınırıdır. Fonksiyon/RPC listesi ayrıca exact bağımlılık analiziyle sabitlenecektir; canlıdaki legacy sürümler sırf mevcut oldukları için yeni instance'a taşınmayacaktır.

## 4. Core Storage

BS Eğitim Yönetimi için üç bucket korunur:

- `kurum-markasi` — public
- `odev-ekleri` — private
- `profil-fotograflari` — private

Bucket oluşturmak tek başına yeterli değildir. İlgili Storage policy'leri de başlangıç şemasının parçası olacaktır.

## 5. Opsiyonel entegrasyonlar

### 5.1 Google Drive ödev arşivi

- Edge Function: `odev-drive-yukle`
- JWT doğrulaması: açık
- Supabase secret: `ODEV_DRIVE_APPS_SCRIPT_URL`
- Zorunlu değildir.

Drive yapılandırılmamışsa ödev eki private `odev-ekleri` bucket'ında kalabilir; uygulamanın temel ödev akışı çalışmaya devam etmelidir.

**Açık teknik borç:** `odev-drive-yukle` repo sürümünde mevcut BS Eğitim Supabase publishable key'i sabit olarak kaynak koda yazılmıştır. Bu değer instance-safe hale getirilmeden yeni müşteriye deploy edilmeyecektir.

### 5.2 Kurum Finans Asistanı entegrasyonu

- private ayar tablosu: `private.finans_v18_edge_ayar`
- Edge Function: `finans-gelir-sync-v18`
- eklentiler: `pg_net`, `pg_cron`
- cron: müşteri başına ayrıca etkinleştirilir
- endpoint/token repo veya seed içinde tutulmaz
- Zorunlu değildir.

Bu nedenle `pg_net`, `pg_cron` ve private finans ayarı BS Eğitim Core'un temel kurulumuna dahil edilmez.

## 6. BS Koçluk — Core dışında

Aşağıdaki 7 tablo BS Koçluk ürününe aittir ve yeni BS Eğitim Yönetimi instance'ına kurulmaz:

- `kitap_katalogu`
- `kocluk_deneme_bolum_sonuclari`
- `kocluk_deneme_sinavlari`
- `kocluk_gorusmeleri`
- `kocluk_ogrenci_profilleri`
- `kocluk_veli_iletisimleri`
- `ogrenci_kitaplari`

Aynı nedenle aşağıdaki repo Edge Function'ları BS Eğitim Core deployment setinde değildir:

- `deneme-fotograf-oku-v1`
- `kitap-ai-eslestir-v1`
- `kitap-arama-v1`
- `kitap-kapak-oku-v1`
- `kocluk-ai-asistan-v1`
- `kocluk-ai-haftalik-plan-v2`
- `kocluk-veli-ozeti-v1`

## 7. `md_*` ürün ailesi — Core dışında

Canlı projede 23 adet `md_*` tablo bulunuyor. Bunlar BS Eğitim Yönetimi Core kurulumu dışında tutulur:

- `md_branslar`
- `md_ders_katilimlari`
- `md_ders_ucretleri`
- `md_dersler`
- `md_donem_ucretleri`
- `md_egitmen_branslari`
- `md_egitmen_hakedisleri`
- `md_egitmen_odemeleri`
- `md_egitmenler`
- `md_gider_kategorileri`
- `md_giderler`
- `md_kasa_hesaplari`
- `md_kurs_grup_uyeleri`
- `md_kurs_gruplari`
- `md_kursiyer_velileri`
- `md_kursiyerler`
- `md_kurum_kullanicilari`
- `md_kurumlar`
- `md_mekanlar`
- `md_sabit_programlar`
- `md_subeler`
- `md_tahsilatlar`
- `md_veliler`

## 8. Instance environment standardı

Her production kurum instance'ında zorunlu Vite environment değerleri:

```env
VITE_APP_MODE=production
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_PORTAL_URL=https://...
```

Eksik değerler build öncesi fail-fast reddedilir.

## 9. Faz 2'nin tamamlanma kriteri

Bu envanter **kurulum paketi tamamlandı** anlamına gelmez. Faz 2 ancak aşağıdakiler tamamlandığında kapanır:

1. Canlı katalogdan sanitize edilmiş BS Eğitim Core SQL başlangıç şeması üretilir.
2. Core RPC ve trigger bağımlılıkları exact liste halinde sabitlenir.
3. Legacy/Koçluk/`md_*` nesnelerinin baseline'a sızmadığı otomatik kontrol edilir.
4. Core Storage bucket ve policy kurulumu baseline'a eklenir.
5. Güvenli başlangıç seed'i hazırlanır.
6. İlk Yönetici bootstrap yöntemi hazırlanır.
7. Tam paket boş bir Supabase üzerinde uygulanır.
8. RLS, RPC, Storage ve temel smoke testleri geçer.
9. Kurulum manifestindeki `installable` değeri ancak bundan sonra `true` yapılır.

## 10. Sonraki işlem

Sonraki teknik adım: **Core SQL başlangıç şemasını üretmeden önce aktif Core RPC sözleşmesini çıkarmak ve legacy fonksiyonlardan ayırmak.**
