/**
 * BS Ofis AppSheet / Google Sheets -> BS Eğitim Supabase
 * DersProgrami Senkron V1
 * Tarih: 12.08.2026
 *
 * AMAÇ
 * - Canlı AppSheet'in kullandığı Google Sheets `DersProgrami` sayfasını
 *   public.sabit_ders_programi tablosuna taşımak.
 * - Aynı ProgramID tekrar çalıştırıldığında ikinci kayıt üretmemek.
 * - Önce kuru çalışma, sonra tek kayıt testi, en son toplu senkron.
 *
 * GÜVENLİK
 * - Service Role anahtarı KESİNLİKLE bu dosyaya yazılmaz.
 * - Script Properties içinde tutulur.
 * - Toplu senkron varsayılan olarak KAPALIDIR.
 *
 * GEREKLİ SCRIPT PROPERTIES
 * ERP_SPREADSHEET_ID          = yalnız Google Sheet dosya ID'si
 * SUPABASE_URL                = https://xxxx.supabase.co
 * SUPABASE_SERVICE_ROLE_KEY   = service_role / secret key
 *
 * KURULUM SIRASI
 * 1) Supabase SQL Editor'da supabase_sabit_ders_programi_v1.sql
 * 2) bsDersProgramiKaynakSemaRaporuV1()
 * 3) bsDersProgramiKuruCalismaV1()
 * 4) TEK_KAYIT_TEST_ONAYI = true
 * 5) bsDersProgramiTekKayitSenkronV1('ProgramID')
 * 6) Tek kayıt doğrulanır, TEK_KAYIT_TEST_ONAYI tekrar false yapılır.
 * 7) TOPLU_SENKRON_ONAYI = true yapılarak ilk toplu senkron kontrollü çalıştırılır.
 */

const BS_DP_SENKRON_V1 = Object.freeze({
  kaynakSayfa: 'DersProgrami',
  hedefTablo: 'sabit_ders_programi',
  spreadsheetProperty: 'ERP_SPREADSHEET_ID',
  supabaseUrlProperty: 'SUPABASE_URL',
  supabaseKeyProperty: 'SUPABASE_SERVICE_ROLE_KEY',
  timezone: 'Europe/Istanbul',

  // Güvenlik kilitleri. İlk kurulumda false kalmalıdır.
  TEK_KAYIT_TEST_ONAYI: false,
  TOPLU_SENKRON_ONAYI: false
});

/**
 * Kaynak sheet başlıklarını ve kayıt sayısını gösterir. YAZMA YAPMAZ.
 */
function bsDersProgramiKaynakSemaRaporuV1() {
  const ctx = bsDpKaynakOkuV1_();
  const sonuc = {
    sayfa: BS_DP_SENKRON_V1.kaynakSayfa,
    kayitSayisi: ctx.kayitlar.length,
    kolonlar: ctx.basliklar,
    zorunluKolonlar: bsDpZorunluKolonlarV1_(),
    eksikZorunluKolonlar: bsDpZorunluKolonlarV1_().filter(k => ctx.basliklar.indexOf(k) < 0)
  };

  Logger.log('===== DERSPROGRAMI KAYNAK ŞEMA RAPORU V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));
  Logger.log('HİÇBİR VERİ YAZILMADI.');

  return sonuc;
}

/**
 * Tüm DersProgrami kayıtlarını Supabase payload'ına dönüştürür. YAZMA YAPMAZ.
 */
function bsDersProgramiKuruCalismaV1() {
  const ctx = bsDpKaynakOkuV1_();
  const uyarilar = [];
  const payloadlar = [];

  ctx.kayitlar.forEach((kayit, i) => {
    try {
      payloadlar.push(bsDpPayloadV1_(kayit, ctx.spreadsheetTimezone));
    } catch (e) {
      uyarilar.push({ satir: i + 2, hata: e.message });
    }
  });

  const sonuc = {
    kaynakKayitSayisi: ctx.kayitlar.length,
    payloadSayisi: payloadlar.length,
    uyariSayisi: uyarilar.length,
    uyarilar: uyarilar,
    ilkPayload: payloadlar.length ? payloadlar[0] : null,
    sonPayload: payloadlar.length ? payloadlar[payloadlar.length - 1] : null,
    not: 'KURU ÇALIŞMA - Supabase yazması yapılmadı.'
  };

  Logger.log('===== DERSPROGRAMI KURU ÇALIŞMA V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));

  return sonuc;
}

/**
 * Tek ProgramID için gerçek upsert testi.
 * Kilit açılmadan çalışmaz.
 */
function bsDersProgramiTekKayitSenkronV1(programId) {
  if (BS_DP_SENKRON_V1.TEK_KAYIT_TEST_ONAYI !== true) {
    throw new Error('GÜVENLİK KİLİDİ: TEK_KAYIT_TEST_ONAYI false. Önce kuru çalışmayı doğrula.');
  }

  programId = bsDpMetinV1_(programId);
  if (!programId) {
    throw new Error('ProgramID zorunludur.');
  }

  const ctx = bsDpKaynakOkuV1_();
  const kaynak = ctx.kayitlar.find(r => bsDpMetinV1_(r.ProgramID) === programId);

  if (!kaynak) {
    throw new Error('DersProgrami içinde ProgramID bulunamadı: ' + programId);
  }

  const payload = bsDpPayloadV1_(kaynak, ctx.spreadsheetTimezone);
  const response = bsDpUpsertV1_([payload]);

  const sonuc = {
    basarili: true,
    programId: programId,
    gonderilen: payload,
    supabase: response
  };

  Logger.log('===== DERSPROGRAMI TEK KAYIT SENKRON TESTİ V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));

  return sonuc;
}

/**
 * İlk toplu senkron. Kilit açılmadan çalışmaz.
 * ProgramID primary key / on_conflict nedeniyle idempotent çalışır.
 */
function bsDersProgramiTopluSenkronV1() {
  if (BS_DP_SENKRON_V1.TOPLU_SENKRON_ONAYI !== true) {
    throw new Error('GÜVENLİK KİLİDİ: TOPLU_SENKRON_ONAYI false. Tek kayıt testi tamamlanmadan açma.');
  }

  const ctx = bsDpKaynakOkuV1_();
  const payloadlar = ctx.kayitlar.map(r => bsDpPayloadV1_(r, ctx.spreadsheetTimezone));

  if (!payloadlar.length) {
    throw new Error('DersProgrami içinde senkronlanacak kayıt yok.');
  }

  const response = bsDpUpsertV1_(payloadlar);

  const sonuc = {
    basarili: true,
    kaynakKayitSayisi: ctx.kayitlar.length,
    gonderilenKayitSayisi: payloadlar.length,
    supabaseDonenKayitSayisi: Array.isArray(response) ? response.length : null,
    zaman: new Date().toISOString()
  };

  Logger.log('===== DERSPROGRAMI TOPLU SENKRON V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));

  return sonuc;
}

/**
 * Supabase hedefini salt okunur kontrol eder.
 */
function bsDersProgramiSupabaseKontrolV1() {
  const cfg = bsDpSupabaseConfigV1_();
  const url = cfg.url + '/rest/v1/' + BS_DP_SENKRON_V1.hedefTablo +
    '?select=program_id,ogrenci_id,ogretmen_id,haftanin_gunu,baslangic_saati,program_durumu,senkron_zamani' +
    '&order=haftanin_gunu.asc,baslangic_saati.asc';

  const resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: bsDpSupabaseHeadersV1_(cfg, false),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  const body = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Supabase kontrol hatası HTTP ' + code + ': ' + body);
  }

  const data = body ? JSON.parse(body) : [];
  const sonuc = {
    basarili: true,
    kayitSayisi: data.length,
    ilkKayit: data.length ? data[0] : null,
    sonKayit: data.length ? data[data.length - 1] : null
  };

  Logger.log('===== DERSPROGRAMI SUPABASE KONTROL V1 =====');
  Logger.log(JSON.stringify(sonuc, null, 2));
  return sonuc;
}

function bsDpZorunluKolonlarV1_() {
  return [
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
    'Aktif',
    'ProgramDurumu',
    'Aciklama'
  ];
}

function bsDpKaynakOkuV1_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = bsDpMetinV1_(props.getProperty(BS_DP_SENKRON_V1.spreadsheetProperty));

  if (!spreadsheetId) {
    throw new Error('Script Property eksik: ' + BS_DP_SENKRON_V1.spreadsheetProperty);
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sh = ss.getSheetByName(BS_DP_SENKRON_V1.kaynakSayfa);

  if (!sh) {
    throw new Error('Google Sheets sayfası bulunamadı: ' + BS_DP_SENKRON_V1.kaynakSayfa);
  }

  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return {
      basliklar: [],
      kayitlar: [],
      spreadsheetTimezone: ss.getSpreadsheetTimeZone() || BS_DP_SENKRON_V1.timezone
    };
  }

  const values = sh.getRange(1, 1, lastRow, lastColumn).getValues();
  const basliklar = values[0].map(bsDpMetinV1_);
  const eksik = bsDpZorunluKolonlarV1_().filter(k => basliklar.indexOf(k) < 0);

  if (eksik.length) {
    throw new Error('DersProgrami kaynak şeması eksik. Bulunamayan kolonlar: ' + eksik.join(', '));
  }

  const kayitlar = [];

  for (let r = 1; r < values.length; r++) {
    const satir = values[r];
    const bos = satir.every(v => v === '' || v === null);
    if (bos) continue;

    const obj = {};
    basliklar.forEach((h, c) => {
      if (h) obj[h] = satir[c];
    });
    kayitlar.push(obj);
  }

  return {
    basliklar: basliklar,
    kayitlar: kayitlar,
    spreadsheetTimezone: ss.getSpreadsheetTimeZone() || BS_DP_SENKRON_V1.timezone
  };
}

function bsDpPayloadV1_(r, tz) {
  const programId = bsDpMetinV1_(r.ProgramID);
  const ogrenciId = bsDpMetinV1_(r.StudentID);
  const ogretmenId = bsDpMetinV1_(r.TeacherID);
  const bransId = bsDpMetinV1_(r.BranchID);
  const gun = bsDpMetinV1_(r.HaftaninGunu);
  const baslangic = bsDpSaatV1_(r.BaslangicSaati, tz);
  const dersSayisi = Number(r.DersSayisiSaat || 0);
  const programDurumu = bsDpMetinV1_(r.ProgramDurumu) || 'Aktif';

  if (!programId) throw new Error('ProgramID boş.');
  if (!ogrenciId) throw new Error(programId + ': StudentID boş.');
  if (!ogretmenId) throw new Error(programId + ': TeacherID boş.');
  if (!bransId) throw new Error(programId + ': BranchID boş.');
  if (!gun) throw new Error(programId + ': HaftaninGunu boş.');
  if (!baslangic) throw new Error(programId + ': BaslangicSaati boş/geçersiz.');
  if ([1,2,3,4].indexOf(dersSayisi) < 0) throw new Error(programId + ': DersSayisiSaat 1-4 olmalıdır.');

  const canonical = {
    program_id: programId,
    ogrenci_id: ogrenciId,
    ogretmen_id: ogretmenId,
    brans_id: bransId,
    derslik_id: bsDpNullMetinV1_(r.LocationID),
    haftanin_gunu: gun,
    baslangic_saati: baslangic,
    ders_sayisi: dersSayisi,
    ogrenci_birim_ucreti: bsDpParaV1_(r.OgrenciBirimUcreti),
    ogretmen_birim_hakedisi: bsDpParaV1_(r.OgretmenBirimHakedisi),
    baslangic_tarihi: bsDpTarihV1_(r.BaslangicTarihi, tz),
    bitis_tarihi: bsDpTarihV1_(r.BitisTarihi, tz),
    aktif: bsDpBoolV1_(r.Aktif),
    program_durumu: programDurumu,
    aciklama: bsDpNullMetinV1_(r.Aciklama),
    kaynak_sistem: 'AppSheet'
  };

  const payload = Object.assign({}, canonical, {
    kaynak_hash: bsDpHashV1_(canonical),
    senkron_zamani: new Date().toISOString()
  });

  return payload;
}

function bsDpUpsertV1_(payloadlar) {
  const cfg = bsDpSupabaseConfigV1_();
  const url = cfg.url + '/rest/v1/' + BS_DP_SENKRON_V1.hedefTablo + '?on_conflict=program_id';

  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payloadlar),
    headers: bsDpSupabaseHeadersV1_(cfg, true),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  const body = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Supabase upsert hatası HTTP ' + code + ': ' + body);
  }

  return body ? JSON.parse(body) : [];
}

function bsDpSupabaseConfigV1_() {
  const props = PropertiesService.getScriptProperties();
  const url = bsDpMetinV1_(props.getProperty(BS_DP_SENKRON_V1.supabaseUrlProperty)).replace(/\/$/, '');
  const key = bsDpMetinV1_(props.getProperty(BS_DP_SENKRON_V1.supabaseKeyProperty));

  if (!url) throw new Error('Script Property eksik: ' + BS_DP_SENKRON_V1.supabaseUrlProperty);
  if (!key) throw new Error('Script Property eksik: ' + BS_DP_SENKRON_V1.supabaseKeyProperty);

  return { url: url, key: key };
}

function bsDpSupabaseHeadersV1_(cfg, upsert) {
  const h = {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };

  if (upsert) {
    h.Prefer = 'resolution=merge-duplicates,return=representation';
  }

  return h;
}

function bsDpTarihV1_(v, tz) {
  if (v === '' || v === null || v === undefined) return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz || BS_DP_SENKRON_V1.timezone, 'yyyy-MM-dd');
  }

  const s = bsDpMetinV1_(v);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }

  throw new Error('Geçersiz tarih: ' + s);
}

function bsDpSaatV1_(v, tz) {
  if (v === '' || v === null || v === undefined) return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz || BS_DP_SENKRON_V1.timezone, 'HH:mm:ss');
  }

  const s = bsDpMetinV1_(v);
  if (!s) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error('Geçersiz saat: ' + s);

  return String(m[1]).padStart(2, '0') + ':' + m[2] + ':' + (m[3] || '00');
}

function bsDpParaV1_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;

  let s = bsDpMetinV1_(v).replace(/₺/g, '').replace(/\s/g, '');

  // tr-TR: 1.234,56 -> 1234.56
  if (s.indexOf(',') >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  }

  const n = Number(s);
  if (!isFinite(n)) throw new Error('Geçersiz para değeri: ' + v);
  return n;
}

function bsDpBoolV1_(v) {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined || v === '') return true;

  const s = bsDpMetinV1_(v).toLocaleLowerCase('tr-TR');
  if (['false','0','hayır','hayir','pasif','değil','degil'].indexOf(s) >= 0) return false;
  if (['true','1','evet','aktif'].indexOf(s) >= 0) return true;

  // Kaynak kolon Text olduğu için bilinmeyen eski değerlerde sistemi kilitlemek yerine
  // ProgramDurumu ve tarih aralığını esas alan mevcut AppSheet davranışını koru.
  return true;
}

function bsDpHashV1_(obj) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(obj),
    Utilities.Charset.UTF_8
  );

  return bytes.map(b => {
    const n = (b < 0 ? b + 256 : b).toString(16);
    return n.length === 1 ? '0' + n : n;
  }).join('');
}

function bsDpMetinV1_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function bsDpNullMetinV1_(v) {
  const s = bsDpMetinV1_(v);
  return s || null;
}
