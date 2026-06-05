import React, { useMemo, useState } from 'react';
import { Building2, Plus, Search, WalletCards, UsersRound } from 'lucide-react';
import { ConstructionProject, CostItem, Counterparty, Expense } from '../types';

interface Props {
  projects: ConstructionProject[];
  costItems: CostItem[];
  counterparties: Counterparty[];
  expenses: Expense[];
  onSaveProject: (project: ConstructionProject) => Promise<void>;
  onSaveCostItem: (item: CostItem) => Promise<void>;
  onSaveCounterparty: (counterparty: Counterparty) => Promise<void>;
}

const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);
const num = (value: string) => Number(String(value || '').replace(/[^0-9-]/g, '')) || 0;
const makeId = (prefix: string) => `${prefix}-${Date.now()}`;

export default function ConstructionManager({ projects, costItems, counterparties, expenses, onSaveProject, onSaveCostItem, onSaveCounterparty }: Props) {
  const [tab, setTab] = useState<'projects' | 'cost' | 'counterparty'>('projects');
  const [search, setSearch] = useState('');
  const [projectForm, setProjectForm] = useState({ code: '', name: '', investor: '', location: '', contractValue: '', status: 'Đang thi công', manager: '' });
  const [costForm, setCostForm] = useState({ projectId: '', code: '', name: '', budgetAmount: '', accountCode: '621' });
  const [counterForm, setCounterForm] = useState({ code: '', name: '', type: 'Nhà cung cấp', taxCode: '', phone: '', contactPerson: '' });

  const actualByProject = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => map.set(e.projectId || '', (map.get(e.projectId || '') || 0) + (e.actualAmount || 0)));
    return map;
  }, [expenses]);

  const budgetByProject = useMemo(() => {
    const map = new Map<string, number>();
    costItems.forEach(i => map.set(i.projectId, (map.get(i.projectId) || 0) + (i.budgetAmount || 0)));
    return map;
  }, [costItems]);

  const filteredProjects = projects.filter(p => [p.code, p.name, p.investor, p.location].join(' ').toLowerCase().includes(search.toLowerCase()));
  const filteredCostItems = costItems.filter(i => [i.code, i.name, i.accountCode].join(' ').toLowerCase().includes(search.toLowerCase()));
  const filteredCounterparties = counterparties.filter(c => [c.code, c.name, c.type, c.taxCode].join(' ').toLowerCase().includes(search.toLowerCase()));

  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.code || !projectForm.name) return alert('Nhập mã và tên công trình.');
    await onSaveProject({
      id: makeId('prj'),
      code: projectForm.code,
      name: projectForm.name,
      investor: projectForm.investor,
      location: projectForm.location,
      contractValue: num(projectForm.contractValue),
      status: projectForm.status as ConstructionProject['status'],
      manager: projectForm.manager,
      createdAt: new Date().toISOString(),
    });
    setProjectForm({ code: '', name: '', investor: '', location: '', contractValue: '', status: 'Đang thi công', manager: '' });
  };

  const submitCostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costForm.projectId || !costForm.code || !costForm.name) return alert('Chọn công trình, nhập mã và tên hạng mục.');
    await onSaveCostItem({
      id: makeId('cost'),
      projectId: costForm.projectId,
      code: costForm.code,
      name: costForm.name,
      budgetAmount: num(costForm.budgetAmount),
      accountCode: costForm.accountCode,
      createdAt: new Date().toISOString(),
    });
    setCostForm({ ...costForm, code: '', name: '', budgetAmount: '', accountCode: '621' });
  };

  const submitCounterparty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterForm.code || !counterForm.name) return alert('Nhập mã và tên đối tượng.');
    await onSaveCounterparty({
      id: makeId('cp'),
      code: counterForm.code,
      name: counterForm.name,
      type: counterForm.type as Counterparty['type'],
      taxCode: counterForm.taxCode,
      phone: counterForm.phone,
      contactPerson: counterForm.contactPerson,
      createdAt: new Date().toISOString(),
    });
    setCounterForm({ code: '', name: '', type: 'Nhà cung cấp', taxCode: '', phone: '', contactPerson: '' });
  };

  return <div className="space-y-5">
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-6 shadow-xl border border-slate-800">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-blue-100 mb-3"><Building2 className="h-3.5 w-3.5" /> Kế toán xây dựng</div>
      <h2 className="text-2xl font-black">Công trình · Hạng mục · Ngân sách</h2>
      <p className="text-sm text-blue-100 mt-1">Nền dữ liệu để chi phí gắn theo từng công trình, phục vụ báo cáo dự toán - thực tế.</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Công trình" value={projects.length} />
      <Kpi label="Hạng mục" value={costItems.length} />
      <Kpi label="Đối tượng" value={counterparties.length} />
      <Kpi label="Tổng ngân sách" value={costItems.reduce((s, i) => s + (i.budgetAmount || 0), 0)} moneyValue />
    </div>

    <div className="card-pro p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'projects'} onClick={() => setTab('projects')} icon={Building2} label="Công trình" />
        <TabButton active={tab === 'cost'} onClick={() => setTab('cost')} icon={WalletCards} label="Hạng mục / ngân sách" />
        <TabButton active={tab === 'counterparty'} onClick={() => setTab('counterparty')} icon={UsersRound} label="NCC / Nhà thầu" />
      </div>
      <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="input-pro pl-10" placeholder="Tìm mã, tên, MST..." /></div>
    </div>

    {tab === 'projects' && <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <form onSubmit={submitProject} className="card-pro p-5 space-y-3"><h3 className="font-black text-slate-900 flex items-center gap-2"><Plus className="h-4 w-4" />Thêm công trình</h3><input className="input-pro" placeholder="Mã công trình: CT001" value={projectForm.code} onChange={e => setProjectForm({ ...projectForm, code: e.target.value })} /><input className="input-pro" placeholder="Tên công trình" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} /><input className="input-pro" placeholder="Chủ đầu tư" value={projectForm.investor} onChange={e => setProjectForm({ ...projectForm, investor: e.target.value })} /><input className="input-pro" placeholder="Địa điểm" value={projectForm.location} onChange={e => setProjectForm({ ...projectForm, location: e.target.value })} /><input className="input-pro font-mono" placeholder="Giá trị hợp đồng" value={projectForm.contractValue} onChange={e => setProjectForm({ ...projectForm, contractValue: e.target.value.replace(/[^0-9]/g, '') })} /><select className="input-pro" value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}><option>Chuẩn bị</option><option>Đang thi công</option><option>Tạm dừng</option><option>Hoàn thành</option><option>Bảo hành</option><option>Đóng</option></select><input className="input-pro" placeholder="Chỉ huy trưởng/phụ trách" value={projectForm.manager} onChange={e => setProjectForm({ ...projectForm, manager: e.target.value })} /><button className="w-full rounded-2xl bg-blue-700 text-white py-3 text-sm font-black hover:bg-blue-600">Lưu công trình</button></form>
      <div className="xl:col-span-2 card-pro overflow-hidden"><Table headers={['Mã', 'Công trình', 'Hợp đồng', 'Ngân sách', 'Thực chi', 'CL']} rows={filteredProjects.map(p => [p.code, <div><b>{p.name}</b><p className="text-xs text-slate-500">{p.investor || '-'} · {p.location || '-'}</p></div>, money(p.contractValue || 0), money(budgetByProject.get(p.id) || 0), money(actualByProject.get(p.id) || 0), money((budgetByProject.get(p.id) || 0) - (actualByProject.get(p.id) || 0))])} /></div>
    </div>}

    {tab === 'cost' && <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><form onSubmit={submitCostItem} className="card-pro p-5 space-y-3"><h3 className="font-black text-slate-900 flex items-center gap-2"><Plus className="h-4 w-4" />Thêm hạng mục</h3><select className="input-pro" value={costForm.projectId} onChange={e => setCostForm({ ...costForm, projectId: e.target.value })}><option value="">Chọn công trình</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select><input className="input-pro" placeholder="Mã hạng mục: HM001" value={costForm.code} onChange={e => setCostForm({ ...costForm, code: e.target.value })} /><input className="input-pro" placeholder="Tên hạng mục" value={costForm.name} onChange={e => setCostForm({ ...costForm, name: e.target.value })} /><input className="input-pro font-mono" placeholder="Ngân sách/dự toán" value={costForm.budgetAmount} onChange={e => setCostForm({ ...costForm, budgetAmount: e.target.value.replace(/[^0-9]/g, '') })} /><select className="input-pro" value={costForm.accountCode} onChange={e => setCostForm({ ...costForm, accountCode: e.target.value })}><option value="621">621 - NVL trực tiếp</option><option value="622">622 - Nhân công</option><option value="623">623 - Máy thi công</option><option value="627">627 - Sản xuất chung</option><option value="642">642 - Quản lý</option></select><button className="w-full rounded-2xl bg-blue-700 text-white py-3 text-sm font-black hover:bg-blue-600">Lưu hạng mục</button></form><div className="xl:col-span-2 card-pro overflow-hidden"><Table headers={['Công trình', 'Mã', 'Hạng mục', 'TK', 'Ngân sách']} rows={filteredCostItems.map(i => [projects.find(p => p.id === i.projectId)?.code || '-', i.code, i.name, i.accountCode || '-', money(i.budgetAmount)])} /></div></div>}

    {tab === 'counterparty' && <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><form onSubmit={submitCounterparty} className="card-pro p-5 space-y-3"><h3 className="font-black text-slate-900 flex items-center gap-2"><Plus className="h-4 w-4" />Thêm đối tượng</h3><input className="input-pro" placeholder="Mã: NCC001" value={counterForm.code} onChange={e => setCounterForm({ ...counterForm, code: e.target.value })} /><input className="input-pro" placeholder="Tên NCC/Nhà thầu/Đội" value={counterForm.name} onChange={e => setCounterForm({ ...counterForm, name: e.target.value })} /><select className="input-pro" value={counterForm.type} onChange={e => setCounterForm({ ...counterForm, type: e.target.value })}><option>Nhà cung cấp</option><option>Nhà thầu phụ</option><option>Đội thi công</option><option>Cá nhân</option><option>Khác</option></select><input className="input-pro" placeholder="MST" value={counterForm.taxCode} onChange={e => setCounterForm({ ...counterForm, taxCode: e.target.value })} /><input className="input-pro" placeholder="SĐT" value={counterForm.phone} onChange={e => setCounterForm({ ...counterForm, phone: e.target.value })} /><input className="input-pro" placeholder="Người liên hệ" value={counterForm.contactPerson} onChange={e => setCounterForm({ ...counterForm, contactPerson: e.target.value })} /><button className="w-full rounded-2xl bg-blue-700 text-white py-3 text-sm font-black hover:bg-blue-600">Lưu đối tượng</button></form><div className="xl:col-span-2 card-pro overflow-hidden"><Table headers={['Mã', 'Tên đối tượng', 'Loại', 'MST', 'Liên hệ']} rows={filteredCounterparties.map(c => [c.code, c.name, c.type, c.taxCode || '-', c.contactPerson || c.phone || '-'])} /></div></div>}
  </div>;
}

function Kpi({ label, value, moneyValue }: { label: string; value: number; moneyValue?: boolean }) { return <div className="card-pro p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-slate-900 font-mono">{moneyValue ? money(value) : value}</p></div>; }
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>; }
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="table-head-pro"><tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((r, i) => <tr key={i} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/40">{r.map((c, j) => <td key={j} className="px-4 py-3 align-top">{c}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-slate-400">Chưa có dữ liệu.</td></tr>}</tbody></table></div>; }
