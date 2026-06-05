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

export interface ConstructionProject {
  id: string;
  code: string;
  name: string;
  investor?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  status: 'Chuẩn bị' | 'Đang thi công' | 'Tạm dừng' | 'Hoàn thành' | 'Bảo hành' | 'Đóng';
  manager?: string;
  notes?: string;
  createdAt: string;
}

export interface CostItem {
  id: string;
  projectId: string;
  code: string;
  name: string;
  parentId?: string;
  budgetAmount: number;
  accountCode?: string;
  notes?: string;
  createdAt: string;
}

export interface Counterparty {
  id: string;
  code: string;
  name: string;
  type: 'Nhà cung cấp' | 'Nhà thầu phụ' | 'Đội thi công' | 'Cá nhân' | 'Khác';
  taxCode?: string;
  phone?: string;
  address?: string;
  bankAccount?: string;
  bankName?: string;
  contactPerson?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  requestDate: string;
  actualDate: string;
  content: string;
  expenseGroup: string;
  expenseType: string;
  projectId?: string;
  costItemId?: string;
  counterpartyId?: string;
  accountingDebit?: string;
  accountingCredit?: string;
  advanceAmount: number;
  actualAmount: number;
  limitType: string;
  clearanceStatus: 'Xong' | 'Đang hoàn ứng';
  documentStatus: 'Đầy đủ' | 'Thiếu chứng từ';
  missingDocuments?: string;
  invoiceNo?: string;
  notes?: string;
  column1?: string;
  createdByRole: string;
  createdAt: string;
  dossierCode?: string;
}

export interface FundReceipt {
  id: string;
  date: string;
  content: string;
  expenseGroup?: string;
  projectId?: string;
  amount: number;
  source: 'Ngân sách' | 'Mượn sếp' | 'Khác';
  notes?: string;
  fundType: 'HCNS' | 'Dầu';
  createdAt: string;
}

export interface DocumentProgress {
  id: string;
  code: string;
  name: string;
  expenseId?: string;
  projectId?: string;
  counterpartyId?: string;
  category: 'Hợp đồng' | 'Hóa đơn' | 'Biên bản nghiệm thu' | 'Biên bản giao nhận' | 'Khác';
  status: 'Soạn thảo' | 'Trình ký' | 'Đã ký duyệt' | 'Hoàn tất' | 'Lưu trữ';
  updatedAt: string;
  assignedTo: string;
  notes?: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  minStock: number;
  description?: string;
}

export interface MaterialTransaction {
  id: string;
  materialId: string;
  projectId?: string;
  costItemId?: string;
  type: 'NHẬP' | 'XUẤT';
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reference?: string;
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
  projects?: ConstructionProject[];
  costItems?: CostItem[];
  counterparties?: Counterparty[];
}
