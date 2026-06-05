/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { UserRole, AppDatabase, Expense, FundReceipt, DocumentProgress, MaterialTransaction } from './types';
import RoleHeader from './components/RoleHeader';
import ExpenseTracker from './components/ExpenseTrackerPro';
import FundLedger from './components/FundLedger';
import DocumentManager from './components/DocumentManager';
import InventoryManager from './components/InventoryManager';
import ReportDashboard from './components/ReportDashboard';
import { Landmark, Fuel, ClipboardCheck, Boxes, TrendingUp, AlertOctagon, HelpCircle, Settings2, Database, Save } from 'lucide-react';
import { seedData } from './seedData';
import {
  getBackendConfig,
  loadDatabaseFromSheets,
  saveBackendConfig,
  saveDatabaseToSheets,
  isBackendConfigured,
} from './services/sheetsBackend';

const emptyDb: AppDatabase = {
  expenses: [],
  funds: [],
  documents: [],
  materials: [],
  inventoryTransactions: [],
};

type Notice = { message: string; type: 'info' | 'success' } | null;

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.ACCOUNTANT);
  const [baselineDate, setBaselineDate] = useState<string>('2026-06-01');
  const [activeTab, setActiveTab] = useState<string>('chi-phi');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorString, setErrorString] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notice>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [db, setDb] = useState<AppDatabase>(emptyDb);

  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => getBackendConfig().apiUrl);
  const [appsScriptToken, setAppsScriptToken] = useState<string>(() => getBackendConfig().token);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

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

  const showNotice = (message: string, type: 'info' | 'success' = 'info') => {
    setNotification({ message, type });
    window.setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setSyncStatus('connecting');
      const result = await loadDatabaseFromSheets(seedData);
      setDb(result.database);
      setErrorString(null);
      setSyncStatus(result.status === 'connected' ? 'connected' : 'disconnected');
      showNotice(result.message, result.status === 'connected' ? 'success' : 'info');
    } catch (err: any) {
      setErrorString(err?.message || 'Không thể tải dữ liệu.');
      setSyncStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const persistDb = async (nextDb: AppDatabase, successMessage = 'Đã lưu dữ liệu.') => {
    setDb(nextDb);
    try {
      const result = await saveDatabaseToSheets(nextDb);
      setSyncStatus(result.synced ? 'connected' : 'disconnected');
      showNotice(result.synced ? successMessage + ' Đã đồng bộ Google Sheets.' : successMessage + ' Đang lưu cache trên trình duyệt.', result.synced ? 'success' : 'info');
    } catch (err: any) {
      setSyncStatus('disconnected');
      showNotice(`Đã lưu tạm trên trình duyệt nhưng chưa đồng bộ được Google Sheets: ${err?.message || err}`, 'info');
    }
  };

  const updateDb = (updater: (prev: AppDatabase) => AppDatabase, message?: string) => {
    const nextDb = updater(db);
    persistDb(nextDb, message);
  };

  const handleResetDB = async () => {
    const ok = window.confirm('Khôi phục dữ liệu mẫu? Dữ liệu hiện tại sẽ bị ghi đè lên Google Sheets nếu đã cấu hình backend.');
    if (!ok) return;
    await persistDb(seedData, 'Đã khôi phục dữ liệu mẫu.');
  };

  const handleAddOrUpdateExpense = async (expense: Expense) => {
    updateDb((prev) => {
      const index = prev.expenses.findIndex((e) => e.id === expense.id);
      const nextExpenses = [...prev.expenses];
      const normalizedExpense = { ...expense, id: expense.id || `exp-${Date.now()}` };
      if (index >= 0) nextExpenses[index] = normalizedExpense;
      else nextExpenses.unshift(normalizedExpense);
      return { ...prev, expenses: nextExpenses };
    }, 'Đã lưu chi phí/tạm ứng.');
  };

  const handleDeleteExpense = async (id: string) => {
    updateDb((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }), 'Đã xóa chi phí.');
  };

  const handleAddFund = async (fund: FundReceipt) => {
    updateDb((prev) => {
      const index = prev.funds.findIndex((f) => f.id === fund.id);
      const nextFunds = [...prev.funds];
      if (index >= 0) nextFunds[index] = fund;
      else nextFunds.unshift(fund);
      return { ...prev, funds: nextFunds };
    }, 'Đã lưu phiếu quỹ.');
  };

  const handleDeleteFund = async (id: string) => {
    updateDb((prev) => ({ ...prev, funds: prev.funds.filter((f) => f.id !== id) }), 'Đã xóa phiếu quỹ.');
  };

  const handleAddOrUpdateDoc = async (doc: DocumentProgress) => {
    updateDb((prev) => {
      const index = prev.documents.findIndex((d) => d.id === doc.id);
      const nextDocs = [...prev.documents];
      if (index >= 0) nextDocs[index] = doc;
      else nextDocs.unshift(doc);
      return { ...prev, documents: nextDocs };
    }, 'Đã lưu hồ sơ chứng từ.');
  };

  const handleDeleteDoc = async (id: string) => {
    updateDb((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }), 'Đã xóa hồ sơ.');
  };

  const handleAddTransaction = async (tx: MaterialTransaction) => {
    updateDb((prev) => ({ ...prev, inventoryTransactions: [tx, ...prev.inventoryTransactions] }), 'Đã lưu giao dịch vật tư.');
  };

  const handleDeleteTransaction = async (id: string) => {
    updateDb((prev) => ({ ...prev, inventoryTransactions: prev.inventoryTransactions.filter((t) => t.id !== id) }), 'Đã xóa giao dịch vật tư.');
  };

  const handleSaveBackendSettings = async () => {
    setSavingConfig(true);
    saveBackendConfig(appsScriptUrl, appsScriptToken);
    showNotice('Đã lưu cấu hình Apps Script. Đang tải lại dữ liệu từ Google Sheets...', 'success');
    await loadData();
    setSavingConfig(false);
  };

  const getOverdueCount = () => {
    const clearancePeriod = 15;
    return db.expenses.filter((exp) => {
      if (exp.clearanceStatus === 'Xong') return false;
      const date = new Date(exp.actualDate);
      date.setDate(date.getDate() + clearancePeriod);
      const dueDate = date.toISOString().split('T')[0];
      return new Date(baselineDate).getTime() > new Date(dueDate).getTime();
    }).length;
  };

  const navItems = [
    { id: 'chi-phi', label: 'Sổ Chi Phí & Tạm Ứng', short: 'Chi Phí', icon: Landmark, danger: false },
    { id: 'quy', label: 'Theo Dõi Quỹ (Dầu & HCNS)', short: 'Quỹ', icon: Fuel, danger: false },
    { id: 'ho-so', label: 'Tiến Trình Hồ Sơ', short: 'Hồ Sơ', icon: ClipboardCheck, danger: false },
    { id: 'vat-tu', label: 'Vật Tư Tồn Kho', short: 'Kho', icon: Boxes, danger: false },
    { id: 'bao-cao', label: 'Báo Cáo Gửi Sếp', short: 'Báo Cáo', icon: TrendingUp, danger: true },
    { id: 'cai-dat', label: 'Cài Đặt Backend', short: 'Cài Đặt', icon: Settings2, danger: false },
  ];

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Kết nối Google Sheets qua Apps Script</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dán Web App URL của Apps Script và token riêng. Frontend GitHub Pages sẽ đọc/ghi dữ liệu qua backend này, không cần server Node.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Apps Script Web App URL</span>
            <input value={appsScriptUrl} onChange={(e) => setAppsScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/AKfycb.../exec" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Token</span>
            <input value={appsScriptToken} onChange={(e) => setAppsScriptToken(e.target.value)} placeholder="Mã token trong Script Properties" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSaveBackendSettings} disabled={savingConfig} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{savingConfig ? 'Đang lưu...' : 'Lưu cấu hình & tải dữ liệu'}</button>
          <button onClick={loadData} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-extrabold hover:bg-slate-200">Tải lại dữ liệu</button>
        </div>
        <div className={`p-4 rounded-2xl text-xs font-semibold border ${isBackendConfigured() ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {isBackendConfigured() ? 'Đã có cấu hình backend trong trình duyệt này. Nếu token/URL đúng, dữ liệu sẽ đồng bộ Google Sheets.' : 'Chưa cấu hình backend. App vẫn chạy được bằng dữ liệu mẫu/cache nhưng chưa ghi về Google Sheets.'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans antialiased relative">
      {notification && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 ring-4 ring-emerald-500/10">
          <span className="flex h-2 w-2 relative shrink-0"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'} opacity-75`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span></span>
          <div className="flex-1 min-w-0"><p className="text-[9px] font-extrabold tracking-widest font-mono uppercase text-emerald-400">ĐỒNG BỘ DỮ LIỆU</p><p className="text-xs text-slate-200 mt-0.5 font-semibold leading-relaxed">{notification.message}</p></div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white text-base font-semibold h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center">&times;</button>
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col border-r border-slate-800 shrink-0 sticky top-0 h-screen print:hidden">
        <div className="p-6 border-b border-slate-800"><h1 className="text-lg font-bold tracking-tight uppercase text-blue-400">Project Account</h1><p className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold">GitHub Pages + Google Sheets</p></div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all ${active ? item.danger ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-950/20"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">{currentRole === UserRole.ACCOUNTANT ? 'KT' : currentRole === UserRole.STOREKEEPER ? 'TK' : currentRole === UserRole.HCNS ? 'HC' : 'SD'}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-200 truncate leading-none mb-1">{getRoleLabel(currentRole)}</p><div className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span><span className="text-[10px] text-slate-500 italic">{syncStatus === 'connected' ? 'Google Sheets' : 'Cache/local'}</span></div></div></div></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <RoleHeader currentRole={currentRole} onChangeRole={setCurrentRole} baselineDate={baselineDate} onChangeBaselineDate={setBaselineDate} overdueCount={getOverdueCount()} activeUsers={syncStatus === 'connected' ? ['Google Sheets Backend'] : []} syncStatus={syncStatus} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4"><div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-sm font-medium text-slate-500 font-mono">Đang kết nối Google Sheets backend...</p></div>
          ) : errorString ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center text-rose-800 space-y-3"><AlertOctagon className="h-12 w-12 text-rose-500 mx-auto" /><p className="font-bold">Đã xảy ra sự cố!</p><p className="text-xs font-mono text-slate-550">{errorString}</p><button onClick={loadData} className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-xl text-xs hover:bg-rose-700">Thử kết nối lại</button></div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#f0fdf4] p-4 rounded-xl border border-emerald-200 flex items-start gap-3 text-xs leading-snug text-emerald-800 print:hidden shadow-xs"><HelpCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /><div className="space-y-1"><p className="font-bold">Mô hình mới: GitHub Pages + Google Sheets</p><p className="text-emerald-700">Giao diện chạy trên GitHub Pages. Dữ liệu đọc/ghi qua Apps Script vào Google Sheets.</p></div></div>
              {activeTab === 'chi-phi' && <ExpenseTracker expenses={db.expenses} onAddOrUpdateExpense={handleAddOrUpdateExpense} onDeleteExpense={handleDeleteExpense} currentRole={currentRole} baselineDate={baselineDate} documents={db.documents} onAddOrUpdateDoc={handleAddOrUpdateDoc} />}
              {activeTab === 'quy' && <FundLedger funds={db.funds} expenses={db.expenses} onAddFund={handleAddFund} onDeleteFund={handleDeleteFund} currentRole={currentRole} baselineDate={baselineDate} />}
              {activeTab === 'ho-so' && <DocumentManager documents={db.documents} expenses={db.expenses} onAddOrUpdateDoc={handleAddOrUpdateDoc} onDeleteDoc={handleDeleteDoc} currentRole={currentRole} baselineDate={baselineDate} />}
              {activeTab === 'vat-tu' && <InventoryManager materials={db.materials} transactions={db.inventoryTransactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} currentRole={currentRole} baselineDate={baselineDate} />}
              {activeTab === 'bao-cao' && <ReportDashboard expenses={db.expenses} funds={db.funds} onResetDB={handleResetDB} currentDate={baselineDate} />}
              {activeTab === 'cai-dat' && renderSettings()}
            </div>
          )}
        </main>
        <footer className="py-6 border-t border-slate-200 mt-auto bg-white/40 text-center text-[10px] text-slate-400 font-medium print:hidden">Hệ thống kế toán dự án © 2026. Frontend GitHub Pages, backend Google Sheets/Apps Script.</footer>
      </div>
    </div>
  );
}
