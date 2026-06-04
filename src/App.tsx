/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, AppDatabase, Expense, FundReceipt, DocumentProgress, MaterialTransaction } from './types';
import RoleHeader from './components/RoleHeader';
import ExpenseTracker from './components/ExpenseTracker';
import FundLedger from './components/FundLedger';
import DocumentManager from './components/DocumentManager';
import InventoryManager from './components/InventoryManager';
import ReportDashboard from './components/ReportDashboard';
import { Landmark, Fuel, ClipboardCheck, Boxes, Award, TrendingUp, AlertOctagon, HelpCircle, Settings2 } from 'lucide-react';
import SettingsPanel, { AppSettings, Employee } from './components/SettingsPanel';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.ACCOUNTANT);
  const [baselineDate, setBaselineDate] = useState<string>('2026-06-01'); // Baselined at 2026-06-01 to match PDF timing!
  const [activeTab, setActiveTab] = useState<string>('chi-phi');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorString, setErrorString] = useState<string | null>(null);

  // App dynamic settings & employee directory states
  const [systemSettings, setSystemSettings] = useState<AppSettings | null>(() => {
    const cached = localStorage.getItem('qd_app_settings');
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Real-time synchronization state
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'success'} | null>(null);

  // Google Drive Integration States
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('qd_google_client_id') || '';
  });
  const [gDriveAccessToken, setGDriveAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('qd_gdrive_access_token') || null;
  });
  const [gDriveFileId, setGDriveFileId] = useState<string | null>(() => {
    return localStorage.getItem('qd_gdrive_file_id') || null;
  });
  const [isGDriveSyncEnabled, setIsGDriveSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('qd_gdrive_sync_enabled') === 'true';
  });
  const [gDriveSyncStatus, setGDriveSyncStatus] = useState<'disabled' | 'syncing' | 'idle' | 'error' | 'connected'>('disabled');

  // Load Google Client SDK on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleConnectGDrive = () => {
    if (typeof (window as any).google === 'undefined') {
      alert('Đang tải thư viện Google, vui lòng thử lại sau vài giây!');
      return;
    }
    const clientIdToUse = googleClientId.trim() || '71ed2be0-8d5a-4263-9914-264d8ffe276b';
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientIdToUse,
        scope: 'https://www.googleapis.com/auth/drive.file openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (response: any) => {
          if (response.error) {
            console.error('Lỗi OAuth:', response);
            setGDriveSyncStatus('error');
            alert('Lỗi OAuth từ Google: ' + (response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            setGDriveAccessToken(response.access_token);
            localStorage.setItem('qd_gdrive_access_token', response.access_token);
            setIsGDriveSyncEnabled(true);
            localStorage.setItem('qd_gdrive_sync_enabled', 'true');
            setGDriveSyncStatus('idle');
            setNotification({
              message: 'Đã kết nối tài khoản Google Drive thành công!',
              type: 'success'
            });
            initGDriveFile(response.access_token);
          }
        },
      });
      client.requestAccessToken();
    } catch (err: any) {
      alert('Lỗi cấu hình Google OAuth Client ID của bạn: ' + err.message);
    }
  };

  const handleDisconnectGDrive = () => {
    setGDriveAccessToken(null);
    setGDriveFileId(null);
    setIsGDriveSyncEnabled(false);
    localStorage.removeItem('qd_gdrive_access_token');
    localStorage.removeItem('qd_gdrive_file_id');
    localStorage.setItem('qd_gdrive_sync_enabled', 'false');
    setGDriveSyncStatus('disabled');
    setNotification({
      message: 'Đã ngắt kết nối Google Drive.',
      type: 'info'
    });
  };

  const handleToggleGDriveSync = (enabled: boolean) => {
    setIsGDriveSyncEnabled(enabled);
    localStorage.setItem('qd_gdrive_sync_enabled', enabled ? 'true' : 'false');
    if (!enabled) {
      setGDriveSyncStatus('disabled');
    } else if (gDriveAccessToken) {
      setGDriveSyncStatus('idle');
    }
  };

  const initGDriveFile = async (token: string) => {
    try {
      setGDriveSyncStatus('syncing');
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='construction_tracker_database.json'+and+trashed=false&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const files = data.files || [];
      
      if (files.length > 0) {
        const fileId = files[0].id;
        setGDriveFileId(fileId);
        localStorage.setItem('qd_gdrive_file_id', fileId);
        
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (contentRes.ok) {
          const driveData = await contentRes.json();
          setDb(driveData);
          localStorage.setItem('trung_hai_db_cache', JSON.stringify(driveData));
          setGDriveSyncStatus('idle');
          setNotification({
            message: 'Đã tải và đồng bộ dữ liệu từ Google Drive thành công!',
            type: 'success'
          });
        }
      } else {
        // Create new
        const metadataRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'construction_tracker_database.json',
            mimeType: 'application/json'
          })
        });
        const metadata = await metadataRes.json();
        const newFileId = metadata.id;
        setGDriveFileId(newFileId);
        localStorage.setItem('qd_gdrive_file_id', newFileId);
        
        await pushToGDriveDirect(token, newFileId, db);
        setGDriveSyncStatus('idle');
        setNotification({
          message: 'Đã khởi tạo file construction_tracker_database.json trên GDrive của bạn!',
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      setGDriveSyncStatus('error');
    }
  };

  const pushToGDriveDirect = async (token: string, fileId: string, content: AppDatabase) => {
    try {
      setGDriveSyncStatus('syncing');
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(content)
      });
      if (!res.ok) throw new Error();
      setGDriveSyncStatus('idle');
    } catch (err) {
      console.error(err);
      setGDriveSyncStatus('error');
    }
  };

  const onSyncPushGDrive = async () => {
    if (!gDriveAccessToken || !gDriveFileId) return;
    setNotification({ message: 'Đang đẩy dữ liệu lên Google Drive...', type: 'info' });
    await pushToGDriveDirect(gDriveAccessToken, gDriveFileId, db);
    setNotification({ message: 'Đăng tải lên Google Drive thành công!', type: 'success' });
  };

  const onSyncPullGDrive = async () => {
    if (!gDriveAccessToken || !gDriveFileId) return;
    setNotification({ message: 'Đang tải dữ liệu từ Google Drive...', type: 'info' });
    try {
      setGDriveSyncStatus('syncing');
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${gDriveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${gDriveAccessToken}` }
      });
      if (!res.ok) throw new Error();
      const driveData = await res.json();
      setDb(driveData);
      localStorage.setItem('trung_hai_db_cache', JSON.stringify(driveData));
      setGDriveSyncStatus('idle');
      setNotification({ message: 'Cập nhật từ Google Drive hoàn tất!', type: 'success' });
    } catch (err) {
      setGDriveSyncStatus('error');
      setNotification({ message: 'Lỗi đồng bộ dữ liệu tải về.', type: 'info' });
    }
  };

  const onChangeGoogleClientId = (id: string) => {
    setGoogleClientId(id);
    localStorage.setItem('qd_google_client_id', id);
  };

  // Core Data State
  const [db, setDb] = useState<AppDatabase>({
    expenses: [],
    funds: [],
    documents: [],
    materials: [],
    inventoryTransactions: []
  });

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ACCOUNTANT:
        return 'Kế toán David Bảo';
      case UserRole.STOREKEEPER:
        return 'Thủ kho Đào Phú';
      case UserRole.HCNS:
        return 'HCNS Cô Lan';
      case UserRole.BOSS:
        return 'Sếp Thạch (Sếp)';
      default:
        return 'Người dùng';
    }
  };

  // Load everything on boot with local storage cache fallback
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Không thể tải cơ sở dữ liệu từ máy chủ API.');
      const data = await res.json();
      setDb(data);
      setErrorString(null);
      
      // Save backup in local storage
      localStorage.setItem('trung_hai_db_cache', JSON.stringify(data));
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu:', err);
      // Try resolving from cache backup
      const cached = localStorage.getItem('trung_hai_db_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setDb(parsed);
          setErrorString(null);
          setNotification({
            message: 'Đang xem dữ liệu dự phòng (offline cache) do kết nối mạng chập chờn!',
            type: 'info'
          });
        } catch (jsonErr) {
          setErrorString(err.message || 'Lỗi kết nối máy chủ');
        }
      } else {
        setErrorString(err.message || 'Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }
      setSyncStatus('connecting');

      const roleName = getRoleLabel(currentRole);
      eventSource = new EventSource(`/api/sync-events?role=${encodeURIComponent(roleName)}&t=${Date.now()}`);

      eventSource.onopen = () => {
        setSyncStatus('connected');
      };

      eventSource.onerror = () => {
        setSyncStatus('disconnected');
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            setActiveUsers(data.roles);
          } else if (data.type === 'update') {
            // Background silent reload of database
            fetch('/api/data')
              .then(res => {
                if (res.ok) return res.json();
                throw new Error();
              })
              .then(newData => {
                setDb(newData);
                setErrorString(null);
              })
              .catch(err => console.error('Silent synchronizer update failed:', err));

            // Only notify if update comes from another connection
            if (data.detail !== roleName) {
              setNotification({
                message: `Dữ liệu vừa được cập nhật tức thì bởi ${data.detail}!`,
                type: 'success'
              });
              setTimeout(() => {
                setNotification(prev => prev?.message.includes(data.detail) ? null : prev);
              }, 4000);
            }
          }
        } catch (err) {
          console.error("Format error in SSE streams incoming msg:", err);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentRole]);

  const handleResetDB = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reset', { 
        method: 'POST',
        headers: { 'x-updater': getRoleLabel(currentRole) }
      });
      if (!res.ok) throw new Error('Không thể khôi phục dữ liệu mẫu.');
      const data = await res.json();
      setDb(data.database);
      setErrorString(null);
      alert('Khôi phục cơ sở dữ liệu gốc thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Synchronous State Commit + Google Drive instant replication
  const commitDbUpdate = (updaterFn: (prev: AppDatabase) => AppDatabase) => {
    setDb(prev => {
      const nextDb = updaterFn(prev);
      localStorage.setItem('trung_hai_db_cache', JSON.stringify(nextDb));
      
      // If Google Drive Sync is active, replicate immediately
      if (gDriveAccessToken && gDriveFileId && isGDriveSyncEnabled) {
        pushToGDriveDirect(gDriveAccessToken, gDriveFileId, nextDb);
      }
      return nextDb;
    });
  };

  // 1. Expenses API calls
  const handleAddOrUpdateExpense = async (expense: Expense) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-updater': getRoleLabel(currentRole)
        },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => {
        const index = prev.expenses.findIndex(e => e.id === expense.id);
        const nextExpenses = [...prev.expenses];
        if (index >= 0) {
          nextExpenses[index] = expense;
        } else {
          nextExpenses.unshift(expense);
        }
        return { ...prev, expenses: nextExpenses };
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { 
        method: 'DELETE',
        headers: { 'x-updater': getRoleLabel(currentRole) }
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => ({
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== id)
      }));
    }
  };

  // 2. Funds API calls
  const handleAddFund = async (fund: FundReceipt) => {
    try {
      const res = await fetch('/api/funds', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-updater': getRoleLabel(currentRole)
        },
        body: JSON.stringify(fund)
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => {
        const index = prev.funds.findIndex(f => f.id === fund.id);
        const nextFunds = [...prev.funds];
        if (index >= 0) {
          nextFunds[index] = fund;
        } else {
          nextFunds.unshift(fund);
        }
        return { ...prev, funds: nextFunds };
      });
    }
  };

  const handleDeleteFund = async (id: string) => {
    try {
      const res = await fetch(`/api/funds/${id}`, { 
        method: 'DELETE',
        headers: { 'x-updater': getRoleLabel(currentRole) }
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => ({
        ...prev,
        funds: prev.funds.filter(f => f.id !== id)
      }));
    }
  };

  // 3. Documents API calls
  const handleAddOrUpdateDoc = async (doc: DocumentProgress) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-updater': getRoleLabel(currentRole)
        },
        body: JSON.stringify(doc)
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => {
        const index = prev.documents.findIndex(d => d.id === doc.id);
        const nextDocs = [...prev.documents];
        if (index >= 0) {
          nextDocs[index] = doc;
        } else {
          nextDocs.unshift(doc);
        }
        return { ...prev, documents: nextDocs };
      });
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { 
        method: 'DELETE',
        headers: { 'x-updater': getRoleLabel(currentRole) }
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== id)
      }));
    }
  };

  // 4. Material Transaction API calls
  const handleAddTransaction = async (tx: MaterialTransaction) => {
    try {
      const res = await fetch('/api/inventory/transaction', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-updater': getRoleLabel(currentRole)
        },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => {
        const nextTxs = [tx, ...prev.inventoryTransactions];
        return { ...prev, inventoryTransactions: nextTxs };
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/transaction/${id}`, { 
        method: 'DELETE',
        headers: { 'x-updater': getRoleLabel(currentRole) }
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error();
      }
    } catch (err: any) {
      commitDbUpdate(prev => {
        const nextTxs = prev.inventoryTransactions.filter(t => t.id !== id);
        return { ...prev, inventoryTransactions: nextTxs };
      });
    }
  };

  // Calculate Overdue Count
  const getOverdueCount = () => {
    const period = systemSettings?.clearancePeriod || 15;
    return db.expenses.filter((exp) => {
      if (exp.clearanceStatus === 'Xong') return false;
      // Clearance due date is actualDate + period
      const date = new Date(exp.actualDate);
      date.setDate(date.getDate() + period);
      const dueDate = date.toISOString().split('T')[0];
      
      const d1 = new Date(baselineDate);
      const d2 = new Date(dueDate);
      return d1.getTime() > d2.getTime(); // Overdue past period days
    }).length;
  };

  // Main UI render
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans antialiased relative">
      {/* Floating Real-time Toast Notifications */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 ring-4 ring-emerald-500/10">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-extrabold tracking-widest font-mono uppercase text-emerald-400">ĐỒNG BỘ TRỰC TIẾP</p>
            <p className="text-xs text-slate-200 mt-0.5 font-semibold leading-relaxed">{notification.message}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-base font-semibold h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* LEFT SIDEBAR NAVIGATION: Sleek dark theme representing the tabs */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col border-r border-slate-800 shrink-0 sticky top-0 h-screen print:hidden">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight uppercase text-blue-400">Project Account</h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold">QL-TL HIGHWAY v1.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('chi-phi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'chi-phi'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span>Sổ Chi Phí & Tạm Ứng</span>
          </button>

          <button
            onClick={() => setActiveTab('quy')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'quy'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Fuel className="h-4 w-4 shrink-0" />
            <span>Theo Dõi Quỹ (Dầu & HCNS)</span>
          </button>

          <button
            onClick={() => setActiveTab('ho-so')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'ho-so'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span>Tiến Trình Hồ Sơ</span>
          </button>

          <button
            onClick={() => setActiveTab('vat-tu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'vat-tu'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Boxes className="h-4 w-4 shrink-0" />
            <span>Vật Tư Tồn Kho</span>
          </button>

          <button
            onClick={() => setActiveTab('bao-cao')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'bao-cao'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>Báo Cáo Gửi Sếp</span>
          </button>

          <button
            onClick={() => setActiveTab('cai-dat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'cai-dat'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            <span>Cài Đặt Hệ Thống</span>
          </button>
        </nav>

        {/* User profile details customized based on currentRole */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${
              currentRole === UserRole.ACCOUNTANT ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              currentRole === UserRole.STOREKEEPER ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              currentRole === UserRole.HCNS ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
              'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {currentRole === UserRole.ACCOUNTANT ? 'KT' :
               currentRole === UserRole.STOREKEEPER ? 'TK' :
               currentRole === UserRole.HCNS ? 'HC' : 'SD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate leading-none mb-1">
                {currentRole === UserRole.ACCOUNTANT ? 'David Bảo (KT)' :
                 currentRole === UserRole.STOREKEEPER ? 'Đào Phú (Thủ kho)' :
                 currentRole === UserRole.HCNS ? 'Cô Lan (HCNS)' : 'Sếp Thạch (Sếp)'}
              </p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-slate-500 italic">Trực tuyến</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER: Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Dynamic top bar for roles */}
        <RoleHeader
          currentRole={currentRole}
          onChangeRole={(r) => {
            setCurrentRole(r);
            // Keep the user on their active tab to prevent jarring tab-jumping!
          }}
          baselineDate={baselineDate}
          onChangeBaselineDate={setBaselineDate}
          overdueCount={getOverdueCount()}
          activeUsers={activeUsers}
          syncStatus={syncStatus}
        />

        {/* Center Layout Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 print:p-0">
          
          {/* Mobile Tab bar (only displays when sidebar is hidden) */}
          <div className="flex md:hidden border border-slate-200 bg-white p-2 rounded-2xl items-center justify-between shadow-xs print:hidden">
            <div className="flex flex-wrap gap-1">
              <button
                id="tab-btn-chi-phi"
                onClick={() => setActiveTab('chi-phi')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'chi-phi' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Chi Phí</span>
              </button>

              <button
                id="tab-btn-quy"
                onClick={() => setActiveTab('quy')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'quy' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Quỹ</span>
              </button>

              <button
                id="tab-btn-ho-so"
                onClick={() => setActiveTab('ho-so')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'ho-so' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Hồ Sơ</span>
              </button>

              <button
                id="tab-btn-vat-tu"
                onClick={() => setActiveTab('vat-tu')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'vat-tu' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Kho</span>
              </button>

              <button
                id="tab-btn-bao-cao"
                onClick={() => setActiveTab('bao-cao')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'bao-cao' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Báo Cáo</span>
              </button>

              <button
                id="tab-btn-cai-dat"
                onClick={() => setActiveTab('cai-dat')}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === 'cai-dat' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-650 hover:bg-slate-50'
                }`}
              >
                <span>Cài Đặt</span>
              </button>
            </div>
          </div>

          {/* Global Loading Spinner / Error strings */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500 font-mono">Đang kết nối cơ sở dữ liệu xây dựng Trung Lương...</p>
            </div>
          ) : errorString ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center text-rose-800 space-y-3">
              <AlertOctagon className="h-12 w-12 text-rose-500 mx-auto" />
              <p className="font-bold">Đã xảy ra sự cố!</p>
              <p className="text-xs font-mono text-slate-550">{errorString}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-xl text-xs hover:bg-rose-700 cursor-pointer"
              >
                Thử kết nối lại
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Quick guide for Accountant / Depot / HR */}
              <div className="bg-[#f0fdf4] p-4 rounded-xl border border-emerald-200 flex items-start gap-3 text-xs leading-snug text-emerald-800 print:hidden shadow-xs">
                <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Thông tin phân quyền tác nghiệp & nhập chung:</p>
                  <p className="text-emerald-700">
                    Phần mềm cho phép <strong>Kế toán dự án</strong>, <strong>Thủ kho bãi</strong>, và <strong>Hành chính (HCNS)</strong> dùng chung dữ liệu. Sếp (Giám đốc) có thể xem báo cáo dòng tiền và sơ đồ biểu đồ bất kỳ lúc nào. Bạn hãy chuyển đổi vai trò ở thanh trên để kiểm thử đầy đủ các chức năng.
                  </p>
                </div>
              </div>

              {/* Active Tab rendering */}
              <div>
                {activeTab === 'chi-phi' && (
                  <ExpenseTracker
                    expenses={db.expenses}
                    onAddOrUpdateExpense={handleAddOrUpdateExpense}
                    onDeleteExpense={handleDeleteExpense}
                    currentRole={currentRole}
                    baselineDate={baselineDate}
                    documents={db.documents}
                    onAddOrUpdateDoc={handleAddOrUpdateDoc}
                    clearancePeriod={systemSettings?.clearancePeriod}
                    formApprovalThreshold={systemSettings?.formApprovalThreshold}
                  />
                )}

                {activeTab === 'quy' && (
                  <FundLedger
                    funds={db.funds}
                    expenses={db.expenses}
                    onAddFund={handleAddFund}
                    onDeleteFund={handleDeleteFund}
                    currentRole={currentRole}
                    baselineDate={baselineDate}
                  />
                )}

                {activeTab === 'ho-so' && (
                  <DocumentManager
                    documents={db.documents}
                    expenses={db.expenses}
                    onAddOrUpdateDoc={handleAddOrUpdateDoc}
                    onDeleteDoc={handleDeleteDoc}
                    currentRole={currentRole}
                    baselineDate={baselineDate}
                  />
                )}

                {activeTab === 'vat-tu' && (
                  <InventoryManager
                    materials={db.materials}
                    transactions={db.inventoryTransactions}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    currentRole={currentRole}
                    baselineDate={baselineDate}
                  />
                )}

                {activeTab === 'bao-cao' && (
                  <ReportDashboard
                    expenses={db.expenses}
                    funds={db.funds}
                    onResetDB={handleResetDB}
                    currentDate={baselineDate}
                  />
                )}

                {activeTab === 'cai-dat' && (
                  <SettingsPanel
                    currentRole={currentRole}
                    baselineDate={baselineDate}
                    onSettingsChange={(newSettings) => setSystemSettings(newSettings)}
                    onEmployeesChange={(newList) => setEmployees(newList)}
                    gDriveAccessToken={gDriveAccessToken}
                    onConnectGDrive={handleConnectGDrive}
                    onDisconnectGDrive={handleDisconnectGDrive}
                    isGDriveSyncEnabled={isGDriveSyncEnabled}
                    onToggleGDriveSync={handleToggleGDriveSync}
                    gDriveSyncStatus={gDriveSyncStatus}
                    gDriveFileId={gDriveFileId}
                    onSyncPushGDrive={onSyncPushGDrive}
                    onSyncPullGDrive={onSyncPullGDrive}
                    googleClientId={googleClientId}
                    onChangeGoogleClientId={onChangeGoogleClientId}
                  />
                )}
              </div>

            </div>
          )}

        </main>

        {/* Little clean design credits in bottom margin */}
        <footer className="py-6 border-t border-slate-200 mt-auto bg-white/40 text-center text-[10px] text-slate-400 font-medium print:hidden">
          Hệ thống tích hợp được xây dựng chuẩn mực cho Kế Toán Dự Án © 2026. Công trường Cao tốc Trung Lương – Mỹ Thuận.
        </footer>

      </div>

    </div>
  );
}
