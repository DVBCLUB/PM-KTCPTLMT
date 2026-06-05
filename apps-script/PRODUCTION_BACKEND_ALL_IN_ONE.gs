/**
 * PM-KTCPTLMT - PRODUCTION BACKEND ALL-IN-ONE
 * Frontend: GitHub Pages
 * Backend: Google Apps Script Web App
 * Database: Google Sheets Hybrid
 *
 * CÁCH DÙNG:
 * 1) Tạo file mới trong Apps Script: Production_Backend.gs
 * 2) Copy toàn bộ file này vào
 * 3) Đổi SECRET_TOKEN
 * 4) Chạy setupDatabase()
 * 5) Deploy Web App phiên bản mới
 */

const SECRET_TOKEN = 'DOI_TOKEN_NAY_THANH_TOKEN_KHO_DOAN';
const APP_NAME = 'PM-KTCPTLMT';
const APP_VERSION = '2026.06-production-hybrid-safe-v1';
const MAX_BACKUPS = 150;

const SHEET = {
  DATABASE: 'DATABASE_JSON',
  BACKUP: 'BACKUP_JSON',
  LOG: 'SYNC_LOG',
  CP: 'CP',
  QUY: 'QUY',
  HO_SO: 'HO_SO',
  VAT_TU: 'VAT_TU',
  GIAO_DICH_VAT_TU: 'GIAO_DICH_VAT_TU',
  BAO_CAO_SEP: 'BAO_CAO_SEP',
  SYSTEM: 'SYSTEM_INFO'
};

const CP_HEADERS = [
  'id', 'ngay_de_nghi', 'ngay_thuc_te', 'noi_dung', 'nhom_chi_phi', 'loai_chi_phi',
  'tam_ung', 'thuc_chi', 'chenh_lech_tam_ung_thuc_chi', 'han_muc', 'trang_thai_hoan_ung',
  'trang_thai_chung_tu', 'chung_tu_thieu', 'so_hoa_don', 'ghi_chu', 'nguoi_tao', 'ngay_tao', 'ma_ho_so'
];

const QUY_HEADERS = [
  'id', 'ngay', 'noi_dung', 'nhom_chi_phi', 'so_tien', 'nguon_tien', 'loai_quy', 'ghi_chu', 'ngay_tao'
];

const HO_SO_HEADERS = [
  'id', 'ma_ho_so', 'ten_ho_so', 'id_chi_phi', 'phan_loai', 'trang_thai', 'ngay_cap_nhat', 'phu_trach', 'ghi_chu'
];

const VAT_TU_HEADERS = [
  'id', 'ma_vat_tu', 'ten_vat_tu', 'don_vi_tinh', 'ton_toi_thieu', 'mo_ta'
];

const GIAO_DICH_VAT_TU_HEADERS = [
  'id', 'id_vat_tu', 'loai', 'ngay', 'so_luong', 'don_gia', 'thanh_tien', 'chung_tu', 'nguoi_thuc_hien', 'ghi_chu', 'ngay_tao'
];

function doGet(e) {
  try {
    checkAccess_(e, null);
    const action = getAction_(e, null);

    if (action === 'ping') return ok_({ message: 'Production backend đang hoạt động.', version: APP_VERSION });
    if (action === 'getDatabase') return ok_({ database: getDatabase_() });
    if (action === 'getLatestBackup') return ok_({ backup: getLatestBackup_() });
    if (action === 'getBackupList') return ok_({ backups: getBackupList_(20) });
    if (action === 'getSystemInfo') return ok_({ info: getSystemInfo_() });

    return fail_('Action GET không hợp lệ: ' + action);
  } catch (err) {
    return fail_(errorMessage_(err));
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    checkAccess_(e, body);
    const action = getAction_(e, body);

    if (action === 'saveDatabase') {
      const current = safeGetDatabase_();
      if (hasAnyData_(current)) appendBackup_('before_save', current);

      const next = normalizeDb_(body.payload || {});
      saveDatabase_(next);
      writeReadableSheets_(next);
      appendBackup_('after_save', next);
      writeSystemInfo_(next);
      addLog_('saveDatabase', next, 'Frontend saved database');
      return ok_({ database: next, message: 'Đã lưu dữ liệu an toàn.' });
    }

    if (action === 'resyncReadableSheets') {
      const db = getDatabase_();
      writeReadableSheets_(db);
      appendBackup_('manual_resync', db);
      writeSystemInfo_(db);
      addLog_('resyncReadableSheets', db, 'Manual resync readable sheets');
      return ok_({ database: db, message: 'Đã đồng bộ lại các sheet CP/QUY/HO_SO/VAT_TU.' });
    }

    if (action === 'restoreLatestBackup') {
      const backup = getLatestBackup_();
      if (!backup || !backup.database) throw new Error('Không có backup để khôi phục.');
      appendBackup_('before_restore_latest_backup', safeGetDatabase_());
      saveDatabase_(backup.database);
      writeReadableSheets_(backup.database);
      writeSystemInfo_(backup.database);
      addLog_('restoreLatestBackup', backup.database, 'Restored latest backup');
      return ok_({ database: backup.database, message: 'Đã khôi phục backup gần nhất.' });
    }

    if (action === 'rebuildDatabaseFromReadableSheets') {
      const rebuilt = rebuildDatabaseFromReadableSheets_();
      appendBackup_('before_rebuild_from_tables', safeGetDatabase_());
      saveDatabase_(rebuilt);
      writeReadableSheets_(rebuilt);
      appendBackup_('after_rebuild_from_tables', rebuilt);
      writeSystemInfo_(rebuilt);
      addLog_('rebuildDatabaseFromReadableSheets', rebuilt, 'Rebuilt JSON from CP/QUY/HO_SO/VAT_TU sheets');
      return ok_({ database: rebuilt, message: 'Đã dựng lại DATABASE_JSON từ các sheet bảng.' });
    }

    if (action === 'dangerHardReset') {
      if (String(body.confirm || '') !== 'TOI_HIEU_SE_XOA_DU_LIEU') {
        throw new Error('Thiếu xác nhận reset. Không thực hiện.');
      }
      appendBackup_('before_danger_hard_reset', safeGetDatabase_());
      const empty = emptyDb_();
      saveDatabase_(empty);
      writeReadableSheets_(empty);
      writeSystemInfo_(empty);
      addLog_('dangerHardReset', empty, 'Hard reset confirmed');
      return ok_({ database: empty, message: 'Đã reset dữ liệu sau khi xác nhận.' });
    }

    return fail_('Action POST không hợp lệ: ' + action);
  } catch (err) {
    return fail_(errorMessage_(err));
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

/**
 * SAFE SETUP - chạy bao nhiêu lần cũng không xóa dữ liệu cũ.
 */
function setupDatabase() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ensureCoreSheets_();
    const current = safeGetDatabase_();
    if (hasAnyData_(current)) {
      appendBackup_('setup_preserve_existing_data', current);
      saveDatabase_(current);
      writeReadableSheets_(current);
      writeSystemInfo_(current);
      addLog_('setupDatabase', current, 'Safe setup preserved existing data');
    } else {
      const empty = emptyDb_();
      saveDatabase_(empty);
      writeReadableSheets_(empty);
      writeSystemInfo_(empty);
      addLog_('setupDatabase', empty, 'Safe setup initialized empty database');
    }
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function resyncReadableSheets() {
  const db = getDatabase_();
  writeReadableSheets_(db);
  appendBackup_('manual_resync_function', db);
  writeSystemInfo_(db);
  addLog_('resyncReadableSheets', db, 'Manual function run');
}

function restoreLatestBackup() {
  const backup = getLatestBackup_();
  if (!backup || !backup.database) throw new Error('Không có backup để khôi phục.');
  appendBackup_('before_restore_function', safeGetDatabase_());
  saveDatabase_(backup.database);
  writeReadableSheets_(backup.database);
  writeSystemInfo_(backup.database);
  addLog_('restoreLatestBackup', backup.database, 'Manual function run');
}

function rebuildDatabaseFromReadableSheets() {
  const rebuilt = rebuildDatabaseFromReadableSheets_();
  appendBackup_('before_rebuild_function', safeGetDatabase_());
  saveDatabase_(rebuilt);
  writeReadableSheets_(rebuilt);
  appendBackup_('after_rebuild_function', rebuilt);
  writeSystemInfo_(rebuilt);
  addLog_('rebuildDatabaseFromReadableSheets', rebuilt, 'Manual function run');
}

function getDatabase_() {
  const sheet = getSheet_(SHEET.DATABASE);
  const raw = String(sheet.getRange('B2').getValue() || '').trim();
  if (!raw) return emptyDb_();
  return normalizeDb_(JSON.parse(raw));
}

function safeGetDatabase_() {
  try { return getDatabase_(); } catch (err) { return emptyDb_(); }
}

function saveDatabase_(dbInput) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(SHEET.DATABASE);
  sheet.getRange('A1').setValue('key');
  sheet.getRange('B1').setValue('json');
  sheet.getRange('A2').setValue('database');
  sheet.getRange('B2').setValue(JSON.stringify(db));
  sheet.setFrozenRows(1);
  styleHeader_(sheet, 2);
  sheet.autoResizeColumns(1, 2);
}

function writeReadableSheets_(dbInput) {
  const db = normalizeDb_(dbInput || {});

  writeRows_(SHEET.CP, CP_HEADERS, db.expenses.map(function (x) {
    const tamUng = num_(x.advanceAmount);
    const thucChi = num_(x.actualAmount);
    return [
      x.id || '', x.requestDate || '', x.actualDate || '', x.content || '', x.expenseGroup || '', x.expenseType || '',
      tamUng, thucChi, tamUng - thucChi, x.limitType || '', x.clearanceStatus || '', x.documentStatus || '',
      x.missingDocuments || '', x.invoiceNo || '', x.notes || '', x.createdByRole || '', x.createdAt || '', x.dossierCode || ''
    ];
  }));

  writeRows_(SHEET.QUY, QUY_HEADERS, db.funds.map(function (x) {
    return [x.id || '', x.date || '', x.content || '', x.expenseGroup || '', num_(x.amount), x.source || '', x.fundType || '', x.notes || '', x.createdAt || ''];
  }));

  writeRows_(SHEET.HO_SO, HO_SO_HEADERS, db.documents.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.expenseId || '', x.category || '', x.status || '', x.updatedAt || '', x.assignedTo || '', x.notes || ''];
  }));

  writeRows_(SHEET.VAT_TU, VAT_TU_HEADERS, db.materials.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.unit || '', num_(x.minStock), x.description || ''];
  }));

  writeRows_(SHEET.GIAO_DICH_VAT_TU, GIAO_DICH_VAT_TU_HEADERS, db.inventoryTransactions.map(function (x) {
    return [x.id || '', x.materialId || '', x.type || '', x.date || '', num_(x.quantity), num_(x.unitPrice), num_(x.totalPrice), x.reference || '', x.person || '', x.notes || '', x.createdAt || ''];
  }));

  writeBossReport_(db);
}

function writeBossReport_(db) {
  const totalAdvance = db.expenses.reduce(function (s, x) { return s + num_(x.advanceAmount); }, 0);
  const totalActual = db.expenses.reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);
  const totalFund = db.funds.reduce(function (s, x) { return s + num_(x.amount); }, 0);
  const missingDocs = db.expenses.filter(function (x) { return x.documentStatus === 'Thiếu chứng từ'; }).length;
  const pendingClearance = db.expenses.filter(function (x) { return x.clearanceStatus !== 'Xong'; }).length;
  const fuelCost = db.expenses.filter(function (x) { return contains_(x.expenseType, 'dầu'); }).reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);
  const hcnsCost = db.expenses.filter(function (x) {
    return contains_(x.expenseType, 'hành chính') || contains_(x.expenseType, 'bếp') || contains_(x.expenseType, 'công tác') || contains_(x.expenseType, 'tiếp khách');
  }).reduce(function (s, x) { return s + num_(x.actualAmount); }, 0);

  writeRows_(SHEET.BAO_CAO_SEP, ['chi_tieu', 'gia_tri', 'ghi_chu'], [
    ['Tổng tạm ứng', totalAdvance, 'Từ CP.tam_ung'],
    ['Tổng thực chi', totalActual, 'Từ CP.thuc_chi'],
    ['Chênh lệch tạm ứng - thực chi', totalAdvance - totalActual, 'Dương là còn phải hoàn/âm là chi vượt'],
    ['Tổng tiền nhập quỹ', totalFund, 'Từ QUY.so_tien'],
    ['Chi phí dầu', fuelCost, 'Lọc loại chi phí có chữ dầu'],
    ['Chi phí HCNS/Hành chính', hcnsCost, 'Hành chính, bếp, công tác, tiếp khách'],
    ['Số dòng thiếu chứng từ', missingDocs, 'CP.trang_thai_chung_tu = Thiếu chứng từ'],
    ['Số dòng đang hoàn ứng', pendingClearance, 'CP.trang_thai_hoan_ung chưa Xong'],
    ['Tổng số dòng CP', db.expenses.length, 'Số bản ghi chi phí'],
    ['Tổng số dòng QUY', db.funds.length, 'Số bản ghi quỹ'],
    ['Cập nhật lúc', new Date(), 'Tự động từ Apps Script']
  ]);
}

function rebuildDatabaseFromReadableSheets_() {
  return normalizeDb_({
    expenses: readObjects_(SHEET.CP).map(function (r) {
      return {
        id: r.id || makeId_('exp'),
        requestDate: r.ngay_de_nghi || '',
        actualDate: r.ngay_thuc_te || '',
        content: r.noi_dung || '',
        expenseGroup: r.nhom_chi_phi || '',
        expenseType: r.loai_chi_phi || '',
        advanceAmount: num_(r.tam_ung),
        actualAmount: num_(r.thuc_chi),
        limitType: r.han_muc || '',
        clearanceStatus: r.trang_thai_hoan_ung || 'Đang hoàn ứng',
        documentStatus: r.trang_thai_chung_tu || 'Thiếu chứng từ',
        missingDocuments: r.chung_tu_thieu || '',
        invoiceNo: r.so_hoa_don || '',
        notes: r.ghi_chu || '',
        createdByRole: r.nguoi_tao || '',
        createdAt: r.ngay_tao || new Date().toISOString(),
        dossierCode: r.ma_ho_so || ''
      };
    }),
    funds: readObjects_(SHEET.QUY).map(function (r) {
      return {
        id: r.id || makeId_('fund'),
        date: r.ngay || '',
        content: r.noi_dung || '',
        expenseGroup: r.nhom_chi_phi || '',
        amount: num_(r.so_tien),
        source: r.nguon_tien || 'Khác',
        fundType: r.loai_quy || 'HCNS',
        notes: r.ghi_chu || '',
        createdAt: r.ngay_tao || new Date().toISOString()
      };
    }),
    documents: readObjects_(SHEET.HO_SO).map(function (r) {
      return {
        id: r.id || makeId_('doc'),
        code: r.ma_ho_so || '',
        name: r.ten_ho_so || '',
        expenseId: r.id_chi_phi || '',
        category: r.phan_loai || 'Khác',
        status: r.trang_thai || 'Soạn thảo',
        updatedAt: r.ngay_cap_nhat || '',
        assignedTo: r.phu_trach || '',
        notes: r.ghi_chu || ''
      };
    }),
    materials: readObjects_(SHEET.VAT_TU).map(function (r) {
      return {
        id: r.id || makeId_('mat'),
        code: r.ma_vat_tu || '',
        name: r.ten_vat_tu || '',
        unit: r.don_vi_tinh || '',
        minStock: num_(r.ton_toi_thieu),
        description: r.mo_ta || ''
      };
    }),
    inventoryTransactions: readObjects_(SHEET.GIAO_DICH_VAT_TU).map(function (r) {
      return {
        id: r.id || makeId_('tx'),
        materialId: r.id_vat_tu || '',
        type: r.loai || 'NHẬP',
        date: r.ngay || '',
        quantity: num_(r.so_luong),
        unitPrice: num_(r.don_gia),
        totalPrice: num_(r.thanh_tien),
        reference: r.chung_tu || '',
        person: r.nguoi_thuc_hien || '',
        notes: r.ghi_chu || '',
        createdAt: r.ngay_tao || new Date().toISOString()
      };
    })
  });
}

function ensureCoreSheets_() {
  getSheet_(SHEET.DATABASE);
  ensureHeader_(SHEET.BACKUP, ['timestamp', 'reason', 'records', 'json', 'note']);
  ensureHeader_(SHEET.LOG, ['timestamp', 'action', 'records', 'user', 'note']);
  ensureHeader_(SHEET.SYSTEM, ['key', 'value']);
}

function appendBackup_(reason, dbInput) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(SHEET.BACKUP);
  ensureHeader_(SHEET.BACKUP, ['timestamp', 'reason', 'records', 'json', 'note']);
  sheet.appendRow([new Date(), reason, countRecords_(db), JSON.stringify(db), 'Auto backup']);
  trimBackup_(sheet, MAX_BACKUPS);
}

function getLatestBackup_() {
  const sheet = getSheet_(SHEET.BACKUP);
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

function getBackupList_(limit) {
  const sheet = getSheet_(SHEET.BACKUP);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const start = Math.max(2, lastRow - limit + 1);
  const values = sheet.getRange(start, 1, lastRow - start + 1, 5).getValues();
  return values.map(function (r) {
    return { timestamp: r[0], reason: r[1], records: r[2], note: r[4] };
  }).reverse();
}

function trimBackup_(sheet, keepRows) {
  const lastRow = sheet.getLastRow();
  const maxRows = keepRows + 1;
  if (lastRow > maxRows) sheet.deleteRows(2, lastRow - maxRows);
}

function addLog_(action, dbInput, note) {
  const db = normalizeDb_(dbInput || {});
  const sheet = getSheet_(SHEET.LOG);
  ensureHeader_(SHEET.LOG, ['timestamp', 'action', 'records', 'user', 'note']);
  sheet.appendRow([new Date(), action, countRecords_(db), getUser_(), note || '']);
}

function writeSystemInfo_(dbInput) {
  const db = normalizeDb_(dbInput || {});
  writeRows_(SHEET.SYSTEM, ['key', 'value'], [
    ['app_name', APP_NAME],
    ['app_version', APP_VERSION],
    ['updated_at', new Date()],
    ['records_total', countRecords_(db)],
    ['expenses', db.expenses.length],
    ['funds', db.funds.length],
    ['documents', db.documents.length],
    ['materials', db.materials.length],
    ['inventory_transactions', db.inventoryTransactions.length]
  ]);
}

function getSystemInfo_() {
  return {
    appName: APP_NAME,
    version: APP_VERSION,
    recordCount: countRecords_(safeGetDatabase_()),
    user: getUser_(),
    time: new Date()
  };
}

function readObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function (x) { return String(x || '').trim(); });
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== '' && cell !== null; });
  }).map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function writeRows_(sheetName, headers, rows) {
  const sheet = getSheet_(sheetName);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows && rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  styleHeader_(sheet, headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

function ensureHeader_(sheetName, headers) {
  const sheet = getSheet_(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sheet, headers.length);
  }
}

function styleHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, width)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff');
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
  if (SECRET_TOKEN && SECRET_TOKEN !== 'DOI_TOKEN_NAY_THANH_TOKEN_KHO_DOAN' && token !== SECRET_TOKEN) {
    throw new Error('Sai token truy cập Apps Script backend.');
  }
}

function getAction_(e, body) {
  return String((body && body.action) || (e && e.parameter && e.parameter.action) || '').trim();
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

function contains_(value, keyword) {
  return String(value || '').toLowerCase().indexOf(String(keyword || '').toLowerCase()) >= 0;
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8);
}

function getUser_() {
  try { return Session.getActiveUser().getEmail() || 'web-app'; } catch (err) { return 'web-app'; }
}

function ok_(payload) {
  const data = payload || {};
  data.ok = true;
  return json_(data);
}

function fail_(message) {
  return json_({ ok: false, message: message });
}

function errorMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
