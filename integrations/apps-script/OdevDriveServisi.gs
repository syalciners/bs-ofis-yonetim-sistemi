const ODEV_ROOT_FOLDER_ID = '1pi9sIusouzL_fDvHwsjEtLlbY9Un_tCw';
const SUPABASE_URL = 'https://igmtuouhdozkgwmdxlme.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_scFk1bnw1-VCw_ZQrfc7Mw_N518OvBf';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse_({ ok: true, servis: 'BS Ofis Ödev Drive Servisi', surum: 'v1' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.islem !== 'odev_drive_yukle') throw new Error('Geçersiz işlem.');
    if (!body.access_token) throw new Error('Oturum doğrulanamadı.');
    if (!yoneticiMi_(body.access_token)) throw new Error('Bu işlem için yönetici yetkisi gerekir.');

    const odevId = temizMetin_(body.odev_id, 100);
    const ogrenciId = temizMetin_(body.ogrenci_id, 100);
    const ogrenciAdi = temizMetin_(body.ogrenci_adi, 160);
    const ogretmenAdi = temizMetin_(body.ogretmen_adi, 160);
    const verilisTarihi = temizMetin_(body.verilis_tarihi, 20);
    const tur = body.tur === 'fotograf' ? 'fotograf' : 'dosya';
    const mimeType = temizMetin_(body.mime_type, 160) || 'application/octet-stream';
    const originalName = temizMetin_(body.dosya_adi, 220) || (tur === 'fotograf' ? 'odev-fotograf.jpg' : 'odev-dosya.pdf');
    const sourceUrl = String(body.dosya_url || '');

    if (!odevId || !ogrenciId || !ogrenciAdi || !ogretmenAdi || !verilisTarihi || !sourceUrl) {
      throw new Error('Eksik ödev veya dosya bilgisi.');
    }
    if (!/^https:\/\//i.test(sourceUrl)) throw new Error('Geçersiz dosya bağlantısı.');
    if (ALLOWED_MIME_TYPES.indexOf(mimeType) === -1) throw new Error('Bu dosya türüne izin verilmiyor.');

    const source = UrlFetchApp.fetch(sourceUrl, { followRedirects: true, muteHttpExceptions: true });
    if (source.getResponseCode() < 200 || source.getResponseCode() >= 300) throw new Error('Geçici ödev eki alınamadı.');
    const bytes = source.getBlob().getBytes();
    if (bytes.length > MAX_FILE_SIZE) throw new Error('Ödev eki en fazla 15 MB olabilir.');

    const root = DriveApp.getFolderById(ODEV_ROOT_FOLDER_ID);
    const studentFolderName = ogrenciId + '_' + ogrenciAdi.trim().toLocaleUpperCase('tr-TR');
    const studentFolder = klasorBulVeyaOlustur_(root, studentFolderName);
    const extension = uzanti_(originalName, mimeType);
    const datePart = tarihDosyaAdi_(verilisTarihi);
    const baseName = asciiUpper_(ogretmenAdi) + '_' + datePart + '_' + asciiUpper_(ogrenciAdi) + (tur === 'fotograf' ? '_ODEV_FOTOGRAF' : '_ODEV');
    const fileName = baseName + extension;

    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = studentFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    if (body.eski_drive_linki) eskiDosyayiCopuTasi_(String(body.eski_drive_linki), file.getId());

    return jsonResponse_({
      ok: true,
      odev_id: odevId,
      tur: tur,
      file_id: file.getId(),
      file_name: fileName,
      path: 'ÖDEVLER/' + studentFolderName + '/' + fileName,
      url: 'https://drive.google.com/file/d/' + file.getId() + '/view'
    });
  } catch (err) {
    return jsonResponse_({ ok: false, hata: err && err.message ? err.message : String(err) });
  }
}

function yoneticiMi_(accessToken) {
  const response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/drive_yukleme_yetkili_mi_v1', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: 'Bearer ' + accessToken
    },
    payload: '{}',
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) return false;
  try { return JSON.parse(response.getContentText()) === true; } catch (_) { return false; }
}

function klasorBulVeyaOlustur_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function eskiDosyayiCopuTasi_(url, newFileId) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || match[1] === newFileId) return;
  try { DriveApp.getFileById(match[1]).setTrashed(true); } catch (_) {}
}

function temizMetin_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
}

function asciiUpper_(value) {
  return String(value || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ/g, 'I')
    .replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function tarihDosyaAdi_(isoDate) {
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error('Geçersiz veriliş tarihi.');
  return m[3] + '-' + m[2] + '-' + m[1];
}

function uzanti_(name, mimeType) {
  const match = String(name || '').match(/(\.[A-Za-z0-9]{1,8})$/);
  if (match) return match[1].toLowerCase();
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'application/pdf': '.pdf', 'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  };
  return map[mimeType] || '.bin';
}
