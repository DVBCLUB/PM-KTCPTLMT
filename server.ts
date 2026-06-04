/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { ExpenseGroup, ExpenseType, UserRole } from './src/types.js';

// Resolve directory name
const tempDbPath = path.join(process.cwd(), 'database.json');

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Seed data based strictly on user PDF screenshots (Trung Luong - My Thuan Project, 2026)
const defaultDatabase = {
  expenses: [
    {
      id: 'exp-1',
      requestDate: '2026-03-20',
      actualDate: '2026-03-20',
      content: 'Chi phí thuê xe ô tô chở Thoa đi từ CT-ĐH xuống dự án HCM-TL-MT',
      expenseGroup: ExpenseGroup.PROJECT_MGMT,
      expenseType: ExpenseType.SHIPPING,
      advanceAmount: 1000000,
      actualAmount: 1000000,
      limitType: '0',
      clearanceStatus: 'Xong',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: '',
      notes: 'Đã hoàn ứng',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-20T08:00:00Z').toISOString()
    },
    {
      id: 'exp-2',
      requestDate: '2026-03-21',
      actualDate: '2026-03-21',
      content: 'Thuê phòng thanh toán đến ngày 21/03',
      expenseGroup: ExpenseGroup.PROJECT_MGMT,
      expenseType: ExpenseType.TRAVEL,
      advanceAmount: 0,
      actualAmount: 3525000,
      limitType: 'Theo thực tế',
      clearanceStatus: 'Đang hoàn ứng',
      documentStatus: 'Thiếu chứng từ',
      missingDocuments: 'Chưa nộp hóa đơn phòng nghỉ',
      invoiceNo: '',
      notes: 'Quá hạn 57 ngày',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-21T08:30:00Z').toISOString()
    },
    {
      id: 'exp-3',
      requestDate: '2026-03-21',
      actualDate: '2026-03-21',
      content: 'Mua xe máy 2 chiếc phục vụ hiện trường',
      expenseGroup: ExpenseGroup.PROJECT_MGMT,
      expenseType: ExpenseType.ADMIN,
      advanceAmount: 20000000,
      actualAmount: 20000000,
      limitType: '0',
      clearanceStatus: 'Đang hoàn ứng',
      documentStatus: 'Thiếu chứng từ',
      missingDocuments: 'Hóa đơn VAT và giấy đăng ký xe',
      invoiceNo: '',
      notes: 'Quá hạn 57 ngày',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-21T09:00:00Z').toISOString()
    },
    {
      id: 'exp-4',
      requestDate: '2026-03-21',
      actualDate: '2026-03-21',
      content: 'Thanh toán tiền cơm của Trần Khắc Trung và A Kiên tại hiện bãi',
      expenseGroup: ExpenseGroup.PROJECT_MGMT,
      expenseType: ExpenseType.KITCHEN,
      advanceAmount: 1680000,
      actualAmount: 1680000,
      limitType: '60k/người',
      clearanceStatus: 'Đang hoàn ứng',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: '',
      notes: 'Bếp ăn công trình/Ăn ngoài (627)',
      createdByRole: UserRole.HCNS,
      createdAt: new Date('2026-03-21T10:00:00Z').toISOString()
    },
    {
      id: 'exp-5',
      requestDate: '2026-03-21',
      actualDate: '2026-03-21',
      content: 'Thanh toán chi phí mua 100 lít dầu Do 0.05S-II',
      expenseGroup: ExpenseGroup.CONSTRUCTION,
      expenseType: ExpenseType.FUEL,
      advanceAmount: 3342000,
      actualAmount: 3342000,
      limitType: 'Theo định mức',
      clearanceStatus: 'Xong',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: '18109 vs 18110',
      notes: 'Dầu (621) - Đã nhập kho dầu',
      createdByRole: UserRole.STOREKEEPER,
      createdAt: new Date('2026-03-21T11:00:00Z').toISOString()
    },
    {
      id: 'exp-6',
      requestDate: '2026-03-25',
      actualDate: '2026-03-25',
      content: 'Thanh toán tiền xăng 51M97730 Fortuner chở sếp Tuấn về SG',
      expenseGroup: ExpenseGroup.CONSTRUCTION,
      expenseType: ExpenseType.FUEL,
      advanceAmount: 500000,
      actualAmount: 500000,
      limitType: 'Theo định mức',
      clearanceStatus: 'Xong',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: '637268',
      notes: 'Đã hoàn ứng',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-25T08:00:00Z').toISOString()
    },
    {
      id: 'exp-7',
      requestDate: '2026-03-26',
      actualDate: '2026-03-26',
      content: 'Thanh toán tiền mua 50 lít dầu cấp máy đào 07 làm mặt bằng bãi dầm',
      expenseGroup: ExpenseGroup.CONSTRUCTION,
      expenseType: ExpenseType.FUEL,
      advanceAmount: 1000200,
      actualAmount: 1000200,
      limitType: 'Theo định mức',
      clearanceStatus: 'Đang hoàn ứng',
      documentStatus: 'Thiếu chứng từ',
      missingDocuments: 'Thiếu hóa đơn lẻ',
      invoiceNo: '19658',
      notes: 'Hạch toán lệch 55,700đ',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-26T08:30:00Z').toISOString()
    },
    {
      id: 'exp-8',
      requestDate: '2026-03-26',
      actualDate: '2026-03-26',
      content: 'Thanh toán tiền đổ xăng xe Fotuner để sếp Thạch về SG',
      expenseGroup: ExpenseGroup.CONSTRUCTION,
      expenseType: ExpenseType.FUEL,
      advanceAmount: 950000,
      actualAmount: 950000,
      limitType: 'Theo định mức',
      clearanceStatus: 'Đang hoàn ứng',
      documentStatus: 'Thiếu chứng từ',
      missingDocuments: 'Thiếu hóa đơn gốc',
      invoiceNo: '19659',
      notes: 'Được duyệt tạm ứng',
      createdByRole: UserRole.ACCOUNTANT,
      createdAt: new Date('2026-03-26T09:00:00Z').toISOString()
    },
    {
      id: 'exp-9',
      requestDate: '2026-04-01',
      actualDate: '2026-04-01',
      content: 'Chi phí thuê xe Lalamove chuyển máy lạnh và đồ xuống văn phòng dự án',
      expenseGroup: ExpenseGroup.PROJECT_MGMT,
      expenseType: ExpenseType.SHIPPING,
      advanceAmount: 1200000,
      actualAmount: 1200000,
      limitType: '0',
      clearanceStatus: 'Xong',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: 'LLM-29938',
      notes: 'Chuyển máy lạnh văn phòng BĐH',
      createdByRole: UserRole.HCNS,
      createdAt: new Date('2026-04-01T10:00:00Z').toISOString()
    },
    {
      id: 'exp-10',
      requestDate: '2026-04-04',
      actualDate: '2026-04-04',
      content: 'Thanh toán tiền mua dầu cấp 50 lít cho máy đào 09 thi công bãi đúc dầm',
      expenseGroup: ExpenseGroup.CONSTRUCTION,
      expenseType: ExpenseType.FUEL,
      advanceAmount: 2239000,
      actualAmount: 2239000,
      limitType: 'Theo định mức',
      clearanceStatus: 'Xong',
      documentStatus: 'Đầy đủ',
      missingDocuments: '',
      invoiceNo: '31969',
      notes: 'Đã chi và hoàn ứng',
      createdByRole: UserRole.STOREKEEPER,
      createdAt: new Date('2026-04-04T08:00:00Z').toISOString()
    }
  ],
  funds: [
    {
      id: 'f-1',
      date: '2026-03-21',
      content: 'Số tiền tạm ứng ban đầu cấp cho quỹ HCNS từ Công ty',
      amount: 76270000,
      source: 'Ngân sách',
      notes: 'Nhập ban đầu cho hoạt động văn phòng',
      fundType: 'HCNS',
      createdAt: new Date('2026-03-21T07:00:00Z').toISOString()
    },
    {
      id: 'f-2',
      date: '2026-03-25',
      content: 'Nhập quỹ mua dầu từ công ty đợt 1',
      amount: 40896000,
      source: 'Ngân sách',
      notes: 'Phục vụ nhiên liệu thi công máy công trình',
      fundType: 'Dầu',
      createdAt: new Date('2026-03-25T07:15:00Z').toISOString()
    },
    {
      id: 'f-3',
      date: '2026-04-03',
      content: 'Mượn quỹ BĐH từ sếp Thạch đổ dầu khẩn cấp',
      amount: 10000000,
      source: 'Mượn sếp',
      notes: 'Sếp Thạch cấp mượn trực tiếp',
      fundType: 'Dầu',
      createdAt: new Date('2026-04-03T09:00:00Z').toISOString()
    },
    {
      id: 'f-4',
      date: '2026-04-05',
      content: 'Mượn quỹ BĐH từ sếp Thạch mua dầu và vật tư khẩn cấp đợt 2',
      amount: 10000000,
      source: 'Mượn sếp',
      notes: 'Cấp tiền mặt',
      fundType: 'Dầu',
      createdAt: new Date('2026-04-05T09:30:00Z').toISOString()
    },
    {
      id: 'f-5',
      date: '2026-04-06',
      content: 'Nhập quỹ mua dầu từ công ty đợt 2',
      amount: 50000000,
      source: 'Ngân sách',
      notes: 'Chuyển khoản công ty cấp quỹ',
      fundType: 'Dầu',
      createdAt: new Date('2026-04-06T08:00:00Z').toISOString()
    },
    {
      id: 'f-6',
      date: '2026-04-08',
      content: 'Tạm ứng đợt 2 cho quỹ hành chính nhân sự HCNS',
      amount: 30000000,
      source: 'Ngân sách',
      notes: 'Nhập quỹ văn phòng',
      fundType: 'HCNS',
      createdAt: new Date('2026-04-08T08:00:00Z').toISOString()
    },
    {
      id: 'f-7',
      date: '2026-04-14',
      content: 'Nhập quỹ mua dầu từ công ty đợt 3',
      amount: 39184000,
      source: 'Ngân sách',
      notes: 'Dầu phục vụ đổ máy đào 07 & 09',
      fundType: 'Dầu',
      createdAt: new Date('2026-04-14T08:00:00Z').toISOString()
    },
    {
      id: 'f-8',
      date: '2026-04-20',
      content: 'Tạm ứng quỹ HCNS đợt 3',
      amount: 66000000,
      source: 'Ngân sách',
      notes: 'Bếp ăn và sinh hoạt',
      fundType: 'HCNS',
      createdAt: new Date('2026-04-20T08:00:00Z').toISOString()
    },
    {
      id: 'f-9',
      date: '2026-04-29',
      content: 'Tạm ứng hành chính đợt 4 (Quỹ HCNS)',
      amount: 30000000,
      source: 'Ngân sách',
      notes: 'Hạch toán đợt cuối tháng 4',
      fundType: 'HCNS',
      createdAt: new Date('2026-04-29T10:00:00Z').toISOString()
    }
  ],
  documents: [
    {
      id: 'doc-1',
      code: 'HD-001',
      name: 'Hợp đồng thuê xe ô tô đưa đón chỉ huy dự án',
      expenseId: 'exp-1',
      category: 'Hợp đồng',
      status: 'Hoàn tất',
      updatedAt: '2026-03-20',
      assignedTo: UserRole.HCNS,
      notes: 'Ký kết cùng nhà xe Thắng Lợi'
    },
    {
      id: 'doc-2',
      code: 'HDD-18109',
      name: 'Biên bản nghiệm thu cấp dầu đợt 1 - HĐ 18109',
      expenseId: 'exp-5',
      category: 'Biên bản bàn giao',
      status: 'Đã ký duyệt',
      updatedAt: '2026-03-21',
      assignedTo: UserRole.STOREKEEPER,
      notes: 'Thủ kho lưu hồ sơ giấy tại văn phòng'
    },
    {
      id: 'doc-3',
      code: 'VAT-3525',
      name: 'Yêu cầu xuất hóa đơn đỏ chi phí thuê phòng tới 21/03',
      expenseId: 'exp-2',
      category: 'Hóa đơn',
      status: 'Trình ký',
      updatedAt: '2026-04-05',
      assignedTo: UserRole.ACCOUNTANT,
      notes: 'Đang hối thúc khách sạn ở Cai Lậy hoàn thiện hóa đơn'
    },
    {
      id: 'doc-4',
      code: 'HS-XE-01',
      name: 'Hồ sơ pháp lý mua 02 xe máy hiện trường',
      expenseId: 'exp-3',
      category: 'Khác',
      status: 'Soạn thảo',
      updatedAt: '2026-03-25',
      assignedTo: UserRole.HCNS,
      notes: 'Chưa nhận được giấy đăng ký xe từ đơn vị bán'
    }
  ],
  materials: [
    {
      id: 'mat-1',
      code: 'DẦU-DO',
      name: 'Dầu Diesel 0.05S-II',
      unit: 'Lít',
      minStock: 500,
      description: 'Dầu phục vụ máy đào, máy phát điện, lu rung hiện trường'
    },
    {
      id: 'mat-2',
      code: 'XM-PCB40',
      name: 'Xi măng PCB40 Hà Tiên',
      unit: 'Bao (50kg)',
      minStock: 100,
      description: 'Phục vụ đúc dầm và các hạng mục phụ trợ'
    },
    {
      id: 'mat-3',
      code: 'THÉP-D16',
      name: 'Thép thanh vằn Hòa Phát D16',
      unit: 'Tấn',
      minStock: 2,
      description: 'Cốt thép gia cường sàn dầm'
    },
    {
      id: 'mat-4',
      code: 'NÓN-BHLĐ',
      name: 'Nón bảo hộ lao động Thùy Dương',
      unit: 'Cái',
      minStock: 20,
      description: 'Nón nhựa trang bị cho kỹ sư và công nhân'
    }
  ],
  inventoryTransactions: [
    {
      id: 'tx-1',
      materialId: 'mat-1',
      type: 'NHẬP',
      date: '2026-03-21',
      quantity: 100,
      unitPrice: 33420,
      totalPrice: 3342000,
      reference: 'PN-01/DAU',
      person: 'Đào Văn Phú (Thủ kho)',
      notes: 'Nhập kho dầu trạm chính dầm từ hóa đơn 18109',
      createdAt: new Date('2026-03-21T11:00:00Z').toISOString()
    },
    {
      id: 'tx-2',
      materialId: 'mat-1',
      type: 'XUẤT',
      date: '2026-03-24',
      quantity: 50,
      unitPrice: 33420,
      totalPrice: 1671000,
      reference: 'PX-01/DAU',
      person: 'Kỹ sư hiện trường (Đội Trưởng)',
      notes: 'Xuất cấp cho máy đào MPD làm việc 2 ca',
      createdAt: new Date('2026-03-24T14:00:00Z').toISOString()
    },
    {
      id: 'tx-3',
      materialId: 'mat-4',
      type: 'NHẬP',
      date: '2026-03-25',
      quantity: 15,
      unitPrice: 45000,
      totalPrice: 675000,
      reference: 'PN-02/VPP',
      person: 'Cô Lan (Hành chính)',
      notes: 'Mua nón bảo hộ lao động cho công nhân mới vào',
      createdAt: new Date('2026-03-25T11:00:00Z').toISOString()
    },
    {
      id: 'tx-4',
      materialId: 'mat-1',
      type: 'NHẬP',
      date: '2026-04-04',
      quantity: 200,
      unitPrice: 35440,
      totalPrice: 7088000,
      reference: 'PN-03/DAU',
      person: 'Đào Văn Phú (Thủ kho)',
      notes: 'Nhập dầu cấp máy đào nhập trực tiếp',
      createdAt: new Date('2026-04-04T09:00:00Z').toISOString()
    },
    {
      id: 'tx-5',
      materialId: 'mat-1',
      type: 'XUẤT',
      date: '2026-04-05',
      quantity: 120,
      unitPrice: 35440,
      totalPrice: 4252800,
      reference: 'PX-02/DAU',
      person: 'Tài xế máy đào 09',
      notes: 'Đổ dầu trực tiếp máy đào 09 và máy 07',
      createdAt: new Date('2026-04-05T15:30:00Z').toISOString()
    }
  ]
};

class DBWriteMutex {
  private queue: Promise<any> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const parent = this.queue;
    let resolveNext: () => void = () => {};
    this.queue = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
    try {
      await parent;
      return await fn();
    } finally {
      resolveNext();
    }
  }
}

const dbWriteMutex = new DBWriteMutex();

// Active SSE client tracking for real-time collaboration
interface SSEClient {
  id: string;
  res: any;
  role: string;
}

let activeClients: SSEClient[] = [];

// Helper to broadcast presence updates
function broadcastPresence() {
  const uniqRoles = Array.from(new Set(activeClients.map(c => c.role)));
  const payload = {
    type: 'presence',
    roles: uniqRoles,
    count: activeClients.length
  };
  const rawMsg = `data: ${JSON.stringify(payload)}\n\n`;
  activeClients.forEach(c => {
    try {
      c.res.write(rawMsg);
    } catch (err) {
      // client connection is dead
    }
  });
}

// Helper to broadcast database updates
function broadcastUpdate(changeType: string, updatedBy: string) {
  const payload = {
    type: 'update',
    changeType,
    detail: updatedBy,
    timestamp: Date.now()
  };
  const rawMsg = `data: ${JSON.stringify(payload)}\n\n`;
  activeClients.forEach(c => {
    try {
      c.res.write(rawMsg);
    } catch (err) {
      // client connection is dead
    }
  });
}

// Loading DB helper with fallback seeding
async function getDB() {
  try {
    const data = await fs.readFile(tempDbPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // If doesn't exist, build with seed data
    await fs.writeFile(tempDbPath, JSON.stringify(defaultDatabase, null, 2), 'utf-8');
    return defaultDatabase;
  }
}

async function saveDB(dbData: typeof defaultDatabase) {
  await fs.writeFile(tempDbPath, JSON.stringify(dbData, null, 2), 'utf-8');
}

// REST API Endpoints
app.get('/api/sync-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const role = (req.query.role as string) || 'Khách';
  const clientId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
  
  // Welcome ping
  res.write(`data: ${JSON.stringify({ type: 'welcome', clientId })}\n\n`);
  
  const clientObj: SSEClient = { id: clientId, res, role };
  activeClients.push(clientObj);
  broadcastPresence();
  
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      // connection might be dead
    }
  }, 15000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    activeClients = activeClients.filter(c => c.id !== clientId);
    broadcastPresence();
  });
});

app.get('/api/data', async (req, res) => {
  try {
    const db = await getDB();
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset database route
app.post('/api/reset', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    await dbWriteMutex.run(async () => {
      await saveDB(defaultDatabase);
    });
    broadcastUpdate('reset', updater);
    res.json({ message: 'Khôi phục dữ liệu mẫu thành công!', database: defaultDatabase });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses
app.post('/api/expenses', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = 'exp-' + Date.now();
        item.createdAt = new Date().toISOString();
        db.expenses.unshift(item);
      } else {
        const idx = db.expenses.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          db.expenses[idx] = { ...db.expenses[idx], ...item };
        } else {
          db.expenses.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate('expense', updater);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.expenses = db.expenses.filter((x: any) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate('expense_deleted', updater);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Funds
app.post('/api/funds', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = 'f-' + Date.now();
        item.createdAt = new Date().toISOString();
        db.funds.unshift(item);
      } else {
        const idx = db.funds.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          db.funds[idx] = { ...db.funds[idx], ...item };
        } else {
          db.funds.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate('fund', updater);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/funds/:id', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.funds = db.funds.filter((x: any) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate('fund_deleted', updater);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Documents
app.post('/api/documents', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = 'doc-' + Date.now();
        db.documents.unshift(item);
      } else {
        const idx = db.documents.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          db.documents[idx] = { ...db.documents[idx], ...item };
        } else {
          db.documents.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate('document', updater);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.documents = db.documents.filter((x: any) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate('document_deleted', updater);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Materials Info
app.post('/api/materials', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = 'mat-' + Date.now();
        db.materials.push(item);
      } else {
        const idx = db.materials.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          db.materials[idx] = { ...db.materials[idx], ...item };
        } else {
          db.materials.push(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate('material', updater);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(550).json({ error: err.message });
  }
});

// Material Transactions (Inventory)
app.post('/api/inventory/transaction', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const transaction = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!transaction.id) {
        transaction.id = 'tx-' + Date.now();
        transaction.createdAt = new Date().toISOString();
        db.inventoryTransactions.unshift(transaction);
      } else {
        const idx = db.inventoryTransactions.findIndex((x: any) => x.id === transaction.id);
        if (idx !== -1) {
          db.inventoryTransactions[idx] = { ...db.inventoryTransactions[idx], ...transaction };
        } else {
          db.inventoryTransactions.unshift(transaction);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate('inventory', updater);
    res.json({ success: true, item: transaction });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/transaction/:id', async (req, res) => {
  try {
    const updater = req.header('x-updater') || 'máy tính khác';
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.inventoryTransactions = db.inventoryTransactions.filter((x: any) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate('inventory_deleted', updater);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development vs. Production file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support SPA routing fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULLSTACK SERVER] Khởi chạy thành công trên cổng http://localhost:${PORT}`);
  });
}

startServer();
