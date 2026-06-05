const SECRET_TOKEN = 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN';

const DATABASE_SHEET = 'DATABASE_JSON';
const BACKUP_SHEET = 'BACKUP_JSON';
const LOG_SHEET = 'SYNC_LOG';

const TABLE_SHEETS = {
  CP: 'CP',
  QUY: 'QUY',
  HO_SO: 'HO_SO',
  VAT_TU: 'VAT_TU',
  GIAO_DICH_VAT_TU: 'GIAO_DICH_VAT_TU',
  BAO_CAO_SEP: 'BAO_CAO_SEP'
};

function doGet(e) {
  try {
    checkAccess_(e, null);
    const action = String(e.parameter.action || '').trim();

    if (action === 'ping') {
      return json_({ ok: true, message: 'Hybrid backend đang hoạt động.' });
    }

    if (action === 'getDatabase') {
      return json_({ ok: true, database: getDatabase_() });
    }

    if (action === 'getLatestBackup') {
      return json_({ ok: true, backup: getLatestBackup_() });
    }

    return json_({ ok: false, message: 'Action GET không hợp lệ: ' + action });
  } catch (err) {
    return json_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    checkAccess_(e, body);
    const action = String(body.action || e.parameter.action || '').trim();

    if (action === 'saveDatabase') {
      const current = safeGetDatabase_();
      if (hasAnyData_(current)) {
        appendBackup_('before_save', current);
      }

      const nextDb = normalizeDb_(body.payload || {});
      saveDatabase_(nextDb);
      writeReadableSheets_(nextDb);
      appendBackup_('after_save', nextDb);
      addLog_('saveDatabase', nextDb, 'Đã lưu JSON + bảng kế toán + backup');

      return json_({ ok: true, database: nextDb, message: 'Đã lưu dữ liệu hybrid an toàn.' });
    }

    if (action === 'restoreLatestBackup') {
      const backup = getLatestBackup_();
      if (!backup || !backup.database) throw new Error('Không tìm thấy backup để khôi phục.');
      saveDatabase_(backup.database);
      writeReadableSheets_(backup.database);
      addLog_('restoreLatestBackup', backup.database, 'Khôi phục từ backup gần nhất');
      return json_({ ok: true, database: backup.database, message: 'Đã khôi phục backup gần nhất.' });
    }

    return json_({ ok: false, message: 'Action POST không hợp lệ: ' + action });
  } catch (err) {
    return json_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

/**
 * SAFE SETUP:
 * Không xóa dữ liệu cũ. Chỉ tạo sheet thiếu và đồng bộ lại bảng dễ xem.
 * Chạy hàm này bao nhiêu lần cũng không làm mất DATABASE_JSON nếu đang có dữ liệu.
 */
function setupDatabase() {
  const current = safeGetDatabase_();
  ensureCoreSheets_();

  if (!hasAnyData_(current)) {
    saveDatabase_(emptyDb_());
  } else {
    saveDatabase_(current);
    appendBackup_('setup_preserve_existing_data', current);
  }

  writeReadableSheets_(safeGetDatabase_());
  addLog_('setupDatabase', safeGetDatabase_(), 'Safe setup - không reset dữ liệu');
}

function resyncReadableSheets() {
  const db = getDatabase_();
  writeReadableSheets_(db);
  appendBackup_('manual_resync', db);
  addLog_('resyncReadableSheets', db, 'Đồng bộ lại sheet CP/QUY/HO_SO/VAT_TU');
}

function restoreLatestBackup() {
  const backup = getLatestBackup_();
  if (!backup || !backup.database) throw new Error('Không có backup để khôi phục.');
  saveDatabase_(backup.database);
  writeReadableSheets_(backup.database);
  addLog_('restoreLatestBackup', backup.database, 'Khôi phục thủ công từ backup gần nhất');
}

function getDatabase_() {
  const sheet = getSheet_(DATABASE_SHEET);
  const raw = sheet.getRange('B2').getValue();
  if (!raw) return emptyDb_();
  return normalizeDb_(JSON.parse(raw));
}

function safeGetDatabase_() {
  try {
    return getDatabase_();
  } catch (err) {
    return emptyDb_();
  }
}

function saveDatabase_(dbInput) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(DATABASE_SHEET);

  sheet.getRange('A1').setValue('key');
  sheet.getRange('B1').setValue('json');
  sheet.getRange('A2').setValue('database');
  sheet.getRange('B2').setValue(JSON.stringify(db));
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
}

function ensureCoreSheets_() {
  getSheet_(DATABASE_SHEET);
  const backup = getSheet_(BACKUP_SHEET);
  if (backup.getLastRow() === 0) {
    backup.getRange(1, 1, 1, 5).setValues([['timestamp', 'reason', 'records', 'json', 'note']]);
    styleHeader_(backup, 5);
  }

  const log = getSheet_(LOG_SHEET);
  if (log.getLastRow() === 0) {
    log.getRange(1, 1, 1, 5).setValues([['timestamp', 'action', 'records', 'user', 'note']]);
    styleHeader_(log, 5);
  }
}

function writeReadableSheets_(dbInput) {
  const db = normalizeDb_(dbInput || {});

  writeRows_(TABLE_SHEETS.CP, [
    'id', 'ngay_de_nghi', 'ngay_thuc_te', 'noi_dung', 'nhom_chi_phi', 'loai_chi_phi',
    'tam_ung', 'thuc_chi', 'chenh_lech_tam_ung_thuc_chi', 'han_muc', 'trang_thai_hoan_ung',
    'trang_thai_chung_tu', 'chung_tu_thieu', 'so_hoa_don', 'ghi_chu', 'nguoi_tao', 'ngay_tao', 'ma_ho_so'
  ], db.expenses.map(function (x) {
    const tamUng = num_(x.advanceAmount);
    const thucChi = num_(x.actualAmount);
    return [
      x.id || '', x.requestDate || '', x.actualDate || '', x.content || '', x.expenseGroup || '', x.expenseType || '',
      tamUng, thucChi, tamUng - thucChi, x.limitType || '', x.clearanceStatus || '', x.documentStatus || '',
      x.missingDocuments || '', x.invoiceNo || '', x.notes || '', x.createdByRole || '', x.createdAt || '', x.dossierCode || ''
    ];
  }));

  writeRows_(TABLE_SHEETS.QUY, [
    'id', 'ngay', 'noi_dung', 'nhom_chi_phi', 'so_tien', 'nguon_tien', 'loai_quy', 'ghi_chu', 'ngay_tao'
  ], db.funds.map(function (x) {
    return [x.id || '', x.date || '', x.content || '', x.expenseGroup || '', num_(x.amount), x.source || '', x.fundType || '', x.notes || '', x.createdAt || ''];
  }));

  writeRows_(TABLE_SHEETS.HO_SO, [
    'id', 'ma_ho_so', 'ten_ho_so', 'id_chi_phi', 'phan_loai', 'trang_thai', 'ngay_cap_nhat', 'phu_trach', 'ghi_chu'
  ], db.documents.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.expenseId || '', x.category || '', x.status || '', x.updatedAt || '', x.assignedTo || '', x.notes || ''];
  }));

  writeRows_(TABLE_SHEETS.VAT_TU, [
    'id', 'ma_vat_tu', 'ten_vat_tu', 'don_vi_tinh', 'ton_toi_thieu', 'mo_ta'
  ], db.materials.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.unit || '', num_(x.minStock), x.description || ''];
  }));

  writeRows_(TABLE_SHEETS.GIAO_DICH_VAT_TU, [
    'id', 'id_vat_tu', 'loai', 'ngay', 'so_luong', 'don_gia', 'thanh_tien', 'chung_tu', 'nguoi_thuc_hien', 'ghi_chu', 'ngay_tao'
  ], db.inventoryTransactions.map(function (x) {
    return [
      x.id || '', x.materialId || '', x.type || '', x.date || '', num_(x.quantity), num_(x.unitPrice), num_(x.totalPrice),
      x.reference || '', x.person || '', x.notes || '', x.createdAt || ''
    ];
  }));

  writeBossReport_(db);
}

function writeBossReport_(db) {
  const totalAdvance = db.expenses.reduce(function (s, x) { return s + num_(x.advanceAmount); }, 0);
  const totalActual = db.expenses.reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);
  const totalFund = db.funds.reduce(function (s, x) { return s + num_(x.amount); }, 0);
  const missingDocs = db.expenses.filter(function (x) { return x.documentStatus === 'Thiếu chứng từ'; }).length;
  const pendingClearance = db.expenses.filter(function (x) { return x.clearanceStatus !== 'Xong'; }).length;
  const fuelCost = db.expenses.filter(function (x) {
    return String(x.expenseType || '').toLowerCase().indexOf('dầu') >= 0;
  }).reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);
  const hcnsCost = db.expenses.filter(function (x) {
    const type = String(x.expenseType || '').toLowerCase();
    return type.indexOf('hành chính') >= 0 || type.indexOf('bếp') >= 0 || type.indexOf('công tác') >= 0 || type.indexOf('tiếp khách') >= 0;
  }).reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);

  writeRows_(TABLE_SHEETS.BAO_CAO_SEP, ['chi_tieu', 'gia_tri', 'ghi_chu'], [
    ['Tổng tạm ứng', totalAdvance, 'Từ CP.tam_ung'],
    ['Tổng thực chi', totalActual, 'Từ CP.thuc_chi'],
    ['Chênh lệch tạm ứng - thực chi', totalAdvance - totalActual, 'Dương là còn phải hoàn/âm là chi vượt'],
    ['Tổng tiền nhập quỹ', totalFund, 'Từ QUY.so_tien'],
    ['Chi phí dầu', fuelCost, 'Lọc loại chi phí có chữ dầu'],
    ['Chi phí HCNS/Hành chính', hcnsCost, 'Hành chính, bếp, công tác, tiếp khách'],
    ['Số dòng thiếu chứng từ', missingDocs, 'CP.trang_thai_chung_tu = Thiếu chứng từ'],
    ['Số dòng đang hoàn ứng', pendingClearance, 'CP.trang_thai_hoan_ung chưa Xong'],
    ['Cập nhật lúc', new Date(), 'Tự động từ Apps Script']
  ]);
}

function appendBackup_(reason, dbInput) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(BACKUP_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['timestamp', 'reason', 'records', 'json', 'note']]);
    styleHeader_(sheet, 5);
  }

  sheet.appendRow([new Date(), reason, countRecords_(db), JSON.stringify(db), 'Auto backup']);
  trimBackup_(sheet, 100);
}

function getLatestBackup_() {
  const sheet = getSheet_(BACKUP_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const row = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
  return {
    timestamp: row[0],
    reason: row[1],
    records: row[2],
    database: normalizeDb_(JSON.parse(row[3] || '{}')),
    note: row[4]
  };
}

function trimBackup_(sheet, keepRows) {
  const lastRow = sheet.getLastRow();
  const maxRows = keepRows + 1;
  if (lastRow > maxRows) {
    sheet.deleteRows(2, lastRow - maxRows);
  }
}

function writeRows_(sheetName, headers, rows) {
  const sheet = getSheet_(sheetName);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  styleHeader_(sheet, headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

function styleHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, width)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff');
}

function addLog_(action, dbInput, note) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(LOG_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['timestamp', 'action', 'records', 'user', 'note']]);
    styleHeader_(sheet, 5);
  }
  sheet.appendRow([new Date(), action, countRecords_(db), Session.getActiveUser().getEmail() || 'web-app', note || '']);
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function checkAccess_(e, body) {
  const queryToken = e && e.parameter ? e.parameter.token : '';
  const bodyToken = body && body.token ? body.token : '';
  const token = queryToken || bodyToken;
  if (SECRET_TOKEN && SECRET_TOKEN !== 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN' && token !== SECRET_TOKEN) {
    throw new Error('Sai token truy cập Apps Script backend.');
  }
}

function normalizeDb_(db) {
  return {
    expenses: Array.isArray(db.expenses) ? db.expenses : [],
    funds: Array.isArray(db.funds) ? db.funds : [],
    documents: Array.isArray(db.documents) ? db.documents : [],
    materials: Array.isArray(db.materials) ? db.materials : [],
    inventoryTransactions: Array.isArray(db.inventoryTransactions) ? db.inventoryTransactions : []
  };
}

function emptyDb_() {
  return { expenses: [], funds: [], documents: [], materials: [], inventoryTransactions: [] };
}

function hasAnyData_(db) {
  return countRecords_(db) > 0;
}

function countRecords_(db) {
  const safe = normalizeDb_(db || {});
  return safe.expenses.length + safe.funds.length + safe.documents.length + safe.materials.length + safe.inventoryTransactions.length;
}

function num_(value) {
  const n = Number(value || 0);
  return isNaN(n) ? 0 : n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
