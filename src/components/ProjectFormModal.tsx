/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, UserRole } from '../types';
import { Printer, X, Plus, Trash2, ArrowLeftRight, Settings, Check, FileText } from 'lucide-react';

// Numeric-to-words helper for Vietnamese Dong with precise capitalization
export function convertNumberToVietnameseWords(num: number): string {
  const amount = Math.round(num);
  if (amount === 0) return 'Không đồng';
  if (amount < 0) return 'Âm ' + convertNumberToVietnameseWords(Math.abs(amount)).toLowerCase();

  const units = ['', 'nghìn', 'triệu', 'tỉ', 'nghìn tỉ', 'triệu tỉ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readTriple(n: number, showZeroHundred: boolean): string {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0 || showZeroHundred) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
    } else if (t === 1) {
      res += 'mười ';
    } else if (t === 0 && u > 0 && (h > 0 || showZeroHundred)) {
      res += 'lẻ ';
    }

    if (t > 0) {
      if (u === 1 && t > 1) {
        res += 'mốt';
      } else if (u === 5) {
        res += 'lăm';
      } else if (u > 0) {
        res += digits[u];
      }
    } else {
      if (u > 0) {
        if (u === 5 && showZeroHundred) {
          res += 'lăm';
        } else {
          res += digits[u];
        }
      }
    }
    return res.trim();
  }

  let str = '';
  let temp = amount;
  let groupIdx = 0;

  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0 || groupIdx === 0 ? false : temp >= 1) {
       // Only skip if group is 0 and not at end
    }
    const shouldRead = group > 0 || (groupIdx === 0 && temp > 0);
    if (shouldRead && group > 0) {
      const read = readTriple(group, temp > 1000);
      str = read + ' ' + units[groupIdx] + ' ' + str;
    }
    temp = Math.floor(temp / 1000);
    groupIdx++;
  }

  let result = str.trim().replace(/\s+/g, ' ');
  if (!result) return 'Không đồng';

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  if (!result.endsWith('đồng')) {
    result += ' đồng';
  }
  return result;
}

// Elegant Trung Hai logo component with responsive images & ultra-crisp SVG vector fallback
export function TrungHaiLogo() {
  const [pathIndex, setPathIndex] = useState(0);
  const paths = [
    'trung_hai.png',
    '/trung_hai.png',
    '/assets/trung_hai.png'
  ];

  if (pathIndex >= paths.length) {
    return (
      <div className="flex flex-col items-center justify-center p-0.5 mx-auto max-w-[130px]">
        <svg viewBox="0 0 160 80" className="h-10 w-auto" xmlns="http://www.w3.org/2000/svg">
          {/* Red Chevron: left leg of stylized triangle */}
          <path d="M 15 56 L 68 12 L 85 12 L 32 56 Z" fill="#E2231A" />
          {/* Blue Chevron: right leg shaping the complete peak */}
          <path d="M 52 56 L 105 12 L 145 56 L 125 56 L 105 38 L 105 56 Z" fill="#1C3088" />
          {/* Bold caption under the graphic symbol */}
          <text 
            x="80" 
            y="76" 
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            fontWeight="900" 
            fontSize="14.5" 
            fill="#0F1E54" 
            letterSpacing="2.5" 
            textAnchor="middle"
          >
            TRUNG HAI
          </text>
        </svg>
      </div>
    );
  }

  return (
    <img 
      src={paths[pathIndex]} 
      alt="TRUNG HAI Logo" 
      className="h-10 w-auto mx-auto object-contain" 
      onError={() => setPathIndex(prev => prev + 1)}
      referrerPolicy="no-referrer"
    />
  );
}

export enum FormTemplateType {
  BM01_DE_NGHI_TAM_UNG = 'BM01-QT06.01 (Đề nghị tạm ứng)',
  BM02_BANG_KE_DU_TRU_TAM_UNG = 'BM02-QT06.01 (Bảng kê dự trù chi phí)',
  BM03_DE_NGHI_THANH_TOAN_TAM_UNG = 'BM03-QT06.01 (Đề nghị thanh toán tạm ứng)',
  BM04_BANG_KE_CHUNG_TU_TA_UNG = 'BM04-QT06.01 (Bảng kê chứng từ tạm ứng)',
  BM05_DE_NGHI_THANH_TOAN_TT = 'BM05-QT06.01 (Đề nghị thanh toán chung)',
  BM06_BANG_KE_CHUNG_TU_TT = 'BM06-QT06.01 (Bảng kê chứng từ thanh toán)',
  BM07_DE_NGHI_THANH_TOAN_HD = 'BM07-QT01/KHKT (Đề nghị thanh toán HĐ/Nhà thầu)',
  BM08_GIAY_DE_XUAT = 'BM08-QT06.01 (Giấy đề xuất mua sắm/chủ trương)'
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExpense?: Expense | null;
  selectedExpenses?: Expense[] | null; // For consolidated dossier printing!
  dossierCode?: string | null;           // Optional dossier code
  baselineDate: string;
  formApprovalThreshold?: number;
}

interface TableRowData {
  id: string;
  col1: string; // Nội dung / Danh sách
  col2: string; // Mục đích / Đơn vị / Tên nhà thầu
  col3: number; // Số tiền (đ) / Giá trị HĐ (đ)
  col4?: number; // Giá trị đã thanh toán (đồng)
  col5?: number; // Đề nghị thanh toán đợt này (đồng)
  col6?: string; // Ghi chú
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  selectedExpense,
  selectedExpenses,
  dossierCode,
  baselineDate,
  formApprovalThreshold = 10000000
}: ProjectFormModalProps) {
  // 1. Choose template
  const [template, setTemplate] = useState<FormTemplateType>(FormTemplateType.BM01_DE_NGHI_TAM_UNG);

  // 2. Global metadata for the form
  const [department, setDepartment] = useState('Ban Quản Lý Thiết Bị & Thi Công');
  const [position, setPosition] = useState('Chuyên viên Kỹ thuật');
  const [applicant, setApplicant] = useState('Nguyễn Văn An');
  const [recipient, setRecipient] = useState('Nguyễn Văn An');
  const [bankAccount, setBankAccount] = useState('10238491823');
  const [bankName, setBankName] = useState('Ngân hàng ACB');
  const [bankBranch, setBankBranch] = useState('PGD Lê Văn Khương');
  const [paymentMethod, setPaymentMethod] = useState<'TM' | 'CK'>('CK');
  const [advanceReason, setAdvanceReason] = useState('');
  const [reimbursementNotes, setReimbursementNotes] = useState('');
  const [clearanceInvoiceNo, setClearanceInvoiceNo] = useState('');
  const [clearanceInvoiceDate, setClearanceInvoiceDate] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('15 ngày');
  const [attachedFiles, setAttachedFiles] = useState('Hóa đơn bán lẻ, biên bản giao nhận');
  const [contractBasis, setContractBasis] = useState('Căn cứ PYC số 10/PYCVT HCM-TL-MT');
  const [contractorName, setContractorName] = useState('CÔNG TY TNHH MTV THƯƠNG MẠI DỊCH VỤ VẬN TẢI THANH ĐẠT PHÚ');
  const [contractValue, setContractValue] = useState<number>(150000000);
  const [previousPaidValue, setPreviousPaidValue] = useState<number>(85000000);
  const [proposalPurpose, setProposalPurpose] = useState('Đơm dầm lu lèn phụ vụ dự án mở rộng quốc lộ Trung Lương');

  // Amount variables
  const [formAmount, setFormAmount] = useState<number>(0);

  // Table items for lists (BM02, BM04, BM06, BM07, BM08)
  const [tableItems, setTableItems] = useState<TableRowData[]>([]);

  // Sign-off Threshold Override
  // Auto: Determine from amount (>10M VND goes to General Director, <=10M goes to Board of Management)
  // Force_BĐH: Board of Management (Giám đốc BĐH, Kế toán dự án)
  // Force_TGĐ: General Director (Tổng giám đốc, Kế toán trưởng)
  const [signThreshold, setSignThreshold] = useState<'AUTO' | 'BĐH' | 'TGĐ'>('AUTO');

  // Load from selected expense or group of expenses if supplied
  useEffect(() => {
    if (selectedExpense) {
      setApplicant(selectedExpense.createdByRole === 'Thủ kho' ? 'Đào Phú' : selectedExpense.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Cô Lan' : 'David Bảo');
      setRecipient(selectedExpense.createdByRole === 'Thủ kho' ? 'Đào Phú' : selectedExpense.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Cô Lan' : 'David Bảo');
      setPosition(selectedExpense.createdByRole === 'Thủ kho' ? 'Thủ kho bãi' : selectedExpense.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Phụ trách Hành chính' : 'Kế toán dự án');
      setDepartment(selectedExpense.createdByRole === 'Thủ kho' ? 'Bộ phận Kho vật tư' : selectedExpense.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Hành chính - Nhân sự' : 'Ban Tài chính - Kế toán');
      setAdvanceReason(selectedExpense.content);
      const isAdvance = selectedExpense.advanceAmount > 0;
      
      // Auto select appropriate form template based on expense types
      if (isAdvance && selectedExpense.actualAmount === 0) {
        setTemplate(FormTemplateType.BM01_DE_NGHI_TAM_UNG);
        setFormAmount(selectedExpense.advanceAmount);
      } else if (selectedExpense.advanceAmount > 0 && selectedExpense.actualAmount > 0) {
        setTemplate(FormTemplateType.BM03_DE_NGHI_THANH_TOAN_TAM_UNG);
        setFormAmount(selectedExpense.actualAmount);
      } else {
        setTemplate(FormTemplateType.BM05_DE_NGHI_THANH_TOAN_TT);
        setFormAmount(selectedExpense.actualAmount);
      }

      setClearanceInvoiceNo(selectedExpense.invoiceNo || '');
      setClearanceInvoiceDate(selectedExpense.actualDate || '');
      setReimbursementNotes(selectedExpense.notes || '');

      // Initialize table items with the single expense data
      setTableItems([
        {
          id: 'item-1',
          col1: selectedExpense.content,
          col2: selectedExpense.limitType || 'Định mức thi công',
          col3: selectedExpense.actualAmount > 0 ? selectedExpense.actualAmount : selectedExpense.advanceAmount,
          col4: 0,
          col5: selectedExpense.actualAmount,
          col6: selectedExpense.notes || ''
        }
      ]);
    } else if (selectedExpenses && selectedExpenses.length > 0) {
      const first = selectedExpenses[0];
      setApplicant(first.createdByRole === 'Thủ kho' ? 'Đào Phú' : first.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Cô Lan' : 'David Bảo');
      setRecipient(first.createdByRole === 'Thủ kho' ? 'Đào Phú' : first.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Cô Lan' : 'David Bảo');
      setPosition(first.createdByRole === 'Thủ kho' ? 'Thủ kho bãi' : first.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Phụ trách Hành chính' : 'Kế toán dự án');
      setDepartment(first.createdByRole === 'Thủ kho' ? 'Bộ phận Kho vật tư' : first.createdByRole === 'Hành chính nhân sự (HCNS)' ? 'Hành chính - Nhân sự' : 'Ban Tài chính - Kế toán');
      setAdvanceReason(`Quyết toán tổng hợp cho bộ hồ sơ đề xuất mã số ${dossierCode || 'Gộp'}`);

      const totalAdvance = selectedExpenses.reduce((sum, e) => sum + (e.advanceAmount || 0), 0);
      const totalActual = selectedExpenses.reduce((sum, e) => sum + (e.actualAmount || 0), 0);

      // Automatically suggest combined list-based templates
      if (totalAdvance > 0 && totalActual === 0) {
        setTemplate(FormTemplateType.BM02_BANG_KE_DU_TRU_TAM_UNG);
        setFormAmount(totalAdvance);
      } else if (totalAdvance > 0 && totalActual > 0) {
        setTemplate(FormTemplateType.BM04_BANG_KE_CHUNG_TU_TA_UNG);
        setFormAmount(totalActual);
      } else {
        setTemplate(FormTemplateType.BM06_BANG_KE_CHUNG_TU_TT);
        setFormAmount(totalActual);
      }

      setClearanceInvoiceNo('');
      setClearanceInvoiceDate(first.actualDate || first.requestDate || '');
      setReimbursementNotes(`Tập hợp ${selectedExpenses.length} khoản chi phí của Hồ sơ gộp ${dossierCode || ''}`);

      setTableItems(selectedExpenses.map((exp, index) => ({
        id: exp.id || `item-${index}`,
        col1: exp.content,
        col2: exp.limitType || exp.expenseType || 'Bồi hoàn thực tế',
        col3: exp.actualAmount > 0 ? exp.actualAmount : exp.advanceAmount,
        col4: 0,
        col5: exp.actualAmount,
        col6: exp.invoiceNo ? `HĐ: ${exp.invoiceNo}` : exp.notes || ''
      })));
    } else {
      // Default blank list
      setFormAmount(8500000);
      setAdvanceReason('Chi phí mua sắm vật liệu, bảo dưỡng xe lu rung công trình');
      setTableItems([
        { id: 'item-1', col1: 'Thuê thiết bị cẩu xích dầm phụ', col2: 'Chi phí thi công bãi đúc', col3: 5000000, col4: 0, col5: 5000000, col6: 'Chứng từ đầy đủ' },
        { id: 'item-2', col1: 'Mua mỡ bôi trơn bánh xích xe ủi', col2: 'Sửa chữa bảo trì xe lu', col3: 3500000, col4: 0, col5: 3500000, col6: 'Hóa đơn mã số 12903' }
      ]);
    }
  }, [selectedExpense, selectedExpenses, dossierCode]);

  // Read actual amount directly from summing up table lines for lists
  const isListTemplate = [
    FormTemplateType.BM02_BANG_KE_DU_TRU_TAM_UNG,
    FormTemplateType.BM04_BANG_KE_CHUNG_TU_TA_UNG,
    FormTemplateType.BM06_BANG_KE_CHUNG_TU_TT,
    FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD,
    FormTemplateType.BM08_GIAY_DE_XUAT
  ].includes(template);

  const calculateTotal = () => {
    if (isListTemplate) {
      if (template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD) {
        return tableItems.reduce((acc, item) => acc + (item.col5 || 0), 0);
      }
      return tableItems.reduce((acc, item) => acc + item.col3, 0);
    }
    return formAmount;
  };

  const totalAmount = calculateTotal();

  // Dynamic signoff logic based on the 10M VNĐ boundary
  const getApprovalTier = () => {
    if (signThreshold === 'BĐH') {
      return {
        directorTitle: 'Giám đốc BĐH',
        accountantTitle: 'Kế toán dự án'
      };
    }
    if (signThreshold === 'TGĐ') {
      return {
        directorTitle: 'Ban TGĐ Công ty',
        accountantTitle: 'Kế toán trưởng'
      };
    }
    // AUTO: under/equal 10,000,000 is BĐH, above is TGĐ
    if (totalAmount <= formApprovalThreshold) {
      return {
        directorTitle: 'Giám đốc BĐH',
        accountantTitle: 'Kế toán dự án'
      };
    } else {
      return {
        directorTitle: 'Ban TGĐ Công ty',
        accountantTitle: 'Kế toán trưởng'
      };
    }
  };

  const activeSignatures = getApprovalTier();

  // Helpers to add or remove rows in list editor
  const handleAddNewItem = () => {
    const newId = 'item-' + Date.now();
    setTableItems([
      ...tableItems,
      {
        id: newId,
        col1: 'Nội dung khoản chi mới...',
        col2: 'Mục đích sử dụng...',
        col3: 1000000,
        col4: 0,
        col5: 1000000,
        col6: ''
      }
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof TableRowData, value: any) => {
    setTableItems(tableItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    if (tableItems.length <= 1) {
      alert('Phải giữ lại ít nhất 1 dòng chứng từ.');
      return;
    }
    setTableItems(tableItems.filter(item => item.id !== id));
  };

  // Modern print trigger
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-0 overflow-hidden no-print">
      
      {/* Dynamic styling override injected purely for standard printouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Overrides that style the screen preview as well as the printed paper */
        #print-area-wrapper, #print-area-wrapper * {
          font-family: "Times New Roman", Times, "Liberation Serif", Georgia, serif !important;
          color: #000000 !important;
        }

        @media screen {
          #print-area-wrapper {
            max-width: 100% !important;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

        #print-area-wrapper table {
          border-collapse: collapse !important;
          border: 1.5px solid #000000 !important;
          width: 100% !important;
          margin-top: 10px !important;
          margin-bottom: 10px !important;
        }

        #print-area-wrapper th, #print-area-wrapper td {
          border: 1px solid #000000 !important;
          padding: 6px 8px !important;
          font-size: 11px !important;
          color: #000000 !important;
          line-height: 1.35 !important;
        }

        #print-area-wrapper th {
          font-weight: bold !important;
          text-align: center !important;
          background-color: #f5f5f5 !important;
        }

        /* Dotted leader styles for standard blanks or values */
        .dot-leader-container {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin-bottom: 6px;
        }

        .dot-leader-line {
          border-bottom: 1px dotted #000000 !important;
          flex-grow: 1 !important;
          height: 1px !important;
          margin-bottom: 4px !important;
        }

        @media print {
          /* Hide whole app save for the sheet wrapper */
          body * {
            visibility: hidden !important;
          }
          /* Show print modal only */
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
          }
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-no-wrap {
            white-space: nowrap !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}} />

      <div className="bg-slate-100 dark:bg-slate-950 w-full h-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
        
        {/* LEFT SIDEBAR CONTROLS: 350px width containing values we can edit dynamically */}
        <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto no-print">
          
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="font-extrabold text-xs tracking-wider uppercase text-blue-400">Thiết Lập Biểu Mẫu</h3>
                <p className="text-[10px] text-slate-400">Nhập thông tin in ấn đồng bộ</p>
              </div>
            </div>
            <button
              id="close-forms-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            
            {/* Dynamic limit indicator */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-1.5">
              <span className="font-bold text-blue-800 uppercase tracking-wide block">⚖️ QUY ĐỊNH DUYỆT CHI PHÍ:</span>
              <p className="text-blue-700 leading-snug">
                Số tiền <strong>≤ 10.000.000 VNĐ</strong>: Tự động dùng <strong>BIỂU MẪU DỰ ÁN</strong> (Giám đốc BĐH & Kế toán dự án ký duyệt).
              </p>
              <p className="text-blue-700 leading-snug col-span-2">
                Số tiền <strong>&gt; 10.000.000 VNĐ</strong>: Tự động dùng <strong>BIỂU MẪU VĂN PHÒNG</strong> (Ban TGĐ Công ty & Kế toán trưởng duyệt).
              </p>
            </div>

            {/* Choose Template Type */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 uppercase tracking-wide">1. Chọn Biểu Mẫu:</label>
              <select
                id="template-select-form"
                value={template}
                onChange={(e) => setTemplate(e.target.value as FormTemplateType)}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium cursor-pointer"
              >
                {Object.values(FormTemplateType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Threshold Override controls */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 uppercase tracking-wide">2. Quản lý Chữ Ký Phê Duyệt:</label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-150 p-1 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setSignThreshold('AUTO')}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold tracking-tight text-[10px] cursor-pointer ${
                    signThreshold === 'AUTO' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tự Động ({totalAmount <= formApprovalThreshold ? 'BĐH' : 'TGĐ'})
                </button>
                <button
                  type="button"
                  onClick={() => setSignThreshold('BĐH')}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold tracking-tight text-[10px] cursor-pointer ${
                    signThreshold === 'BĐH' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ép BĐH (≤{(formApprovalThreshold / 1000000).toLocaleString('vi-VN')}tr)
                </button>
                <button
                  type="button"
                  onClick={() => setSignThreshold('TGĐ')}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold tracking-tight text-[10px] cursor-pointer ${
                    signThreshold === 'TGĐ' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ép TGĐ (&gt;{(formApprovalThreshold / 1000000).toLocaleString('vi-VN')}tr)
                </button>
              </div>
            </div>

            {/* Form Fields to Customize */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <span className="font-bold text-slate-700 block uppercase tracking-wide">3. Thông Tin Cơ Bản:</span>

              {/* Amount - display/edit */}
              {!isListTemplate ? (
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Số tiền giao dịch (VNĐ):</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block">Số tiền (Tổng hợp từ danh sách dưới):</span>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono">{totalAmount.toLocaleString()} VNĐ</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-0.5">Người đề nghị:</label>
                  <input
                    type="text"
                    value={applicant}
                    onChange={(e) => setApplicant(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-0.5">Chức vụ:</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-0.5">Bộ phận / Phòng ban:</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Template specific fields */}
              {(template === FormTemplateType.BM01_DE_NGHI_TAM_UNG || template === FormTemplateType.BM05_DE_NGHI_THANH_TOAN_TT || template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD) && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-250">
                  <span className="font-extrabold text-slate-700 block uppercase text-[10px]">Phương Thức & Thụ Hưởng:</span>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'CK'}
                        onChange={() => setPaymentMethod('CK')}
                        className="text-blue-600"
                      />
                      <span className="font-medium">Chuyển khoản</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'TM'}
                        onChange={() => setPaymentMethod('TM')}
                        className="text-blue-600"
                      />
                      <span className="font-medium">Tiền mặt</span>
                    </label>
                  </div>

                  {paymentMethod === 'CK' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5">Người nhận tiền thụ hưởng:</label>
                        <input
                          type="text"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5">Số tài khoản ngân hàng:</label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-500 font-semibold mb-0.5">Tên Ngân hàng:</label>
                          <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full p-1.5 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-semibold mb-0.5">Chi nhánh:</label>
                          <input
                            type="text"
                            value={bankBranch}
                            onChange={(e) => setBankBranch(e.target.value)}
                            className="w-full p-1.5 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic details input */}
              {!isListTemplate && (
                <div>
                  <label className="block text-slate-500 font-semibold mb-0.5">Lý do chi phí / Tạm ứng:</label>
                  <textarea
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                </div>
              )}

              {/* Additional custom details depending on forms */}
              {template === FormTemplateType.BM01_DE_NGHI_TAM_UNG && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-0.5">Hạn hoàn ứng:</label>
                    <input
                      type="text"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(e.target.value)}
                      placeholder="15 ngày, 30 ngày..."
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-0.5">Kèm theo chứng chỉ:</label>
                    <input
                      type="text"
                      value={attachedFiles}
                      onChange={(e) => setAttachedFiles(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD && (
                <div className="space-y-2 bg-indigo-50/50 p-2.5 border border-indigo-200 rounded-xl text-[11px]">
                  <span className="font-bold text-indigo-900 uppercase block">Căn cứ & Thông tin hợp đồng:</span>
                  <div>
                    <label className="block text-slate-650 font-bold mb-0.5">Căn cứ thanh toán:</label>
                    <input
                      type="text"
                      value={contractBasis}
                      onChange={(e) => setContractBasis(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-650 font-bold mb-0.5">Tên nhà thầu:</label>
                    <input
                      type="text"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-650 font-bold mb-0.5">Giá trị hợp đồng:</label>
                      <input
                        type="number"
                        value={contractValue}
                        onChange={(e) => setContractValue(Number(e.target.value))}
                        className="w-full p-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-650 font-bold mb-0.5">Đã tạm ứng/thanh toán:</label>
                      <input
                        type="number"
                        value={previousPaidValue}
                        onChange={(e) => setPreviousPaidValue(Number(e.target.value))}
                        className="w-full p-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {template === FormTemplateType.BM08_GIAY_DE_XUAT && (
                <div>
                  <label className="block text-slate-500 font-semibold mb-0.5">Mục đích đề xuất (V/v):</label>
                  <input
                    type="text"
                    value={proposalPurpose}
                    onChange={(e) => setProposalPurpose(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* List Editor (BM02, BM04, BM05, BM06, BM07, BM08 list rows) */}
            {isListTemplate && (
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wide">4. Chỉnh Sửa Danh Sách Dòng:</span>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Thêm dòng
                  </button>
                </div>
                
                <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                  {tableItems.map((item, index) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-250 rounded-xl space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="absolute right-2 top-2 text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                        title="Xóa dòng"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span className="font-mono text-[9px] text-slate-400 block font-bold">DÒNG SỐ {index + 1}</span>
                      
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Nội dung chi / Tên hàng hóa:</label>
                        <input
                          type="text"
                          value={item.col1}
                          onChange={(e) => handleUpdateItem(item.id, 'col1', e.target.value)}
                          className="w-full p-1 text-[11px] border border-slate-300 rounded-md"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            {template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? 'Tên nhà thầu / Tổ Đội:' : 'Mục đích / Đơn vị tính:'}
                          </label>
                          <input
                            type="text"
                            value={item.col2}
                            onChange={(e) => handleUpdateItem(item.id, 'col2', e.target.value)}
                            className="w-full p-1 text-[11px] border border-slate-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            {template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? 'Số tiền đề nghị kỳ này (đ):' : 'Số tiền (VNĐ):'}
                          </label>
                          <input
                            type="number"
                            value={template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? item.col5 : item.col3}
                            onChange={(e) => handleUpdateItem(item.id, template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? 'col5' : 'col3', Number(e.target.value) || 0)}
                            className="w-full p-1 text-[11px] font-mono border border-slate-300 rounded-md text-right font-semibold"
                          />
                        </div>
                      </div>

                      {template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Giá trị hợp đồng (đ):</label>
                            <input
                              type="number"
                              value={item.col3}
                              onChange={(e) => handleUpdateItem(item.id, 'col3', Number(e.target.value) || 0)}
                              className="w-full p-1 text-[11px] font-mono border border-slate-300 rounded-md text-right"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Đã tạm ứng lũy kế (đ):</label>
                            <input
                              type="number"
                              value={item.col4}
                              onChange={(e) => handleUpdateItem(item.id, 'col4', Number(e.target.value) || 0)}
                              className="w-full p-1 text-[11px] font-mono border border-slate-300 rounded-md text-right"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Ghi chú ảnh hưởng:</label>
                        <input
                          type="text"
                          value={item.col6}
                          onChange={(e) => handleUpdateItem(item.id, 'col6', e.target.value)}
                          className="w-full p-1 text-[11px] border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* PRINT VOUCHER ACTION */}
          <div className="p-4 border-t border-slate-200 mt-auto sticky bottom-0 bg-white z-20">
            <button
              onClick={handlePrint}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white py-3 px-4 rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>In Biểu Mẫu Điền Sẵn</span>
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW / SHEET SHEET CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200 dark:bg-slate-900">
          <div
            id="print-area-wrapper"
            className="w-[210mm] min-h-[297mm] bg-white text-black p-10 md:p-12 shadow-xl relative text-left leading-relaxed flex flex-col justify-start gap-6"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* 1. COMPACT LETTERHEAD HEADER TABLE */}
              <table className="w-full border-collapse border border-black print-border-black text-[10px] leading-tight text-left">
              <tbody>
                <tr className="divide-x divide-black">
                  {/* Logo column */}
                  <td className="w-28 p-2 text-center align-middle text-black">
                    <TrungHaiLogo />
                  </td>
                  
                  {/* Name section */}
                  <td className="p-3 text-center align-middle space-y-1">
                    <h4 className="font-serif font-bold text-[10.5px] uppercase tracking-wide text-black">
                      CÔNG TY CỔ PHẦN XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI
                    </h4>
                    <span className="text-[8.5px] font-semibold text-black block">
                      {totalAmount <= formApprovalThreshold 
                        ? 'Ban Điều hành Dự án Quốc lộ - Cao tốc Trung Lương - Mỹ Thuận' 
                        : 'Văn phòng Tổng Công ty'}
                    </span>
                  </td>
                  
                  {/* Form Metadata code */}
                  <td className="w-48 p-0 divide-y divide-black text-[9.5px]">
                    <div className="p-1 px-2 flex justify-between">
                      <span className="font-bold">Mã số:</span>
                      <span className="font-bold">
                        {template === FormTemplateType.BM01_DE_NGHI_TAM_UNG ? 'BM01-QT06.01' :
                         template === FormTemplateType.BM02_BANG_KE_DU_TRU_TAM_UNG ? 'BM02-QT06.01' :
                         template === FormTemplateType.BM03_DE_NGHI_THANH_TOAN_TAM_UNG ? 'BM03-QT06.01' :
                         template === FormTemplateType.BM04_BANG_KE_CHUNG_TU_TA_UNG ? 'BM04-QT06.01' :
                         template === FormTemplateType.BM05_DE_NGHI_THANH_TOAN_TT ? 'BM05-QT06.01' :
                         template === FormTemplateType.BM06_BANG_KE_CHUNG_TU_TT ? 'BM06-QT06.01' :
                         template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? 'BM07-QT01/KHKT' :
                         'BM08-QT06.01'}
                      </span>
                    </div>
                    <div className="p-1 px-2 flex justify-between">
                      <span>Lần ban hành:</span>
                      <span>01</span>
                    </div>
                    <div className="p-1 px-2 flex justify-between">
                      <span>Ngày ban hành:</span>
                      <span>01/08/2022</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. DYNAMIC FORM CONTENT RENDER */}
            
            {/* --- TEMPLATE BM01: ĐỀ NGHỊ TẠM ỨNG --- */}
            {template === FormTemplateType.BM01_DE_NGHI_TAM_UNG && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">ĐỀ NGHỊ TẠM ỨNG</h2>
                </div>

                <div className="space-y-3.5 text-[12px] leading-relaxed">
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Người đề nghị:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{applicant}</span></p>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Chức vụ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{position}</span></p>
                  </div>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Bộ phận:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{department}</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Đề nghị tạm ứng số tiền:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-bold text-sm">{totalAmount.toLocaleString('vi-VN')} VNĐ</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">(Bằng chữ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Lý do đề nghị tạm ứng:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{advanceReason}</span></p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 font-bold">
                      <span className="print-no-wrap">Hình thức tạm ứng:</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[10px]">
                          {paymentMethod === 'TM' ? '✓' : ''}
                        </span>
                        <span>Tiền mặt</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[10px]">
                          {paymentMethod === 'CK' ? '✓' : ''}
                        </span>
                        <span>Chuyển khoản</span>
                      </span>
                    </div>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Thời hạn hoàn ứng:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{deadlineDays}</span></p>
                  </div>

                  {paymentMethod === 'CK' && (
                    <div className="p-3 bg-white rounded-none border border-black text-[11px] space-y-1.5 leading-snug">
                      <p className="font-bold text-black uppercase tracking-wider text-[10px]">Thông tin thụ hưởng thanh toán ngân hàng:</p>
                      <div className="grid grid-cols-2 gap-2 text-black">
                        <p><span className="font-semibold text-slate-700">Người nhận tiền:</span> {recipient}</p>
                        <p><span className="font-semibold text-slate-700">Số tài khoản:</span> <strong className="text-black">{bankAccount}</strong></p>
                        <p className="col-span-2"><span className="font-semibold text-slate-700">Mở tại Ngân hàng:</span> {bankName} - Chi nhánh: {bankBranch}</p>
                      </div>
                    </div>
                  )}

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">(Kèm theo chứng từ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black italic">{attachedFiles}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM02: BẢNG KÊ DỰ TRÙ CHI PHÍ --- */}
            {template === FormTemplateType.BM02_BANG_KE_DU_TRU_TAM_UNG && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">BẢNG KÊ DỰ TRÙ CHI PHÍ TẠM ỨNG</h2>
                  <p className="text-[10px] italic text-slate-500">( Đi kèm giấy đề nghị tạm ứng ngày {baselineDate ? baselineDate.split('-').reverse().join('/') : '01/06/2026'} )</p>
                </div>

                <div className="space-y-4">
                  <p className="text-black italic text-[10px]">Chú ý: Gạch chéo những dòng trống không kê khai thông tin</p>
                  
                  {/* Detailed Table */}
                  <table className="w-full border-collapse border border-black print-border-black text-[11px]">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1 w-12">STT</th>
                        <th className="py-2 px-3 text-left">Nội dung khoản chi</th>
                        <th className="py-2 px-3 text-left">Mục đích sử dụng</th>
                        <th className="py-2 px-3 text-right w-32">Số tiền đề xuất (đ)</th>
                        <th className="py-2 px-3 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black">
                      {tableItems.map((item, index) => (
                        <tr key={item.id} className="text-black">
                          <td className="py-2 px-1 text-center font-bold">{index + 1}</td>
                          <td className="py-2 px-3 font-semibold">{item.col1}</td>
                          <td className="py-2 px-3">{item.col2}</td>
                          <td className="py-2 px-3 text-right font-bold">{item.col3.toLocaleString('vi-VN')}</td>
                          <td className="py-2 px-3 italic">{item.col6 || '-'}</td>
                        </tr>
                      ))}
                      {/* Sub-total */}
                      <tr className="border-t border-black divide-x divide-black font-bold">
                        <td colSpan={3} className="py-2.5 px-3 text-right bg-slate-50">Tổng cộng dự trù</td>
                        <td className="py-2.5 px-3 text-right text-black text-xs font-bold">{totalAmount.toLocaleString('vi-VN')}</td>
                        <td className="py-2.5 px-3 italic text-black font-normal">Đồng chẵn</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="flex gap-1.5 text-xs"><span className="font-bold print-no-wrap">(Bằng chữ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM03: ĐỀ NGHỊ THANH TOÁN TẠM ỨNG --- */}
            {template === FormTemplateType.BM03_DE_NGHI_THANH_TOAN_TAM_UNG && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">ĐỀ NGHỊ THANH TOÁN TẠM ỨNG</h2>
                </div>

                <div className="space-y-3.5 text-[12px] leading-relaxed">
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Người hoàn ứng:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{applicant}</span></p>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Chức vụ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{position}</span></p>
                  </div>
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Bộ phận tác nghiệp:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{department}</span></p>
                  
                  <p className="font-bold text-black uppercase text-[10px] pt-1">Diễn giải số tiền tạm ứng được hoàn ứng theo bảng dưới:</p>
                  
                  <table className="w-full border-collapse border border-black print-border-black text-[11px]">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1 w-12">STT</th>
                        <th className="py-2 px-3 text-left">Diễn giải nội dung thanh toán</th>
                        <th className="py-2 px-3 text-right w-36">Số tiền phát sinh (đ)</th>
                        <th className="py-2 px-3 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black leading-snug">
                      <tr className="font-bold text-black">
                        <td className="py-2 px-1 text-center bg-slate-50">I</td>
                        <td className="py-2 px-3 bg-slate-50">Tổng số tiền đã tạm ứng trước đây:</td>
                        <td className="py-2 px-3 text-right">{(selectedExpense?.advanceAmount || totalAmount).toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-3 italic font-normal">Phiếu chi/Ủy nhiệm chi số: {selectedExpense?.invoiceNo || 'PC-901'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-1 text-center">1</td>
                        <td className="py-2 px-3 pl-6 text-black">Mục đích tạm ứng hoàn thành:</td>
                        <td className="py-2 px-3 text-right">{(selectedExpense?.advanceAmount || totalAmount).toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-3 italic">{selectedExpense?.content || advanceReason}</td>
                      </tr>

                      <tr className="font-bold text-black">
                        <td className="py-2 px-1 text-center bg-slate-50">II</td>
                        <td className="py-2 px-3 bg-slate-50">Tổng chi phí thực tế đã thực hiện chi:</td>
                        <td className="py-2 px-3 text-right">{(selectedExpense?.actualAmount || totalAmount).toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-3 italic font-normal">Quyết toán thực tế có chứng từ</td>
                      </tr>
                      {tableItems.map((item, idx) => (
                        <tr key={item.id} className="text-black">
                          <td className="py-1 px-1 text-center">{idx + 1}</td>
                          <td className="py-1 px-3 pl-6">{item.col1}</td>
                          <td className="py-1 px-3 text-right">{(template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD ? (item.col5 || 0) : item.col3).toLocaleString('vi-VN')}</td>
                          <td className="py-1 px-3 italic">{item.col6 || '-'}</td>
                        </tr>
                      ))}

                      <tr className="font-bold">
                        <td className="py-2 px-1 text-center bg-slate-50">III</td>
                        <td className="py-2 px-3 bg-slate-50">Chênh lệch hoàn ứng:</td>
                        <td className="py-2 px-3 text-right text-rose-700">
                          {((selectedExpense?.advanceAmount || totalAmount) - (selectedExpense?.actualAmount || totalAmount)).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-normal italic">
                          {((selectedExpense?.advanceAmount || totalAmount) - (selectedExpense?.actualAmount || totalAmount)) > 0 
                            ? 'Số tạm ứng dư trả lại quỹ công trình' 
                            : 'Chi quá định mức - đề nghị cấp bổ sung'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Tổng chi phí bằng chữ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold italic">{convertNumberToVietnameseWords(selectedExpense?.actualAmount || totalAmount)}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM04: BẢNG KÊ CHỨNG TỪ TẠM ỨNG --- */}
            {template === FormTemplateType.BM04_BANG_KE_CHUNG_TU_TA_UNG && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">BẢNG KÊ CHỨNG TỪ THANH TOÁN TẠM ỨNG</h2>
                  <p className="text-[10px] italic text-slate-500">( Đi kèm giấy đề nghị thanh toán tạm ứng ngày {clearanceInvoiceDate ? clearanceInvoiceDate.split('-').reverse().join('/') : '01/06/2026'} )</p>
                </div>

                <div className="space-y-4 text-xs">
                  <table className="w-full border-collapse border border-black print-border-black text-[10px]">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1" rowSpan={2}>STT</th>
                        <th className="py-2 px-2" rowSpan={2}>Nội dung chi phí</th>
                        <th className="py-1 px-2" colSpan={2}>Hóa đơn chứng từ</th>
                        <th className="py-1 px-2" colSpan={3}>Giá trị thanh toán</th>
                      </tr>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-1 px-1">Ngày/Tháng/Năm</th>
                        <th className="py-1 px-1">Số Hóa đơn</th>
                        <th className="p-1 text-right">Không VAT (đ)</th>
                        <th className="p-1 text-right">Thuế VAT (đ)</th>
                        <th className="p-1 text-right">Có VAT (đ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black leading-snug">
                      {tableItems.map((item, idx) => {
                        const amountWithoutVat = Math.round(item.col3 * 0.9090);
                        const vat = item.col3 - amountWithoutVat;
                        return (
                          <tr key={item.id} className="text-black">
                            <td className="py-2 px-1 text-center font-bold">{idx + 1}</td>
                            <td className="py-2 px-2 font-bold">{item.col1}</td>
                            <td className="py-2 px-1 text-center">{clearanceInvoiceDate || '01/06/2026'}</td>
                            <td className="py-2 px-1 text-center">{clearanceInvoiceNo || '33'}</td>
                            <td className="py-2 px-2 text-right">{amountWithoutVat.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-2 text-right">{vat.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-2 text-right font-bold">{item.col3.toLocaleString('vi-VN')}</td>
                          </tr>
                        );
                      })}
                      {/* Totals */}
                      <tr className="font-bold border-t border-black divide-x divide-black">
                        <td colSpan={6} className="py-2 px-3 text-right bg-slate-50">TỔNG CỘNG HOÀN ỨNG CÓ VAT</td>
                        <td className="py-2 px-2 text-right text-black font-bold">{totalAmount.toLocaleString('vi-VN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Số tiền bằng chữ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM05: ĐỀ NGHỊ THANH TOÁN CHUNG --- */}
            {template === FormTemplateType.BM05_DE_NGHI_THANH_TOAN_TT && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">ĐỀ NGHỊ THANH TOÁN</h2>
                </div>

                <div className="space-y-3.5 text-[12px] leading-relaxed">
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Người đề nghị:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{applicant}</span></p>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Chức vụ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{position}</span></p>
                  </div>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Bộ phận:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{department}</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Thanh toán số tiền:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-bold text-sm">{totalAmount.toLocaleString('vi-VN')} VNĐ</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">(Bằng chữ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                  
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Lý do thanh toán:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{advanceReason}</span></p>
                  
                  <div className="flex items-center gap-4 font-bold">
                    <span className="print-no-wrap">Hình thức thanh toán:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[10px]">
                        {paymentMethod === 'TM' ? '✓' : ''}
                      </span>
                      <span>Tiền mặt</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[10px]">
                        {paymentMethod === 'CK' ? '✓' : ''}
                      </span>
                      <span>Chuyển khoản</span>
                    </span>
                  </div>

                  {paymentMethod === 'CK' && (
                    <div className="p-3 bg-white rounded-none border border-black text-[11px] space-y-1.5 leading-snug">
                      <p className="font-bold text-black uppercase tracking-wider text-[10px]">Thông tin thụ hưởng thanh toán ngân hàng:</p>
                      <div className="grid grid-cols-2 gap-2 text-black">
                        <p><span className="font-semibold text-slate-700">Đơn vị nhận:</span> {recipient}</p>
                        <p><span className="font-semibold text-slate-700">Số tài khoản:</span> <strong className="text-black">{bankAccount}</strong></p>
                        <p className="col-span-2"><span className="font-semibold text-slate-700">Mở tại Ngân hàng:</span> {bankName} - Chi nhánh: {bankBranch}</p>
                      </div>
                    </div>
                  )}

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">(Đính kèm chứng từ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-medium italic">{attachedFiles}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM06: BẢNG KÊ CHỨNG TỪ THANH TOÁN --- */}
            {template === FormTemplateType.BM06_BANG_KE_CHUNG_TU_TT && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">BẢNG KÊ CHỨNG TỪ THANH TOÁN</h2>
                  <p className="text-[10px] italic text-slate-500">( Đi kèm giấy đề nghị thanh toán ngày {clearanceInvoiceDate ? clearanceInvoiceDate.split('-').reverse().join('/') : '01/06/2026'} )</p>
                </div>

                <div className="space-y-4 text-xs">
                  <table className="w-full border-collapse border border-black print-border-black text-[10px]">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1">STT</th>
                        <th className="py-2 px-3 text-left">Nội dung chứng từ</th>
                        <th className="py-2 px-1">Ngày/Tháng/Năm</th>
                        <th className="py-2 px-1">Số Hóa đơn</th>
                        <th className="p-1.5 text-right">Số tiền chưa VAT (đ)</th>
                        <th className="p-1.5 text-right font-bold">Thuế VAT (đ)</th>
                        <th className="p-1.5 text-right">Tổng cộng (đ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black leading-snug">
                      {tableItems.map((item, idx) => {
                        const amountWithoutVat = Math.round(item.col3 * 0.9090);
                        const vat = item.col3 - amountWithoutVat;
                        return (
                          <tr key={item.id} className="text-black">
                            <td className="py-2 px-1 text-center font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold">{item.col1}</td>
                            <td className="py-2 px-1 text-center">{clearanceInvoiceDate || '01/06/2026'}</td>
                            <td className="py-2 px-1 text-center">{clearanceInvoiceNo || '33'}</td>
                            <td className="py-2 px-2 text-right">{amountWithoutVat.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-2 text-right">{vat.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-2 text-right font-bold">{item.col3.toLocaleString('vi-VN')}</td>
                          </tr>
                        );
                      })}
                      {/* Totals */}
                      <tr className="font-bold border-t border-black divide-x divide-black">
                        <td colSpan={6} className="py-2 px-3 text-right bg-slate-50">TỔNG CỘNG THANH TOÁN (ĐÃ CHI)</td>
                        <td className="py-2 px-2 text-right text-black font-bold">{totalAmount.toLocaleString('vi-VN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Số tiền bằng chữ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM07: ĐỀ NGHỊ THANH TOÁN NHÀ THẦU --- */}
            {template === FormTemplateType.BM07_DE_NGHI_THANH_TOAN_HD && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">ĐỀ NGHỊ THANH TOÁN</h2>
                  <p className="text-[10px] italic text-slate-500">Ngày {baselineDate ? baselineDate.split('-').reverse().join('/') : '01/06/2026'}</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">- Căn cứ:</span> <span className="border-b border-dotted border-black grow pl-1 font-semibold italic text-black">{contractBasis}</span></p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Ban đề nghị:</span> <span className="border-b border-dotted border-black grow pl-1 text-black">{department}</span></p>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Người đại diện:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{applicant}</span></p>
                  </div>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Nội dung thanh toán:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-medium">{advanceReason}</span></p>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Tổng giá trị đề xuất:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-bold text-sm">{totalAmount.toLocaleString('vi-VN')} VNĐ</span></p>
                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">(Bằng chữ):</span> <span className="border-b border-dotted border-black grow pl-1 text-black italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>

                  {/* Progressive contractor accounting table */}
                  <table className="w-full border-collapse border border-black print-border-black text-[9px] leading-snug">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1 w-8">STT</th>
                        <th className="py-2 px-2 text-left">Nội dung thanh toán đợt kỳ</th>
                        <th className="py-2 px-2 text-left">Tên nhà thầu thụ hưởng</th>
                        <th className="py-2 px-1 text-right">Giá trị Hợp đồng (đ)</th>
                        <th className="py-2 px-1 text-right">Đã tạm ứng trước (đ)</th>
                        <th className="py-2 px-1 text-right">Đề nghị đợt này (đ)</th>
                        <th className="py-2 px-1 text-right">Tổng lũy kế (đ)</th>
                        <th className="py-2 px-1 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black text-black">
                      {tableItems.map((item, idx) => {
                        const totalPaidAcum = (item.col4 || 0) + (item.col5 || 0);
                        return (
                          <tr key={item.id} className="text-black">
                            <td className="py-1 px-1 text-center font-bold">{idx + 1}</td>
                            <td className="py-1 px-2 font-semibold">{item.col1}</td>
                            <td className="py-1 px-2">{contractorName}</td>
                            <td className="py-1 px-1 text-right">{(item.col3 || contractValue).toLocaleString('vi-VN')}</td>
                            <td className="py-1 px-1 text-right">{(item.col4 || previousPaidValue).toLocaleString('vi-VN')}</td>
                            <td className="py-1 px-1 text-right font-bold">{(item.col5 || totalAmount).toLocaleString('vi-VN')}</td>
                            <td className="py-1 px-1 text-right font-bold">{totalPaidAcum.toLocaleString('vi-VN')}</td>
                            <td className="py-1 px-2 italic">{item.col6 || '-'}</td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold border-t border-black divide-x divide-black text-[10px]">
                        <td colSpan={3} className="py-1.5 px-3 text-right uppercase bg-slate-50">Tổng cộng hồ sơ thầu</td>
                        <td className="py-1.5 px-1 text-right bg-slate-50">{contractValue.toLocaleString('vi-VN')}</td>
                        <td className="py-1.5 px-1 text-right bg-slate-50">{previousPaidValue.toLocaleString('vi-VN')}</td>
                        <td className="py-1.5 px-1 text-right bg-slate-50 text-black">{totalAmount.toLocaleString('vi-VN')}</td>
                        <td className="py-1.5 px-1 text-right bg-slate-50">{(previousPaidValue + totalAmount).toLocaleString('vi-VN')}</td>
                        <td className="py-1.5 px-1 bg-slate-50 italic font-normal">Duyệt chi đợt này</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-3 bg-white rounded-none border border-black text-[11px] space-y-1.5 leading-snug">
                    <p className="font-bold text-black uppercase tracking-wider text-[10px]">Đơn vị thụ hưởng:</p>
                    <div className="grid grid-cols-2 gap-2 text-black">
                      <p><span className="font-semibold text-slate-700">Đơn vị:</span> {contractorName}</p>
                      <p><span className="font-semibold text-slate-700">Tài khoản Ngân hàng:</span> <strong>{bankAccount}</strong> mở tại <strong>{bankName} - {bankBranch}</strong></p>
                      <p className="col-span-2"><span className="font-semibold text-slate-700">Tài liệu kèm theo hoàn tất:</span> {attachedFiles}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TEMPLATE BM08: GIẤY ĐỀ XUẤT --- */}
            {template === FormTemplateType.BM08_GIAY_DE_XUAT && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-black text-center">GIẤY ĐỀ XUẤT</h2>
                  <p className="text-[10px] italic text-slate-500">( V/v: đề đạt phương án thực thi: {proposalPurpose} )</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Người đề xuất:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{applicant}</span></p>
                    <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Phòng ban đề xuất:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold">{department}</span></p>
                  </div>

                  <p className="font-bold uppercase tracking-wide text-black text-[10px] pt-1">Nội dung đề xuất cụ thể theo bảng đánh giá:</p>

                  <table className="w-full border-collapse border border-black print-border-black text-[11px]">
                    <thead>
                      <tr className="border-b border-black divide-x divide-black text-center font-bold">
                        <th className="py-2 px-1 w-12">STT</th>
                        <th className="py-2 px-3 text-left">Danh sách đề xuất, trang bị, phương án</th>
                        <th className="py-2 px-2 text-center w-24">Đơn vị tính</th>
                        <th className="py-2 px-3 text-right w-36">Tổng dự tính (đ)</th>
                        <th className="py-2 px-2 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black divide-x divide-black leading-snug">
                      {tableItems.map((item, idx) => (
                        <tr key={item.id} className="text-black">
                          <td className="py-2 px-1 text-center font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold">{item.col1}</td>
                          <td className="py-2 px-2 text-center">{item.col2 || 'Đợt / Cái'}</td>
                          <td className="py-2 px-3 text-right font-bold">{item.col3.toLocaleString('vi-VN')}</td>
                          <td className="py-2 px-2 italic">{item.col6 || '-'}</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-black divide-x divide-black">
                        <td colSpan={3} className="py-2 px-3 text-right bg-slate-50">Tổng hợp giá trị đề xuất</td>
                        <td className="py-2 px-3 text-right text-black font-bold text-xs">{totalAmount.toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-2 italic text-black font-normal">Đồng chẵn</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="flex gap-1.5"><span className="font-bold print-no-wrap">Bằng chữ:</span> <span className="border-b border-dotted border-black grow pl-1 text-black font-semibold italic">{convertNumberToVietnameseWords(totalAmount)}</span></p>
                </div>
              </div>
            )}


            </div>

            {/* 3. SIGNATURE BLOCKS - DYNAMIC CHOSEN TIER BASED ON 10M VND LIMIT */}
            <div className="mt-auto pt-8 space-y-6 font-serif">
              <div className="text-right text-[11px] italic">
                Ngày {baselineDate ? baselineDate.split('-')[2] : '01'} tháng {baselineDate ? baselineDate.split('-')[1] : '06'} năm {baselineDate ? baselineDate.split('-')[0] : '2026'}
              </div>
              
              {/* Dynamic Columns based on threshold levels */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10.5px] leading-tight">
                
                {/* Col 1 */}
                <div className="space-y-6">
                  <div>
                    <span className="font-bold uppercase block text-black">Người đề nghị</span>
                    <span className="text-[8.5px] italic text-slate-500 block">(Ký, ghi rõ họ tên)</span>
                  </div>
                  <div className="pt-4 flex flex-col items-center">
                    <span className="text-[11.5px] font-bold text-blue-900 italic font-serif leading-none">{applicant}</span>
                    <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold font-sans tracking-wider">(Đã ký số)</span>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="space-y-6">
                  <div>
                    <span className="font-bold uppercase block text-black">Trưởng phòng ban</span>
                    <span className="text-[8.5px] italic text-slate-500 block">(Ký, duyệt ý kiến)</span>
                  </div>
                  <div className="pt-4 flex flex-col items-center">
                    <span className="text-[11px] font-bold text-emerald-700 italic font-serif leading-none">(Đã kiểm duyệt)</span>
                    <span className="text-[8px] text-emerald-600/80 mt-1 uppercase font-semibold font-sans tracking-wider font-mono">● ONLINE VERIFIED</span>
                  </div>
                </div>

                {/* Col 3: Changes dynamically from Kế toán dự án (under) to Kế toán trưởng (above) */}
                <div className="space-y-6">
                  <div>
                    <span className="font-bold uppercase block text-black">{activeSignatures.accountantTitle}</span>
                    <span className="text-[8.5px] italic text-slate-500 block">(Ký, kiểm soát chi)</span>
                  </div>
                  <div className="pt-4 flex flex-col items-center">
                    <span className="text-[11px] font-bold text-blue-900 italic font-serif leading-none">
                      {totalAmount <= formApprovalThreshold ? 'Kế toán dự án ký' : 'Kế toán trưởng ký'}
                    </span>
                    <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold font-sans tracking-wider">(Đã kiểm soát)</span>
                  </div>
                </div>

                {/* Col 4: Changes dynamically from Giám đốc BĐH (under) to Ban TGĐ Công ty (above) */}
                <div className="space-y-6">
                  <div>
                    <span className="font-bold uppercase block text-black">{activeSignatures.directorTitle}</span>
                    <span className="text-[8.5px] italic text-slate-500 block">(Ký, phê duyệt chung)</span>
                  </div>
                  <div className="pt-4 flex flex-col items-center">
                    <span className="text-[11px] font-extrabold text-rose-700 font-serif uppercase tracking-wider leading-none">
                      {totalAmount <= formApprovalThreshold ? 'HĐ QUẢN TRỊ DUYỆT' : 'BAN TGĐ DUYỆT'}
                    </span>
                    <span className="text-[8px] text-rose-600 mt-1 uppercase font-semibold font-sans tracking-wider font-mono">● ĐÃ HOÀN TẤT</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
