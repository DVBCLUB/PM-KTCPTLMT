import { AppDatabase } from '../types';

const CACHE_KEY = 'trung_hai_db_cache';
const API_URL_KEY = 'qd_apps_script_api_url';
const API_TOKEN_KEY = 'qd_apps_script_api_token';
const API_REVISION_KEY = 'qd_apps_script_revision';

export type BackendStatus = 'not_configured' | 'connected' | 'offline_cache' | 'seed_fallback';

export interface BackendResult {
  database: AppDatabase;
  status: BackendStatus;
  message: string;
}

interface BackendEnvelope<T = unknown> {
  ok?: boolean;
  message?: string;
  database?: AppDatabase;
  system?: {
    revision?: number;
    [key: string]: unknown;
  };
  data?: T;
  [key: string]: unknown;
}

export function getBackendConfig() {
  return {
    apiUrl: localStorage.getItem(API_URL_KEY) || '',
    token: localStorage.getItem(API_TOKEN_KEY) || '',
    revision: localStorage.getItem(API_REVISION_KEY) || '',
  };
}

export function saveBackendConfig(apiUrl: string, token: string) {
  localStorage.setItem(API_URL_KEY, apiUrl.trim());
  localStorage.setItem(API_TOKEN_KEY, token.trim());
}

function saveBackendRevision(revision?: number | string) {
  if (revision !== undefined && revision !== null && String(revision) !== '') {
    localStorage.setItem(API_REVISION_KEY, String(revision));
  }
}

export function isBackendConfigured() {
  return Boolean(getBackendConfig().apiUrl.trim());
}

async function callBackendRaw<T = unknown>(action: string, payload?: unknown): Promise<BackendEnvelope<T>> {
  const { apiUrl, token } = getBackendConfig();

  if (!apiUrl.trim()) {
    throw new Error('Chưa cấu hình Apps Script API URL.');
  }

  if (!token.trim()) {
    throw new Error('Chưa nhập token Apps Script.');
  }

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      token,
      payload: payload ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apps Script API lỗi HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data?.ok === false) {
    throw new Error(data.message || 'Apps Script API trả về lỗi.');
  }

  if (data?.system?.revision !== undefined) {
    saveBackendRevision(data.system.revision);
  }

  return data as BackendEnvelope<T>;
}

async function callBackend<T = unknown>(action: string, payload?: unknown): Promise<T> {
  const data = await callBackendRaw<T>(action, payload);
  return (data.database ?? data.data ?? data) as T;
}

export function readCache(): AppDatabase | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as AppDatabase;
  } catch {
    return null;
  }
}

export function writeCache(database: AppDatabase) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(database));
}

export async function loadDatabaseFromSheets(seedData: AppDatabase): Promise<BackendResult> {
  if (!isBackendConfigured()) {
    const cached = readCache();
    return {
      database: cached || seedData,
      status: cached ? 'offline_cache' : 'not_configured',
      message: cached
        ? 'Chưa cấu hình Apps Script, đang dùng dữ liệu cache trên trình duyệt.'
        : 'Chưa cấu hình Apps Script, đang dùng dữ liệu mẫu để kiểm thử giao diện.',
    };
  }

  try {
    const data = await callBackendRaw('getDatabase');
    const database = (data.database || seedData) as AppDatabase;
    writeCache(database);
    return {
      database,
      status: 'connected',
      message: 'Đã tải dữ liệu từ Google Sheets qua Apps Script.',
    };
  } catch (error: any) {
    const cached = readCache();
    return {
      database: cached || seedData,
      status: cached ? 'offline_cache' : 'seed_fallback',
      message: cached
        ? `Không kết nối được Apps Script, đang dùng cache. Chi tiết: ${error.message}`
        : `Không kết nối được Apps Script, đang dùng dữ liệu mẫu. Chi tiết: ${error.message}`,
    };
  }
}

export async function saveDatabaseToSheets(database: AppDatabase) {
  writeCache(database);
  if (!isBackendConfigured()) return { synced: false, message: 'Chưa cấu hình Apps Script API URL.' };

  const { revision } = getBackendConfig();
  const data = await callBackendRaw('saveDatabase', {
    database,
    clientRevision: revision || undefined,
  });

  if (data.database) writeCache(data.database as AppDatabase);
  return { synced: true, message: 'Đã đồng bộ dữ liệu lên Google Sheets.' };
}

export async function createManualBackendBackup(reason = 'manual_frontend_backup') {
  await callBackend('createManualBackup', { reason });
}

export async function validateBackendDatabase() {
  return await callBackend('validateDatabase');
}
