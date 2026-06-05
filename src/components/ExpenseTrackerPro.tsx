import React, { useMemo, useState } from 'react';
import { Expense, ExpenseGroup, ExpenseType, UserRole, DocumentProgress } from '../types';
import { AlertCircle, CalendarDays, CheckCircle2, Edit3, FileSpreadsheet, Plus, ReceiptText, Search, Sparkles, Trash2, X } from 'lucide-react';

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

type TaxMode = 'none' | 'vat_included' | 'vat_excluded';
type ExpenseWithTax = Expense & {
  taxRate?: number;
  taxAmount?: number;
  amountBeforeTax?: number;
  totalWithTax?: number;
  taxMode?: TaxMode;
};

const today = () => new Date().toISOString().slice(0, 10);
const toNumber = (value: string | number | undefined | null) => Number(String(value ?? '').replace(/[^0-9-]/g, '')) || 0;
const moneyRaw = (value: number) => value ? String(Math.round(value)) : '';
const moneyExcel = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);
const dateVN = (date: string) => date ? date.split('-').reverse().join('/') : '-';

const roleLabel = (role: string) => {
  if (role === UserRole.ACCOUNTANT) return 'Kế toán dự án';
  if (role === UserRole.STOREKEEPER) return 'Thủ kho / Vật tư';
  if (role === UserRole.HCNS) return 'HCNS / Hành chính';
  if (role === UserRole.BOSS) return 'Sếp / Giám đốc';
  return role || 'Người dùng';
};

const getExpenseCode = (type: string) => {
  if (type.includes('Dầu')) return 'FUEL';
  if (type.includes('Hành chính')) return 'ADMIN';
  if (type.includes('Vật liệu') || type.includes('Vật tư')) return 'MATERIALS';
  if (type.includes('Nhân công')) return 'LABOR';
  if (type.includes('Vận chuyển')) return 'SHIPPING';
  if (type.includes('Công tác')) return 'TRAVEL';
  return 'OTHER';
};

const getTaxFields = (exp: Expense): ExpenseWithTax => exp as ExpenseWithTax;

export default function ExpenseTrackerPro({
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDoc, setFilterDoc] = useState('ALL');

  const [requestDate, setRequestDate] = useState(today());
  const [actualDate, setActualDate] = useState(today());
  const [content, setContent] = useState('');
  const [expenseGroup, setExpenseGroup] = useState<string>(ExpenseGroup.PROJECT_MGMT);
  const [expenseType, setExpenseType] = useState<string>(ExpenseType.ADMIN);
  const [advanceAmountText, setAdvanceAmountText] = useState('');
  const [actualAmountText, setActualAmountText] = useState('');
  const [taxMode, setTaxMode] = useState<TaxMode>('none');
  const [taxRate, setTaxRate] = useState(10);
  const [limitType, setLimitType] = useState('Theo thực tế');
  const [clearanceStatus, setClearanceStatus] = useState<'Xong' | 'Đang hoàn ứng'>('Đang hoàn ứng');
  const [documentStatus, setDocumentStatus] = useState<'Đầy đủ' | 'Thiếu chứng từ'>('Đầy đủ');
  const [missingDocuments, setMissingDocuments] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TM');
  const [dossierCode, setDossierCode] = useState('');
  const [createdByRole, setCreatedByRole] = useState<string>(currentRole);

  const actualAmount = toNumber(actualAmountText);
  const advanceAmount = toNumber(advanceAmountText);

  const taxCalc = useMemo(() => {
    if (taxMode === 'none' || taxRate <= 0) {
      return { beforeTax: actualAmount, taxAmount: 0, total: actualAmount };
    }
    if (taxMode === 'vat_included') {
      const beforeTax = Math.round(actualAmount / (1 + taxRate / 100));
      return { beforeTax, taxAmount: actualAmount - beforeTax, total: actualAmount };
    }
    const taxAmount = Math.round(actualAmount * taxRate / 100);
    return { beforeTax: actualAmount, taxAmount, total: actualAmount + taxAmount };
  }, [actualAmount, taxMode, taxRate]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((exp) => {
      const ext = getTaxFields(exp);
      const text = [exp.content, exp.expenseType, exp.expenseGroup, exp.invoiceNo, exp.notes, exp.dossierCode, ext.taxMode, String(ext.taxRate || '')]
        .filter(Boolean).join(' ').toLowerCase();
      const matchText = !q || text.includes(q);
      const matchType = filterType === 'ALL' || exp.expenseType === filterType;
      const matchDoc = filterDoc === 'ALL' || exp.documentStatus === filterDoc;
      return matchText && matchType && matchDoc;
    });
  }, [expenses, search, filterType, filterDoc]);

  const totals = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => {
      const ext = getTaxFields(exp);
      acc.advance += exp.advanceAmount || 0;
      acc.actual += exp.actualAmount || 0;
      acc.tax += ext.taxAmount || 0;
      acc.totalWithTax += ext.totalWithTax || exp.actualAmount || 0;
      if (exp.documentStatus === 'Thiếu chứng từ') acc.missingDocs += 1;
      if (exp.clearanceStatus !== 'Xong') acc.pending += 1;
      return acc;
    }, { advance: 0, actual: 0, tax: 0, totalWithTax: 0, missingDocs: 0, pending: 0 });
  }, [filteredExpenses]);

  const resetForm = () => {
    const d = today();
    setEditingId(null);
    setRequestDate(d);
    setActualDate(d);
    setContent('');
    setAdvanceAmountText('');
    setActualAmountText('');
    setTaxMode('none');
    setTaxRate(10);
    setInvoiceNo('');
    setMissingDocuments('');
    setNotes('');
    setPaymentMethod('TM');
    setDossierCode('');
    setClearanceStatus('Đang hoàn ứng');
    setDocumentStatus('Đầy đủ');
    setCreatedByRole(currentRole);

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
  };

  const openNew = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (exp: Expense) => {
    const ext = getTaxFields(exp);
    setEditingId(exp.id);
    setRequestDate(exp.requestDate || today());
    setActualDate(exp.actualDate || today());
    setContent(exp.content || '');
    setExpenseGroup(exp.expenseGroup || ExpenseGroup.PROJECT_MGMT);
    setExpenseType(exp.expenseType || ExpenseType.ADMIN);
    setAdvanceAmountText(moneyRaw(exp.advanceAmount));
    setActualAmountText(moneyRaw(exp.actualAmount));
    setTaxMode(ext.taxMode || 'none');
    setTaxRate(Number(ext.taxRate ?? 10));
    setLimitType(exp.limitType || 'Theo thực tế');
    setClearanceStatus(exp.clearanceStatus || 'Đang hoàn ứng');
    setDocumentStatus(exp.documentStatus || 'Đầy đủ');
    setMissingDocuments(exp.missingDocuments || '');
    setInvoiceNo(exp.invoiceNo || '');
    setNotes(exp.notes || '');
    setPaymentMethod(exp.column1 || 'TM');
    setDossierCode(exp.dossierCode || '');
    setCreatedByRole(exp.createdByRole || currentRole);
    setIsFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung chi phí.');
      return;
    }
    setSaving(true);
    try {
      const payload: ExpenseWithTax = {
        id: editingId || '',
        requestDate: requestDate || today(),
        actualDate: actualDate || today(),
        content: content.trim(),
        expenseGroup,
        expenseType,
        advanceAmount,
        actualAmount,
        limitType,
        clearanceStatus,
        documentStatus,
        missingDocuments,
        invoiceNo,
        notes,
        column1: paymentMethod,
        createdByRole,
        createdAt: editingId ? (expenses.find(x => x.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        dossierCode: dossierCode || undefined,
        taxMode,
        taxRate: taxMode === 'none' ? 0 : taxRate,
        amountBeforeTax: taxCalc.beforeTax,
        taxAmount: taxCalc.taxAmount,
        totalWithTax: taxCalc.total,
      };
      await onAddOrUpdateExpense(payload);
      setIsFormOpen(false);
    } catch (err: any) {
      alert('Lưu chi phí thất bại: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ['STT','Ngày đề nghị','Ngày thực tế','Nội dung','Loại chi phí','Tạm ứng','Thực chi','Thuế','Tổng gồm thuế','Trạng thái hoàn ứng','Trạng thái chứng từ','Số HĐ','Ghi chú'];
    const rows = filteredExpenses.map((exp, i) => {
      const ext = getTaxFields(exp);
      return [i + 1, exp.requestDate, exp.actualDate, `"${(exp.content || '').replace(/"/g, '""')}"`, `"${exp.expenseType}"`, exp.advanceAmount || 0, exp.actualAmount || 0, ext.taxAmount || 0, ext.totalWithTax || exp.actualAmount || 0, `"${exp.clearanceStatus}"`, `"${exp.documentStatus}"`, `"${exp.invoiceNo || ''}"`, `"${exp.notes || ''}"`];
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_chi_phi_${today()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white shadow-xl border border-slate-800">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-blue-100 mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Sổ chi phí công trình
            </div>
            <h2 className="text-2xl font-black tracking-tight">Quản lý Chi phí · Tạm ứng · Thuế</h2>
            <p className="text-sm text-blue-100 mt-1 max-w-2xl">Form nhập mặc định ngày hôm nay, tiền nhập dạng số thô như Excel, có theo dõi thuế VAT/TNCN và tổng thanh toán.</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-400 text-emerald-950 font-extrabold text-sm shadow-lg shadow-emerald-950/20 hover:bg-emerald-300 transition-all">
            <Plus className="h-4 w-4" /> Nhập chi phí mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[{label:'Tạm ứng', value: totals.advance, tone:'blue'}, {label:'Thực chi', value: totals.actual, tone:'slate'}, {label:'Thuế', value: totals.tax, tone:'amber'}, {label:'Tổng gồm thuế', value: totals.totalWithTax, tone:'emerald'}, {label:'Thiếu CT / Hoàn ứng', value: `${totals.missingDocs} / ${totals.pending}`, tone:'rose'}].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-2 text-lg font-black text-slate-900 font-mono">{typeof card.value === 'number' ? moneyExcel(card.value) : card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nội dung, số HĐ, ghi chú, mã hồ sơ..." className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-blue-500">
            <option value="ALL">Tất cả loại chi phí</option>
            {Object.values(ExpenseType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterDoc} onChange={(e) => setFilterDoc(e.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-blue-500">
            <option value="ALL">Tất cả chứng từ</option>
            <option value="Đầy đủ">Đầy đủ</option>
            <option value="Thiếu chứng từ">Thiếu chứng từ</option>
          </select>
          <button onClick={exportCSV} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
            <FileSpreadsheet className="h-4 w-4" /> Xuất Excel/CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr className="text-left text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3 min-w-[260px]">Nội dung</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3 text-right">Tạm ứng</th>
                <th className="px-4 py-3 text-right">Thực chi</th>
                <th className="px-4 py-3 text-right">Thuế</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Chưa có dữ liệu phù hợp.</td></tr>
              ) : filteredExpenses.map((exp, index) => {
                const ext = getTaxFields(exp);
                return (
                  <tr key={exp.id || index} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{dateVN(exp.actualDate)}</div>
                      <div className="text-[11px] text-slate-400">ĐN: {dateVN(exp.requestDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 leading-snug">{exp.content}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        {exp.invoiceNo ? <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">HĐ {exp.invoiceNo}</span> : <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Không HĐ</span>}
                        {exp.dossierCode && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{exp.dossierCode}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{roleLabel(exp.createdByRole)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-semibold text-slate-800">{exp.expenseType}</div><div className="text-[11px] text-slate-400">{getExpenseCode(exp.expenseType)}</div></td>
                    <td className="px-4 py-3 text-right font-mono">{exp.advanceAmount ? moneyExcel(exp.advanceAmount) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{exp.actualAmount ? moneyExcel(exp.actualAmount) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{ext.taxAmount ? moneyExcel(ext.taxAmount) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{moneyExcel(ext.totalWithTax || exp.actualAmount || 0)}</td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${exp.clearanceStatus === 'Xong' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>{exp.clearanceStatus}</div>
                      <div className={`mt-1 text-[11px] ${exp.documentStatus === 'Thiếu chứng từ' ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>{exp.documentStatus}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(exp)} className="p-2 rounded-xl text-blue-700 hover:bg-blue-50" title="Sửa"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={async () => { if (confirm('Xóa dòng chi phí này?')) await onDeleteExpense(exp.id); }} className="p-2 rounded-xl text-rose-600 hover:bg-rose-50" title="Xóa"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/20">
            <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black tracking-widest uppercase text-emerald-300">Phiếu chi phí · chuẩn kế toán công trình</div>
                <h3 className="text-xl font-black mt-1">{editingId ? 'Cập nhật chi phí' : 'Nhập chi phí mới'}</h3>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-2 rounded-2xl hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="p-6 overflow-y-auto max-h-[78vh] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Ngày đề nghị"><input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="input-pro" required /></Field>
                <Field label="Ngày chi thực tế"><input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="input-pro" required /></Field>
                <Field label="Người/đơn vị nhập"><select value={createdByRole} onChange={(e) => setCreatedByRole(e.target.value)} className="input-pro"><option value={UserRole.ACCOUNTANT}>Kế toán dự án</option><option value={UserRole.STOREKEEPER}>Thủ kho</option><option value={UserRole.HCNS}>HCNS</option></select></Field>
              </div>

              <Field label="Nội dung chi tiết"><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ví dụ: Mua dầu DO cho xe công trình, thanh toán văn phòng phẩm..." rows={3} className="input-pro resize-none" required /></Field>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nhóm chi phí"><select value={expenseGroup} onChange={(e) => setExpenseGroup(e.target.value)} className="input-pro">{Object.values(ExpenseGroup).map(g => <option key={g} value={g}>{g}</option>)}</select></Field>
                <Field label="Loại chi phí"><select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} className="input-pro">{Object.values(ExpenseType).map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="Hạn mức/định mức"><input value={limitType} onChange={(e) => setLimitType(e.target.value)} className="input-pro" placeholder="Theo thực tế" /></Field>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3"><ReceiptText className="h-4 w-4 text-blue-700" /><h4 className="font-black text-slate-900">Số tiền & thuế</h4><span className="text-[11px] text-slate-500">Nhập số thô không dấu chấm/phẩy, ví dụ 1000000. Bảng sẽ hiển thị theo định dạng Excel.</span></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Field label="Tạm ứng"><input inputMode="numeric" value={advanceAmountText} onChange={(e) => setAdvanceAmountText(e.target.value.replace(/[^0-9]/g, ''))} className="input-pro font-mono" placeholder="0" /></Field>
                  <Field label="Thực chi"><input inputMode="numeric" value={actualAmountText} onChange={(e) => setActualAmountText(e.target.value.replace(/[^0-9]/g, ''))} className="input-pro font-mono" placeholder="0" /></Field>
                  <Field label="Kiểu thuế"><select value={taxMode} onChange={(e) => setTaxMode(e.target.value as TaxMode)} className="input-pro"><option value="none">Không thuế</option><option value="vat_included">Đã gồm thuế</option><option value="vat_excluded">Chưa gồm thuế</option></select></Field>
                  <Field label="Thuế suất %"><input inputMode="numeric" value={taxRate} onChange={(e) => setTaxRate(toNumber(e.target.value))} className="input-pro font-mono" /></Field>
                  <div className="rounded-2xl bg-white border border-slate-200 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Tổng thanh toán</div><div className="text-lg font-black text-emerald-700 font-mono">{moneyExcel(taxCalc.total)}</div><div className="text-[11px] text-slate-500">Thuế: {moneyExcel(taxCalc.taxAmount)}</div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Trạng thái hoàn ứng"><select value={clearanceStatus} onChange={(e) => setClearanceStatus(e.target.value as 'Xong' | 'Đang hoàn ứng')} className="input-pro"><option value="Đang hoàn ứng">Đang hoàn ứng</option><option value="Xong">Xong</option></select></Field>
                <Field label="Trạng thái chứng từ"><select value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value as 'Đầy đủ' | 'Thiếu chứng từ')} className="input-pro"><option value="Đầy đủ">Đầy đủ</option><option value="Thiếu chứng từ">Thiếu chứng từ</option></select></Field>
                <Field label="Hình thức"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-pro"><option value="TM">Tiền mặt</option><option value="CK">Chuyển khoản</option></select></Field>
              </div>

              {documentStatus === 'Thiếu chứng từ' && <Field label="Thiếu chứng từ gì?"><input value={missingDocuments} onChange={(e) => setMissingDocuments(e.target.value)} className="input-pro" placeholder="Ví dụ: thiếu hóa đơn VAT, biên bản giao nhận..." /></Field>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Số hóa đơn"><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input-pro" placeholder="Không có thì để trống" /></Field>
                <Field label="Mã hồ sơ"><input value={dossierCode} onChange={(e) => setDossierCode(e.target.value)} className="input-pro" placeholder="HS-001" /></Field>
                <Field label="Ghi chú"><input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-pro" /></Field>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Hủy</button>
                <button disabled={saving} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-black hover:from-blue-600 hover:to-indigo-600 disabled:opacity-60 inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu chi phí'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>{children}</label>;
}
