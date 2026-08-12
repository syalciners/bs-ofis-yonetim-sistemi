/**
 * BS Ofis AppSheet / Google Sheets -> BS Eğitim Supabase
 * V1 KURU ÇALIŞMA / ŞEMA DOĞRULAMA
 *
 * GÜVENLİK:
 * - Bu dosya Supabase'e veri YAZMAZ.
 * - insert / update / delete / upsert çağrısı yoktur.
 * - Amaç canlı AppSheet Google Sheet başlıklarını okuyup Supabase'e gidecek
 *   normalize payload'ı üretmek ve gerçek alan adlarını doğrulamaktır.
 *
 * Kaynak: canlı AppSheet Google Sheets dosyası
 * Script Property: ERP_SPREADSHEET_ID
 *
 * Kullanım sırası:
 * 1) bsSenkronKaynakSemaRaporuV1()
 * 2) bsSenkronKuruCalismaV1()
 * 3) bsSenkronTekTahsilatKuruTestV1('PaymentID')
 *
 * Gerçek Supabase yazma kodu; kolonlar, PK/unique, RLS ve mevcut RPC'ler
 * supabase_yazma_onkontrol.sql ile doğrulanmadan eklenmeyecektir.
 */

const BS_SENKRON_V1 = Object.freeze({
  spreadsheetProperty: 'ERP_SPREADSHEET_ID',

  tablolar: [
    {
      kaynak: 'Students',
      hedef: 'ogrenciler',
      kaynakAnahtar: 'StudentID',
      hedefAnahtarAdayi: 'ogrenci_id',
      alanlar: {
        StudentID: 'ogrenci_id',
        AdSoyad: 'ad_soyad'
      }
    },
    {
      kaynak: 'Teachers',
      hedef: 'ogretmenler',
      kaynakAnahtar: 'TeacherID',
      hedefAnahtarAdayi: 'ogretmen_id',
      alanlar: {
        TeacherID: 'ogretmen_id',
        AdSoyad: 'ad_soyad'
      }
    },
    {
      kaynak: 'Lessons',
      hedef: 'dersler',
      kaynakAnahtar: 'LessonID',
      hedefAnahtarAdayi: 'ders_id',
      alanlar: {
        LessonID: 'ders_id',
        ProgramID: 'program_id',
        Tarih: 'tarih',
        StudentID: 'ogrenci_id',
        TeacherID: 'ogretmen_id',
        BranchID: 'brans_id',
        LocationID: 'derslik_id',
        DersSayisiSaat: 'ders_sayisi',
        OgrenciBirimUcreti: 'ogrenci_birim_ucreti',
        OgretmenBirimHakedisi: 'ogretmen_birim_hakedisi',
        OgrenciToplamTutar: 'ogrenci_toplam_tutar',
        OgretmenToplamHakedis: 'ogretmen_toplam_hakedis',
        DersDurumu: 'ders_durumu',
        Aciklama: 'aciklama',
        BaslangicSaati: 'baslangic_saati',
        BitisSaati: 'bitis_saati',
        DersTuru: 'ders_turu',
        DersYeri: 'ders_yeri',
        ZoomToplantiID: 'zoom_toplanti_id',
        ZoomKatilimBaglantisi: 'zoom_katilim_baglantisi',
        ZoomSifre: 'zoom_sifre',
        ZoomIslemDurumu: 'zoom_islem_durumu',
        ZoomHataMesaji: 'zoom_hata_mesaji',
        ZoomOlusturulmaZamani: 'zoom_olusturulma_zamani',
        ZoomGuncellenmeZamani: 'zoom_guncellenme_zamani'
      }
    },
    {
      kaynak: 'StudentPayments',
      hedef: 'tahsilatlar',
      kaynakAnahtar: 'PaymentID',
      // Kesin hedef anahtar / tarih kolonu Supabase önkontrolü ile teyit edilecek.
      hedefAnahtarAdayi: 'tahsilat_id',
      alanlar: {
        PaymentID: 'tahsilat_id',
        Tarih: 'tarih',
        StudentID: 'ogrenci_id',
        Tutar: 'tutar',
        OdemeYontemi: 'odeme_yontemi',
        Aciklama: 'aciklama',
        CreatedBy: 'olusturan',
        CreatedAt: 'olusturulma_zamani'
      },
      donustur: function(kaynak, hedef) {
        // AppSheet'te ödeme yöntemi -> kasa hesabı mevcut iş kuralı.
        const yontem = bsMetin_(kaynak.OdemeYontemi);
        if (yontem === 'Nakit') {
          hedef.hesap_id = 'KASA-001';
        } else if (yontem === 'Havale/EFT' || yontem === 'Havale / EFT' || yontem === 'Kredi Kartı') {
          hedef.hesap_id = 'KASA-002';
        }
        return hedef;
      }
    },
    {
      kaynak: 'KasaHesaplari',
      hedef: 'kasa_hesaplari',
      kaynakAnahtar: 'HesapID',
      hedefAnahtarAdayi: 'hesap_id',
      alanlar: {
        HesapID: 'hesap_id',
        HesapAdi: 'hesap_adi',
        HesapTuru: 'hesap_turu',
        BankaAdi: 'banka_adi',
        IBAN: 'iban',
        AcilisBakiyesi: 'acilis_bakiyesi',
        AktifMi: 'aktif_mi'
      }
    },
    {
      kaynak: 'KasaHareketleri',
      hedef: 'kasa_hareketleri',
      kaynakAnahtar: 'HareketID',
      hedefAnahtarAdayi: 'hareket_id',
      alanlar: {
        HareketID: 'hareket_id',
        Tarih: 'tarih',
        HareketTuru: 'hareket_turu',
        KaynakTuru: 'kaynak_turu',
        KaynakID: 'kaynak_id',
        HesapID: 'hesap_id',
        Tutar: 'tutar',
        Aciklama: 'aciklama',
        StudentID: 'ogrenci_id',
        TeacherID: 'ogretmen_id',
        CreatedBy: 'olusturan',
        CreatedAt: 'olusturulma_zamani',
        IptalMi: 'iptal_mi',
        Durum: 'durum'
      }
    }
  ]
});

function bsSenkronKaynakSemaRaporuV1() {
  const ss = bsSenkronSpreadsheet_();
  const sonuc = [];

  BS_SENKRON_V1.tablolar.forEach(tablo => {
    const sh = ss.getSheetByName(tablo.kaynak);

    if (!sh) {
      sonuc.push({
        tablo: tablo.kaynak,
        durum: 'BULUNAMADI',
        kayitSayisi: 0,
        kolonlar: []
      });
      return;
    }

    const sonSatir = sh.getLastRow();
    const sonKolon = sh.getLastColumn();
    const basliklar = sonKolon > 0
      ? sh.getRange(1, 1, 1, sonKolon).getDisplayValues()[0].map(bsMetin_)
      : [];

    sonuc.push({
      tablo: tablo.kaynak,
      hedef: tablo.hedef,
      durum: 'OK',
      kayitSayisi: Math.max(0, sonSatir - 1),
      kolonlar: basliklar.filter(Boolean),
      kaynakAnahtar: tablo.kaynakAnahtar,
      hedefAnahtarAdayi: tablo.hedefAnahtarAdayi
    });
  });

  Logger.log('===== BS OFİS -> SUPABASE KAYNAK ŞEMA RAPORU V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));
  Logger.log('HİÇBİR VERİ YAZILMADI.');

  return sonuc;
}

function bsSenkronKuruCalismaV1() {
  const ss = bsSenkronSpreadsheet_();
  const rapor = {
    zaman: new Date().toISOString(),
    spreadsheetId: ss.getId(),
    tablolar: [],
    toplamKayit: 0,
    toplamEslenenAlan: 0,
    uyariSayisi: 0
  };

  BS_SENKRON_V1.tablolar.forEach(tablo => {
    const okuma = bsSayfayiOku_(ss, tablo.kaynak);

    if (!okuma.basari) {
      rapor.tablolar.push({
        kaynak: tablo.kaynak,
        hedef: tablo.hedef,
        durum: 'HATA',
        hata: okuma.hata
      });
      rapor.uyariSayisi++;
      return;
    }

    const payloadlar = [];
    const uyarilar = [];

    okuma.kayitlar.forEach((kaynakKayit, index) => {
      const anahtar = bsMetin_(kaynakKayit[tablo.kaynakAnahtar]);

      if (!anahtar) {
        uyarilar.push({
          satir: index + 2,
          neden: 'Kaynak anahtar boş: ' + tablo.kaynakAnahtar
        });
        return;
      }

      const hedef = bsKaydiDonustur_(tablo, kaynakKayit);
      payloadlar.push(hedef);
    });

    const eslenenAlanlar = Object.keys(tablo.alanlar || {}).filter(k =>
      okuma.basliklar.indexOf(k) >= 0
    );

    rapor.toplamKayit += payloadlar.length;
    rapor.toplamEslenenAlan += eslenenAlanlar.length;
    rapor.uyariSayisi += uyarilar.length;

    rapor.tablolar.push({
      kaynak: tablo.kaynak,
      hedef: tablo.hedef,
      durum: 'OK',
      kaynakKayitSayisi: okuma.kayitlar.length,
      payloadSayisi: payloadlar.length,
      bulunanKolonlar: okuma.basliklar,
      eslenenAlanlar: eslenenAlanlar,
      kaynaktaOlupMapteOlmayanlar: okuma.basliklar.filter(k =>
        k && !Object.prototype.hasOwnProperty.call(tablo.alanlar || {}, k)
      ),
      uyarilar: uyarilar,
      ilkPayloadOrnegi: payloadlar.length ? payloadlar[0] : null,
      sonPayloadOrnegi: payloadlar.length ? payloadlar[payloadlar.length - 1] : null
    });
  });

  Logger.log('===== BS OFİS -> SUPABASE KURU ÇALIŞMA V1 =====');
  Logger.log(JSON.stringify(rapor, null, 2));
  Logger.log('KURU ÇALIŞMA TAMAMLANDI - SUPABASE\'E HİÇBİR VERİ YAZILMADI.');

  return rapor;
}

function bsSenkronTekTahsilatKuruTestV1(paymentId) {
  paymentId = bsMetin_(paymentId);
  if (!paymentId) {
    throw new Error('PaymentID zorunludur. Örnek: bsSenkronTekTahsilatKuruTestV1("abc123")');
  }

  const ss = bsSenkronSpreadsheet_();
  const tablo = BS_SENKRON_V1.tablolar.find(t => t.kaynak === 'StudentPayments');
  const okuma = bsSayfayiOku_(ss, 'StudentPayments');

  if (!okuma.basari) {
    throw new Error(okuma.hata);
  }

  const kaynak = okuma.kayitlar.find(r => bsMetin_(r.PaymentID) === paymentId);

  if (!kaynak) {
    throw new Error('StudentPayments içinde PaymentID bulunamadı: ' + paymentId);
  }

  const payload = bsKaydiDonustur_(tablo, kaynak);

  const sonuc = {
    paymentId: paymentId,
    kaynak: kaynak,
    hedefTablo: tablo.hedef,
    hedefAnahtarAdayi: tablo.hedefAnahtarAdayi,
    payload: payload,
    not: 'KURU TEST - hiçbir Supabase yazması yapılmadı.'
  };

  Logger.log('===== TEK TAHSİLAT KURU TEST V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));

  return sonuc;
}

function bsKaydiDonustur_(tablo, kaynakKayit) {
  let hedef = {};

  Object.keys(tablo.alanlar || {}).forEach(kaynakAlan => {
    const hedefAlan = tablo.alanlar[kaynakAlan];
    const deger = kaynakKayit[kaynakAlan];

    if (deger === '' || deger === null || deger === undefined) {
      return;
    }

    hedef[hedefAlan] = bsNormalizeDeger_(deger);
  });

  if (typeof tablo.donustur === 'function') {
    hedef = tablo.donustur(kaynakKayit, hedef) || hedef;
  }

  return hedef;
}

function bsSayfayiOku_(ss, sayfaAdi) {
  const sh = ss.getSheetByName(sayfaAdi);

  if (!sh) {
    return {
      basari: false,
      hata: 'Sayfa bulunamadı: ' + sayfaAdi,
      basliklar: [],
      kayitlar: []
    };
  }

  const sonSatir = sh.getLastRow();
  const sonKolon = sh.getLastColumn();

  if (sonSatir < 1 || sonKolon < 1) {
    return {
      basari: true,
      basliklar: [],
      kayitlar: []
    };
  }

  const values = sh.getRange(1, 1, sonSatir, sonKolon).getValues();
  const basliklar = values[0].map(bsMetin_);
  const kayitlar = [];

  for (let r = 1; r < values.length; r++) {
    const satir = values[r];
    const tamamenBos = satir.every(v => v === '' || v === null);
    if (tamamenBos) continue;

    const kayit = {};
    basliklar.forEach((baslik, c) => {
      if (baslik) kayit[baslik] = satir[c];
    });
    kayitlar.push(kayit);
  }

  return {
    basari: true,
    basliklar: basliklar.filter(Boolean),
    kayitlar: kayitlar
  };
}

function bsSenkronSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = bsMetin_(props.getProperty(BS_SENKRON_V1.spreadsheetProperty));

  if (!id) {
    throw new Error(
      'Script Property eksik: ' + BS_SENKRON_V1.spreadsheetProperty +
      '. Değer olarak yalnız Google Sheet dosya ID\'si girilmelidir; tam URL girilmemelidir.'
    );
  }

  return SpreadsheetApp.openById(id);
}

function bsNormalizeDeger_(deger) {
  if (deger instanceof Date) {
    return Utilities.formatDate(deger, 'Europe/Istanbul', 'yyyy-MM-dd\'T\'HH:mm:ss');
  }

  if (typeof deger === 'string') {
    return deger.trim();
  }

  return deger;
}

function bsMetin_(deger) {
  return deger === null || deger === undefined ? '' : String(deger).trim();
}
