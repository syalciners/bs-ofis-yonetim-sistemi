# BS Eğitim SaaS V1 — Core RPC Sözleşmesi

Tarih: 25 Ağustos 2026

Bu belge, yeni bir kuruma açılacak dedicated Supabase instance'ında hangi veritabanı fonksiyonlarının BS Eğitim Core ürünü olarak kurulacağını sabitler. Kaynak, çalışan BS Eğitim frontend + BS Eğitim Portalı çağrıları ve canlı Supabase fonksiyon/trigger kataloğunun salt okunur analiziyle oluşturulmuştur.

Makinece okunabilir kaynak: `saas/core-rpc-contract.v1.json`.

## 1. Sözleşme özeti

- Aktif public API: **53 RPC**.
- Private runtime helper: **6**.
- Private trigger kökü: **3**.
- Koçluk, Deneme Merkezi ve `md_*` ürünleri bu sözleşmenin dışındadır.
- Eski V1–V5 hafta üretim fonksiyonları, eski sabit program V1–V3 ve diğer doğrulanmış legacy RPC'ler yeni müşteri baseline'ına kurulmaz.
- `private.finans_v18_sync_tetikle` Core zorunluluğu değildir.
- `pg_net` ve `pg_cron` Core zorunlu eklentileri değildir.

## 2. Yetki standardı

Yeni baseline canlıdaki mevcut grant'leri körlemesine kopyalamaz.

Core public RPC standardı:

1. Fonksiyonlar yalnız gerektiği yerde `SECURITY DEFINER` olur.
2. `search_path` sabitlenir; caller tarafından değiştirilebilir search path'e güvenilmez.
3. Fonksiyon oluşturulduktan sonra `PUBLIC EXECUTE` açık bırakılmaz.
4. Varsayılan istemci rolü `authenticated` olur.
5. **Tek anonim istisna `kurum_public_bilgisi_v1`**'dir; giriş ekranında kurum marka bilgisinin okunması için `anon` + `authenticated` çalıştırabilir.
6. Yönetici işlemleri yalnız role grant'e güvenmez; fonksiyon gövdesinde `auth.uid()` ve yönetici kimliği kontrolü zorunludur.
7. Portal fonksiyonları authenticated kullanıcıyı öğrenci/öğretmen kimliğine güvenli biçimde eşler; yönetim hesabı portal kimliği olarak kullanılamaz.
8. Private helper ve trigger fonksiyonlarına `anon` / `authenticated` doğrudan EXECUTE verilmez.

Bu kural özellikle canlı katalogda tespit edilen gereğinden geniş anon/PUBLIC izinlerinin yeni müşterilere taşınmasını engeller.

## 3. Öğretmen–branş normalizasyonu

Canlı trigger `private.bs_ofis_ogretmen_brans_dogrula_v1`, eski `private.bs_ofis_ogretmen_brans_uygun_mu` helper'ı üzerinden `ogretmenler.branslar` metin alanını kontrol etmektedir.

SaaS Core baseline bu legacy bağı **kopyalamaz**. Trigger aynı iş kuralını `public.ogretmen_branslari` normalize ilişki tablosu üzerinden uygulayan `private.ogretmen_brans_uygun_mu` helper'ına bağlanacaktır.

Sonuç: branş ilişkisi tek kaynaktan yönetilir; serbest metin alanı kritik yetkilendirme/validasyon kaynağı olmaz.

## 4. Finans Asistanı ayrımı

Canlı BS Ofis'te iki Core işlem:

- `tahsilat_guncelle_guvenli_v1`
- `tahsilat_sil_guvenli_v1`

işlem sonunda `private.finans_v18_sync_tetikle()` çağırmaktadır. Canlı köprü `pg_net` kullanır ve Finans Asistanı ayarı pasifse exception atarak işlemi rollback eder.

Bu davranış yeni müşteri Core baseline'ına taşınmaz.

SaaS kuralı:

- Tahsilat düzenleme/silme BS Eğitim Core işlemleridir ve Finans Asistanı kurulmamışken de eksiksiz çalışmalıdır.
- Finans Asistanı ayrı opsiyonel entegrasyon katmanıdır.
- Core RPC önce kendi transaction'ını güvenli biçimde tamamlar.
- Entegrasyon etkinse senkronizasyon ayrı entegrasyon sözleşmesiyle bağlanır.
- Core SQL baseline `private.finans_v18_sync_tetikle`, `private.finans_v18_edge_ayar` veya `pg_net` zorunluluğu taşımaz.

## 5. Legacy fonksiyon politikası

`saas/core-rpc-contract.v1.json` içindeki `baseline_disinda_legacy_public_rpc` listesi yeni kurulumda yasaklıdır. Amaç canlı veritabanını şu aşamada temizlemek değildir; amaç yeni kurum instance'ının tarihsel fonksiyon çöplüğünü miras almamasıdır.

Örnekler:

- `haftalik_ders_uretim_durumu_v1`, `v2`
- `haftalik_dersleri_olustur_guvenli_v1` … `v5`
- `sabit_program_kaydet_guvenli_v1`, `v2`, `v3`
- `ogretmen_kaydet_guvenli_v1`, `v2`, `v4`
- `ogretmen_odeme_kaydet_guvenli_v1`
- eski kullanıcı/öğrenci/öğretmen silme-güncelleme fonksiyonları

## 6. Baseline kabul kriteri

`supabase/saas-v1-core/00_core_schema.sql` ancak aşağıdaki koşullar sağlanınca kabul edilir:

1. 26 Core tablo eksiksiz kurulur.
2. 53 aktif public RPC doğru imza ile mevcuttur.
3. 6 runtime helper ve 3 trigger kökü doğru bağımlılıklarla mevcuttur.
4. Legacy fonksiyonlar kurulmaz.
5. Öğretmen-branş trigger'ı normalize ilişki tablosunu kullanır.
6. Finance köprüsü Core zorunluluğu değildir.
7. `PUBLIC EXECUTE` kapalıdır; yalnız sözleşmedeki roller grant alır.
8. Public/exposed tablolarda RLS ve gerekli policy/grant'ler açıkça tanımlıdır.
9. Storage bucket/policy'leri kurulum manifestiyle uyumludur.
10. Yönetim uygulaması ve BS Eğitim Portalı aynı yeni instance environment'ıyla production build verir.
11. Kurulum sonrası şema/RPC/permission smoke testleri tamamen geçer.

Bu kriterler tamamlanmadan `saas/kurulum-manifesti.v1.json` içindeki `installable` alanı `true` yapılmayacaktır.
