const SECRET_TOKEN = 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN';
const DATABASE_SHEET = 'DATABASE_JSON';
const LOG_SHEET = 'SYNC_LOG';

function doGet(e) {
  try {
    guard_(e);
    const action = (e.parameter.action || '').trim();

    if (action === 'getDatabase') {
      return json_({ ok: true, database: getDatabase_() });
    }

    if (action === 'ping') {
      return json_({ ok: true, message: 'Apps Script backend đang hoạt động.' });
    }

    return json_({ ok: false, message: 'Action GET không hợp lệ: ' + action });
  } catch (err) {
    return json_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    guard_(e, body);
    const action = (body.action || e.parameter.action || '').trim();

    if (action === 'saveDatabase') {
      saveDatabase_(body.payload);
      log_('saveDatabase', body.payload);
      return json_({ ok: true, database: body.payload, message: 'Đã lưu dữ liệu vào Google Sheets.' });
    }

    return json_({ ok: false, message: 'Action POST không hợp lệ: ' + action });
  } catch (err) {
    return json_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActive();
  let dbSheet = ss.getSheetByName(DATABASE_SHEET);
  if (!dbSheet) dbSheet = ss.insertSheet(DATABASE_SHEET);

  dbSheet.clear();
  dbSheet.getRange('A1').setValue('key');
  dbSheet.getRange('B1').setValue('json');
  dbSheet.getRange('A2').setValue('database');
  dbSheet.getRange('B2').setValue(JSON.stringify(emptyDatabase_(), null, 2));
  dbSheet.setFrozenRows(1);
  dbSheet.autoResizeColumns(1, 2);

  let logSheet = ss.getSheetByName(LOG_SHEET);
  if (!logSheet) logSheet = ss.insertSheet(LOG_SHEET);
  logSheet.clear();
  logSheet.getRange(1, 1, 1, 4).setValues([['timestamp', 'action', 'records', 'note']]);
  logSheet.setFrozenRows(1);
  logSheet.autoResizeColumns(1, 4);
}

function getDatabase_() {
  const sheet = getOrCreateDbSheet_();
  const raw = sheet.getRange('B2').getValue();
  if (!raw) return emptyDatabase_();

  const parsed = JSON.parse(raw);
  return normalizeDatabase_(parsed);
}

function saveDatabase_(database) {
  const normalized = normalizeDatabase_(database || {});
  const sheet = getOrCreateDbSheet_();
  sheet.getRange('A1').setValue('key');
  sheet.getRange('B1').setValue('json');
  sheet.getRange('A2').setValue('database');
  sheet.getRange('B2').setValue(JSON.stringify(normalized));
}

function getOrCreateDbSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(DATABASE_SHEET);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(DATABASE_SHEET);
  }
  return sheet;
}

function log_(action, database) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) sheet = ss.insertSheet(LOG_SHEET);
  const db = normalizeDatabase_(database || {});
  const totalRecords = db.expenses.length + db.funds.length + db.documents.length + db.materials.length + db.inventoryTransactions.length;
  sheet.appendRow([new Date(), action, totalRecords, 'Frontend GitHub Pages sync']);
}

function guard_(e, body) {
  const queryToken = e && e.parameter ? e.parameter.token : '';
  const bodyToken = body && body.token ? body.token : '';
  const token = queryToken || bodyToken;

  if (SECRET_TOKEN && SECRET_TOKEN !== 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN' && token !== SECRET_TOKEN) {
    throw new Error('Sai token truy cập Apps Script backend.');
  }
}

function normalizeDatabase_(db) {
  return {
    expenses: Array.isArray(db.expenses) ? db.expenses : [],
    funds: Array.isArray(db.funds) ? db.funds : [],
    documents: Array.isArray(db.documents) ? db.documents : [],
    materials: Array.isArray(db.materials) ? db.materials : [],
    inventoryTransactions: Array.isArray(db.inventoryTransactions) ? db.inventoryTransactions : [],
  };
}

function emptyDatabase_() {
  return {
    expenses: [],
    funds: [],
    documents: [],
    materials: [],
    inventoryTransactions: [],
  };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
