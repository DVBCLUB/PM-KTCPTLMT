/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Expense, ExpenseGroup, ExpenseType, UserRole, DocumentProgress } from '../types';
import { Plus, Search, Filter, Trash2, Edit2, AlertCircle, FileSpreadsheet, Check, RefreshCw, Printer, Copy, Eye, FileText, Group, Layers, Users, Fuel, ClipboardCheck } from 'lucide-react';
import ProjectFormModal from './ProjectFormModal';
import ExpenseDetailModal from './ExpenseDetailModal';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddOrUpdateExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  currentRole: UserRole;
  baselineDate: string;
  documents?: DocumentProgress[];
  onAddOrUpdateDoc?: (doc: DocumentProgress) => Promise<void>;
  clearancePeriod?: number;
  formApprovalThreshold?: number;
}

// Date helper to check difference in days
const getDaysDiff = (date1Str: string, date2Str: string): number => {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Date helper to add days
const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Reusable double entry account resolver following standard Vietnamese accounting system (VAS)
export const resolveAccountingAccounts = (expense: Expense) => {
  let debitAcc = '141'; // default prepayments (Phải thu tạm ứng)
  let creditAcc = '1111'; // default cash (Tiền mặt VND)

  // Credit account depends on payment status and bank/cash selection
  if (expense.column1 === 'CK' || expense.notes?.toLowerCase().includes('chuyển khoản') || expense.content?.toLowerCase().includes('ck')) {
    creditAcc = '1121'; // Bank transfers
  }

  // Debit Account mapping based on Vietnamese Chart of Accounts
  const typeLower = expense.expenseType?.toLowerCase() || '';
  const groupLower = expense.expenseGroup?.toLowerCase() || '';

  if (typeLower.includes('dầu') || typeLower.includes('fuel') || groupLower.includes('621')) {
    debitAcc = '152'; // Raw materials / Fuel in storage (TK 152) or TK 621
  } else if (typeLower.includes('vật liệu') || typeLower.includes('vật tư') || groupLower.includes('621')) {
    debitAcc = '152'; // Material Inventory
  } else if (typeLower.includes('nhân công') || typeLower.includes('labor') || groupLower.includes('622')) {
    debitAcc = '622'; // Direct Labor
  } else if (typeLower.includes('hành chính') || typeLower.includes('phòng') || groupLower.includes('642')) {
    debitAcc = '6422'; // Administrative Expense
  } else if (typeLower.includes('bếp ăn') || typeLower.includes('kitchen')) {
    debitAcc = '6271'; // Service kitchen/workers meal
  } else if (typeLower.includes('tiếp khách') || typeLower.includes('reception')) {
    debitAcc = '6428'; // Guest hospitality
  } else if (typeLower.includes('công tác') || typeLower.includes('vận chuyển') || typeLower.includes('travel')) {
    debitAcc = '6273'; // Tools/travel or TK 642
  } else {
    debitAcc = '6278'; // general sub-expense
  }

  // Adjust depending on whether it is an advance request or final settlement
  if (expense.actualAmount > 0 && expense.advanceAmount > 0) {
    // Completed clearance: Debit 6xx/152 (expense) and Credit 141 (Clearance)
    return { debit: debitAcc, credit: '141', label: `Nợ ${debitAcc} / Có 141` };
  } else if (expense.advanceAmount > 0 && expense.actualAmount === 0) {
    // Pure advance payment: Debit 141 (prepayment) and Credit 1111/1121 (Cash/Bank)
    return { debit: '141', credit: creditAcc, label: `Nợ 141 / Có ${creditAcc}` };
  } else {
    // Pure actual spend without advance: Debit 6xx / 152 and Credit 1111/1121
    return { debit: debitAcc, credit: creditAcc, label: `Nợ ${debitAcc} / Có ${creditAcc}` };
  }
};

// Generates standard voucher code for accounting reports
export const getVoucherNo = (exp: Expense, index: number) => {
  const isBank = exp.column1 === 'CK' || exp.notes?.toLowerCase().includes('chuyển khoản') || exp.content?.toLowerCase().includes('ck');
  const prefix = isBank ? 'UNC' : 'PC'; // UNC = Ủy nhiệm chi, PC = Phiếu chi
  
  // Pad index with 4 zeros
  const numStr = String(index + 1).padStart(4, '0');
  
  if (exp.advanceAmount > 0 && exp.actualAmount > 0) {
    return `QTHƯ-${numStr}`; // Quyết toán hoàn ứng
  } else if (exp.advanceAmount > 0) {
    return `TƯ-${numStr}`; // Tạm ứng
  } else {
    return `${prefix}-${numStr}`; // Phiếu chi / Ủy nhiệm chi trực tiếp
  }
};

export default function ExpenseTracker({
  expenses,
  onAddOrUpdateExpense,
  onDeleteExpense,
  currentRole,
  baselineDate,
  documents = [],
  onAddOrUpdateDoc,
  clearancePeriod = 15,
  formApprovalThreshold = 10000000,
}: ExpenseTrackerProps) {
  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [roleModeOnly, setRoleModeOnly] = useState<boolean>(true);
  const [filterCreatorRole, setFilterCreatorRole] = useState<string>('ALL');

  // Column specific filters (MISA AMIS style!)
  const [colFilters, setColFilters] = useState({
    requestDate: '',
    actualDate: '',
    content: '',
    expenseType: '',
    advanceAmount: '',
    actualAmount: '',
    remainingAmount: '',
    limitType: '',
    dueDate: '',
    clearanceStatus: 'ALL',
    documentStatus: 'ALL',
    invoiceNo: '',
    notes: '',
  });

  // Selected row ids for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detailed Expense state
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<Expense | null>(null);

  // Reset all filters including col-filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterType('ALL');
    setFilterStatus('ALL');
    setQuickFilter('ALL');
    setRoleModeOnly(true);
    setFilterCreatorRole('ALL');
    setColFilters({
      requestDate: '',
      actualDate: '',
      content: '',
      expenseType: '',
      advanceAmount: '',
      actualAmount: '',
      remainingAmount: '',
      limitType: '',
      dueDate: '',
      clearanceStatus: 'ALL',
      documentStatus: 'ALL',
      invoiceNo: '',
      notes: '',
    });
  };

  // Duplicate single expense
  const handleDuplicate = async (exp: Expense) => {
    try {
      const cloned: Expense = {
        ...exp,
        id: '', // reset id so backend creates a unique new one
        content: `${exp.content} (Nhân bản)`,
        createdAt: new Date().toISOString()
      };
      await onAddOrUpdateExpense(cloned);
    } catch (err: any) {
      alert('Nhân bản thất bại: ' + err.message);
    }
  };

  // Update clearance status (settle/unsettle)
  const handleUpdateStatus = async (exp: Expense, isSettled: boolean) => {
    try {
      const updated: Expense = {
        ...exp,
        clearanceStatus: isSettled ? 'Xong' : 'Đang hoàn ứng'
      };
      await onAddOrUpdateExpense(updated);
      if (selectedDetailExpense && selectedDetailExpense.id === exp.id) {
        setSelectedDetailExpense(updated);
      }
    } catch (err: any) {
      alert('Cập nhật trạng thái thất bại: ' + err.message);
    }
  };

  // Bulk deletion
  const handleBulkDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn không?`)) {
      try {
        for (const id of selectedIds) {
          await onDeleteExpense(id);
        }
        setSelectedIds([]);
        alert('Xóa hàng loạt thành công!');
      } catch (err: any) {
        alert('Có lỗi khi xóa hàng loạt: ' + err.message);
      }
    }
  };

  // Bulk mark as settled (hoàn ứng xong)
  const handleBulkApprove = async () => {
    if (confirm(`Bạn có chắc chắn muốn duyệt hoàn ứng cho ${selectedIds.length} dòng đã chọn không?`)) {
      try {
        for (const id of selectedIds) {
          const exp = expenses.find(x => x.id === id);
          if (exp && exp.clearanceStatus !== 'Xong') {
            await onAddOrUpdateExpense({
              ...exp,
              clearanceStatus: 'Xong'
            });
          }
        }
        setSelectedIds([]);
        alert('Phê duyệt hoàn ứng hàng loạt thành công!');
      } catch (err: any) {
        alert('Có lỗi khi duyệt hoàn ứng hàng loạt: ' + err.message);
      }
    }
  };

  // Export to standard CSV/Excel format formatted cleanly
  const handleExportCSV = () => {
    const listToExport = selectedIds.length > 0 
      ? expenses.filter(e => selectedIds.includes(e.id))
      : filteredExpenses;

    if (listToExport.length === 0) {
      alert('Không có dòng dữ liệu nào để xuất!');
      return;
    }

    const headers = [
      'STT',
      'Ngày đề nghị',
      'Ngày chi thực',
      'Nội dung chi phí',
      'Nhóm và Loại chi phí',
      'Số tiền tạm ứng',
      'Số tiền chi thực',
      'Số dư còn lại',
      'Hạn mức chi',
      'Hạn hoàn ứng',
      'Trạng thái hoàn ứng',
      'Hồ sơ / Chứng từ',
      'Số HĐ',
      'Ghi chú'
    ];

    const rows = listToExport.map((exp, index) => {
      const rem = exp.advanceAmount - exp.actualAmount;
      const dueDate = addDays(exp.actualDate, clearancePeriod);
      return [
        index + 1,
        exp.requestDate || '',
        exp.actualDate || '',
        `"${(exp.content || '').replace(/"/g, '""')}"`,
        `"${(exp.expenseType || '')} (${exp.expenseGroup || ''})"`,
        exp.advanceAmount || 0,
        exp.actualAmount || 0,
        rem,
        `"${(exp.limitType || 'Theo thực tế').replace(/"/g, '""')}"`,
        dueDate,
        `"${exp.clearanceStatus === 'Xong' ? 'Đã hoàn ứng' : 'Đang hoàn ứng'}"`,
        `"${exp.documentStatus}"`,
        `"${(exp.invoiceNo || '').replace(/"/g, '""')}"`,
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_chi_phi_MISA_AMIS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection for all filtered ones
  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredExpenses.map(e => e.id);
    const areAllSelected = allFilteredIds.every(id => selectedIds.includes(id));

    if (areAllSelected) {
      // Deselect all filtered
      setSelectedIds(selectedIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      const union = Array.from(new Set([...selectedIds, ...allFilteredIds]));
      setSelectedIds(union);
    }
  };

  // Handle single checklist change
  const handleToggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingExpense, setPrintingExpense] = useState<Expense | null>(null);
  const [printingDossierCode, setPrintingDossierCode] = useState<string | null>(null);

  // Form Fields
  const [requestDate, setRequestDate] = useState(baselineDate);
  const [actualDate, setActualDate] = useState(baselineDate);
  const [content, setContent] = useState('');
  const [expenseGroup, setExpenseGroup] = useState<string>(ExpenseGroup.PROJECT_MGMT);
  const [expenseType, setExpenseType] = useState<string>(ExpenseType.ADMIN);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [limitType, setLimitType] = useState('Theo thực tế');
  const [clearanceStatus, setClearanceStatus] = useState<'Xong' | 'Đang hoàn ứng'>('Đang hoàn ứng');
  const [documentStatus, setDocumentStatus] = useState<'Đầy đủ' | 'Thiếu chứng từ'>('Đầy đủ');
  const [missingDocuments, setMissingDocuments] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [column1, setColumn1] = useState('');
  const [dossierCode, setDossierCode] = useState('');
  const [showNewDossierInput, setShowNewDossierInput] = useState(false);
  const [newDossierName, setNewDossierName] = useState('');
  const [formCreatedByRole, setFormCreatedByRole] = useState<string>(currentRole);

  // Auto-fill defaults depending on who represents the active role
  const handleOpenNewForm = () => {
    setEditingId(null);
    setRequestDate(baselineDate);
    setActualDate(baselineDate);
    setContent('');
    setAdvanceAmount(0);
    setActualAmount(0);
    setInvoiceNo('');
    setMissingDocuments('');
    setNotes('');
    setColumn1('');
    setClearanceStatus('Đang hoàn ứng');
    setDocumentStatus('Đầy đủ');
    setDossierCode('');
    setShowNewDossierInput(false);
    setNewDossierName('');
    setFormCreatedByRole(currentRole);

    if (currentRole === UserRole.STOREKEEPER) {
      setExpenseGroup(ExpenseGroup.CONSTRUCTION);
      setExpenseType(ExpenseType.FUEL);
      setLimitType('Theo định mức');
    } else if (currentRole === UserRole.HCNS) {
      setExpenseGroup(ExpenseGroup.PROJECT_MGMT);
      setExpenseType(ExpenseType.KITCHEN);
      setLimitType('60k/người');
    } else {
      setExpenseGroup(ExpenseGroup.PROJECT_MGMT);
      setExpenseType(ExpenseType.ADMIN);
      setLimitType('Theo thực tế');
    }
    setIsFormOpen(true);
  };

  const handleEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setRequestDate(exp.requestDate);
    setActualDate(exp.actualDate);
    setContent(exp.content || '');
    setExpenseGroup(exp.expenseGroup);
    setExpenseType(exp.expenseType);
    setAdvanceAmount(exp.advanceAmount);
    setActualAmount(exp.actualAmount);
    setLimitType(exp.limitType || 'Theo thực tế');
    setClearanceStatus(exp.clearanceStatus);
    setDocumentStatus(exp.documentStatus || 'Đầy đủ');
    setMissingDocuments(exp.missingDocuments || '');
    setInvoiceNo(exp.invoiceNo || '');
    setNotes(exp.notes || '');
    setColumn1(exp.column1 || '');
    setDossierCode(exp.dossierCode || '');
    setShowNewDossierInput(false);
    setNewDossierName('');
    setFormCreatedByRole(exp.createdByRole || currentRole);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung chi phí!');
      return;
    }

    let finalDossierCode = dossierCode;
    if (showNewDossierInput && newDossierName.trim() && onAddOrUpdateDoc) {
      const generatedCode = 'HS-' + Math.floor(Math.random() * 900 + 100);
      const newDoc: DocumentProgress = {
        id: 'doc-' + Date.now(),
        code: generatedCode,
        name: newDossierName.trim(),
        category: 'Khác',
        status: 'Soạn thảo',
        assignedTo: currentRole,
        notes: 'Hồ sơ gộp tạo nhanh khi nhập chi phí',
        updatedAt: baselineDate
      };
      await onAddOrUpdateDoc(newDoc);
      finalDossierCode = generatedCode;
    }

    const payload: Expense = {
      id: editingId || '',
      requestDate,
      actualDate,
      content,
      expenseGroup,
      expenseType,
      advanceAmount: Number(advanceAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      limitType,
      clearanceStatus,
      documentStatus,
      missingDocuments,
      invoiceNo,
      notes,
      column1,
      createdByRole: formCreatedByRole,
      createdAt: new Date().toISOString(),
      dossierCode: finalDossierCode || undefined
    };

    await onAddOrUpdateExpense(payload);
    setIsFormOpen(false);
  };

  // Status Clearance Formatter relative to simulation baseline date
  const computeClearanceDisplay = (exp: Expense) => {
    if (exp.clearanceStatus === 'Xong') {
      return {
        label: 'Xong',
        desc: 'Đã hoàn ứng',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }

    // Clearance due is actual spending date + clearancePeriod days
    const dueDate = addDays(exp.actualDate, clearancePeriod);
    const dayGap = getDaysDiff(baselineDate, dueDate);

    if (dayGap > 0) {
      return {
        label: 'Quá hạn',
        desc: `Quá hạn ${dayGap} ngày`,
        className: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
      };
    } else if (dayGap === 0) {
      return {
        label: 'Đến hạn',
        desc: 'Đến hạn hôm nay',
        className: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse font-medium'
      };
    } else {
      const daysLeft = Math.abs(dayGap);
      return {
        label: 'Đang hoàn ứng',
        desc: `Còn ${daysLeft} ngày`,
        className: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }
  };

  // Filter & Search Logic
  const filteredExpenses = expenses.filter((exp, index) => {
    // 1. Department Isolation Filter
    if (roleModeOnly) {
      if (currentRole === UserRole.STOREKEEPER) {
        // Storekeeper: only show their entries, OR fuel and materials categories
        const isStorekeeperCategory = exp.expenseType === ExpenseType.FUEL || exp.expenseType === ExpenseType.MATERIALS;
        if (exp.createdByRole !== UserRole.STOREKEEPER && !isStorekeeperCategory) {
          return false;
        }
      } else if (currentRole === UserRole.HCNS) {
        // HCNS: only show their entries, OR HCNS-related categories (Kitchen, Travel, Admin, Reception, Other)
        const isHCNSCategory = [
          ExpenseType.KITCHEN,
          ExpenseType.TRAVEL,
          ExpenseType.ADMIN,
          ExpenseType.RECEPTION,
          ExpenseType.OTHER
        ].includes(exp.expenseType as ExpenseType);
        if (exp.createdByRole !== UserRole.HCNS && !isHCNSCategory) {
          return false;
        }
      }
    }

    // 2. Filter by department creator
    if (filterCreatorRole !== 'ALL') {
      if (exp.createdByRole !== filterCreatorRole) {
        return false;
      }
    }

    const acc = resolveAccountingAccounts(exp);
    const code = getVoucherNo(exp, index);
    const textMatch = exp.content.toLowerCase().includes(search.toLowerCase()) ||
                      (exp.invoiceNo && exp.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
                      (exp.expenseType && exp.expenseType.toLowerCase().includes(search.toLowerCase())) ||
                      (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase())) ||
                      (exp.dossierCode && exp.dossierCode.toLowerCase().includes(search.toLowerCase())) ||
                      code.toLowerCase().includes(search.toLowerCase()) ||
                      acc.label.toLowerCase().includes(search.toLowerCase());
                      
    const typeMatch = filterType === 'ALL' || exp.expenseType === filterType;
    
    let statusMatch = true;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'XONG') {
        statusMatch = exp.clearanceStatus === 'Xong';
      } else if (filterStatus === 'QUAHAN') {
        statusMatch = exp.clearanceStatus === 'Đang hoàn ứng' && getDaysDiff(baselineDate, addDays(exp.actualDate, clearancePeriod)) > 0;
      } else if (filterStatus === 'HOANUNG') {
        statusMatch = exp.clearanceStatus === 'Đang hoàn ứng' && getDaysDiff(baselineDate, addDays(exp.actualDate, clearancePeriod)) <= 0;
      } else if (filterStatus === 'THIEUCHUNGTI') {
        statusMatch = exp.documentStatus === 'Thiếu chứng từ';
      }
    }

    let quickFilterMatch = true;
    if (quickFilter !== 'ALL') {
      if (quickFilter === 'OVER_10M') {
        quickFilterMatch = exp.actualAmount > formApprovalThreshold;
      } else if (quickFilter === 'UNDER_10M') {
        quickFilterMatch = exp.actualAmount <= formApprovalThreshold && exp.actualAmount > 0;
      } else if (quickFilter === 'MISSING_DOCS') {
        quickFilterMatch = exp.documentStatus === 'Thiếu chứng từ';
      } else if (quickFilter === 'DEBT_ADVANCE') {
        quickFilterMatch = exp.advanceAmount > exp.actualAmount;
      }
    }
    
    if (!(textMatch && typeMatch && statusMatch && quickFilterMatch)) return false;

    // Apply MISA AMIS column specific filters
    if (colFilters.requestDate) {
      const revReq = exp.requestDate.split('-').reverse().join('/');
      const revAct = exp.actualDate.split('-').reverse().join('/');
      if (!revReq.toLowerCase().includes(colFilters.requestDate.toLowerCase()) &&
          !revAct.toLowerCase().includes(colFilters.requestDate.toLowerCase()) &&
          !code.toLowerCase().includes(colFilters.requestDate.toLowerCase())) {
        return false;
      }
    }
    
    if (colFilters.content && 
        !exp.content.toLowerCase().includes(colFilters.content.toLowerCase()) &&
        !acc.label.toLowerCase().includes(colFilters.content.toLowerCase())) {
      return false;
    }
    
    if (colFilters.expenseType && 
        !exp.expenseType.toLowerCase().includes(colFilters.expenseType.toLowerCase()) &&
        !exp.expenseGroup.toLowerCase().includes(colFilters.expenseType.toLowerCase()) &&
        !exp.limitType?.toLowerCase().includes(colFilters.expenseType.toLowerCase())) {
      return false;
    }
    
    if (colFilters.advanceAmount) {
      const val = exp.advanceAmount?.toString() || '';
      if (!val.includes(colFilters.advanceAmount)) return false;
    }
    
    if (colFilters.actualAmount) {
      const val = exp.actualAmount?.toString() || '';
      if (!val.includes(colFilters.actualAmount)) return false;
    }
    
    if (colFilters.invoiceNo && 
        !exp.invoiceNo?.toLowerCase().includes(colFilters.invoiceNo.toLowerCase()) &&
        !exp.documentStatus.toLowerCase().includes(colFilters.invoiceNo.toLowerCase()) &&
        !(exp.missingDocuments && exp.missingDocuments.toLowerCase().includes(colFilters.invoiceNo.toLowerCase()))) {
      return false;
    }

    if (colFilters.clearanceStatus !== 'ALL') {
      if (colFilters.clearanceStatus === 'Xong' && exp.clearanceStatus !== 'Xong') return false;
      if (colFilters.clearanceStatus === 'Quá hạn' && !(exp.clearanceStatus === 'Đang hoàn ứng' && getDaysDiff(baselineDate, addDays(exp.actualDate, clearancePeriod)) > 0)) return false;
      if (colFilters.clearanceStatus === 'Đang hoàn ứng' && !(exp.clearanceStatus === 'Đang hoàn ứng' && getDaysDiff(baselineDate, addDays(exp.actualDate, clearancePeriod)) <= 0)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Sổ Theo Dõi Tạm Ứng, Hoàn Ứng & Chi Phí Chi Tiết</h2>
          <p className="text-xs text-gray-500">Toàn bộ chứng từ chi phí phục vụ dự án thi công đường cao tốc Trung Lương - Mỹ Thuận</p>
        </div>
        
        {/* Actions grouped together */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export triggers */}
          <button
            id="export-excel-btn"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Xuất bảng chi phí ra file Excel (CSV UTF-8)"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            id="print-blank-forms-btn"
            onClick={() => {
              setPrintingExpense(null);
              setIsPrintModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>In Biểu Mẫu Trống</span>
          </button>

          {currentRole !== UserRole.BOSS ? (
            <button
              id="add-expense-btn"
              onClick={handleOpenNewForm}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Thêm Chi Phí / Tạm Ứng</span>
            </button>
          ) : (
            <div className="text-xs bg-rose-50 text-rose-700 px-3 py-2 rounded-xl border border-rose-100 font-medium whitespace-nowrap">
              🔒 Đang xem báo cáo
            </div>
          )}
        </div>
      </div>

      {/* Department-Focused Task Banner */}
      {(currentRole === UserRole.STOREKEEPER || currentRole === UserRole.HCNS) && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${
          roleModeOnly 
            ? currentRole === UserRole.STOREKEEPER 
              ? 'bg-amber-55/70 bg-amber-50/70 border-amber-200 text-amber-900 shadow-xs' 
              : 'bg-indigo-50/75 border-indigo-200 text-indigo-950 shadow-xs'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-start gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-xl shrink-0 ${
              roleModeOnly
                ? currentRole === UserRole.STOREKEEPER ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {currentRole === UserRole.STOREKEEPER ? <Fuel className="h-5 w-5 animate-pulse" /> : <ClipboardCheck className="h-5 w-5" />}
            </div>
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider block font-mono">
                {currentRole === UserRole.STOREKEEPER ? '👷 PHÂN HỆ QUẢN LÝ VẬT TƯ & NHIÊN LIỆU ĐƯỜNG BÃI' : '💼 PHÂN HỆ QUẢN LÝ HÀNH CHÍNH & TIỂU BAN SỐNG DÂN SINH'}
              </span>
              <h4 className="font-extrabold text-sm tracking-tight text-slate-900">
                {roleModeOnly 
                  ? currentRole === UserRole.STOREKEEPER 
                    ? 'Đang bật chế độ gom một mục: Chi phí chuyên trách Thủ kho (Xăng dầu & Vật tư)' 
                    : 'Đang bật chế độ gom một mục: Chi phí chuyên trách HCNS (Bếp ăn, Hành chính, Tiếp khách)'
                  : 'Sổ tổng hợp chi phí toàn bộ bãi dầm dã ngoại (Chế độ xem mở rộng)'
                }
              </h4>
              <p className="text-xs text-slate-600 leading-normal">
                {roleModeOnly 
                  ? currentRole === UserRole.STOREKEEPER
                    ? 'Hệ thống tự động lọc các phiếu chi, tạm ứng thuộc Quỹ Dầu và Vật tư do một mình bạn quản lý để tối ưu giao diện nhập liệu bãi dầm.'
                    : 'Hệ thống tự động lọc phần chi tiêu bếp ăn thợ, văn phòng phẩm, tiếp khách và chi phí hành chính do bạn phụ trách.'
                  : 'Đang hiển thị toàn thể các tài khoản và chứng từ của toàn bộ công trường (Nội nghiệp, kế hoạch...). Bạn chỉ có quyền sửa xóa các phiếu do bạn trực tiếp lập.'
                }
              </p>
            </div>
          </div>
          
          {/* Toggle Button */}
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
            <span className="text-xs font-bold leading-none select-none text-slate-700">
              {roleModeOnly ? '🔒 Đang tự thu gọn mục' : '🔓 Hiển thị tất cả'}
            </span>
            <button
              type="button"
              id="department-isolation-toggle"
              onClick={() => setRoleModeOnly(!roleModeOnly)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                roleModeOnly 
                  ? currentRole === UserRole.STOREKEEPER ? 'bg-amber-600' : 'bg-indigo-600' 
                  : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  roleModeOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Consolidated Dossier Panel (Gom nhóm và Quản lý Hồ sơ) */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3.5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5 uppercase">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span>Bàn làm việc Hồ sơ gộp & Chứng từ liên kết</span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
              Gom nhiều chi phí nhỏ vào chung một bộ hồ sơ đề xuất (dossier) để dễ dàng kiểm tra, phê duyệt, in gộp báo cáo nhanh.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[10px] text-slate-400 hover:text-white bg-slate-800 border border-slate-700/60 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* List of active dossiers grouped by code */}
        {(() => {
          // Find all unique dossierCodes that exist on active expenses or exist in documents
          const activeDossierCodes = Array.from(new Set([
            ...documents.map(d => d.code),
            ...expenses.map(e => e.dossierCode).filter(Boolean) as string[]
          ]));

          if (activeDossierCodes.length === 0) {
            return (
              <div className="p-3 text-center bg-slate-950/40 border border-slate-800/40 rounded-xl text-[11px] text-slate-500 italic">
                Chưa có bộ hồ sơ gộp nào được liên kết. Bấm sửa dòng chi tiết bất kỳ để liên kết mã đề xuất hồ sơ!
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDossierCodes.map(code => {
                const linkedExpenses = expenses.filter(e => e.dossierCode === code);
                const docRef = documents.find(d => d.code === code);
                const name = docRef ? docRef.name : `Bộ hồ sơ đề xuất thanh quyết toán gộp [${code}]`;
                const status = docRef ? docRef.status : 'Khởi tạo chi phí';
                
                const totalAdvance = linkedExpenses.reduce((sum, e) => sum + (e.advanceAmount || 0), 0);
                const totalActual = linkedExpenses.reduce((sum, e) => sum + (e.actualAmount || 0), 0);
                const count = linkedExpenses.length;

                const isSearchingThis = search.toLowerCase() === code.toLowerCase();

                return (
                  <div 
                    key={code}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSearchingThis 
                        ? 'bg-blue-950/50 border-blue-500/80 shadow-xs' 
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/65'
                    }`}
                  >
                    <div className="space-y-1.5">
                      {/* Header with Code & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700/40 text-blue-300">
                          {code}
                        </span>
                        
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          status === 'Hoàn tất' || status === 'Đã ký duyệt'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : status === 'Trình ký'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Name */}
                      <h4 className="text-[11.5px] font-bold text-slate-100 line-clamp-1" title={name}>
                        {name}
                      </h4>

                      {/* Mini counts and stats */}
                      <div className="pt-1.5 flex items-center justify-between border-t border-slate-800/50 text-[10px] font-mono text-slate-400">
                        <div>
                          Tổng cộng: <span className="font-bold text-slate-200">{count} khoản chi</span>
                        </div>
                        <div>
                          Tổng tiền: <span className="font-bold text-emerald-400">
                            {((totalActual > 0 ? totalActual : totalAdvance) || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="mt-2.5 pt-2 border-t border-slate-850 border-t-slate-800/40 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSearch(code)}
                        className={`px-2 py-1 rounded text-[9.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isSearchingThis 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title="Lọc bảng chi tiết hồ sơ chứng từ này"
                      >
                        <Search className="h-2.5 w-2.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => {
                          setPrintingExpense(null);
                          setPrintingDossierCode(code);
                        }}
                        className={`px-2 py-1 rounded text-[9.5px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                          count === 0 
                            ? 'bg-slate-800 text-slate-650 border border-slate-850 cursor-not-allowed opacity-50' 
                            : 'bg-emerald-650 hover:bg-emerald-600 text-white shadow-sm'
                        }`}
                        title="Vẽ, in gộp toàn bộ bảng kê chi phí thuộc hồ sơ này"
                      >
                        <Printer className="h-2.5 w-2.5" />
                        <span>In Gộp Sổ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="expense-search-input"
            type="text"
            placeholder="Tìm kiếm nội dung, số HĐ, ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filter on Expense Type */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <select
            id="expense-type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full py-2 px-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả loại chi phí</option>
            {Object.values(ExpenseType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Filter on Clearance Status */}
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <select
            id="expense-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full py-2 px-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả trạng thái hoàn ứng</option>
            <option value="XONG">Duyệt xong (Đã hoàn ứng)</option>
            <option value="HOANUNG">Đang hoàn ứng (Còn hạn)</option>
            <option value="QUAHAN">⚠️ Quá hạn hoàn ứng (&gt; {clearancePeriod} ngày)</option>
            <option value="THIEUCHUNGTI">Thiếu chứng từ kèm theo</option>
          </select>
        </div>

        {/* Filter on Department Creator */}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <select
            id="expense-dept-filter"
            value={filterCreatorRole}
            onChange={(e) => setFilterCreatorRole(e.target.value)}
            className="w-full py-2 px-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="ALL">Gom theo Đơn vị nhập</option>
            <option value={UserRole.STOREKEEPER}>Nhóm Thủ kho (Dầu & Vật tư)</option>
            <option value={UserRole.HCNS}>Nhóm Hành chính (HCNS / Bếp ăn)</option>
            <option value={UserRole.ACCOUNTANT}>Kế toán / Nội nghiệp / Kế hoạch</option>
          </select>
        </div>

        {/* Count display */}
        <div className="flex items-center justify-end text-xs text-gray-500 font-mono font-medium">
          Hiển thị: {filteredExpenses.length} / {expenses.length} dòng
        </div>

        {/* Quick Filter Chips */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-5 flex flex-wrap gap-1.5 items-center pt-2.5 border-t border-gray-105 border-t-slate-100">
          <span className="text-[9.5px] text-gray-400 uppercase font-extrabold tracking-wider mr-1 shrink-0">Lọc nhanh chứng từ:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'OVER_10M', label: 'Chi phí > 10 triệu (Mẫu Văn phòng)' },
            { id: 'UNDER_10M', label: 'Chi phí ≤ 10 triệu (Mẫu Dự án)' },
            { id: 'MISSING_DOCS', label: '⚠️ Thiếu chứng từ gốc' },
            { id: 'DEBT_ADVANCE', label: 'Còn dư tạm ứng' },
          ].map(chip => {
            const isActive = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-sans'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* MISA AMIS Bulk Action Panel */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="font-bold">Đang chọn {selectedIds.length} dòng chứng từ chi phí:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {/* Bulk settlement check */}
            <button
              onClick={handleBulkApprove}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Duyệt quyết hoàn ứng ({selectedIds.length})</span>
            </button>

            {/* Bulk export */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>Xuất Excel ({selectedIds.length})</span>
            </button>

            {currentRole !== UserRole.BOSS && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Xóa hàng loạt ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Primary Spreasheet / Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px] leading-normal" id="expense-table">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-100 divide-x divide-gray-150">
                <th className="py-2.5 px-3 font-semibold text-center w-16 select-none">
                  <div className="flex items-center justify-center gap-1">
                    <input 
                      type="checkbox" 
                      onChange={handleToggleSelectAll} 
                      checked={filteredExpenses.length > 0 && filteredExpenses.every(e => selectedIds.includes(e.id))} 
                      className="cursor-pointer rounded border-gray-350 text-blue-650 h-3.5 w-3.5"
                    />
                    <span>STT</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold w-32">Chứng từ</th>
                <th className="py-2.5 px-3 font-semibold min-w-[220px]">Diễn giải & Hạch toán</th>
                <th className="py-2.5 px-3 font-semibold">Phân loại & Định mức</th>
                <th className="py-2.5 px-3 text-right font-semibold w-28">Tạm ứng (Nợ 141)</th>
                <th className="py-2.5 px-3 text-right font-semibold w-28">Chi thực tế</th>
                <th className="py-2.5 px-3 text-right font-semibold w-24">Dư tạm ứng</th>
                <th className="py-2.5 px-3 font-semibold">Bộ chứng từ gốc & Quyết toán</th>
                <th className="py-2.5 px-3 font-semibold text-center w-28">Thao tác [Biểu mẫu]</th>
              </tr>
              
              {/* Column Specific Filter Row */}
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-200 divide-x divide-slate-100 no-print">
                <td className="p-1.5 text-center">
                  <button
                    onClick={handleResetFilters}
                    className="p-1.5 bg-white hover:bg-slate-100 rounded border border-gray-300 text-[9px] text-blue-600 font-bold font-sans cursor-pointer flex items-center justify-center mx-auto"
                    title="Xóa bộ lọc cột"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </td>
                
                {/* Chứng từ filter */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Mã / Ngày..."
                    value={colFilters.requestDate}
                    onChange={(e) => setColFilters({...colFilters, requestDate: e.target.value})}
                    className="w-full px-1 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white font-mono shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                {/* Diễn giải & Hạch toán filter */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Nội dung / TK..."
                    value={colFilters.content}
                    onChange={(e) => setColFilters({...colFilters, content: e.target.value})}
                    className="w-full px-1 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                {/* Phân loại và định mức filter */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Loại / Định mức..."
                    value={colFilters.expenseType}
                    onChange={(e) => setColFilters({...colFilters, expenseType: e.target.value})}
                    className="w-full px-1 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                {/* Tạm ứng */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Số tiền..."
                    value={colFilters.advanceAmount}
                    onChange={(e) => setColFilters({...colFilters, advanceAmount: e.target.value})}
                    className="w-full px-1 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white text-right font-mono shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                {/* Chi thực tế */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Số tiền..."
                    value={colFilters.actualAmount}
                    onChange={(e) => setColFilters({...colFilters, actualAmount: e.target.value})}
                    className="w-full px-1 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white text-right font-mono shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                {/* Balance columns consolidated filter placeholder */}
                <td className="p-1 text-center font-bold text-slate-300">-</td>

                {/* Bộ chứng từ gốc & Hóa đơn filter */}
                <td className="p-1">
                  <input
                    type="text"
                    placeholder="Số HĐ / Hồ sơ..."
                    value={colFilters.invoiceNo}
                    onChange={(e) => setColFilters({...colFilters, invoiceNo: e.target.value})}
                    className="w-full px-1.5 py-0.5 border border-slate-200 rounded text-[10px] text-slate-800 bg-white font-mono shadow-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </td>

                <td className="p-1 text-center font-bold text-slate-300">
                  -
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 divide-x divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    Không tìm thấy chứng từ chi phí nào trùng khớp.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, index) => {
                  const rem = exp.advanceAmount - exp.actualAmount;
                  const statusInfo = computeClearanceDisplay(exp);
                  const dueDate = addDays(exp.actualDate, clearancePeriod);
                  const acc = resolveAccountingAccounts(exp);
                  const code = getVoucherNo(exp, index);
                  
                  return (
                    <tr 
                      key={exp.id} 
                      onClick={() => setSelectedDetailExpense(exp)}
                      className={`hover:bg-blue-50/50 active:bg-blue-100/40 transition-all cursor-pointer ${selectedIds.includes(exp.id) ? 'bg-blue-50/30' : ''}`}
                    >
                      {/* Index / Checkbox selector */}
                      <td className="py-2 px-3 text-center text-gray-500 font-mono select-none" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(exp.id)}
                            onChange={() => handleToggleSelectRow(exp.id)}
                            className="cursor-pointer rounded border-gray-300 text-blue-650 h-3.5 w-3.5"
                          />
                          <span className="text-gray-400 text-[10px]">{index + 1}</span>
                        </div>
                      </td>
                      
                      {/* Chứng từ (Voucher details combined) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          {/* Voucher Code & Creator Badge */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`inline-block w-fit px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${
                              exp.advanceAmount > 0 && exp.actualAmount > 0 
                                ? 'bg-amber-100 text-amber-800' 
                                : exp.advanceAmount > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-slate-100 text-slate-800'
                            }`}>
                              {code}
                            </span>
                            {exp.createdByRole ? (
                              <span className={`inline-block px-1 py-0.2 rounded font-mono font-black text-[7.5px] uppercase tracking-wide shrink-0 ${
                                exp.createdByRole === UserRole.STOREKEEPER ? 'bg-amber-100 text-amber-800' :
                                exp.createdByRole === UserRole.HCNS ? 'bg-indigo-100 text-indigo-800' :
                                exp.createdByRole === UserRole.ACCOUNTANT ? 'bg-emerald-100 text-emerald-800' :
                                exp.createdByRole === 'Nội nghiệp bãi dầm' ? 'bg-orange-100 text-orange-850' :
                                exp.createdByRole === 'Kế hoạch bãi dầm' ? 'bg-sky-100 text-sky-800' :
                                'bg-slate-100 text-slate-700'
                              }`} title={`Bộ phận lập: ${exp.createdByRole}`}>
                                {exp.createdByRole === UserRole.STOREKEEPER ? 'THỦ KHO' :
                                 exp.createdByRole === UserRole.HCNS ? 'HCNS' :
                                 exp.createdByRole === UserRole.ACCOUNTANT ? 'KẾ TOÁN' :
                                 exp.createdByRole === 'Nội nghiệp bãi dầm' ? 'NỘI NGHIỆP' :
                                 exp.createdByRole === 'Kế hoạch bãi dầm' ? 'KẾ HOẠCH' : exp.createdByRole}
                              </span>
                            ) : null}
                          </div>
                          {/* Payment Date */}
                          <span className="font-mono text-gray-800 font-semibold text-[10px]">
                            {exp.actualDate ? exp.actualDate.split('-').reverse().join('/') : '-'}
                          </span>
                          {/* Proposal request date if different */}
                          {exp.requestDate && exp.requestDate !== exp.actualDate && (
                            <span className="text-[9px] text-gray-400">
                              (ĐN: {exp.requestDate.split('-').reverse().slice(0, 2).join('/')})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Content & Accounting Entry (Diễn giải & TK đối ứng) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-gray-900 break-words leading-snug">
                            <Eye className="h-3 w-3 text-blue-500 shrink-0 opacity-40 hover:opacity-100" />
                            <span>{exp.content}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Dynamic accounting double entry visualizer */}
                            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5 w-fit">
                              <span className="font-semibold text-slate-600 bg-slate-200/80 px-1 rounded">VAS</span>
                              <span>{acc.label}</span>
                            </div>

                            {/* Clickable Dossier Code Badge */}
                            {exp.dossierCode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearch(exp.dossierCode || '');
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-800 text-[9.5px] font-bold font-sans transition-colors cursor-pointer"
                                title="Click để lọc tất cả các chi phí thuộc bộ hồ sơ này"
                              >
                                <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                                <span>Hồ sơ gộp: {exp.dossierCode}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phân loại & Định mức */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-700 text-[10.5px]">{exp.expenseType}</span>
                          <span className="text-[9px] text-gray-400 truncate max-w-[140px]" title={exp.expenseGroup}>
                            {exp.expenseGroup.split('(')[0]}
                          </span>
                          <span className="text-[9px] text-indigo-600/90 font-medium italic">
                            • Hạn mức: {exp.limitType || 'Theo thực tế'}
                          </span>
                        </div>
                      </td>

                      {/* Cash value column: Tạm ứng */}
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 bg-slate-50/30">
                        {exp.advanceAmount ? exp.advanceAmount.toLocaleString() : '-'}
                      </td>

                      {/* Cash value column: Chi thực tế */}
                      <td className="py-2.5 px-3 text-right font-mono text-gray-900 font-semibold bg-blue-50/10">
                        {exp.actualAmount ? exp.actualAmount.toLocaleString() : '-'}
                      </td>

                      {/* Cash value column: Dư tạm ứng */}
                      <td className={`py-2.5 px-3 text-right font-mono font-medium ${
                        rem < 0 
                          ? 'text-rose-600 font-semibold bg-rose-50/20' 
                          : rem > 0 
                            ? 'text-emerald-700 bg-emerald-50/20' 
                            : 'text-gray-400'
                      }`}>
                        {rem ? rem.toLocaleString() : '0'}
                      </td>

                      {/* Bộ chứng từ gốc & Trạng thái quyết toán */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {/* Invoice No Badge */}
                            {exp.invoiceNo ? (
                              <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded font-mono text-[9px]">
                                HĐ #{exp.invoiceNo}
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 italic">Không hóa đơn</span>
                            )}

                            {/* Document complete badge */}
                            {exp.documentStatus === 'Thiếu chứng từ' ? (
                              <div className="flex flex-col text-[9.5px]">
                                <span className="text-amber-700 font-bold flex items-center gap-0.5">
                                  ⚠️ Thiếu chứng từ
                                </span>
                                {exp.missingDocuments && (
                                  <span className="text-[8.5px] text-amber-500 italic max-w-[150px] truncate" title={exp.missingDocuments}>
                                    ({exp.missingDocuments})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[9.5px] flex items-center gap-0.5">
                                <Check className="h-3 w-3" /> Đủ bộ
                              </span>
                            )}
                          </div>

                          {/* Dynamic Clearance Progress bar */}
                          <div className="flex items-center gap-1.5 pt-0.5 border-t border-gray-100/60">
                            <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${statusInfo.className}`}>
                              <span>{statusInfo.label}</span>
                            </div>
                            <span className="text-[8.5px] text-gray-400">
                              (Hạn: {dueDate.split('-').reverse().slice(0, 2).join('/')})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintingExpense(exp);
                              setIsPrintModalOpen(true);
                            }}
                            className="inline-flex items-center gap-0.5 px-1.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-sans text-[9px] font-bold cursor-pointer transition-all"
                            title="In biểu mẫu kế toán (BM01-BM08)"
                          >
                            <Printer className="h-2.5 w-2.5 shrink-0" />
                            <span>In mẫu</span>
                          </button>

                          {currentRole !== UserRole.BOSS && (
                            <>
                              {/* Standard edit permissions: ACCOUNTANT can edit anything, others can only edit their own creations */}
                              {(currentRole === UserRole.ACCOUNTANT || exp.createdByRole === currentRole || !exp.createdByRole) ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicate(exp);
                                    }}
                                    className="p-1 text-sky-600 hover:bg-sky-50 hover:text-sky-700 rounded transition-colors cursor-pointer"
                                    title="Nhân bản (Clone)"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(exp);
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors cursor-pointer"
                                    title="Sửa"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`Bạn chắc chắn muốn xóa chi phí: "${exp.content}" không?`)) {
                                        await onDeleteExpense(exp.id);
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                    title="Xóa"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[9px] text-gray-450 italic px-1 whitespace-nowrap bg-slate-50 border border-slate-100/80 rounded" title="Chứng từ được lập bởi bộ phận khác và được bảo mật">
                                  🔒 Xem chuyên biệt
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input / Edit Modal Form Popup */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-wide">
                  {editingId ? 'Cập Nhật Chứng Từ Chi Phí' : 'Sinh Mới Chứng Từ Chi Phí'}
                </h3>
                <p className="text-[10px] text-blue-100">Bởi vai trò chuyên trách: {currentRole}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white leading-none text-xl p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Specialized Department Notification Banner */}
              {currentRole === UserRole.STOREKEEPER && (
                <div id="storekeeper-form-banner" className="bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded-lg flex items-start gap-2 mb-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="text-[10px] uppercase block tracking-wider font-mono text-amber-800">👷 Chuyên trách Thủ kho / Vật tư:</strong>
                    <p className="text-[10.5px]">Bạn đang lập chứng từ chi tiết thuộc nhóm Quỹ Dầu, Nhiên liệu & Vật tư thiết bị hiện trường bãi dầm dã ngoại.</p>
                  </div>
                </div>
              )}
              {currentRole === UserRole.HCNS && (
                <div id="hcns-form-banner" className="bg-indigo-50 text-indigo-950 border border-indigo-200 p-3 rounded-lg flex items-start gap-2 mb-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
                  <div>
                    <strong className="text-[10px] uppercase block tracking-wider font-mono text-indigo-850">💼 Chuyên trách HCNS:</strong>
                    <p className="text-[10.5px]">Bạn đang lập các chứng từ chi cho Bếp ăn công trường, văn phòng phẩm, tiếp khách, và sinh hoạt thợ bộ phận.</p>
                  </div>
                </div>
              )}
              {currentRole === UserRole.ACCOUNTANT && (
                <div id="accountant-form-banner" className="bg-blue-50 text-blue-900 border border-blue-200 p-3 rounded-lg flex items-start gap-2 mb-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="text-[10px] uppercase block tracking-wider font-mono text-blue-800">📑 Kế toán / Nội nghiệp / Kế hoạch:</strong>
                    <p className="text-[10.5px]">Bạn có quyền quản trị cao nhất, có thể hạch toán bất cứ tài khoản chi phí chung hay tạm ứng nào.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Request Date */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Ngày đề nghị tạm ứng:</label>
                  <input
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Actual Date */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Ngày chi thực tế:</label>
                  <input
                    type="date"
                    value={actualDate}
                    onChange={(e) => setActualDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Creator Role Designation Section */}
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Đơn vị & Bộ phận thụ hưởng / Người đề xuất:</label>
                {currentRole === UserRole.ACCOUNTANT ? (
                  <select
                    value={formCreatedByRole}
                    onChange={(e) => setFormCreatedByRole(e.target.value)}
                    className="w-full p-2 border border-blue-200 bg-blue-50/20 text-blue-900 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 font-medium cursor-pointer text-xs"
                  >
                    <option value={UserRole.ACCOUNTANT}>📋 Kế toán dự án (Kế toán David Bảo)</option>
                    <option value={UserRole.STOREKEEPER}>👷 Thủ kho bãi dầm (Chuyên trách Quỹ Dầu & Vật tư)</option>
                    <option value={UserRole.HCNS}>💼 Hành chính nhân sự (HCNS Cô Lan / Bếp ăn)</option>
                    <option value="Nội nghiệp bãi dầm">🚧 Bộ phận Nội nghiệp bãi dầm dã ngoại</option>
                    <option value="Kế hoạch bãi dầm">📊 Bộ phận Kế hoạch & Tiến độ dự án</option>
                  </select>
                ) : (
                  <div className="p-2 border border-gray-150 bg-gray-50 text-gray-700 rounded-lg text-xs flex items-center justify-between font-medium">
                    <span>
                      {formCreatedByRole === UserRole.STOREKEEPER ? '👷 Thủ kho bãi dầm (Quỹ Dầu & Vật tư)' :
                       formCreatedByRole === UserRole.HCNS ? '💼 Hành chính nhân sự (HCNS / Bếp ăn)' :
                       formCreatedByRole === UserRole.ACCOUNTANT ? '📋 Kế toán dự án' : formCreatedByRole}
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider font-bold font-mono">Tác vụ của bạn</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                  {currentRole === UserRole.ACCOUNTANT 
                    ? "Bạn đang ở vai trò điều phối viên chính. Tại đây bạn có thể hạch toán hộ cho các đầu việc của Nội nghiệp hoặc Ban Kế hoạch."
                    : "Chứng từ tự động được ghi nhận chính xác cho nhóm chuyên trách của bạn."
                  }
                </p>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Nội dung chi tiết:</label>
                <textarea
                  placeholder="Nhập nội dung chi tiêu e.g. Mua 200 lít dầu đổ xe MPD..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expense Group */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Nhóm chi phí:</label>
                  <select
                    value={expenseGroup}
                    onChange={(e) => setExpenseGroup(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 cursor-pointer text-xs"
                  >
                    {Object.values(ExpenseGroup).map(g => {
                      const isRecommended = 
                        (currentRole === UserRole.STOREKEEPER && g === ExpenseGroup.CONSTRUCTION) ||
                        (currentRole === UserRole.HCNS && g === ExpenseGroup.PROJECT_MGMT);
                      return (
                        <option key={g} value={g}>
                          {isRecommended ? `⭐ ${g} (Chuyên trách)` : g}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Expense Type */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Loại chi phí:</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 cursor-pointer text-xs"
                  >
                    {Object.values(ExpenseType).map(t => {
                      const isRecommended = 
                        (currentRole === UserRole.STOREKEEPER && [ExpenseType.FUEL, ExpenseType.MATERIALS].includes(t)) ||
                        (currentRole === UserRole.HCNS && [ExpenseType.KITCHEN, ExpenseType.TRAVEL, ExpenseType.ADMIN, ExpenseType.RECEPTION].includes(t));
                      return (
                        <option key={t} value={t}>
                          {isRecommended ? `⭐ ${t} (Đề xuất bãi dầm)` : t}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Advance Cash */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Số tiền tạm ứng (VNĐ):</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Actual Spend Cash */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Thực chi thực tế (VNĐ):</label>
                  <input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Limit Quota */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Hạn mức chi phí:</label>
                  <input
                    type="text"
                    value={limitType}
                    onChange={(e) => setLimitType(e.target.value)}
                    placeholder="Theo định mức, 60k/người,..."
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Dynamic Validation / Advisory Alerts */}
              {(() => {
                const totalTypeAmount = expenses
                  .filter(e => e.expenseType === expenseType && e.id !== editingId)
                  .reduce((sum, e) => sum + e.actualAmount, 0) + Number(actualAmount || 0);

                // Define standard estimated budget thresholds for categories to warn the user
                const budgets: Record<string, { limit: number; name: string }> = {
                  [ExpenseType.FUEL]: { limit: 120000000, name: 'Ngân sách Nhiên liệu (Dầu)' },
                  [ExpenseType.KITCHEN]: { limit: 40000000, name: 'Ngân sách Bếp ăn / Dân sinh' },
                  [ExpenseType.ADMIN]: { limit: 25000000, name: 'Ngân sách Quản lý / Hành chính' },
                };

                const categoryBudget = budgets[expenseType];
                if (categoryBudget && totalTypeAmount > categoryBudget.limit) {
                  return (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm animate-pulse">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <span className="font-bold text-[11px] block tracking-wide uppercase">⚠️ VƯỢT ĐỊNH MỨC CHI PHÍ DỰ ÁN:</span>
                        <p className="mt-0.5 leading-snug">
                          Đã chi tiêu lũy kế <strong>{totalTypeAmount.toLocaleString()} đ</strong> vượt quá hạn mức tối đa {categoryBudget.name} (Hạn mức là <strong>{categoryBudget.limit.toLocaleString()} đ</strong>)!
                        </p>
                      </div>
                    </div>
                  );
                } else if (categoryBudget && totalTypeAmount > categoryBudget.limit * 0.8) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <span className="font-bold text-[11px] block tracking-wide uppercase">⚠️ CẬN HẠN MỨC NGÂN SÁCH (Sắp vượt):</span>
                        <p className="mt-0.5 leading-snug">
                          Chi tiêu lũy kế đã đạt <strong>{totalTypeAmount.toLocaleString()} đ</strong> (<strong>{((totalTypeAmount / categoryBudget.limit) * 100).toFixed(0)}%</strong> của định mức {categoryBudget.name}). Hãy cân nhắc tiết kiệm chi phí!
                        </p>
                      </div>
                    </div>
                  );
                }

                // Show dynamic signature preview box to make it extremely clean and descriptive!
                return (
                  <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-3.5 rounded-xl flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <span className="font-bold text-[10.5px] uppercase block tracking-wider">Cách thức duyệt chi phí tự động:</span>
                      <p className="mt-0.5 leading-relaxed text-blue-750">
                        {Number(actualAmount || 0) <= formApprovalThreshold ? (
                          <span>
                            Số tiền <strong>≤ {(formApprovalThreshold / 1000000).toLocaleString('vi-VN')} triệu VNĐ</strong>: Hệ thống tự phân vào <strong>BIỂU MẪU DỰ ÁN</strong> (do Giám đốc BĐH & Kế toán dự án duyệt và ký điện tử).
                          </span>
                        ) : (
                          <span>
                            Số tiền <strong>&gt; {(formApprovalThreshold / 1000000).toLocaleString('vi-VN')} triệu VNĐ</strong>: Hệ thống tự phân vào <strong>BIỂU MẪU TỔNG VĂN PHÒNG</strong> (do Ban TGĐ Tổng Công ty & Kế toán trưởng xem xét toàn quyền).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {/* Clearance Status */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Trạng thái hoàn ứng:</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={clearanceStatus === 'Đang hoàn ứng'}
                        onChange={() => setClearanceStatus('Đang hoàn ứng')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Đang hoàn ứng (Hạn {clearancePeriod} ngày)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={clearanceStatus === 'Xong'}
                        onChange={() => setClearanceStatus('Xong')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-emerald-700 font-semibold">Xong (Đã hoàn thành)</span>
                    </label>
                  </div>
                </div>

                {/* Document Complete */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Tình trạng hồ sơ giấy:</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={documentStatus === 'Đầy đủ'}
                        onChange={() => setDocumentStatus('Đầy đủ')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-emerald-700 font-semibold">Đầy đủ chứng từ</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={documentStatus === 'Thiếu chứng từ'}
                        onChange={() => setDocumentStatus('Thiếu chứng từ')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-orange-700">Thiếu chứng từ</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Conditionally show Missing Documents list input */}
              {documentStatus === 'Thiếu chứng từ' && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-250 animate-fadeIn">
                  <label className="block text-amber-800 mb-1 font-semibold">Chứng từ, hóa đơn cần bổ sung thêm:</label>
                  <input
                    type="text"
                    value={missingDocuments}
                    onChange={(e) => setMissingDocuments(e.target.value)}
                    placeholder="e.g. Thiếu bill chuyển khoản, thiếu hóa đơn đỏ VAT...."
                    className="w-full p-2 border border-amber-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Invoice No */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Số hóa đơn / Số HĐ (nếu có):</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. 18109"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Additional custom notes */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Ghi chú bổ sung:</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Đỗ xe lu dầm ngày 2k..."
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Linked Dossier / Shared dossier container -- MISA Style */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>LIÊN KẾT BỘ HỒ SƠ CHỨNG TỪ GỘP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDossierInput(!showNewDossierInput);
                      if (!showNewDossierInput) {
                        setDossierCode('');
                      } else {
                        setNewDossierName('');
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
                  >
                    {showNewDossierInput ? '« Chọn hồ sơ sẵn có' : '+ Tạo nhanh bộ hồ sơ mới'}
                  </button>
                </div>

                {showNewDossierInput ? (
                  <div className="space-y-2">
                    <label className="block text-gray-400 text-[10px] uppercase font-bold">Tên bộ hồ sơ mới gộp chi phí:</label>
                    <input
                      type="text"
                      value={newDossierName}
                      onChange={(e) => setNewDossierName(e.target.value)}
                      placeholder="e.g. Hồ sơ đề xuất HCNS mua sắm VPP & Đồng phục Q2"
                      className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs bg-white"
                    />
                    <p className="text-[10px] text-gray-400 italic">Mã hồ sơ (HS-xxx) sẽ được tự động sinh ngẫu nhiên.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Chọn bộ hồ sơ chứng từ của dự án:</label>
                    <select
                      value={dossierCode}
                      onChange={(e) => setDossierCode(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      <option value="">-- Không gom/Không có hồ sơ gộp --</option>
                      {documents.map(doc => (
                        <option key={doc.id} value={doc.code}>
                          [{doc.code}] {doc.name} ({doc.status})
                        </option>
                      ))}
                    </select>
                    {dossierCode && (
                      <div className="mt-1.5 p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] text-blue-700 font-medium">
                        Có <strong>{expenses.filter(e => e.dossierCode === dossierCode && e.id !== editingId).length}</strong> khoản chi khác cùng chung bộ hồ sơ <strong>{dossierCode}</strong> này.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-center cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center cursor-pointer shadow-sm"
                >
                  Lưu Chứng Từ
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Project Printable Forms Modal */}
      <ProjectFormModal
        isOpen={isPrintModalOpen || !!printingDossierCode}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintingExpense(null);
          setPrintingDossierCode(null);
        }}
        selectedExpense={printingExpense}
        selectedExpenses={printingDossierCode ? expenses.filter(e => e.dossierCode === printingDossierCode) : null}
        dossierCode={printingDossierCode}
        baselineDate={baselineDate}
        formApprovalThreshold={formApprovalThreshold}
      />

      {/* MISA AMIS Rich Detailed Voucher Modal */}
      <ExpenseDetailModal
        expense={selectedDetailExpense}
        onClose={() => setSelectedDetailExpense(null)}
        onEdit={handleEdit}
        onDelete={onDeleteExpense}
        onDuplicate={handleDuplicate}
        onUpdateStatus={handleUpdateStatus}
        currentRole={currentRole}
        baselineDate={baselineDate}
      />

    </div>
  );
}
