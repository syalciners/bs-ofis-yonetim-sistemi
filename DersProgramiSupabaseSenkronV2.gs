/**
 * BS Ofis → Supabase
 * DersProgrami / Lessons kalıcı senkron kontrol altyapısı V2
 *
 * Bu dosya yalnızca OKUMA ve KARŞILAŞTIRMA yapar.
 * Google Sheets veya Supabase üzerinde INSERT / UPDATE / DELETE yapmaz.
 *
 * Kaynak gerçeklik: AppSheet → Google Sheets
 * Hedef okuma katmanı: Supabase
 */

const BS_V2 = Object.freeze({
  spreadsheetProperty: 'ERP_SPREADSHEET_ID',
  supabaseUrlProperty: 'BSOFIS_SUPABASE_URL',
  supabaseKeyProperty: 'BSOFIS_SUPABASE_SERVICE_ROLE_KEY',
  timezoneFallback: 'Europe/Istanbul',
  dersProgramiSayfa: 'DersProgrami',
  lessonsSayfa: 'Lessons',
  dersProgramiTablo: 'sabit_ders_programi',
  lessonsTablo: 'dersler'
});

const BS_V2_DERS_PROGRAMI_ALANLARI = Object.freeze({
  ProgramID: 'program_id',
  StudentID: 'ogrenci_id',
  TeacherID: 'ogretmen_id',
  BranchID: 'brans_id',
  LocationID: 'derslik_id',
  HaftaninGunu: 'haftanin_gunu',
  BaslangicSaati: 'baslangic_saati',
  DersSayisiSaat: 'ders_sayisi',
  OgrenciBirimUcreti: 'ogrenci_birim_ucreti',
  OgretmenBirimHakedisi: 'ogretmen_birim_hakedisi',
  BaslangicTarihi: 'baslangic_tarihi',
  BitisTarihi: 'bitis_tarihi',
  ProgramDurumu: 'program_durumu',
  Aciklama: 'aciklama'
});

const BS_V2_LESSONS_ALANLARI = Object.freeze({
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
  CreatedBy: 'olusturan',
  CreatedAt: 'olusturulma_zamani',
  BaslangicSaati: 'baslangic_saati',
  BitisSaati: 'bitis_saati',
  DersTuru: 'ders_turu',
  DersYeri: 'ders_yeri',
  AkademikYil: 'akademik_yil',
  DersAy: 'ders_ayi',
  HaftaNo: 'hafta_no',
  SonDegistiren: 'son_degistiren',
  SonDegistirmeZamani: 'son_degistirme_zamani',
  ZoomToplantiID: 'zoom_toplanti_id',
  ZoomKatilimBaglantisi: 'zoom_katilim_baglantisi',
  ZoomSifre: 'zoom_sifre',
  ZoomIslemDurumu: 'zoom_islem_durumu',
  ZoomHataMesaji: 'zoom_hata_mesaji',
  ZoomOlusturulmaZamani: 'zoom_olusturulma_zamani',
  ZoomGuncellenmeZamani: 'zoom_guncellenme_zamani'
});

const BS_V2_LESSONS_SAYISAL_SHEET_ALANLARI = new Set([
  'DersSayisiSaat',
  'OgrenciBirimUcreti',
  'OgretmenBirimHakedisi',
  'OgrenciToplamTutar',
  'OgretmenToplamHakedis',
  'HaftaNo'
]);

const BS_V2_LESSONS_TARIH_SHEET_ALANLARI = new Set([
  'Tarih'
]);

const BS_V2_LESSONS_SAAT_SHEET_ALANLARI = new Set([
  'BaslangicSaati',
  'BitisSaati'
]);

const BS_V2_LESSONS_ZAMAN_SHEET_ALANLARI = new Set([
  'CreatedAt',
  'SonDegistirmeZamani',
  'ZoomOlusturulmaZamani',
  'ZoomGuncellenmeZamani'
]);

/**
 * 1) Temel bağlantı ve kaynak şema kontrolü.
 * SADECE OKUR.
 */
function bsV2SaglikKontrol() {
  const ctx = bsV2Context_();

  const dersProgrami = bsV2SheetOku_(
    ctx.ss,
    BS_V2.dersProgramiSayfa
  );

  const lessons = bsV2SheetOku_(
    ctx.ss,
    BS_V2.lessonsSayfa
  );

  const sonuc = {
    basarili: true,
    timezone: ctx.timezone,
    dersProgrami: {
      kayitSayisi: dersProgrami.kayitlar.length,
      kolonSayisi: dersProgrami.basliklar.length
    },
    lessons: {
      kayitSayisi: lessons.kayitlar.length,
      kolonSayisi: lessons.basliklar.length
    },
    not: 'SADECE OKUMA YAPILDI. HİÇBİR VERİ DEĞİŞTİRİLMEDİ.'
  };

  Logger.log('===== BS V2 SAĞLIK KONTROL =====');
  Logger.log(JSON.stringify(sonuc, null, 2));

  return sonuc;
}

/**
 * 2) DersProgrami Google Sheets ↔ Supabase karşılaştırması.
 * ProgramDurumu kaynak otoritedir; aktif değeri buradan türetilir.
 * SADECE OKUR.
 */
function bsV2DersProgramiKarsilastir() {
  const ctx = bsV2Context_();
  const sheet = bsV2SheetOku_(ctx.ss, BS_V2.dersProgramiSayfa);

  bsV2ZorunluKolonKontrol_(
    sheet.basliklar,
    [
      'ProgramID',
      'StudentID',
      'TeacherID',
      'BranchID',
      'LocationID',
      'HaftaninGunu',
      'BaslangicSaati',
      'DersSayisiSaat',
      'OgrenciBirimUcreti',
      'OgretmenBirimHakedisi',
      'BaslangicTarihi',
      'BitisTarihi',
      'ProgramDurumu',
      'Aciklama'
    ],
    BS_V2.dersProgramiSayfa
  );

  const sheetMap = {};

  sheet.kayitlar.forEach(r => {
    const programId = bsV2Metin_(r.ProgramID);
    if (!programId) return;

    const programDurumu = bsV2Metin_(r.ProgramDurumu) || 'Aktif';

    sheetMap[programId] = {
      program_id: programId,
      ogrenci_id: bsV2NullMetin_(r.StudentID),
      ogretmen_id: bsV2NullMetin_(r.TeacherID),
      brans_id: bsV2NullMetin_(r.BranchID),
      derslik_id: bsV2NullMetin_(r.LocationID),
      haftanin_gunu: bsV2NullMetin_(r.HaftaninGunu),
      baslangic_saati: bsV2Saat_(r.BaslangicSaati, ctx.timezone),
      ders_sayisi: bsV2Sayi_(r.DersSayisiSaat),
      ogrenci_birim_ucreti: bsV2Sayi_(r.OgrenciBirimUcreti),
      ogretmen_birim_hakedisi: bsV2Sayi_(r.OgretmenBirimHakedisi),
      baslangic_tarihi: bsV2Tarih_(r.BaslangicTarihi, ctx.timezone),
      bitis_tarihi: bsV2Tarih_(r.BitisTarihi, ctx.timezone),
      aktif: programDurumu === 'Aktif',
      program_durumu: programDurumu,
      aciklama: bsV2NullMetin_(r.Aciklama)
    };
  });

  const selectAlanlari = [
    'program_id',
    'ogrenci_id',
    'ogretmen_id',
    'brans_id',
    'derslik_id',
    'haftanin_gunu',
    'baslangic_saati',
    'ders_sayisi',
    'ogrenci_birim_ucreti',
    'ogretmen_birim_hakedisi',
    'baslangic_tarihi',
    'bitis_tarihi',
    'aktif',
    'program_durumu',
    'aciklama'
  ];

  const supabaseRows = bsV2SupabaseGet_(
    ctx,
    BS_V2.dersProgramiTablo,
    selectAlanlari
  );

  const supabaseMap = {};
  supabaseRows.forEach(r => {
    const id = bsV2Metin_(r.program_id);
    if (id) supabaseMap[id] = r;
  });

  const sadeceGoogleSheets = [];
  const sadeceSupabase = [];
  const farkliKayitlar = [];
  let birebirAyni = 0;

  Object.keys(sheetMap).forEach(programId => {
    const g = sheetMap[programId];
    const s = supabaseMap[programId];

    if (!s) {
      sadeceGoogleSheets.push(programId);
      return;
    }

    const farklar = [];

    Object.keys(g).forEach(alan => {
      const gv = bsV2ProgramDegerNormalize_(alan, g[alan]);
      const sv = bsV2ProgramDegerNormalize_(alan, s[alan]);

      if (!bsV2Esit_(gv, sv)) {
        farklar.push({
          alan: alan,
          googleSheets: gv,
          supabase: sv
        });
      }
    });

    if (farklar.length) {
      farkliKayitlar.push({
        ProgramID: programId,
        farklar: farklar
      });
    } else {
      birebirAyni++;
    }
  });

  Object.keys(supabaseMap).forEach(programId => {
    if (!sheetMap[programId]) {
      sadeceSupabase.push(programId);
    }
  });

  const sonuc = {
    googleSheetsKayit: Object.keys(sheetMap).length,
    supabaseKayit: Object.keys(supabaseMap).length,
    birebirAyni: birebirAyni,
    farkliKayitSayisi: farkliKayitlar.length,
    sadeceGoogleSheetsSayisi: sadeceGoogleSheets.length,
    sadeceSupabaseSayisi: sadeceSupabase.length,
    farkliKayitlar: farkliKayitlar,
    sadeceGoogleSheets: sadeceGoogleSheets,
    sadeceSupabase: sadeceSupabase
  };

  Logger.log('===== BS V2 DERSPROGRAMI KARŞILAŞTIR =====');
  Logger.log(JSON.stringify(sonuc, null, 2));
  Logger.log('SADECE OKUMA YAPILDI.');

  return sonuc;
}

/**
 * 3) Lessons Google Sheets ↔ Supabase TAM ALAN karşılaştırması.
 * 32 kolonlu kaynak yapının LessonID dışındaki kalıcı alanlarını karşılaştırır.
 * SADECE OKUR.
 */
function bsV2LessonsTamKarsilastir() {
  const ctx = bsV2Context_();
  const sheet = bsV2SheetOku_(ctx.ss, BS_V2.lessonsSayfa);

  const zorunlu = ['LessonID'].concat(
    Object.keys(BS_V2_LESSONS_ALANLARI)
  );

  bsV2ZorunluKolonKontrol_(
    sheet.basliklar,
    zorunlu,
    BS_V2.lessonsSayfa
  );

  const sheetMap = {};

  sheet.kayitlar.forEach(r => {
    const lessonId = bsV2Metin_(r.LessonID);
    if (!lessonId) return;

    const kayit = {};

    Object.keys(BS_V2_LESSONS_ALANLARI).forEach(sheetAlan => {
      const dbAlan = BS_V2_LESSONS_ALANLARI[sheetAlan];
      kayit[dbAlan] = bsV2LessonSheetNormalize_(
        sheetAlan,
        r[sheetAlan],
        ctx.timezone
      );
    });

    sheetMap[lessonId] = kayit;
  });

  const selectAlanlari = ['ders_id'].concat(
    Object.values(BS_V2_LESSONS_ALANLARI)
  );

  const supabaseRows = bsV2SupabaseGet_(
    ctx,
    BS_V2.lessonsTablo,
    selectAlanlari
  );

  const supabaseMap = {};
  supabaseRows.forEach(r => {
    const id = bsV2Metin_(r.ders_id);
    if (id) supabaseMap[id] = r;
  });

  const sadeceGoogleSheets = [];
  const sadeceSupabase = [];
  const farkliKayitlar = [];
  const alanFarkSayilari = {};
  let birebirAyni = 0;

  Object.keys(sheetMap).forEach(lessonId => {
    const g = sheetMap[lessonId];
    const s = supabaseMap[lessonId];

    if (!s) {
      sadeceGoogleSheets.push(lessonId);
      return;
    }

    const farklar = [];

    Object.keys(BS_V2_LESSONS_ALANLARI).forEach(sheetAlan => {
      const dbAlan = BS_V2_LESSONS_ALANLARI[sheetAlan];
      const gv = g[dbAlan];
      const sv = bsV2LessonDbNormalize_(sheetAlan, s[dbAlan]);

      if (!bsV2Esit_(gv, sv)) {
        farklar.push({
          alan: dbAlan,
          googleSheets: gv,
          supabase: sv
        });

        alanFarkSayilari[dbAlan] =
          (alanFarkSayilari[dbAlan] || 0) + 1;
      }
    });

    if (farklar.length) {
      farkliKayitlar.push({
        LessonID: lessonId,
        farkSayisi: farklar.length,
        farklar: farklar
      });
    } else {
      birebirAyni++;
    }
  });

  Object.keys(supabaseMap).forEach(lessonId => {
    if (!sheetMap[lessonId]) {
      sadeceSupabase.push(lessonId);
    }
  });

  const sonuc = {
    googleSheetsKayit: Object.keys(sheetMap).length,
    supabaseKayit: Object.keys(supabaseMap).length,
    birebirAyni: birebirAyni,
    farkliKayitSayisi: farkliKayitlar.length,
    sadeceGoogleSheetsSayisi: sadeceGoogleSheets.length,
    sadeceSupabaseSayisi: sadeceSupabase.length,
    alanFarkSayilari: alanFarkSayilari,
    farkliKayitlar: farkliKayitlar,
    sadeceGoogleSheets: sadeceGoogleSheets,
    sadeceSupabase: sadeceSupabase
  };

  Logger.log('===== BS V2 LESSONS TAM KARŞILAŞTIR =====');
  Logger.log(JSON.stringify(sonuc, null, 2));
  Logger.log('SADECE OKUMA YAPILDI.');
  Logger.log('GOOGLE SHEETS VE SUPABASE DEĞİŞTİRİLMEDİ.');

  return sonuc;
}

// =========================================================
// ORTAK YARDIMCILAR
// =========================================================

function bsV2Context_() {
  const props = PropertiesService.getScriptProperties();

  const spreadsheetId = bsV2Metin_(
    props.getProperty(BS_V2.spreadsheetProperty)
  );

  const supabaseUrl = bsV2Metin_(
    props.getProperty(BS_V2.supabaseUrlProperty)
  ).replace(/\/+$/, '');

  const supabaseKey = props.getProperty(BS_V2.supabaseKeyProperty);

  if (!spreadsheetId) {
    throw new Error(
      'Script Property bulunamadı: ' + BS_V2.spreadsheetProperty
    );
  }

  if (!supabaseUrl) {
    throw new Error(
      'Script Property bulunamadı: ' + BS_V2.supabaseUrlProperty
    );
  }

  if (!supabaseKey) {
    throw new Error(
      'Script Property bulunamadı: ' + BS_V2.supabaseKeyProperty
    );
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);

  return {
    ss: ss,
    timezone: ss.getSpreadsheetTimeZone() || BS_V2.timezoneFallback,
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey
  };
}

function bsV2SheetOku_(ss, sayfaAdi) {
  const sh = ss.getSheetByName(sayfaAdi);

  if (!sh) {
    throw new Error('Google Sheets sayfası bulunamadı: ' + sayfaAdi);
  }

  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return {
      basliklar: [],
      kayitlar: []
    };
  }

  const values = sh
    .getRange(1, 1, lastRow, lastColumn)
    .getValues();

  const basliklar = values[0].map(v => bsV2Metin_(v));
  const kayitlar = [];

  for (let i = 1; i < values.length; i++) {
    const satir = values[i];
    const tamamenBos = satir.every(v => v === '' || v === null);

    if (tamamenBos) continue;

    const kayit = {};

    basliklar.forEach((baslik, c) => {
      if (baslik) kayit[baslik] = satir[c];
    });

    kayitlar.push(kayit);
  }

  return {
    basliklar: basliklar,
    kayitlar: kayitlar
  };
}

function bsV2SupabaseGet_(ctx, tablo, alanlar) {
  const endpoint =
    ctx.supabaseUrl +
    '/rest/v1/' +
    encodeURIComponent(tablo) +
    '?select=' +
    alanlar.join(',');

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    headers: {
      apikey: ctx.supabaseKey,
      Authorization: 'Bearer ' + ctx.supabaseKey
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();

  if (status < 200 || status >= 300) {
    throw new Error(
      'Supabase okuma hatası. Tablo=' +
        tablo +
        ' HTTP ' +
        status +
        ': ' +
        response.getContentText()
    );
  }

  return JSON.parse(response.getContentText());
}

function bsV2ZorunluKolonKontrol_(basliklar, zorunlu, sayfaAdi) {
  const eksik = zorunlu.filter(kolon => !basliklar.includes(kolon));

  if (eksik.length) {
    throw new Error(
      sayfaAdi +
        ' sayfasında zorunlu kolon eksik: ' +
        eksik.join(', ')
    );
  }
}

function bsV2ProgramDegerNormalize_(alan, value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (
    alan === 'ders_sayisi' ||
    alan === 'ogrenci_birim_ucreti' ||
    alan === 'ogretmen_birim_hakedisi'
  ) {
    return bsV2Sayi_(value);
  }

  if (alan === 'aktif') {
    return Boolean(value);
  }

  if (alan === 'baslangic_saati') {
    return String(value).trim().slice(0, 8);
  }

  if (alan === 'baslangic_tarihi' || alan === 'bitis_tarihi') {
    return String(value).trim().slice(0, 10);
  }

  return String(value).trim();
}

function bsV2LessonSheetNormalize_(sheetAlan, value, timezone) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (BS_V2_LESSONS_SAYISAL_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2Sayi_(value);
  }

  if (BS_V2_LESSONS_TARIH_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2Tarih_(value, timezone);
  }

  if (BS_V2_LESSONS_SAAT_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2Saat_(value, timezone);
  }

  if (BS_V2_LESSONS_ZAMAN_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2ZamanIsoSaniye_(value);
  }

  return String(value).trim();
}

function bsV2LessonDbNormalize_(sheetAlan, value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (BS_V2_LESSONS_SAYISAL_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2Sayi_(value);
  }

  if (BS_V2_LESSONS_TARIH_SHEET_ALANLARI.has(sheetAlan)) {
    return String(value).trim().slice(0, 10);
  }

  if (BS_V2_LESSONS_SAAT_SHEET_ALANLARI.has(sheetAlan)) {
    return String(value).trim().slice(0, 8);
  }

  if (BS_V2_LESSONS_ZAMAN_SHEET_ALANLARI.has(sheetAlan)) {
    return bsV2ZamanIsoSaniye_(value);
  }

  return String(value).trim();
}

function bsV2Metin_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function bsV2NullMetin_(value) {
  const text = bsV2Metin_(value);
  return text || null;
}

function bsV2Sayi_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const n = Number(
    typeof value === 'string'
      ? value.replace(/\s/g, '').replace(',', '.')
      : value
  );

  return Number.isFinite(n) ? n : null;
}

function bsV2Tarih_(value, timezone) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }

  return String(value).trim().slice(0, 10) || null;
}

function bsV2Saat_(value, timezone) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Utilities.formatDate(value, timezone, 'HH:mm:ss');
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return null;

  return (
    String(match[1]).padStart(2, '0') +
    ':' +
    match[2] +
    ':' +
    (match[3] || '00')
  );
}

function bsV2ZamanIsoSaniye_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const d = value instanceof Date ? value : new Date(value);

  if (isNaN(d.getTime())) {
    return String(value).trim();
  }

  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function bsV2Esit_(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
