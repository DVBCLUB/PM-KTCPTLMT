/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Expense, FundReceipt, ExpenseGroup, ExpenseType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Printer, CheckCircle, TrendingUp, TrendingDown, RefreshCw, 
  ChevronDown, ChevronRight, Eye, ShieldAlert, Award, FileWarning, 
  Search, X, Calendar, DollarSign, ListFilter, HelpCircle, ArrowUpRight 
} from 'lucide-react';

interface ReportDashboardProps {
  expenses: Expense[];
  funds: FundReceipt[];
  onResetDB: () => Promise<void>;
  currentDate: string;
}

const COLORS = ['#1e3a8a', '#d97706', '#059669', '#dc2626', '#4f46e5'];

// Helper to get standard voucher codes for reports
export const getReportVoucherNo = (exp: Expense, index: number) => {
  const isBank = exp.column1 === 'CK' || exp.notes?.toLowerCase().includes('chuyển khoản') || exp.content?.toLowerCase().includes('ck');
  const prefix = isBank ? 'UNC' : 'PC'; // UNC = Ủy nhiệm chi, PC = Phiếu chi
  
  // Find index in original list if possible to keep stable numbering
  const numStr = String(index + 1).padStart(4, '0');
  
  if (exp.advanceAmount > 0 && exp.actualAmount > 0) {
    return `QTHƯ-${numStr}`; // Quyết toán hoàn ứng
  } else if (exp.advanceAmount > 0) {
    return `TƯ-${numStr}`; // Tạm ứng
  } else {
    return `${prefix}-${numStr}`; // Phiếu chi / Ủy nhiệm chi trực tiếp
  }
};

// Helper for double entry hạch toán
export const getReportAccountingAccount = (expense: Expense) => {
  let debitAcc = '141'; // default prepayments (Phải thu tạm ứng)
  let creditAcc = '1111'; // default cash (Tiền mặt VND)

  if (expense.column1 === 'CK' || expense.notes?.toLowerCase().includes('chuyển khoản') || expense.content?.toLowerCase().includes('ck')) {
    creditAcc = '1121'; // Bank transfers
  }

  const typeLower = expense.expenseType?.toLowerCase() || '';
  const groupLower = expense.expenseGroup?.toLowerCase() || '';

  if (typeLower.includes('dầu') || typeLower.includes('fuel') || groupLower.includes('621')) {
    debitAcc = '152'; // Raw materials / Fuel in storage
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

  if (expense.actualAmount > 0 && expense.advanceAmount > 0) {
    return { debit: debitAcc, credit: '141', label: `Nợ ${debitAcc} / Có 141` };
  } else if (expense.advanceAmount > 0 && expense.actualAmount === 0) {
    return { debit: '141', credit: creditAcc, label: `Nợ 141 / Có ${creditAcc}` };
  } else {
    return { debit: debitAcc, credit: creditAcc, label: `Nợ ${debitAcc} / Có ${creditAcc}` };
  }
};

export default function ReportDashboard({
  expenses,
  funds,
  onResetDB,
  currentDate,
}: ReportDashboardProps) {

  // State managers to keep it tidy and structured
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [showMissingOnly, setShowMissingOnly] = React.useState<boolean>(false);
  
  // Tab controller for standard vs audit reports
  const [activeReportTab, setActiveReportTab] = React.useState<'dong-tien' | 'doi-chieu'>('dong-tien');
  const [selectedIssueGroupFilter, setSelectedIssueGroupFilter] = React.useState<string>('ALL');
  const [selectedIssueSeverityFilter, setSelectedIssueSeverityFilter] = React.useState<string>('ALL');
  
  // Selected single expense for focus overlay
  const [focusExpense, setFocusExpense] = React.useState<Expense | null>(null);

  // Group data by Months (Thg3, Thg4, Thg5)
  const getMonthlyInflowOutflow = () => {
    const months = [
      { key: '2026-03', label: 'Thg3-26' },
      { key: '2026-04', label: 'Thg4-26' },
      { key: '2026-05', label: 'Thg5-26' },
    ];

    let runningBalance = 0;

    return months.map((month) => {
      const startBal = runningBalance;
      
      const inflow = funds
        .filter(f => f.date.startsWith(month.key))
        .reduce((sum, f) => sum + f.amount, 0);

      const outflow = expenses
        .filter(e => e.actualDate.startsWith(month.key))
        .reduce((sum, e) => sum + e.actualAmount, 0);

      const endBal = startBal + inflow - outflow;
      runningBalance = endBal;

      return {
        name: month.label,
        key: month.key,
        startBal,
        inflow,
        outflow,
        endBal
      };
    });
  };

  const monthlyData = getMonthlyInflowOutflow();

  // Compute Expense categories weight
  const getExpenseGroupRatio = () => {
    const groups = Object.values(ExpenseGroup);
    const totalOutflow = expenses.reduce((sum, e) => sum + e.actualAmount, 0);

    return groups.map(g => {
      const amount = expenses
        .filter(e => e.expenseGroup === g)
        .reduce((sum, e) => sum + e.actualAmount, 0);
      const ratio = totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0;
      return {
        name: g,
        value: amount,
        ratio: ratio
      };
    });
  };

  const groupRatioData = getExpenseGroupRatio();

  // Compute funds remaining
  const totalAllocatedDau = funds.filter(f => f.fundType === 'Dầu').reduce((sum, f) => sum + f.amount, 0);
  const totalSpentDau = expenses.filter(e => e.expenseType === ExpenseType.FUEL).reduce((sum, e) => sum + e.actualAmount, 0);
  const balanceDau = totalAllocatedDau - totalSpentDau;

  const totalAllocatedHCNS = funds.filter(f => f.fundType === 'HCNS').reduce((sum, f) => sum + f.amount, 0);
  const totalSpentHCNS = expenses.filter(e => e.expenseType !== ExpenseType.FUEL).reduce((sum, e) => sum + e.actualAmount, 0);
  const balanceHCNS = totalAllocatedHCNS - totalSpentHCNS;

  const totalBorrowedSếp = funds.filter(f => f.source === 'Mượn sếp').reduce((sum, f) => sum + f.amount, 0);

  // Audited parameters
  const totalActualOutflow = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalAdvanceAllocated = expenses.reduce((sum, e) => sum + e.advanceAmount, 0);
  
  // Total missing document money
  const missingDocsExpenses = expenses.filter(e => e.documentStatus === 'Thiếu chứng từ');
  const totalMissingDocsAmount = missingDocsExpenses.reduce((sum, e) => sum + e.actualAmount, 0);

  // Total ongoing clearance advances
  const uncompletedClearanceCount = expenses.filter(e => e.clearanceStatus === 'Đang hoàn ứng').length;

  // Top 5 largest expenses
  const topLargestExpenses = React.useMemo(() => {
    return [...expenses]
      .sort((a, b) => b.actualAmount - a.actualAmount)
      .slice(0, 5);
  }, [expenses]);

  // Extract filtered list for drilldown inspection
  const drilldownExpenses = React.useMemo(() => {
    let result = expenses.map((e, idx) => ({ ...e, index: idx }));
    
    if (showMissingOnly) {
      result = result.filter(e => e.documentStatus === 'Thiếu chứng từ');
    }
    if (selectedGroup) {
      result = result.filter(e => e.expenseGroup === selectedGroup);
    }
    if (selectedMonth) {
      const monthObj = monthlyData.find(m => m.name === selectedMonth);
      if (monthObj) {
        result = result.filter(e => e.actualDate.startsWith(monthObj.key));
      }
    }
    return result;
  }, [expenses, selectedGroup, selectedMonth, showMissingOnly, monthlyData]);

  const printReport = () => {
    window.print();
  };

  const resetAllFilters = () => {
    setSelectedGroup(null);
    setSelectedMonth(null);
    setShowMissingOnly(false);
  };

  // Automatic Audit and Books Reconciliation logic
  const runDiscrepancyAudit = () => {
    interface AuditIssue {
      id: string;
      type: 'ERROR' | 'WARNING' | 'INFO';
      group: string;
      title: string;
      description: string;
      mismatchedValue?: string;
      suggestedAction: string;
      affectedExpense?: Expense;
      voucherCode?: string;
    }
    const issues: AuditIssue[] = [];

    expenses.forEach((exp, idx) => {
      const code = getReportVoucherNo(exp, idx);
      const acc = getReportAccountingAccount(exp);

      // 1. Check mismatch in Advance Settlement (Lệch thừa/thiếu tiền tạm ứng khi quyết toán xong)
      const remainder = exp.advanceAmount - exp.actualAmount;
      if (exp.clearanceStatus === 'Xong' && exp.advanceAmount > 0 && remainder !== 0) {
        const notesLower = exp.notes?.toLowerCase() || '';
        const isRefundedInNotes = notesLower.includes('hoàn trả') || 
                                  notesLower.includes('trả lại') || 
                                  notesLower.includes('nộp lại') || 
                                  notesLower.includes('thu hồi') || 
                                  notesLower.includes('nhận thêm') ||
                                  notesLower.includes('đã thu') || 
                                  notesLower.includes('đã chi thêm');
        if (!isRefundedInNotes) {
          issues.push({
            id: `advance-mismatch-${exp.id}`,
            type: 'ERROR',
            group: 'Đối chiếu Tạm ứng',
            title: `Sai lệch số dư khi hoàn ứng xong (${code})`,
            description: `Tạm ứng quỹ cấp ${exp.advanceAmount.toLocaleString()} đ nhưng thực tế chi hạch toán ${exp.actualAmount.toLocaleString()} đ (Bị lệch ${Math.abs(remainder).toLocaleString()} đ). Trạng thái ghi 'Duyệt xong (Xong)' nhưng bộ sổ quỹ chưa ghi nhận giao dịch thu hồi tiền mặt thừa hoặc chi bù tiền thiếu cho nhân viên.`,
            mismatchedValue: `${remainder > 0 ? 'Thừa chưa nộp quỹ' : 'Thiếu chưa chi trả'} ${Math.abs(remainder).toLocaleString()} đ`,
            suggestedAction: remainder > 0 
              ? `Yêu cầu nhân viên lập phiếu nộp lại quỹ ${remainder.toLocaleString()} đ tiền vật tư thừa, ghi chú 'Đã thu hồi tiền thừa hoàn ứng vào sổ quỹ tẩm dầm'. Hoặc Click 'Sửa' phiếu này bổ sung ghi chú xác nhận đã thu hồi.`
              : `Duyệt bù chi tiền mặt ${Math.abs(remainder).toLocaleString()} đ cho nhân viên, đính kèm phiếu chi bổ sung và đánh dấu xác nhận hoàn tất quyết toán trong phần Ghi chú.`,
            affectedExpense: exp,
            voucherCode: code,
          });
        }
      }

      // 2. Overdue advances that are still outstanding (Tạm ứng quá hạn chưa nộp hoàn ứng)
      if (exp.clearanceStatus === 'Đang hoàn ứng') {
        const daysLimit = 15; // default
        const date = new Date(exp.actualDate);
        date.setDate(date.getDate() + daysLimit);
        const dueDateStr = date.toISOString().split('T')[0];
        
        const dCurrent = new Date(currentDate);
        const dDue = new Date(dueDateStr);
        
        if (dCurrent.getTime() > dDue.getTime()) {
          const gapMs = dCurrent.getTime() - dDue.getTime();
          const gapDays = Math.floor(gapMs / (1000 * 3600 * 24));
          issues.push({
            id: `overdue-advance-${exp.id}`,
            type: 'ERROR',
            group: 'Hạn hoàn ứng',
            title: `Nợ tạm ứng mẫu BĐH bị quá hạn chưa quyết toán (${code})`,
            description: `Phiếu tạm ứng từ ngày ${exp.actualDate.split('-').reverse().join('/')} của bộ phận ${exp.createdByRole} trị giá ${exp.advanceAmount.toLocaleString()} đ đã vượt hạn nộp chứng từ hoàn ứng tối đa (${daysLimit} ngày). Trễ quá ${gapDays} ngày so với mốc thời gian kiểm toán hiện tại (${currentDate.split('-').reverse().join('/')}).`,
            mismatchedValue: `Trễ ${gapDays} ngày (Tiền treo: ${exp.advanceAmount.toLocaleString()} đ)`,
            suggestedAction: `Nhắc nhở khẩn cấp nhân viên phụ trách tiến hành lập Bảng quyết toán kèm hóa đơn (BM03/BM04). Nếu mất hóa đơn hoặc chi sai mục đích, yêu cầu hoàn trả tiền mặt gấp hoặc khấu trừ trực tiếp vào đợt cấp phí tiếp theo.`,
            affectedExpense: exp,
            voucherCode: code,
          });
        }
      }

      // 3. Complete actual expenditure without invoice declared if large (Trạng thái Xong nhưng thiếu mã hóa đơn giá trị gia tăng)
      if (exp.actualAmount >= 200000 && !exp.invoiceNo && exp.clearanceStatus === 'Xong') {
        const isMissingDoc = exp.documentStatus === 'Thiếu chứng từ';
        issues.push({
          id: `missing-invoice-${exp.id}`,
          type: isMissingDoc ? 'ERROR' : 'WARNING',
          group: 'Chứng từ Thuế',
          title: `Thực chi lớn (≥200k) đã duyệt hoàn tất nhưng thiếu Số Hóa Đơn VAT (${code})`,
          description: `Phát sinh thực chi ${exp.actualAmount.toLocaleString()} đ đã hạch toán hoàn thành ('Xong') nhưng trường 'Số hóa đơn/Biên lai' bị bỏ trống. Theo quy định Kế toán Việt Nam, mọi khoản chi từ 200.000đ trở lên bãi dầm cần có hóa đơn hợp lệ để ghi nhận chi phí hợp lý được trừ khi quyết toán thuế TNDN.`,
          mismatchedValue: `Số hóa đơn trống (Tiền: ${exp.actualAmount.toLocaleString()} đ)`,
          suggestedAction: `Yêu cầu nhà cung cấp gửi hóa đơn điện tử (.xml / .pdf), sau đó Nhấp Sửa chi phí để bổ sung Số ký hiệu hóa đơn đỏ hoặc đính kèm vào hồ sơ trình ký.`,
          affectedExpense: exp,
          voucherCode: code,
        });
      }

      // 4. Mismatched debit/credit mapping for fuel (Hạch toán sai tài khoản nguyên vật liệu)
      const contentLower = exp.content.toLowerCase();
      const typeLower = exp.expenseType.toLowerCase();
      const isFuelRelated = contentLower.includes('dầu') || contentLower.includes('diesel') || contentLower.includes('do') || typeLower.includes('dầu');
      if (isFuelRelated && acc.debit !== '152' && acc.debit !== '621') {
        issues.push({
          id: `fuel-account-mismatch-${exp.id}`,
          type: 'WARNING',
          group: 'Định khoản hạch toán',
          title: `Nghi ngờ sai lệch định khoản chi phí Nhiên liệu DO / Vật tư (${code})`,
          description: `Phiếu chi mua dầu DO phục vụ bãi dầm dã chiến được phân bổ tài khoản '${acc.debit}'. Theo nguyên lý kế toán VAS, chi phí mua nhiên liệu cần đưa vào TK 152 (Nguyên vật liệu nhập kho bãi) hoặc TK 621 (Chi phí NVL trực tiếp) thay vì TK '${acc.debit}'.`,
          mismatchedValue: `Định khoản Nợ ${acc.debit} (Chuẩn nên dồn về 152/621/141)`,
          suggestedAction: `Ấn 'Sửa' chi phí này, kiểm tra và chuyển Nhóm chi phí thành 'Chi phí thi công (621,622,623)' và Loại chi phí thành 'Dầu (621)' để công thức hệ thống tự động quy về TK 152/621 chuẩn xác.`,
          affectedExpense: exp,
          voucherCode: code,
        });
      }

      // 5. Large value expenditures without associated official dossiers containing contract/acceptances (Thiếu Hồ sơ Thanh quyết toán)
      if (exp.actualAmount > 10000000 && !exp.dossierCode) {
        issues.push({
          id: `missing-dossier-${exp.id}`,
          type: 'WARNING',
          group: 'Liên kết hồ sơ',
          title: `Khoản chi lớn vượt hạn mức (>10M) chưa liên kết với Mã hồ sơ trình trình ký (${code})`,
          description: `Khoản thực chi này trị giá ${exp.actualAmount.toLocaleString()} đ đã giải ngân nhưng chưa liên kết với bất kỳ Mã hồ sơ (Dossier Code - ví dụ: HS-001) nào trong Document Manager. Điều này gây khó khăn khi sếp lập báo cáo tổng hợp hồ sơ thanh toán BM02 gửi văn phòng tổng công ty xem xét.`,
          mismatchedValue: `Chưa liên kết hồ sơ (Mã HS trống)`,
          suggestedAction: `Tạo một hồ sơ thanh toán tổng hợp tại tab 'Quản Lý Hồ Sơ Trình Ký', sau đó chỉnh sửa phiếu chi này và gán Mã hồ sơ pháp lý vào mục 'Mã hồ sơ trình ký'.`,
          affectedExpense: exp,
          voucherCode: code,
        });
      }
    });

    // 6. Fund balance alerts (Thâm hụt quỹ so với ngân sách cấp từ văn phòng)
    const allocatedDau = funds.filter(f => f.fundType === 'Dầu').reduce((sum, f) => sum + f.amount, 0);
    const spentDau = expenses.filter(e => e.expenseType === ExpenseType.FUEL).reduce((sum, e) => sum + e.actualAmount, 0);
    if (spentDau > allocatedDau) {
      issues.push({
        id: `fund-deficit-dau`,
        type: 'ERROR',
        group: 'Cân đối Ngân sách',
        title: `Thâm hụt ngân sách Quỹ Nhiên liệu cấp bãi dầm`,
        description: `Ngân sách mua dầu DO thực tế đã giải ngân ${spentDau.toLocaleString()} đ, vượt quá tổng hạn mức tiền quỹ chuyển từ Văn Phòng Tổng Công Ty cấp xuống (${allocatedDau.toLocaleString()} đ). Thâm hụt ${(spentDau - allocatedDau).toLocaleString()} đ.`,
        mismatchedValue: `Âm quỹ DO: ${(allocatedDau - spentDau).toLocaleString()} đ`,
        suggestedAction: `Lập tức trình Sếp Thạch duyệt bổ sung hạn mức mượn quỹ hoặc làm biểu mẫu BM02 của 'Đợt cấp mới nhiên liệu bãi dầm' để tổng công ty rót thêm kinh phí.`,
      });
    }

    const allocatedHCNS = funds.filter(f => f.fundType === 'HCNS').reduce((sum, f) => sum + f.amount, 0);
    const spentHCNS = expenses.filter(e => e.expenseType !== ExpenseType.FUEL).reduce((sum, e) => sum + e.actualAmount, 0);
    if (spentHCNS > allocatedHCNS) {
      issues.push({
        id: `fund-deficit-hcns`,
        type: 'ERROR',
        group: 'Cân đối Ngân sách',
        title: `Thâm hụt quỹ Hành chính / Lương thợ / Bếp ăn công trường`,
        description: `Tổng chi tiêu hành chính nhân sự thực tế chạm mức ${spentHCNS.toLocaleString()} đ, vượt quá hạn mức ngân sách cấp dã chiến ${allocatedHCNS.toLocaleString()} đ (Bị âm quỹ ${(spentHCNS - allocatedHCNS).toLocaleString()} đ).`,
        mismatchedValue: `Âm quỹ HCNS: ${(allocatedHCNS - spentHCNS).toLocaleString()} đ`,
        suggestedAction: `Tối ưu hóa các khoản mua đồ dùng văn phòng, làm việc với nhà cung cấp bếp ăn cho giãn nợ thanh toán đợt sau, hoặc làm tờ trình điều chuyển tạm thời từ dòng tiền 'Mượn sếp'.`,
      });
    }

    return issues;
  };

  return (
    <div className="space-y-6">
      
      {/* Report Options control panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm print:hidden">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Trung Tâm Báo Cáo Tài Chính Tổng Hợp (Vị Thế Sếp)
          </h3>
          <p className="text-xs text-gray-400">Xem phân tích dòng tiền chuẩn Việt Nam và truy vấn nhanh các khoản chi </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              if (confirm('Bạn muốn tải và khôi phục dữ liệu mẫu gốc từ hồ sơ dự án cao tốc Trung Lương không?')) {
                await onResetDB();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Nạp Dữ Liệu Gốc</span>
          </button>

          <button
            onClick={printReport}
            id="print-report-btn"
            className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>In Báo Cáo Gửi Sếp (A4)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs for Reporting Dashboard & Reconciliation Control */}
      <div className="flex border-b border-gray-200 gap-2 print:hidden mb-1">
        <button
          onClick={() => setActiveReportTab('dong-tien')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeReportTab === 'dong-tien'
              ? 'border-blue-600 text-blue-700 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span>I. Tổng hợp Dòng Tiền & Biểu đồ</span>
        </button>
        <button
          id="btn-tab-doi-chieu"
          onClick={() => setActiveReportTab('doi-chieu')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer flex items-center gap-2 relative ${
            activeReportTab === 'doi-chieu'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-indigo-600 animate-bounce" />
          <span>II. Đối Chiếu Sổ Sách & Sửa Sai Lệch</span>
          {runDiscrepancyAudit().filter(i => i.type === 'ERROR').length > 0 && (
            <span id="badge-discrepancy-errors" className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white leading-none">
              {runDiscrepancyAudit().filter(i => i.type === 'ERROR').length}
            </span>
          )}
        </button>
      </div>

      {/* Styled Printable document starting here */}
      <div className={`bg-white rounded-3xl border border-gray-100 p-6 md:p-8 space-y-8 shadow-sm print:border-none print:p-0 print:shadow-none ${activeReportTab === 'doi-chieu' ? 'hidden' : 'block'}`}>
        
        {/* Document Header (appears like actual Excel receipt/PDF header) */}
        <div className="border-b-2 border-slate-900 pb-5 text-center relative">
          <p className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">BÁO CÁO TỔNG HỢP TIẾN ĐỘ & DÒNG TIỀN DỰ ÁN Kế Toán</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 uppercase">DỰ ÁN CAO TỐC TRUNG LƯƠNG - MỸ THUẬN</h2>
          <p className="text-xs text-gray-500 mt-1">
            Thời điểm trích xuất báo cáo: <strong>{currentDate.split('-').reverse().join('/')}</strong> | Trạng thái: Tổng hợp tự động từ hiện trường bãi dầm
          </p>
          
          {/* Virtual stamp */}
          <div className="absolute right-4 top-2 hidden md:block border-2 border-emerald-600 text-emerald-600 font-mono font-extrabold rotate-12 px-3 py-1 text-xs rounded-lg uppercase tracking-widest bg-emerald-50/20">
            ✔ HOÀN TẤT ĐỒNG BỘ
          </div>
        </div>

        {/* SECTION FOR BOSS: Executive Financial Scorecard & Audits */}
        <div className="space-y-4 print:space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-l-4 border-blue-600 pl-2">
              Chỉ số sức khỏe tài chính & Quản lý rủi ro (Giám đốc lưu ý)
            </h3>
            <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-2 py-0.5 rounded-full print:hidden">
              Tự động cập nhật
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Box 1: Inflow vs Outflow Summary */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Tổng giải ngân thực</span>
                <TrendingDown className="h-4 w-4 text-rose-500 shrink-0" />
              </div>
              <div className="mt-2 text-left">
                <p className="text-lg font-black text-slate-900 font-mono">{totalActualOutflow.toLocaleString()} đ</p>
                <span className="text-[9.5px]/tight text-gray-400 block mt-0.5">Thực tế tiền ra khỏi quỹ hiện trường</span>
              </div>
            </div>

            {/* Box 2: Prepayments & Advances */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono font-sans">Tổng tạm ứng cấp</span>
                <TrendingUp className="h-4 w-4 text-sky-500 shrink-0" />
              </div>
              <div className="mt-2 text-left">
                <p className="text-lg font-black text-slate-950 font-mono">{totalAdvanceAllocated.toLocaleString()} đ</p>
                <span className="text-[9.5px]/tight text-gray-400 block mt-0.5">
                  Tạm ứng qua TK 141 ({uncompletedClearanceCount} khoản dở)
                </span>
              </div>
            </div>

            {/* Box 3: Missing Documents Audit (Extremely Important to the Boss) */}
            <button
              onClick={() => {
                setShowMissingOnly(!showMissingOnly);
                setSelectedGroup(null);
                setSelectedMonth(null);
              }}
              className={`text-left bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer print:bg-slate-50/50 print:border-slate-100 ${
                showMissingOnly 
                  ? 'border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10' 
                  : 'border-slate-100 hover:border-amber-200'
              }`}
              title="Click để lọc xem nhanh toàn bộ chứng từ bị thiếu"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] text-amber-750 uppercase font-bold tracking-wider font-mono">⚠️ Thiếu bộ chứng từ gốc</span>
                <FileWarning className={`h-4 w-4 shrink-0 transition-transform ${showMissingOnly ? 'scale-110 text-amber-655 text-amber-600' : 'text-amber-500'}`} />
              </div>
              <div className="mt-2">
                <p className="text-lg font-black text-amber-700 font-mono">{totalMissingDocsAmount.toLocaleString()} đ</p>
                <span className="text-[9.5px]/tight text-amber-600/95 font-medium block mt-0.5">
                  {missingDocsExpenses.length} chứng từ thiếu • <span className="underline font-bold print:hidden">Xem</span>
                </span>
              </div>
            </button>

            {/* Box 4: Current Treasury Balance */}
            <div className="bg-blue-50/45 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider font-mono">Khả dụng quỹ bãi dầm</span>
                <Award className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-left">
                <p className="text-lg font-black text-blue-800 font-mono">{(balanceDau + balanceHCNS).toLocaleString()} đ</p>
                <span className="text-[9.5px]/tight text-blue-600 font-bold block mt-0.5">
                  DO: {balanceDau.toLocaleString()} | HC: {balanceHCNS.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 1. Cash flow breakdown table by months */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pr-1">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-l-4 border-blue-600 pl-2">
              I. Diễn biến dòng tiền theo chu kỳ tháng
            </h3>
            <span className="text-[10px] text-slate-400 italic font-medium print:hidden">
              Mẹo: Click từng tháng để lọc danh sách chi tiết bên dưới
            </span>
          </div>
          
          <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs leading-normal font-mono divide-y divide-gray-200">
              <thead>
                <tr className="bg-slate-50 text-gray-700 divide-x divide-gray-100 font-bold">
                  <th className="py-2.5 px-4">Tháng Phân Kỳ</th>
                  <th className="py-2.5 px-4 text-right">Số dư đầu kỳ (đ)</th>
                  <th className="py-2.5 px-4 text-right">Cấp quỹ mới (đ)</th>
                  <th className="py-2.5 px-4 text-right">Chi thực tế bãi (đ)</th>
                  <th className="py-2.5 px-4 text-right">Hạn tồn cuối kỳ (đ)</th>
                  <th className="py-2.5 px-3 text-center w-28 print:hidden">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 divide-x divide-gray-100 text-gray-800">
                {monthlyData.map((m, idx) => {
                  const isCurMatch = selectedMonth === m.name;
                  return (
                    <tr 
                      key={m.name} 
                      onClick={() => {
                        setSelectedMonth(isCurMatch ? null : m.name);
                        setSelectedGroup(null);
                        setShowMissingOnly(false);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurMatch 
                          ? 'bg-blue-50 hover:bg-blue-100/55 font-bold' 
                          : 'hover:bg-slate-50/85'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5 select-none text-left">
                        <span className={`h-2 w-2 rounded-full ${isCurMatch ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}></span>
                        <span>{m.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right">{m.startBal.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">+{m.inflow.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-rose-600 font-bold">-{m.outflow.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-bold ${m.endBal < 0 ? 'text-rose-600 bg-rose-50/10' : 'text-slate-900'}`}>
                        {m.endBal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedMonth(isCurMatch ? null : m.name);
                            setSelectedGroup(null);
                            setShowMissingOnly(false);
                          }}
                          className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border cursor-pointer transition-all ${
                            isCurMatch 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isCurMatch ? 'Đang Lọc' : 'Xem Chi Tiết'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Total accumulation column */}
                <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800">
                  <td className="py-3 px-4 text-left">Tổng cộng lũy kế</td>
                  <td className="py-3 px-4 text-right">-</td>
                  <td className="py-3 px-4 text-right text-emerald-400">+{monthlyData.reduce((sum, m) => sum + m.inflow, 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-rose-400">-{monthlyData.reduce((sum, m) => sum + m.outflow, 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-300" colSpan={currentDate ? 1 : 2}>
                    {monthlyData[monthlyData.length - 1]?.endBal.toLocaleString()} đ
                  </td>
                  <td className="py-3 px-3 text-center print:hidden bg-slate-950 font-sans text-[10px] font-bold text-slate-450">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* EXTRA FOR BOSS: Top 5 Major Expenditures */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-l-4 border-amber-500 pl-2 text-left">
              Khoản chi quy mô lớn nhất (Sếp hỏi chi cái gì thì ở đây)
            </h3>
            <span className="text-[10px] font-serif italic text-slate-500">
              Kiểm soát trọng điểm nguồn vốn
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {topLargestExpenses.map((exp) => {
              const code = getReportVoucherNo(exp, expenses.indexOf(exp));
              const acc = getReportAccountingAccount(exp);
              return (
                <div 
                  key={exp.id}
                  onClick={() => setFocusExpense(exp)}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-blue-200 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-105 bg-blue-100 text-blue-800">
                        {code}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {exp.actualDate.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                    </div>
                    <p className="font-bold text-slate-805 text-slate-800 text-[11px] leading-snug line-clamp-2 pt-1 min-h-[32px]">
                      {exp.content}
                    </p>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t border-slate-200/60 space-y-1">
                    <p className="text-[10px] font-mono text-slate-500 font-semibold leading-none">
                      {acc.label}
                    </p>
                    <p className="font-black text-rose-600 text-sm font-mono tracking-tight pt-1">
                      {exp.actualAmount.toLocaleString()} đ
                    </p>
                    <div className="flex items-center justify-between text-[8.5px] text-slate-400 pt-0.5 leading-none">
                      <span className="truncate max-w-[65px]">Loại: {exp.expenseType}</span>
                      <span className="font-semibold text-slate-500">{exp.createdByRole.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Visual Charts rendering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 print:gap-4 print:grid-cols-2">
          
          {/* Chart 1: Month bar */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/20 print:border-none print:p-0">
            <span className="text-xs font-bold text-slate-700 block text-center uppercase tracking-wider font-mono">Biên độ dòng tiền từng tháng (VNĐ)</span>
            <div className="h-60 w-full animate-in fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip formatter={(val: number) => val.toLocaleString() + ' đ'} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="inflow" name="Ngân sách cấp" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Thực chi thực tế" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="endBal" name="Lũy kế tồn cuối" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Expense groups share pie */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/20 print:border-none print:p-0">
            <span className="text-xs font-bold text-slate-700 block text-center uppercase tracking-wider font-mono">Tỷ trọng các nhóm chi phí tổng (nhóm 642, 621, 627)</span>
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={groupRatioData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {groupRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => val.toLocaleString() + ' đ'} />
                </PieChart>
              </ResponsiveContainer>
              {/* Pie Legends custom */}
              <div className="w-1/2 ml-2 space-y-1 text-[10px] font-medium leading-tight select-none text-left">
                {groupRatioData.map((d, index) => {
                  const isCurMatch = selectedGroup === d.name;
                  return (
                    <div 
                      key={d.name} 
                      onClick={() => {
                        setSelectedGroup(isCurMatch ? null : d.name);
                        setSelectedMonth(null);
                        setShowMissingOnly(false);
                      }}
                      className={`flex items-center gap-1.5 p-1 rounded-md cursor-pointer transition-colors ${
                        isCurMatch ? 'bg-slate-100 font-bold text-slate-900 border-l-2 border-slate-700' : 'hover:bg-slate-50 text-gray-600'
                      }`}
                      title="Nhấn để xem chi tiết chứng từ của nhóm này"
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="truncate max-w-[100px] inline-block">{d.name}</span>
                      <span className="text-slate-900 font-mono font-bold">({d.ratio.toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* 4. Group weights table detailed */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pr-1">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-l-4 border-blue-600 pl-2 text-left">
              II. Chi tiết tỷ lệ cấu thành dự án chi phí
            </h3>
            <span className="text-[10px] text-slate-400 italic font-medium print:hidden">
              Nhấp vào một dòng để kiểm toán chứng từ thuộc nhóm đó
            </span>
          </div>
          
          <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs leading-normal font-mono divide-y divide-gray-200">
              <thead>
                <tr className="bg-slate-50 text-gray-700 divide-x divide-gray-100 font-bold">
                  <th className="py-2.5 px-4">Nhóm Chi Phí / Tài khoản hạch toán chính</th>
                  <th className="py-2.5 px-4 text-right">Tổng thực chi hiện bãi (đ)</th>
                  <th className="py-2.5 px-4 text-right">% Tỷ Trọng cấu thành</th>
                  <th className="py-2.5 px-3 text-center w-28 print:hidden">Hồ sơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 divide-x divide-gray-100 text-gray-800">
                {groupRatioData.map((d, index) => {
                  const isCurMatch = selectedGroup === d.name;
                  return (
                    <tr 
                      key={d.name} 
                      onClick={() => {
                        setSelectedGroup(isCurMatch ? null : d.name);
                        setSelectedMonth(null);
                        setShowMissingOnly(false);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurMatch 
                          ? 'bg-blue-50 hover:bg-blue-100/55 font-bold' 
                          : 'hover:bg-slate-50/85'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5 select-none text-left">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span>{d.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-950">{d.value.toLocaleString()} đ</td>
                      <td className="py-3 px-4 text-right text-gray-600 font-bold">{d.ratio.toFixed(1)} %</td>
                      <td className="py-3 px-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedGroup(isCurMatch ? null : d.name);
                            setSelectedMonth(null);
                            setShowMissingOnly(false);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold border rounded-lg cursor-pointer transition-all ${
                            isCurMatch 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isCurMatch ? 'Đang Lọc' : 'Xem Chi Tiết'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* INTERACTIVE COMPANION DRILL-DOWN BLOCK (Solving Boss Query immediately & Keeps document short!) */}
        {(selectedGroup || selectedMonth || showMissingOnly) && (
          <div className="bg-slate-905 bg-slate-900 text-slate-100 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl select-none animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  HỆ THỐNG TRUY VẤN CHỨNG TỪ THEO YÊU CẦU
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {showMissingOnly 
                    ? 'DANH SÁCH CHỨNG TỪ CHƯA ĐẦY ĐỦ PHÁP LÝ (CẦN BỔ SUNG)' 
                    : selectedGroup 
                      ? `THẨM ĐỊNH CHỨNG TỪ: ${selectedGroup}`
                      : `CHỨNG TỪ THUỘC THÁNG: ${selectedMonth}`
                  }
                </h4>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllFilters}
                  className="rounded-lg p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>Đóng Truy Vấn</span>
                </button>
              </div>
            </div>

            {drilldownExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Không tìm thấy dữ liệu phát sinh nào trùng hợp.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10.5px] text-slate-400">
                  <span className="text-left">Phát hiện <strong>{drilldownExpenses.length}</strong> chứng từ liên quan:</span>
                  <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-full font-mono">
                    Tổng chi thực tế: {drilldownExpenses.reduce((sum, e) => sum + e.actualAmount, 0).toLocaleString()} đ
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-2xl divide-y divide-slate-850">
                  <table className="w-full text-left text-xs leading-normal font-mono divide-y divide-slate-800">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 divide-x divide-slate-800 font-bold sticky top-0">
                        <th className="py-2 px-3 text-center w-10">STT</th>
                        <th className="py-2 px-3 w-28 text-left">Số CT / Ngày</th>
                        <th className="py-2 px-3 text-left">Diễn giải Chi Tiết</th>
                        <th className="py-2 px-3 w-28 text-left">Định Khoản (VAS)</th>
                        <th className="py-2 px-3 text-right w-28">Thực Chi (đ)</th>
                        <th className="py-2 px-3 w-32 text-left">Trạng thái Hồ sơ</th>
                        <th className="py-2 px-3 w-24 text-left">Phụ trách</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 divide-x divide-slate-800 text-slate-300">
                      {drilldownExpenses.map((exp, idx) => {
                        const code = getReportVoucherNo(exp, exp.index);
                        const acc = getReportAccountingAccount(exp);
                        return (
                          <tr 
                            key={exp.id} 
                            onClick={() => setFocusExpense(exp)}
                            className="hover:bg-slate-800/80 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 text-left">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-100">{code}</span>
                                <span className="text-[9px] text-slate-400">{exp.actualDate.split('-').reverse().join('/')}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 max-w-xs break-words font-sans font-medium text-slate-100 text-left">
                              <div className="flex items-center gap-1.5 leading-tight">
                                <Eye className="h-3 w-3 text-sky-400 shrink-0 opacity-60" />
                                <span>{exp.content}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-left font-semibold text-sky-305 text-sky-400 text-[10px]">
                              {acc.label}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-rose-450 text-slate-100 font-mono">
                              {exp.actualAmount.toLocaleString()} đ
                            </td>
                            <td className="py-2.5 px-3 text-left">
                              {exp.documentStatus === 'Thiếu chứng từ' ? (
                                <div className="text-[10px] text-amber-400 font-bold flex flex-col leading-tight">
                                  <span>⚠️ Thiếu hồ sơ gốc</span>
                                  {exp.missingDocuments && (
                                    <span className="text-[8px] text-amber-500 font-medium font-serif italic truncate max-w-[125px]" title={exp.missingDocuments}>
                                      ({exp.missingDocuments})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-400 font-bold text-[9.5px] flex items-center gap-0.5">
                                  ✔ Đầy đủ hợp lệ
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-[10px] text-slate-400 font-medium text-left">
                              {exp.createdByRole.split(' ')[0]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signatures footer like standard Vietnamese files */}
        <div className="grid grid-cols-3 text-center text-xs font-bold pt-8 gap-4 border-t border-slate-200">
          <div className="space-y-12 text-center">
            <p className="uppercase text-[10px] text-gray-400">Người lập phiếu</p>
            <div>
              <p className="font-bold text-slate-800">Cô Lan</p>
              <p className="text-[10px] text-gray-400 font-medium">Bộ phận HCNS</p>
            </div>
          </div>
          <div className="space-y-12 text-center">
            <p className="uppercase text-[10px] text-gray-400">Kế toán trưởng dự án</p>
            <div>
              <p className="font-bold text-slate-800">David Bảo</p>
              <p className="text-[10px] text-gray-400 font-medium">Kiểm soát viên chi phí chính</p>
            </div>
          </div>
        </div>

      </div>

      {activeReportTab === 'doi-chieu' && (() => {
        const auditIssues = runDiscrepancyAudit();
        const errorCount = auditIssues.filter(i => i.type === 'ERROR').length;
        const warningCount = auditIssues.filter(i => i.type === 'WARNING').length;
        const healthScore = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5));

        const filteredIssues = auditIssues.filter(issue => {
          if (selectedIssueGroupFilter !== 'ALL' && issue.group !== selectedIssueGroupFilter) return false;
          if (selectedIssueSeverityFilter !== 'ALL' && issue.type !== selectedIssueSeverityFilter) return false;
          return true;
        });

        return (
          <div className="bg-slate-50 rounded-3xl border border-slate-150 p-6 md:p-8 space-y-6 animate-in fade-in duration-300 select-none text-left print:bg-white print:border-none print:p-0">
            
            {/* Audit Dashboard header */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1 text-left w-full md:w-auto">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block font-mono">
                  VAS Real-time Auditing Engine
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Bảng Đối Chiếu Số Sách & Sửa Sai Lệch Chứng Từ
                </h3>
                <p className="text-xs text-slate-500 max-w-[550px]">
                  Hệ thống tự động rà soát toàn bộ quỹ giải ngân bãi dầm, kiểm toán hoàn ứng (TK 141), kiểm tra hóa đơn đỏ VAT và phân tích thâm hụt ngân sách.
                </p>
              </div>
              
              {/* Health indicators */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VAS Health Score</span>
                  <span className={`text-2xl font-black font-mono leading-none ${
                    healthScore >= 90 ? 'text-emerald-600' : healthScore >= 70 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {healthScore}/100
                  </span>
                  <span className={`block text-[9.5px] font-bold mt-0.5 ${
                    healthScore >= 90 ? 'text-emerald-600' : healthScore >= 70 ? 'text-amber-600' : 'text-rose-605 text-rose-600'
                  }`}>
                    {healthScore >= 90 ? '● An Toàn Cao' : healthScore >= 70 ? '● Cần Lưu Ý' : '⚠️ Rủi Ro Sai Lệch!'}
                  </span>
                </div>
                <div className={`h-11 w-11 rounded-full flex items-center justify-center p-1 border-4 ${
                  healthScore >= 90 
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-600' 
                    : healthScore >= 70 
                      ? 'border-amber-100 bg-amber-50 text-amber-600' 
                      : 'border-rose-100 bg-rose-50 text-rose-600'
                }`}>
                  {healthScore >= 90 ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Phiếu Được Duyệt</span>
                <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{expenses.length} phiếu</p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Sổ chi tiết bãi dầm dã ngoại</span>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs">
                <span className="text-[10px] text-rose-500 font-bold uppercase block">Lỗi Nghiêm Trọng</span>
                <p className="text-lg font-black text-rose-600 font-mono mt-0.5">{errorCount} lỗi lệch</p>
                <span className="text-[9px] text-rose-400 block mt-0.5">Yêu cầu toán rà soát hạch toán</span>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs bg-amber-50/15 border-amber-100">
                <span className="text-[10px] text-amber-650 text-amber-600 font-bold uppercase block">Cảnh Báo Hồ Sơ Gốc</span>
                <p className="text-lg font-black text-amber-600 font-mono mt-0.5">{warningCount} cảnh báo</p>
                <span className="text-[9px] text-amber-500 block mt-0.5">Thiếu hóa đơn đỏ hoặc dossier</span>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs bg-indigo-50/10 border-indigo-100">
                <span className="text-[10px] text-indigo-700 font-bold uppercase block">Cân Đối Sổ Sách</span>
                <p className={`text-sm font-black mt-1 uppercase ${
                  errorCount === 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {errorCount === 0 ? 'Phù hợp hoàn toàn' : 'Có chênh lệch'}
                </p>
                <span className="text-[9px] text-indigo-500 block">Sổ quỹ vs Giấy tờ gốc</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-3xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Lọc nhanh sự vụ:</span>
                
                <select
                  value={selectedIssueGroupFilter}
                  onChange={(e) => setSelectedIssueGroupFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 p-1.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Tất cả nhóm lệch ({auditIssues.length})</option>
                  <option value="Đối chiếu Tạm ứng">Phần lệch số hoàn ứng ({auditIssues.filter(i => i.group === 'Đối chiếu Tạm ứng').length})</option>
                  <option value="Hạn hoàn ứng">Trễ hạn thu nợ tạm ứng ({auditIssues.filter(i => i.group === 'Hạn hoàn ứng').length})</option>
                  <option value="Chứng từ Thuế">Thiếu hóa đơn VAT trên 200k ({auditIssues.filter(i => i.group === 'Chứng từ Thuế').length})</option>
                  <option value="Định khoản hạch toán">Sai định khoản tẩm dầm ({auditIssues.filter(i => i.group === 'Định khoản hạch toán').length})</option>
                  <option value="Cân đối Ngân sách">Thâm hụt quỹ hiện trường ({auditIssues.filter(i => i.group === 'Cân đối Ngân sách').length})</option>
                  <option value="Liên kết hồ sơ">Khoản chi lớn chưa gán mã ({auditIssues.filter(i => i.group === 'Liên kết hồ sơ').length})</option>
                </select>

                <select
                  value={selectedIssueSeverityFilter}
                  onChange={(e) => setSelectedIssueSeverityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 p-1.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="ERROR">Mức lỗi (ERROR)</option>
                  <option value="WARNING">Mức cảnh báo (WARNING)</option>
                </select>
              </div>

              {auditIssues.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedIssueGroupFilter('ALL');
                    setSelectedIssueSeverityFilter('ALL');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer"
                >
                  Xóa bộ lọc đối soát
                </button>
              )}
            </div>

            {/* List of Issues */}
            <div className="space-y-4">
              {filteredIssues.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-2 shadow-2xs">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center p-1">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase">Bộ Sổ Sách Tuyệt Đối Đồng Bộ! Không Có Lệch Toán</h4>
                  <p className="text-xs text-slate-400 max-w-[500px] leading-relaxed">
                    Hệ thống rà soát đối toán không phát hiện bất kỳ sai sót định khoản, thâm hụt ngân sách quỹ nhiên liệu, nợ quá hạn tạm ứng 141 hay chứng từ thiếu hóa đơn đỏ hợp tống nào.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`bg-white border rounded-2xl p-5 shadow-2xs relative flex flex-col justify-between transition-all hover:shadow-xs border-l-4 ${
                        issue.type === 'ERROR' ? 'border-l-rose-500 border-slate-150' : 'border-l-amber-500 border-slate-155'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              issue.type === 'ERROR' ? 'bg-rose-950 text-rose-400' : 'bg-amber-955 bg-amber-950 text-amber-400'
                            }`}>
                              {issue.type}
                            </span>
                            <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 rounded-full">
                              {issue.group}
                            </span>
                          </div>
                          {issue.voucherCode && (
                            <span className="font-mono text-[10.5px] font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              Số chứng từ: {issue.voucherCode}
                            </span>
                          )}
                        </div>

                        <div className="text-left pt-1">
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                            {issue.title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1 text-left font-serif italic">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      {/* Gap weight block */}
                      {issue.mismatchedValue && (
                        <div className="my-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                            Chênh lệch trị giá phát sinh:
                          </span>
                          <span className={`font-mono text-[10.5px] font-black uppercase text-right leading-none px-2 py-0.5 rounded ${
                            issue.type === 'ERROR' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-750 text-amber-700'
                          }`}>
                            {issue.mismatchedValue}
                          </span>
                        </div>
                      )}

                      {/* Treatment guidelines */}
                      <div className="bg-indigo-55/40 bg-indigo-50 p-3 rounded-xl mt-1 text-left space-y-1 border border-indigo-100">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-700 block font-mono">
                          🔧 HƯỚNG DẪN KHẮC PHỤC CHỈNH SỬA CHI TIẾT:
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold font-sans text-left">
                          {issue.suggestedAction}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {issue.affectedExpense && (
                        <div className="mt-3.5 flex justify-end gap-2 border-t border-slate-100 pt-3">
                          <button
                            onClick={() => setFocusExpense(issue.affectedExpense!)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Truy vấn chi tiết & Cập nhật ({issue.voucherCode})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* EXPENSE DETAIL FOCUS MODAL overlay for boss (Quick Audit view) */}
      {focusExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">
                  Chi tiết chứng từ hạch toán
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                  {getReportVoucherNo(focusExpense, expenses.indexOf(focusExpense))}
                </span>
              </div>
              <button
                onClick={() => setFocusExpense(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 bg-gray-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-750 text-left">
              <div className="space-y-0.5">
                <span className="text-[9.5px] text-slate-400 uppercase font-bold block text-left">Diễn giải</span>
                <p className="font-bold text-slate-900 text-sm leading-snug text-left">{focusExpense.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="text-left">
                  <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Phát sinh thực chi</span>
                  <p className="font-mono text-sm font-black text-rose-600">{focusExpense.actualAmount.toLocaleString()} đ</p>
                </div>
                <div className="text-left">
                  <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Tạm ứng từ quỹ</span>
                  <p className="font-mono text-sm font-bold text-slate-800">{focusExpense.advanceAmount ? `${focusExpense.advanceAmount.toLocaleString()} đ` : '0 đ'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Định khoản VAS</span>
                  <span className="font-mono font-bold text-[10px] text-indigo-700">{getReportAccountingAccount(focusExpense).label}</span>
                </div>
                <div className="text-left">
                  <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Ngày bù chi</span>
                  <span className="font-mono font-bold text-slate-800">{focusExpense.actualDate.split('-').reverse().join('/')}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px] text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Bộ phận tạo dựng:</span>
                  <span className="font-bold text-slate-800">{focusExpense.createdByRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Bố trí & Định mức:</span>
                  <span className="font-bold text-slate-800">{focusExpense.expenseType} ({focusExpense.limitType || 'Thực tế'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Tài liệu đính kèm:</span>
                  <span className={`font-bold ${focusExpense.documentStatus === 'Thiếu chứng từ' ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {focusExpense.documentStatus}
                  </span>
                </div>
                {focusExpense.missingDocuments && (
                  <div className="bg-amber-50 p-2 rounded-xl text-[9px] text-amber-700 font-medium italic mt-1 font-serif text-left">
                    Chi tiết thiếu: {focusExpense.missingDocuments}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setFocusExpense(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer w-full text-center"
              >
                Xác nhận Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
