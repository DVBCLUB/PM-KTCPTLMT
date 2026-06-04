const SECRET_TOKEN = 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN';
const DATABASE_SHEET = 'DATABASE_JSON';
const LOG_SHEET = 'SYNC_LOG';

function doGet(e) {
  try {
    checkAccess_(e, null);
    const action = String(e.parameter.action || '').trim();
    if (action === 'ping') return out_({ ok: true, message: 'Apps Script backend đang hoạt động.' });
    if (action === 'getDatabase') return out_({ ok: true, database: getDatabase_() });
    return out_({ ok: false, message: 'Action GET không hợp lệ: ' + action });
  } catch (err) {
    return out_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    checkAccess_(e, body);
    const action = String(body.action || e.parameter.action || '').trim();
    if (action === 'saveDatabase') {
      const db = saveDatabase_(body.payload || {});
      writeReadableSheets_(db);
      addLog_('saveDatabase', db);
      return out_({ ok: true, database: db, message: 'Đã lưu database và tách sheet kế toán.' });
    }
    return out_({ ok: false, message: 'Action POST không hợp lệ: ' + action });
  } catch (err) {
    return out_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function setupDatabase() {
  saveDatabase_(emptyDb_());
  writeReadableSheets_(emptyDb_());
  const log = getSheet_(LOG_SHEET);
  log.clear();
  writeRows_(log, ['timestamp', 'action', 'records', 'note'], []);
}

function resyncReadableSheets() {
  const db = getDatabase_();
  writeReadableSheets_(db);
  addLog_('resyncReadableSheets', db);
}

function getDatabase_() {
  const sheet = getSheet_(DATABASE_SHEET);
  const raw = sheet.getRange('B2').getValue();
  if (!raw) return emptyDb_();
  return normalizeDb_(JSON.parse(raw));
}

function saveDatabase_(payload) {
  const db = normalizeDb_(payload || {});
  const sheet = getSheet_(DATABASE_SHEET);
  sheet.clear();
  sheet.getRange('A1').setValue('key');
  sheet.getRange('B1').setValue('json');
  sheet.getRange('A2').setValue('database');
  sheet.getRange('B2').setValue(JSON.stringify(db));
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
  return db;
}

function writeReadableSheets_(db) {
  writeRows_(getSheet_('CP'), [
    'id', 'ngay_de_nghi', 'ngay_thuc_te', 'noi_dung', 'nhom_chi_phi', 'loai_chi_phi',
    'tam_ung', 'thuc_chi', 'han_muc', 'trang_thai_hoan_ung', 'trang_thai_chung_tu',
    'chung_tu_thieu', 'so_hoa_don', 'ghi_chu', 'nguoi_tao', 'ngay_tao', 'ma_ho_so'
  ], db.expenses.map(function (x) {
    return [x.id || '', x.requestDate || '', x.actualDate || '', x.content || '', x.expenseGroup || '', x.expenseType || '',
      number_(x.advanceAmount), number_(x.actualAmount), x.limitType || '', x.clearanceStatus || '', x.documentStatus || '',
      x.missingDocuments || '', x.invoiceNo || '', x.notes || '', x.createdByRole || '', x.createdAt || '', x.dossierCode || ''];
  }));

  writeRows_(getSheet_('QUY'), [
    'id', 'ngay', 'noi_dung', 'nhom_chi_phi', 'so_tien', 'nguon_tien', 'loai_quy', 'ghi_chu', 'ngay_tao'
  ], db.funds.map(function (x) {
    return [x.id || '', x.date || '', x.content || '', x.expenseGroup || '', number_(x.amount), x.source || '', x.fundType || '', x.notes || '', x.createdAt || ''];
  }));

  writeRows_(getSheet_('HO_SO'), [
    'id', 'ma_ho_so', 'ten_ho_so', 'id_chi_phi', 'phan_loai', 'trang_thai', 'ngay_cap_nhat', 'phu_trach', 'ghi_chu'
  ], db.documents.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.expenseId || '', x.category || '', x.status || '', x.updatedAt || '', x.assignedTo || '', x.notes || ''];
  }));

  writeRows_(getSheet_('VAT_TU'), [
    'id', 'ma_vat_tu', 'ten_vat_tu', 'don_vi_tinh', 'ton_toi_thieu', 'mo_ta'
  ], db.materials.map(function (x) {
    return [x.id || '', x.code || '', x.name || '', x.unit || '', number_(x.minStock), x.description || ''];
  }));

  writeRows_(getSheet_('GIAO_DICH_VAT_TU'), [
    'id', 'id_vat_tu', 'loai', 'ngay', 'so_luong', 'don_gia', 'thanh_tien', 'chung_tu', 'nguoi_thuc_hien', 'ghi_chu', 'ngay_tao'
  ], db.inventoryTransactions.map(function (x) {
    return [x.id || '', x.materialId || '', x.type || '', x.date || '', number_(x.quantity), number_(x.unitPrice), number_(x.totalPrice),
      x.reference || '', x.person || '', x.notes || '', x.createdAt || ''];
  }));

  writeBossReport_(db);
}

function writeBossReport_(db) {
  const totalAdvance = db.expenses.reduce(function (s, x) { return s + number_(x.advanceAmount); }, 0);
  const totalActual = db.expenses.reduce(function (s, x) { return s + number_(x.actualAmount); }, 0);
  const totalFund = db.funds.reduce(function (s, x) { return s + number_(x.amount); }, 0);
  const missingDocs = db.expenses.filter(function (x) { return x.documentStatus === 'Thiếu chứng từ'; }).length;
  const pendingClearance = db.expenses.filter(function (x) { return x.clearanceStatus !== 'Xong'; }).length;
  const fuelCost = db.expenses.filter(function (x) { return String(x.expenseType || '').toLowerCase().indexOf('dầu') >= 0; })
    .reduce(function (s, x) { return s + number_(x.actualAmount); }, 0);

  writeRows_(getSheet_('BAO_CAO_SEP'), ['chi_tieu', 'gia_tri', 'ghi_chu'], [
    ['Tổng tạm ứng', totalAdvance, 'Từ sheet CP'],
    ['Tổng thực chi', totalActual, 'Từ sheet CP'],
    ['Tổng nhập quỹ', totalFund, 'Từ sheet QUY'],
    ['Chi phí dầu', fuelCost, 'Lọc loại chi phí có chữ dầu'],
    ['Số dòng thiếu chứng từ', missingDocs, 'CP.trang_thai_chung_tu'],
    ['Số dòng đang hoàn ứng', pendingClearance, 'CP.trang_thai_hoan_ung'],
    ['Cập nhật lúc', new Date(), 'Tự động']
  ]);
}

function writeRows_(sheet, headers, rows) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, headers.length);
}

function addLog_(action, db) {
  const sheet = getSheet_(LOG_SHEET);
  if (sheet.getLastRow() === 0) writeRows_(sheet, ['timestamp', 'action', 'records', 'note'], []);
  const count = db.expenses.length + db.funds.length + db.documents.length + db.materials.length + db.inventoryTransactions.length;
  sheet.appendRow([new Date(), action, count, 'Frontend GitHub Pages sync']);
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

function number_(value) {
  const n = Number(value || 0);
  return isNaN(n) ? 0 : n;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
