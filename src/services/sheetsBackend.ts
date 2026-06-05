import { AppDatabase } from '../types';

const CACHE_KEY = 'trung_hai_db_cache';
const API_URL_KEY = 'qd_apps_script_api_url';
const API_TOKEN_KEY = 'qd_apps_script_api_token';

export type BackendStatus = 'not_configured' | 'connected' | 'offline_cache' | 'seed_fallback';

export interface BackendResult {
  database: AppDatabase;
  status: BackendStatus;
  message: string;
}

export function getBackendConfig() {
  return {
    apiUrl: localStorage.getItem(API_URL_KEY) || '',
    token: localStorage.getItem(API_TOKEN_KEY) || '',
  };
}

export function saveBackendConfig(apiUrl: string, token: string) {
  localStorage.setItem(API_URL_KEY, apiUrl.trim());
  localStorage.setItem(API_TOKEN_KEY, token.trim());
}

export function isBackendConfigured() {
  return Boolean(getBackendConfig().apiUrl.trim());
}

async function callBackend<T>(action: string, payload?: unknown): Promise<T> {
  const { apiUrl, token } = getBackendConfig();

  if (!apiUrl.trim()) {
    throw new Error('Chưa cấu hình Apps Script API URL.');
  }

  if (!token.trim()) {
    throw new Error('Chưa nhập token Apps Script.');
  }

  // Luôn dùng POST để token không lộ trên URL / browser history.
  // Content-Type text/plain giúp tránh CORS preflight với Apps Script Web App.
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
    const database = await callBackend<AppDatabase>('getDatabase');
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
  await callBackend<AppDatabase>('saveDatabase', database);
  return { synced: true, message: 'Đã đồng bộ dữ liệu lên Google Sheets.' };
}

export async function createManualBackendBackup(reason = 'manual_frontend_backup') {
  await callBackend('createManualBackup', { reason });
}

export async function validateBackendDatabase() {
  return await callBackend('validateDatabase');
}
