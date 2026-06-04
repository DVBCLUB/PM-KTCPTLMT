/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Expense, UserRole, ExpenseType, ExpenseGroup } from '../types';
import { X, Printer, Copy, Check, Trash2, Edit2, AlertCircle, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { convertNumberToVietnameseWords } from './ProjectFormModal';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  onEdit: (exp: Expense) => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (exp: Expense) => Promise<void>;
  onUpdateStatus: (exp: Expense, isSettled: boolean) => Promise<void>;
  currentRole: UserRole;
  baselineDate: string;
}

export default function ExpenseDetailModal({
  expense,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onUpdateStatus,
  currentRole,
  baselineDate,
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  const remaining = expense.advanceAmount - expense.actualAmount;

  // Resolve double-entry accounts based on MISA AMIS standard Vietnamese criteria
  const resolveAccountingAccounts = () => {
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
      // Completed clearance: Debit 6xx (expense) and Credit 141 (Clearance)
      return {
        debit: debitAcc,
        credit: '141',
        description: 'Quyết toán hoàn ứng chứng từ',
        type: 'Hạch toán hoàn ứng'
      };
    } else if (expense.advanceAmount > 0 && expense.actualAmount === 0) {
      // Pure advance payment: Debit 141 (prepayment) and Credit 1111/1121 (Cash/Bank)
      return {
        debit: '141',
        credit: creditAcc,
        description: 'Tạm ứng kinh phí công trình',
        type: 'Chi tạm ứng'
      };
    } else {
      // Pure actual spend without advance: Debit 6xx / 152 and Credit 1111/1121
      return {
        debit: debitAcc,
        credit: creditAcc,
        description: 'Chi trực tiếp mua hàng hóa dịch vụ',
        type: 'Thanh toán trực tiếp'
      };
    }
  };

  const accounting = resolveAccountingAccounts();

  // Handle duplicate from detail view safely
  const handleDuplicateClick = async () => {
    if (confirm('Bạn có muốn nhân bản chứng từ chi phí này không?')) {
      await onDuplicate(expense);
      onClose();
    }
  };

  // Handle delete click safely
  const handleDeleteClick = async () => {
    if (confirm(`Bạn chắc chắn muốn xóa chứng từ: "${expense.content}"?`)) {
      await onDelete(expense.id);
      onClose();
    }
  };

  // Compute clearance days details
  const getClearanceDetails = () => {
    if (expense.clearanceStatus === 'Xong') {
      return {
        title: 'Đã hoàn ứng xong',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-600',
        desc: 'Chứng từ đã phê duyệt hoàn tất quyết toán, đầy đủ hóa đơn chứng từ hợp lệ.'
      };
    }

    const d1 = new Date(baselineDate);
    const d2 = new Date(expense.actualDate);
    d2.setDate(d2.getDate() + 15); // 15 days due
    const diffTime = d1.getTime() - d2.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue > 0) {
      return {
        title: `⚠️ Quá hạn hoàn ứng (${daysOverdue} ngày)`,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badge: 'bg-rose-600',
        desc: `Đã quá hạn quy định 15 ngày kể từ ngày chi thực tế (${expense.actualDate.split('-').reverse().join('/')}). Yêu cầu bổ sung quyết toán.`
      };
    } else if (daysOverdue === 0) {
      return {
        title: 'Đến hạn hoàn ứng hôm nay',
        color: 'text-amber-700 bg-amber-50 border-amber-200 animate-pulse',
        badge: 'bg-amber-600',
        desc: 'Hôm nay là hạn cuối cùng hoàn ứng quyết toán chứng từ này. Vui lòng cập nhật ngay.'
      };
    } else {
      return {
        title: `Đang hoàn ứng (Còn ${Math.abs(daysOverdue)} ngày)`,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        badge: 'bg-blue-600',
        desc: `Chứng từ đang chờ hoàn tất hạch toán quyết toán hóa đơn. Thời gian còn lại ${Math.abs(daysOverdue)} ngày.`
      };
    }
  };

  const statusObj = getClearanceDetails();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col my-8 animate-in fade-in-50 duration-200 text-xs">
        
        {/* TOP STATUS BAR & HEADER */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">Số chứng từ: CM-{expense.id.slice(-6).toUpperCase()}</span>
                <span className={`${statusObj.badge} text-[10px] text-white px-2 py-0.5 rounded-full font-semibold`}>
                  {expense.clearanceStatus === 'Xong' ? 'Đã Quyết Toán' : 'Chờ Hoàn Ứng'}
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-100 tracking-tight mt-0.5">
                Chi tiết Kế toán: {expense.content}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-slate-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ACCOUNTING GENERAL CONTENT AREA */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[75vh]">
          
          {/* LEFT 2-COL COLUMNS: MAIN GENERAL VOUCHER VIEW */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Box 1: General Info Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                Thông tin chung về chứng từ chi phí
              </h4>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Người tạo chứng từ / Vai trò:</span>
                  <span className="font-semibold text-gray-900">{expense.createdByRole}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Mã số hóa đơn (HĐ):</span>
                  <span className="font-mono text-gray-900 font-bold">{expense.invoiceNo || 'Không áp dụng'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Ngày đề xuất tạm ứng:</span>
                  <span className="font-mono text-gray-900 font-semibold">{expense.requestDate ? expense.requestDate.split('-').reverse().join('/') : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Ngày chi thực tế:</span>
                  <span className="font-mono text-gray-800 font-bold">{expense.actualDate ? expense.actualDate.split('-').reverse().join('/') : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Nhóm chi phí:</span>
                  <span className="text-gray-700 font-medium">{expense.expenseGroup}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Nhóm định mức:</span>
                  <span className="text-gray-700 italic font-medium">{expense.limitType || 'Theo thực tế'}</span>
                </div>
              </div>

              {expense.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-gray-400 block font-medium">Ghi chú giải trình hoặc nội dung bổ sung:</span>
                  <p className="text-gray-700 italic">{expense.notes}</p>
                </div>
              )}
            </div>

            {/* Box 2: Double-Entry Buchung (Hạch toán kế toán MISA AMIS) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider">
                  Hạch toán kế toán (Double-Entry Ledger)
                </h4>
                <div className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded font-mono">
                  {accounting.type}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-2 px-3 text-center w-20">Tài khoản Nợ</th>
                      <th className="py-2 px-3 text-center w-20">Tài khoản Có</th>
                      <th className="py-2 px-3">Đối tượng</th>
                      <th className="py-2 px-3 text-right">Số tiền hạch toán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    
                    {/* Advance flow row */}
                    {expense.advanceAmount > 0 && (
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">141</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-orange-700">
                          {expense.column1 === 'CK' ? '1121' : '1111'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium">{expense.createdByRole}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {expense.advanceAmount.toLocaleString()} đ
                        </td>
                      </tr>
                    )}

                    {/* Spend flow row */}
                    {expense.actualAmount > 0 && (
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">{accounting.debit}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-orange-700">
                          {expense.advanceAmount > 0 ? '141' : (expense.column1 === 'CK' ? '1121' : '1111')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium">Nhà thầu / Người thụ hưởng</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {expense.actualAmount.toLocaleString()} đ
                        </td>
                      </tr>
                    )}
                    
                  </tbody>
                </table>
              </div>

              {/* Total Written-out words */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-500">Tổng số tiền chi hạch toán:</span>
                  <span className="font-mono text-sm font-black text-slate-900">
                    {((expense.actualAmount || expense.advanceAmount || 0)).toLocaleString()} VNĐ
                  </span>
                </div>
                <div className="text-gray-600 italic">
                  <strong>Bằng chữ:</strong> {convertNumberToVietnameseWords(expense.actualAmount || expense.advanceAmount || 0)}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ACTION PANEL, STATS, CHECKS */}
          <div className="space-y-6">
            
            {/* Box 3: Clearance Status Details */}
            <div className={`p-5 rounded-xl border shadow-3xs space-y-3 ${statusObj.color}`}>
              <h5 className="font-bold text-xs uppercase tracking-wider">Trạng Thái Quyết Toán</h5>
              <div className="text-[11px] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{statusObj.title}</span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-90">{statusObj.desc}</p>
              
              {/* If waiting for clearance, allow quick click to approve completed */}
              {expense.clearanceStatus === 'Đang hoàn ứng' && currentRole !== UserRole.BOSS && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(expense, true)}
                  className="w-full mt-3 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-bold text-[10px] shadow-sm transform hover:translate-y-[-0.5px] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  <span>Duyệt quyết toán (Hoàn ứng xong)</span>
                </button>
              )}

              {/* Toggle Back to clearance if already done */}
              {expense.clearanceStatus === 'Xong' && currentRole !== UserRole.BOSS && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(expense, false)}
                  className="w-full mt-3 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-center font-medium text-[10px] transition-colors cursor-pointer"
                >
                  Hoàn tác về chờ hoàn ứng
                </button>
              )}
            </div>

            {/* Box 4: Dossier Documentation Progress */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-900">
                Hồ sơ & Chứng từ đi kèm
              </h5>

              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Trạng thái chứng từ:</span>
                  {expense.documentStatus === 'Thiếu chứng từ' ? (
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 border border-amber-200 rounded">
                      ⚠️ Bản thiếu / Chờ bổ sung
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded">
                      ✓ Đạt yêu cầu đầy đủ
                    </span>
                  )}
                </div>

                {expense.documentStatus === 'Thiếu chứng từ' && expense.missingDocuments && (
                  <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100 text-amber-800 space-y-1">
                    <span className="font-bold text-[10px] uppercase block">Hồ sơ còn nợ:</span>
                    <p className="italic">{expense.missingDocuments}</p>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
                  <span className="font-bold text-[10px] text-gray-500 uppercase block">Quy trình bàn giao kế toán:</span>
                  <div className="space-y-1 font-mono text-[10px] text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>1. Đề xuất: Đã duyệt ({expense.createdByRole})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>2. Chi quỹ: Đã nhận tiền</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${expense.clearanceStatus === 'Xong' ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`}></span>
                      <span>3. Quyết toán: {expense.clearanceStatus === 'Xong' ? 'Đã hoàn tất kiểm tra' : 'Đang xử lý'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 5: Quick Management Actions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-2.5">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-900">Tính năng quản trị</h5>
              
              <div className="space-y-2 text-xs">
                
                {/* Print button mapped */}
                <button
                  type="button"
                  onClick={() => {
                    // Open template print window in parent
                    const printBtn = document.getElementById('print-blank-forms-btn') as HTMLElement;
                    if (printBtn) {
                      onClose();
                      setTimeout(() => {
                        const targetCheckbox = document.getElementById('expense-table');
                        // In case we want to customize, simulate the parent trigger
                        printBtn.click();
                      }, 100);
                    }
                  }}
                  className="w-full py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-2 border border-slate-200"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Xuất in biểu mẫu BM01-BM08</span>
                </button>

                {currentRole !== UserRole.BOSS && (
                  <>
                    {/* Clone button */}
                    <button
                      type="button"
                      onClick={handleDuplicateClick}
                      className="w-full py-2 px-3.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="h-4 w-4 text-sky-600" />
                      <span>Nhân bản chứng từ (Clone)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          onEdit(expense);
                          onClose();
                        }}
                        className="py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-lg text-center font-semibold cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Sửa</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-lg text-center font-semibold cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* FOOTER CLOSE CONTAINER */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer text-xs"
          >
            Đóng bảng xem
          </button>
        </div>

      </div>
    </div>
  );
}
