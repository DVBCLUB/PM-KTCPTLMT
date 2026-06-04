import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  Building2, 
  Users2, 
  Settings2, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  BadgeCheck, 
  Coins, 
  Clock, 
  ShieldAlert,
  Save, 
  RefreshCw, 
  UserPlus2, 
  Search,
  FileSignature,
  FileSpreadsheet,
  Cloud,
  Database,
  Copy,
  Sparkles,
  Code
} from 'lucide-react';

/**
 * Interface representing Employee data
 */
export interface Employee {
  id: string; // e.g. NV-001
  fullName: string;
  department: string;
  softwareRole: UserRole;
  title: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  signatureCode: string; // text signature string, e.g. "Đã ký điện tử" or "Đào Phú bãi"
  maxAdvanceLimit: number; // monthly limit e.g. 50000000
  status: 'Đang làm việc' | 'Nghỉ bảo hiểm' | 'Đã nghỉ việc';
}

/**
 * Interface representing administrative and accounting policy settings
 */
export interface AppSettings {
  companyName: string;
  projectName: string;
  taxCode: string;
  address: string;
  projectDirector: string;
  chiefAccountant: string;
  formApprovalThreshold: number; // Default 10M VND
  clearancePeriod: number; // Default 15 days
  fuelBudget: number; // Total budget in VND
  kitchenBudget: number; // Total budget in VND
  adminBudget: number; // Total budget in VND
  isAutoApproveDocs: boolean; // Auto authorize if valid receipt
  warnOnBudgetExceed: boolean; // Alert when fund approaches 10%
}

interface SettingsPanelProps {
  currentRole: UserRole;
  baselineDate: string;
  onSettingsChange?: (settings: AppSettings) => void;
  onEmployeesChange?: (employees: Employee[]) => void;
  gDriveAccessToken: string | null;
  onConnectGDrive: () => void;
  onDisconnectGDrive: () => void;
  isGDriveSyncEnabled: boolean;
  onToggleGDriveSync: (enabled: boolean) => void;
  gDriveSyncStatus: 'disabled' | 'syncing' | 'idle' | 'error' | 'connected';
  gDriveFileId: string | null;
  onSyncPushGDrive: () => Promise<void>;
  onSyncPullGDrive: () => Promise<void>;
  googleClientId: string;
  onChangeGoogleClientId: (id: string) => void;
}

// Predefined default seed for employees
const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'NV-001',
    fullName: 'David Bảo',
    department: 'Ban Tài chính - Kế toán',
    softwareRole: UserRole.ACCOUNTANT,
    title: 'Kế toán quản lý dự án',
    phone: '0905 174 819',
    bankAccount: '19035629102919',
    bankName: 'Techcombank',
    signatureCode: 'David Bảo - Đã ký điện tử',
    maxAdvanceLimit: 80000000,
    status: 'Đang làm việc'
  },
  {
    id: 'NV-002',
    fullName: 'Đào Phú',
    department: 'Bộ phận Kho vật tư',
    softwareRole: UserRole.STOREKEEPER,
    title: 'Trưởng kho bãi dầm',
    phone: '0912 334 556',
    bankAccount: '0071001289381',
    bankName: 'Vietcombank',
    signatureCode: 'Ký tên: Đào Phú (Đã duyệt kho)',
    maxAdvanceLimit: 30000000,
    status: 'Đang làm việc'
  },
  {
    id: 'NV-003',
    fullName: 'Cô Lan',
    department: 'Hành chính - Nhân sự',
    softwareRole: UserRole.HCNS,
    title: 'Trưởng phòng Hành chính',
    phone: '0983 221 677',
    bankAccount: '10292819281',
    bankName: 'MB Bank',
    signatureCode: 'HCNS Lan - Phê chuẩn',
    maxAdvanceLimit: 40000000,
    status: 'Đang làm việc'
  },
  {
    id: 'NV-004',
    fullName: 'Nguyễn Văn Thạch',
    department: 'Ban Giám đốc',
    softwareRole: UserRole.BOSS,
    title: 'Giám đốc Ban Điều Hành',
    phone: '0901 888 999',
    bankAccount: '111190008888',
    bankName: 'VietinBank',
    signatureCode: 'Giám đốc Thạch - DUYỆT TỐI CAO',
    maxAdvanceLimit: 200000000,
    status: 'Đang làm việc'
  },
  {
    id: 'NV-005',
    fullName: 'Kế toán Thoa',
    department: 'Ban Tài chính - Kế toán',
    softwareRole: UserRole.ACCOUNTANT,
    title: 'Kế toán trưởng Tập đoàn',
    phone: '0943 112 004',
    bankAccount: '19028919021',
    bankName: 'Techcombank',
    signatureCode: 'Kế toán Thoa - Đã duyệt soát',
    maxAdvanceLimit: 100000000,
    status: 'Đang làm việc'
  }
];

// Predefined default seed for unit parameters
const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'CÔNG TY CP ĐẦU TƯ XÂY DỰNG TRUNG HẢI',
  projectName: 'Ban Điều Hành Dự Án Cao Tốc Trung Lương - Mỹ Thuận',
  taxCode: '0314562819',
  address: 'Km 51, Cao tốc Trung Lương - Mỹ Thuận, Huyện Cai Lậy, Tỉnh Tiền Giang',
  projectDirector: 'Sếp Thạch',
  chiefAccountant: 'Kế toán Thoa',
  formApprovalThreshold: 10000000, // 10 million VND
  clearancePeriod: 15, // 15 days limits
  fuelBudget: 120000500,
  kitchenBudget: 40000500,
  adminBudget: 25000500,
  isAutoApproveDocs: true,
  warnOnBudgetExceed: true
};

export default function SettingsPanel({ 
  currentRole, 
  baselineDate,
  onSettingsChange,
  onEmployeesChange,
  gDriveAccessToken,
  onConnectGDrive,
  onDisconnectGDrive,
  isGDriveSyncEnabled,
  onToggleGDriveSync,
  gDriveSyncStatus,
  gDriveFileId,
  onSyncPushGDrive,
  onSyncPullGDrive,
  googleClientId,
  onChangeGoogleClientId
}: SettingsPanelProps) {
  // Config Tabs
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'employees' | 'policy' | 'gdrive'>('profile');

  // Load state from caches or fallbacks
  const [settings, setSettings] = useState<AppSettings>(() => {
    const cached = localStorage.getItem('qd_app_settings');
    if (cached) {
      try { return JSON.parse(cached); } catch { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const cached = localStorage.getItem('qd_app_employees');
    if (cached) {
      try { return JSON.parse(cached); } catch { return DEFAULT_EMPLOYEES; }
    }
    return DEFAULT_EMPLOYEES;
  });

  // Modal employee state (Create / Edit)
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Search state in employee directory
  const [empSearch, setEmpSearch] = useState('');

  // Form bounds for employee
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [empDept, setEmpDept] = useState('Ban Tài chính - Kế toán');
  const [empRole, setEmpRole] = useState<UserRole>(UserRole.ACCOUNTANT);
  const [empTitle, setEmpTitle] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empBankNo, setEmpBankNo] = useState('');
  const [empBankName, setEmpBankName] = useState('Techcombank');
  const [empSigCode, setEmpSigCode] = useState('');
  const [empMaxLimit, setEmpMaxLimit] = useState(50000000);
  const [empStatus, setEmpStatus] = useState<'Đang làm việc' | 'Nghỉ bảo hiểm' | 'Đã nghỉ việc'>('Đang làm việc');

  // Local notifications inside settings panel
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to outer components on mounting
  useEffect(() => {
    if (onSettingsChange) onSettingsChange(settings);
    if (onEmployeesChange) onEmployeesChange(employees);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('qd_app_settings', JSON.stringify(newSettings));
    if (onSettingsChange) onSettingsChange(newSettings);
    triggerToast('Đã lưu cấu hình tham số hệ thống thành công!');
  };

  const handleSaveEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    localStorage.setItem('qd_app_employees', JSON.stringify(newEmployees));
    if (onEmployeesChange) onEmployeesChange(newEmployees);
  };

  // Open creation handler
  const handleOpenNewEmployee = () => {
    setEditingEmployee(null);
    // Find next ID
    const num = employees.length + 1;
    setEmpId(`NV-${num < 10 ? '0' + num : num}`);
    setEmpName('');
    setEmpDept('Ban Tài chính - Kế toán');
    setEmpRole(UserRole.ACCOUNTANT);
    setEmpTitle('');
    setEmpPhone('');
    setEmpBankNo('');
    setEmpBankName('Techcombank');
    setEmpSigCode('');
    setEmpMaxLimit(50000000);
    setEmpStatus('Đang làm việc');
    setIsEmployeeModalOpen(true);
  };

  // Open edit handler
  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpId(emp.id);
    setEmpName(emp.fullName);
    setEmpDept(emp.department);
    setEmpRole(emp.softwareRole);
    setEmpTitle(emp.title);
    setEmpPhone(emp.phone);
    setEmpBankNo(emp.bankAccount);
    setEmpBankName(emp.bankName);
    setEmpSigCode(emp.signatureCode);
    setEmpMaxLimit(emp.maxAdvanceLimit);
    setEmpStatus(emp.status);
    setIsEmployeeModalOpen(true);
  };

  // Submit employee form
  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert('Vui lòng nhập họ và tên nhân viên!');
      return;
    }

    const payload: Employee = {
      id: empId,
      fullName: empName,
      department: empDept,
      softwareRole: empRole,
      title: empTitle || 'Nhân viên',
      phone: empPhone,
      bankAccount: empBankNo,
      bankName: empBankName,
      signatureCode: empSigCode || `${empName} - Chuyên viên`,
      maxAdvanceLimit: Number(empMaxLimit),
      status: empStatus
    };

    let updatedList: Employee[] = [];
    if (editingEmployee) {
      updatedList = employees.map(emp => emp.id === editingEmployee.id ? payload : emp);
      triggerToast(`Đã cập nhật thông tin nhân viên ${payload.fullName}!`);
    } else {
      // Check ID clash
      if (employees.some(emp => emp.id === payload.id)) {
        payload.id = 'NV-' + Date.now().toString().slice(-3);
      }
      updatedList = [...employees, payload];
      triggerToast(`Đã thêm mới nhân viên ${payload.fullName} thành công!`);
    }

    handleSaveEmployees(updatedList);
    setIsEmployeeModalOpen(false);
  };

  // Delete employee
  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân viên [${name}] khỏi hệ thống không?`)) {
      const updated = employees.filter(emp => emp.id !== id);
      handleSaveEmployees(updated);
      triggerToast(`Đã xóa hồ sơ nhân viên ${name}!`);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Bạn có thực sự muốn khôi phục toàn bộ Khai báo danh mục nhân viên và cấu hình về mặc định ban đầu không?')) {
      setSettings(DEFAULT_SETTINGS);
      setEmployees(DEFAULT_EMPLOYEES);
      localStorage.setItem('qd_app_settings', JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('qd_app_employees', JSON.stringify(DEFAULT_EMPLOYEES));
      
      if (onSettingsChange) onSettingsChange(DEFAULT_SETTINGS);
      if (onEmployeesChange) onEmployeesChange(DEFAULT_EMPLOYEES);

      triggerToast('Đã khôi phục toàn bộ danh mục & tham số hệ thống!');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    return (
      emp.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.id.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.department.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.title.toLowerCase().includes(empSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] max-w-sm bg-slate-905 bg-slate-900 border border-emerald-500/30 text-white p-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ring-4 ring-emerald-500/10">
          <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Khai báo cấu hình hệ thống kế toán</h2>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                Quản lý hồ sơ nhân viên, phân quyền tài khoản, định mức duyệt biểu mẫu, và cài đặt các tham số chứng từ.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Mặc định ban đầu</span>
          </button>
        </div>
      </div>

      {/* Configuration Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-gray-100 gap-1.5">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'profile'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-550 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Thông tin Đơn vị & BĐH</span>
        </button>

        <button
          onClick={() => setActiveSubTab('employees')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'employees'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-550 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users2 className="h-4 w-4" />
          <span>Nhân viên & Phân quyền ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('policy')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'policy'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-550 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Tham số định mức & Kế toán</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gdrive')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'gdrive'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-550 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>Lưu trữ Google Drive {gDriveAccessToken ? '🟢' : '⚪'}</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="grid grid-cols-1 gap-6">

        {/* TAB 1: PROFILE INFORMATION */}
        {activeSubTab === 'profile' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-5">
            <h3 className="text-xs font-extrabold text-slate-805 text-slate-820 flex items-center gap-1.5 border-b border-gray-105 pb-3">
              <span className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
              Khai báo pháp lý Công ty & Ban điều hành công trường
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const updated: AppSettings = {
                ...settings,
                companyName: f.get('companyName') as string || settings.companyName,
                projectName: f.get('projectName') as string || settings.projectName,
                taxCode: f.get('taxCode') as string || settings.taxCode,
                address: f.get('address') as string || settings.address,
                projectDirector: f.get('projectDirector') as string || settings.projectDirector,
                chiefAccountant: f.get('chiefAccountant') as string || settings.chiefAccountant,
              };
              handleSaveSettings(updated);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Tên Đơn vị chủ quản / Công ty:</label>
                  <input
                    type="text"
                    name="companyName"
                    defaultValue={settings.companyName}
                    className="w-full text-xs font-bold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Company structure name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Tên Ban Điều Hành Công trường / Dự án:</label>
                  <input
                    type="text"
                    name="projectName"
                    defaultValue={settings.projectName}
                    className="w-full text-xs font-bold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Project banner name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Mã số thuế doanh nghiệp (MST):</label>
                  <input
                    type="text"
                    name="taxCode"
                    defaultValue={settings.taxCode}
                    className="w-full text-xs font-mono font-bold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="0314562819"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Địa chỉ dự án / Hiện trường:</label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={settings.address}
                    className="w-full text-xs font-semibold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Current project address"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Tổng giám đốc / Giám đốc BĐH (Người duyệt biểu ký):</label>
                  <input
                    type="text"
                    name="projectDirector"
                    defaultValue={settings.projectDirector}
                    className="w-full text-xs font-bold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Sếp Thạch"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-450 uppercase">Kế toán trưởng / Phụ trách Tài chính:</label>
                  <input
                    type="text"
                    name="chiefAccountant"
                    defaultValue={settings.chiefAccountant}
                    className="w-full text-xs font-bold p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Kế toán Thoa"
                  />
                </div>
              </div>

              {/* Design visual simulator for vouchers */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Xem trước đầu chứng từ in ấn (Header preview)</p>
                <div className="mt-3 bg-white p-3 border border-gray-200 rounded-xl font-sans space-y-1 max-w-lg shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">{settings.companyName}</p>
                  <p className="text-[9.5px] font-semibold text-slate-500">{settings.projectName}</p>
                  <p className="text-[9px] font-medium text-slate-400 italic">MST: {settings.taxCode} - Đ/c: {settings.address}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Cập nhật Thông tin Đơn vị</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: EMPLOYEE & ROLE DIRECTORY */}
        {activeSubTab === 'employees' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-extrabold text-slate-805 text-slate-820 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                  Khai báo hồ sơ Danh mục nhân viên & Các bộ phận
                </h3>
                <p className="text-[11px] text-gray-400 leading-normal mt-0.5">
                  Danh sách này lưu thông tin nhân sự kế toán, thủ kho bãi, nhân viên HR phục vụ in phiếu ký, biểu tổng hợp, đóng chữ ký.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewEmployee}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserPlus2 className="h-4 w-4" />
                <span>Khai báo nhân viên mới</span>
              </button>
            </div>

            {/* Quick search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên theo tên, mã số, phòng ban..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Employee interactive table */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider font-extrabold font-mono">
                    <th className="p-3.5 pl-4">Mã số</th>
                    <th className="p-3.5">Họ và tên</th>
                    <th className="p-3.5">Bộ phận / Chức vụ</th>
                    <th className="p-3.5">Vai trò hệ thống</th>
                    <th className="p-3.5">Tài khoản thanh toán</th>
                    <th className="p-3.5">Chữ ký in</th>
                    <th className="p-3.5 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                        Không tìm thấy hồ sơ nhân viên nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-gray-500">
                          {emp.id}
                        </td>
                        <td className="p-3.5">
                          <div>
                            <span className="font-bold text-slate-800">{emp.fullName}</span>
                            <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{emp.phone || 'Chưa cập nhật SĐT'}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div>
                            <span className="font-semibold text-slate-700">{emp.department}</span>
                            <span className="block text-[10.5px] text-purple-600 font-medium mt-0.5">{emp.title}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.softwareRole === UserRole.ACCOUNTANT
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : emp.softwareRole === UserRole.STOREKEEPER
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : emp.softwareRole === UserRole.HCNS
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {emp.softwareRole}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {emp.bankAccount ? (
                            <div>
                              <span className="font-mono font-bold text-slate-600 block">{emp.bankAccount}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{emp.bankName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Mặc định tiền mặt</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-550 italic">
                            <FileSignature className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="line-clamp-1 max-w-[120px] font-semibold">{emp.signatureCode}</span>
                          </div>
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded border border-transparent hover:border-blue-200 cursor-pointer"
                              title="Sửa nhân viên"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp.id, emp.fullName)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                              title="Xóa nhân viên"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ALERTS & RULES LIMITATIONS */}
        {activeSubTab === 'policy' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-5">
            <h3 className="text-xs font-extrabold text-slate-805 text-slate-820 flex items-center gap-1.5 border-b border-gray-105 pb-3">
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
              Định mức quy trình biểu mẫu & Kỳ hạn quyết toán chi phí
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const updated: AppSettings = {
                ...settings,
                formApprovalThreshold: Number(f.get('formApprovalThreshold')) || settings.formApprovalThreshold,
                clearancePeriod: Number(f.get('clearancePeriod')) || settings.clearancePeriod,
                fuelBudget: Number(f.get('fuelBudget')) || settings.fuelBudget,
                kitchenBudget: Number(f.get('kitchenBudget')) || settings.kitchenBudget,
                adminBudget: Number(f.get('adminBudget')) || settings.adminBudget,
                isAutoApproveDocs: f.get('isAutoApproveDocs') === 'true',
                warnOnBudgetExceed: f.get('warnOnBudgetExceed') === 'true',
              };
              handleSaveSettings(updated);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Mức trần in biểu mẫu */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <Coins className="h-4 w-4 text-blue-500" />
                    <span>Định mức phân hạng in mộc (VNĐ)</span>
                  </div>
                  <input
                    type="number"
                    name="formApprovalThreshold"
                    defaultValue={settings.formApprovalThreshold}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 10000000"
                  />
                  <p className="text-[10px] text-gray-400 italic leading-snug">
                    Phần chi phí trên mức này (e.g. 10 trđ) tự động áp dụng biểu in BM01/BM03 ký đóng mộc Tổng Giám đốc. Dưới mức duyệt điều hành BĐH.
                  </p>
                </div>

                {/* 2. Kỳ hạn hoàn ứng */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Hạn định hoàn ứng quy định (Ngày)</span>
                  </div>
                  <input
                    type="number"
                    name="clearancePeriod"
                    defaultValue={settings.clearancePeriod}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 15"
                  />
                  <p className="text-[10px] text-gray-400 italic leading-snug">
                    Khoảng cách từ ngày tạm ứng chi phí thực tế đến khi bắt buộc làm quyết toán hóa đơn đỏ bồi hoàn (Mặc định: 15 ngày).
                  </p>
                </div>

                {/* 3. Ngân bồi nhiên liệu */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <ShieldAlert className="h-4 w-4 text-emerald-500" />
                    <span>Hạn mức ngân sách Quỹ Dầu (VNĐ)</span>
                  </div>
                  <input
                    type="number"
                    name="fuelBudget"
                    defaultValue={settings.fuelBudget}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 120000000"
                  />
                  <p className="text-[10px] text-gray-400 italic leading-snug">
                    Ngưỡng kiểm soát báo cáo tổng chi dầu hiện trường. Cảnh báo đỏ khi vượt mức hạn mục công việc này.
                  </p>
                </div>

                {/* 4. Định mức bếp ăn */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <Coins className="h-4 w-4 text-purple-500" />
                    <span>Hạn mức Quỹ Bếp ăn (VNĐ)</span>
                  </div>
                  <input
                    type="number"
                    name="kitchenBudget"
                    defaultValue={settings.kitchenBudget}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 italic leading-snug">
                    Định mức ngân quỹ hàng quý phục vụ nấu ăn, nạp ga, gia vị cho bếp ăn công trình hiện trường.
                  </p>
                </div>

                {/* 5. Quỹ Hành chính */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <Coins className="h-4 w-4 text-indigo-500" />
                    <span>Hạn mức Quỹ Hành chính (VNĐ)</span>
                  </div>
                  <input
                    type="number"
                    name="adminBudget"
                    defaultValue={settings.adminBudget}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 italic leading-snug">
                    Cấp bổ sung cho văn phòng phẩm, tiền điện nước, thuê văn phòng hiện trường của công trình.
                  </p>
                </div>

                {/* 6. Quy tắc duyệt nhanh */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-slate-700 font-bold text-xs block">Quy tắc tự động ứng dụng</span>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        name="isAutoApproveDocs"
                        value="true"
                        defaultChecked={settings.isAutoApproveDocs}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Tự động duyệt Hồ sơ hồ sơ đủ Hóa đơn đỏ</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        name="warnOnBudgetExceed"
                        value="true"
                        defaultChecked={settings.warnOnBudgetExceed}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Cảnh báo Sếp khi vượt tỷ lệ mức tạm ứng</span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Áp dụng quy tắc tham số</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: GOOGLE DRIVE CLOUD SYNC */}
        {activeSubTab === 'gdrive' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Cloud className="h-5 w-5 text-blue-500" />
                <span>Đồng bộ Cloud dữ liệu qua Google Drive của riêng bạn</span>
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                <span>Google Drive API v3</span>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3.5 text-xs text-blue-900 leading-snug">
              <Sparkles className="h-5 w-5 text-blue-650 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold">Đồng bộ hoàn toàn Cloud:</p>
                <p className="text-blue-850 font-medium">
                  Tính năng này giúp lưu trữ tệp dữ liệu <code>construction_tracker_database.json</code> trực tiếp trong Google Drive cá nhân của bạn. Khi bạn đẩy mã nguồn (push) lên GitHub Pages, website tĩnh sẽ tự động đọc/ghi dữ liệu từ Google Drive này, giúp hệ thống hoạt động 100% không cần máy chủ Node.js của bên thứ ba!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              {/* Cài đặt Client ID của bạn */}
              <div className="space-y-3.5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Code className="h-4 w-4 text-slate-600" />
                  <span>Mối nối Google Console (Client ID)</span>
                </h4>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Google Client ID cá nhân:</label>
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => onChangeGoogleClientId(e.target.value)}
                    className="w-full text-xs font-mono font-medium p-3 border border-gray-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 123456-abcdef.apps.googleusercontent.com"
                  />
                  <p className="text-[9.5px] text-gray-550 pt-1 leading-snug">
                    Hãy dán Google Client ID tạo từ trang Google Cloud Console của bạn. Để trống nếu muốn chạy qua Client ID dùng chung do hệ thống cấp quyền.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      alert('Đã copy URL nguồn trang!');
                    }}
                    className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-bold text-slate-750 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy URL nguồn phát (Origin)</span>
                  </button>
                </div>
              </div>

              {/* Trạng thái đồng bộ chi tiết */}
              <div className="space-y-4 p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span>Trạng thái kết nối Google Drive</span>
                  </h4>

                  <div className="space-y-2.5 pt-1.5">
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="text-gray-500 font-bold">Token kết nối:</span>
                      {gDriveAccessToken ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-extrabold font-mono text-[10px] border border-emerald-100">
                          ĐÃ KẾT NỐI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg font-extrabold font-mono text-[10px] border border-gray-200">
                          CHƯA KẾT NỐI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="text-gray-500 font-bold">Chế độ đồng bộ:</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!gDriveAccessToken}
                          checked={isGDriveSyncEnabled}
                          onChange={(e) => onToggleGDriveSync(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-extrabold text-[11px] text-slate-800">Kích hoạt Sync</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="text-gray-500 font-bold">Tệp đích (File ID):</span>
                      <span className="font-mono text-[10.5px] text-slate-705 max-w-[120px] truncate block font-bold" title={gDriveFileId || 'Chưa khởi tạo'}>
                        {gDriveFileId || 'Chưa có file'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-bold">Trạng thái Sync:</span>
                      <span className={`px-2 py-0.5 rounded-lg font-extrabold text-[10px] border ${
                        gDriveSyncStatus === 'idle' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        gDriveSyncStatus === 'syncing' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                        gDriveSyncStatus === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-gray-100 text-gray-550 border-gray-200'
                      }`}>
                        {gDriveSyncStatus === 'idle' ? 'Đã đồng bộ' :
                         gDriveSyncStatus === 'syncing' ? 'Đang chuyển tải...' :
                         gDriveSyncStatus === 'error' ? 'Lỗi kết nối' : 'Chưa bật'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  {!gDriveAccessToken ? (
                    <button
                      onClick={onConnectGDrive}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Cloud className="h-4 w-4" />
                      <span>Kết nối Google Drive</span>
                    </button>
                  ) : (
                    <div className="w-full flex gap-2">
                      <button
                        onClick={onSyncPullGDrive}
                        disabled={gDriveSyncStatus === 'syncing'}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Tải về (Pull)</span>
                      </button>
                      <button
                        onClick={onSyncPushGDrive}
                        disabled={gDriveSyncStatus === 'syncing'}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-105 text-blue-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Tải lên (Push)</span>
                      </button>
                      <button
                        onClick={onDisconnectGDrive}
                        className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Ngắt kết nối"
                      >
                        Ngắt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hướng dẫn thiết lập tiếng Việt */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <span className="text-slate-800 font-extrabold text-xs block">📋 HƯỚNG DẪN THIẾT LẬP GOOGLE CLOUD CONSOLE ĐỂ DEPLOY GITHUB PAGES:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-600 leading-relaxed">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="font-extrabold text-slate-800 block">Bước 1: Tạo Client ID</span>
                  <p className="text-slate-500">
                    Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Google Cloud Console</a>, tạo một Project mới. Nhấp vào <strong>APIs & Services</strong> &gt; <strong>Library</strong>, tìm kiếm rồi nhấn <strong>Enable Google Drive API</strong>.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="font-extrabold text-slate-800 block">Bước 2: Cấu hình Authorized Origins</span>
                  <p className="text-slate-500">
                    Tại trang <strong>Credentials</strong>, chọn <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>. Chọn loại ứng dụng là <strong>Web application</strong>. Tại mục <strong>Authorized JavaScript origins</strong>, thêm:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-mono text-[9px]">
                    <li>{`https://<ten-user>.github.io`}</li>
                    <li>{window.location.origin}</li>
                  </ul>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="font-extrabold text-slate-800 block">Bước 3: Dán Client ID</span>
                  <p className="text-slate-500">
                    Copy <code>Client ID</code> được sinh ra, dán vào ô bên trái sau đó nhấn nút <strong>Kết nối Google Drive</strong> để cấp quyền. Dữ liệu sẽ tự động đồng bộ mỗi khi bạn thao tác!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* POPUP FOR CREATION/EDITING PROCESSES OF WORK MEMBERS */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[150]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 p-6 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
                <Users2 className="h-5 w-5 text-blue-500" />
                <span>{editingEmployee ? `HIỆU CHỈNH NHÂN VIÊN: ${editingEmployee.fullName}` : 'KHAI BÁO NHÂN VIÊN MỚI'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-gray-400 hover:text-slate-800 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEmployee} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Mã nhân viên (*)</label>
                  <input
                    type="text"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    disabled={!!editingEmployee}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-slate-100 rounded-lg focus:outline-none"
                    placeholder="NV-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Họ và tên nhân viên (*)</label>
                  <input
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Nguyễn Văn A"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Phòng ban / Bộ phận</label>
                  <select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="Ban Tài chính - Kế toán">Ban Tài chính - Kế toán</option>
                    <option value="Bộ phận Kho vật tư">Bộ phận Kho vật tư</option>
                    <option value="Hành chính - Nhân sự">Hành chính - Nhân sự</option>
                    <option value="Ban Giám đốc">Ban Giám đốc</option>
                    <option value="Đội xe thi công">Đội xe thi công</option>
                    <option value="Tổ kỹ thuật hiện trường">Tổ kỹ thuật hiện trường</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Chức danh / Chức vụ</label>
                  <input
                    type="text"
                    value={empTitle}
                    onChange={(e) => setEmpTitle(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Kế toán dự án"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Vai trò trên phần quyền hệ thống</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    <option value={UserRole.ACCOUNTANT}>{UserRole.ACCOUNTANT}</option>
                    <option value={UserRole.STOREKEEPER}>{UserRole.STOREKEEPER}</option>
                    <option value={UserRole.HCNS}>{UserRole.HCNS}</option>
                    <option value={UserRole.BOSS}>{UserRole.BOSS}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Số điện thoại liên lạc</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 0905 xxx xxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={empBankNo}
                    onChange={(e) => setEmpBankNo(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Số tài khoản ngân hàng"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Tên ngân hàng hưởng nhận</label>
                  <select
                    value={empBankName}
                    onChange={(e) => setEmpBankName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="Techcombank">Techcombank</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="MB Bank">MB Bank</option>
                    <option value="VietinBank">VietinBank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="Agribank">Agribank</option>
                    <option value="ACB">ACB</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Định dạng hiển thị chữ ký in ấn</label>
                  <input
                    type="text"
                    value={empSigCode}
                    onChange={(e) => setEmpSigCode(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ký hiệu e.g. Kế toán Bảo - Đã ký"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Chữ ký tự động xuất ra khi in biểu mẫu.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Trạng thái làm việc</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="Đang làm việc">Đang làm việc</option>
                    <option value="Nghỉ bảo hiểm">Nghỉ bảo hiểm</option>
                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-555 uppercase mb-1">Hạn mức tạm ứng tối đa trong tháng (VNĐ)</label>
                <input
                  type="number"
                  value={empMaxLimit}
                  onChange={(e) => setEmpMaxLimit(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Hạn mức e.g. 50000000"
                />
              </div>

              {/* Submit panel */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-50 border border-slate-200 text-slate-650 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 hover:bg-emerald-700 bg-emerald-600 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                >
                  {editingEmployee ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
