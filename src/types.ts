/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ExpenseGroup {
  PROJECT_MGMT = 'Quản lý DN/Công trình (642,627)',
  CONSTRUCTION = 'Chi phí thi công (621,622,623)',
  FINANCE_LEGAL = 'Chi phí tài chính & pháp lý',
  INITIAL_INVEST = 'Chi phí đầu tư ban đầu',
  PROVISION_EMERGENCY = 'Chi phí dự phòng & phát sinh'
}

export enum ExpenseType {
  FUEL = 'Dầu (621)',
  KITCHEN = 'Bếp ăn',
  TRAVEL = 'Công tác phí',
  ADMIN = 'Hành chính',
  RECEPTION = 'Tiếp khách',
  SHIPPING = 'Vận chuyển',
  MATERIALS = 'Vật liệu/Vật tư',
  LABOR = 'Nhân công',
  OTHER = 'Khác'
}

export enum UserRole {
  ACCOUNTANT = 'Kế toán dự án',
  STOREKEEPER = 'Thủ kho',
  HCNS = 'Hành chính nhân sự (HCNS)',
  BOSS = 'Giám đốc / Sếp'
}

export interface Expense {
  id: string;
  requestDate: string; // YYYY-MM-DD
  actualDate: string;  // YYYY-MM-DD
  content: string;
  expenseGroup: string;
  expenseType: string;
  advanceAmount: number;
  actualAmount: number;
  limitType: string; // e.g. "0", "Theo thực tế", "60k/người", "Theo định mức", "Theo HĐ"
  clearanceStatus: 'Xong' | 'Đang hoàn ứng'; // Xong corresponds to "Đã hoàn ứng" in PDF
  documentStatus: 'Đầy đủ' | 'Thiếu chứng từ';
  missingDocuments?: string;
  invoiceNo?: string;
  notes?: string;
  column1?: string;
  createdByRole: string; // UserRole
  createdAt: string;
  dossierCode?: string; // code of the associated DocumentProgress (HS-xxx)
}

export interface FundReceipt {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  expenseGroup?: string;
  amount: number;
  source: 'Ngân sách' | 'Mượn sếp' | 'Khác';
  notes?: string;
  fundType: 'HCNS' | 'Dầu';
  createdAt: string;
}

export interface DocumentProgress {
  id: string;
  code: string; // e.g., HS-001
  name: string;
  expenseId?: string; // associated expense
  category: 'Hợp đồng' | 'Hóa đơn' | 'Biên bản nghiệm thu' | 'Biên bản giao nhận' | 'Khác';
  status: 'Soạn thảo' | 'Trình ký' | 'Đã ký duyệt' | 'Hoàn tất' | 'Lưu trữ';
  updatedAt: string; // YYYY-MM-DD
  assignedTo: string; // UserRole or specific name
  notes?: string;
}

export interface MaterialItem {
  id: string;
  code: string; // VT-001
  name: string;
  unit: string; // Lít, Tấn, Kg, Cái...
  minStock: number; // Định mức tồn tối thiểu
  description?: string;
}

export interface MaterialTransaction {
  id: string;
  materialId: string;
  type: 'NHẬP' | 'XUẤT';
  date: string; // YYYY-MM-DD
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reference?: string; // e.g. PN-001, PX-001
  person: string;
  notes?: string;
  createdAt: string;
}

export interface AppDatabase {
  expenses: Expense[];
  funds: FundReceipt[];
  documents: DocumentProgress[];
  materials: MaterialItem[];
  inventoryTransactions: MaterialTransaction[];
}
