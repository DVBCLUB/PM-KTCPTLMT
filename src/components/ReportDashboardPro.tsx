import React, { useMemo, useState } from 'react';
import { Expense, FundReceipt, ExpenseType } from '../types';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, FileWarning, Fuel, Landmark, PieChart as PieIcon, Printer, RefreshCw, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ReportDashboardProps {
  expenses: Expense[];
  funds: FundReceipt[];
  onResetDB: () => Promise<void>;
  currentDate: string;
}

type ExpenseTax = Expense & { taxAmount?: number; totalWithTax?: number; amountBeforeTax?: number; taxRate?: number; taxMode?: string };

const colors = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#475569'];
const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);
const dateVN = (date: string) => date ? date.split('-').reverse().join('/') : '-';
const monthKey = (date: string) => (date || '').slice(0, 7) || 'Chưa ngày';
const monthLabel = (key: string) => key === 'Chưa ngày' ? key : `T${key.slice(5, 7)}/${key.slice(2, 4)}`;
const isFuel = (exp: Expense) => exp.expenseType === ExpenseType.FUEL || exp.expenseType?.toLowerCase().includes('dầu');
const isHCNS = (exp: Expense) => !isFuel(exp);
const daysDiff = (date1: string, date2: string) => Math.floor((new Date(date1).getTime() - new Date(date2).getTime()) / 86400000);
const addDays = (date: string, days: number) => {
  const d = new Date(date || new Date());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function ReportDashboardPro({ expenses, funds, onResetDB, currentDate }: ReportDashboardProps) {
  const [section, setSection] = useState<'overview' | 'risk' | 'detail'>('overview');

  const summary = useMemo(() => {
    const totalAdvance = expenses.reduce((s, e) => s + (e.advanceAmount || 0), 0);
    const totalActual = expenses.reduce((s, e) => s + (e.actualAmount || 0), 0);
    const totalTax = expenses.reduce((s, e) => s + ((e as ExpenseTax).taxAmount || 0), 0);
    const totalWithTax = expenses.reduce((s, e) => s + ((e as ExpenseTax).totalWithTax || e.actualAmount || 0), 0);
    const totalFund = funds.reduce((s, f) => s + (f.amount || 0), 0);
    const fundFuel = funds.filter(f => f.fundType === 'Dầu').reduce((s, f) => s + (f.amount || 0), 0);
    const fundHCNS = funds.filter(f => f.fundType === 'HCNS').reduce((s, f) => s + (f.amount || 0), 0);
    const fuelCost = expenses.filter(isFuel).reduce((s, e) => s + (e.actualAmount || 0), 0);
    const hcnsCost = expenses.filter(isHCNS).reduce((s, e) => s + (e.actualAmount || 0), 0);
    const missingDocs = expenses.filter(e => e.documentStatus === 'Thiếu chứng từ');
    const pending = expenses.filter(e => e.clearanceStatus !== 'Xong');
    const overdue = pending.filter(e => daysDiff(currentDate, addDays(e.actualDate, 15)) > 0);
    const borrowedBoss = funds.filter(f => f.source === 'Mượn sếp').reduce((s, f) => s + (f.amount || 0), 0);
    return {
      totalAdvance,
      totalActual,
      totalTax,
      totalWithTax,
      totalFund,
      fundFuel,
      fundHCNS,
      fuelCost,
      hcnsCost,
      fuelBalance: fundFuel - fuelCost,
      hcnsBalance: fundHCNS - hcnsCost,
      cashBalance: totalFund - totalActual,
      missingDocs,
      pending,
      overdue,
      borrowedBoss,
    };
  }, [expenses, funds, currentDate]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; chi: number; tamUng: number; thue: number; quy: number }>();
    expenses.forEach((e) => {
      const key = monthKey(e.actualDate);
      const row = map.get(key) || { month: monthLabel(key), chi: 0, tamUng: 0, thue: 0, quy: 0 };
      row.chi += e.actualAmount || 0;
      row.tamUng += e.advanceAmount || 0;
      row.thue += (e as ExpenseTax).taxAmount || 0;
      map.set(key, row);
    });
    funds.forEach((f) => {
      const key = monthKey(f.date);
      const row = map.get(key) || { month: monthLabel(key), chi: 0, tamUng: 0, thue: 0, quy: 0 };
      row.quy += f.amount || 0;
      map.set(key, row);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [expenses, funds]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.expenseType || 'Khác', (map.get(e.expenseType || 'Khác') || 0) + (e.actualAmount || 0)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [expenses]);

  const topExpenses = useMemo(() => [...expenses].sort((a, b) => (b.actualAmount || 0) - (a.actualAmount || 0)).slice(0, 10), [expenses]);

  const riskList = useMemo(() => {
    const risks: { level: 'high' | 'medium' | 'low'; title: string; desc: string; amount?: number }[] = [];
    if (summary.overdue.length) risks.push({ level: 'high', title: 'Hoàn ứng quá hạn', desc: `${summary.overdue.length} khoản quá hạn trên 15 ngày`, amount: summary.overdue.reduce((s, e) => s + (e.advanceAmount || e.actualAmount || 0), 0) });
    if (summary.missingDocs.length) risks.push({ level: 'medium', title: 'Thiếu chứng từ', desc: `${summary.missingDocs.length} khoản chưa đủ hồ sơ`, amount: summary.missingDocs.reduce((s, e) => s + (e.actualAmount || 0), 0) });
    if (summary.fuelBalance < 0) risks.push({ level: 'high', title: 'Quỹ dầu âm', desc: 'Chi phí dầu vượt số quỹ đã nhập', amount: Math.abs(summary.fuelBalance) });
    if (summary.hcnsBalance < 0) risks.push({ level: 'medium', title: 'Quỹ HCNS âm', desc: 'Chi HCNS/hành chính vượt số quỹ', amount: Math.abs(summary.hcnsBalance) });
    if (summary.borrowedBoss > 0) risks.push({ level: 'low', title: 'Có khoản mượn sếp', desc: 'Theo dõi riêng nguồn tiền mượn sếp', amount: summary.borrowedBoss });
    return risks;
  }, [summary]);

  const exportBossCSV = () => {
    const rows = [
      ['Chỉ tiêu', 'Giá trị'],
      ['Tổng quỹ nhập', summary.totalFund],
      ['Tổng tạm ứng', summary.totalAdvance],
      ['Tổng thực chi', summary.totalActual],
      ['Tổng thuế', summary.totalTax],
      ['Tổng thanh toán gồm thuế', summary.totalWithTax],
      ['Quỹ còn lại ước tính', summary.cashBalance],
      ['Chi phí dầu', summary.fuelCost],
      ['Chi phí HCNS', summary.hcnsCost],
      ['Khoản thiếu chứng từ', summary.missingDocs.length],
      ['Khoản quá hạn hoàn ứng', summary.overdue.length],
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_sep_${currentDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white shadow-xl border border-slate-800 print:bg-white print:text-slate-900">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl print:hidden" />
        <div className="relative p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-blue-100 mb-3 print:text-slate-600">
              <TrendingUp className="h-3.5 w-3.5" /> Báo cáo điều hành
            </div>
            <h2 className="text-2xl font-black tracking-tight">Báo Cáo Gửi Sếp</h2>
            <p className="text-sm text-blue-100 mt-1 print:text-slate-600">Tổng quan quỹ, chi phí, thuế, chứng từ và rủi ro hoàn ứng đến ngày {dateVN(currentDate)}.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={exportBossCSV} className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/15">Xuất CSV</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-400 text-emerald-950 text-xs font-black hover:bg-emerald-300"><Printer className="h-4 w-4" /> In báo cáo</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Wallet} label="Quỹ nhập" value={summary.totalFund} sub={`Còn lại: ${money(summary.cashBalance)}`} tone="blue" />
        <Kpi icon={ArrowDownRight} label="Thực chi" value={summary.totalActual} sub={`Thuế: ${money(summary.totalTax)}`} tone="slate" />
        <Kpi icon={Fuel} label="Quỹ dầu còn" value={summary.fuelBalance} sub={`Chi dầu: ${money(summary.fuelCost)}`} tone={summary.fuelBalance < 0 ? 'rose' : 'emerald'} />
        <Kpi icon={FileWarning} label="Cảnh báo" value={riskList.length} sub={`${summary.missingDocs.length} thiếu CT · ${summary.overdue.length} quá hạn`} tone={riskList.length ? 'amber' : 'emerald'} isCount />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {[{ id: 'overview', label: 'Tổng quan' }, { id: 'risk', label: 'Cảnh báo rủi ro' }, { id: 'detail', label: 'Top khoản chi' }].map(tab => (
          <button key={tab.id} onClick={() => setSection(tab.id as any)} className={`px-4 py-2 rounded-2xl text-xs font-black border transition-all ${section === tab.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{tab.label}</button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="Dòng tiền theo tháng" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}tr`} />
                <Tooltip formatter={(v: any) => `${money(Number(v))} đ`} />
                <Bar dataKey="quy" name="Quỹ nhập" fill="#2563eb" radius={[8, 8, 0, 0]} />
                <Bar dataKey="chi" name="Thực chi" fill="#059669" radius={[8, 8, 0, 0]} />
                <Bar dataKey="thue" name="Thuế" fill="#d97706" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Tỷ trọng loại chi phí" icon={PieIcon}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}>
                  {typeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${money(Number(v))} đ`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {section === 'risk' && (
        <div className="card-pro p-5 space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-700" /><h3 className="font-black text-slate-900">Danh sách cảnh báo cần xử lý</h3></div>
          {riskList.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-emerald-800 font-bold">Không có cảnh báo lớn. Dữ liệu đang ổn.</div>
          ) : riskList.map((r, i) => (
            <div key={i} className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${r.level === 'high' ? 'bg-rose-50 border-rose-200 text-rose-900' : r.level === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
              <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 mt-0.5" /><div><p className="font-black">{r.title}</p><p className="text-sm opacity-80 mt-0.5">{r.desc}</p></div></div>
              {r.amount !== undefined && <div className="font-mono font-black whitespace-nowrap">{money(r.amount)}</div>}
            </div>
          ))}
        </div>
      )}

      {section === 'detail' && (
        <div className="card-pro overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="font-black text-slate-900">Top 10 khoản chi lớn</h3><button onClick={onResetDB} className="print:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"><RefreshCw className="h-3.5 w-3.5" /> Dữ liệu mẫu</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head-pro"><tr><th className="px-4 py-3 text-left">Ngày</th><th className="px-4 py-3 text-left">Nội dung</th><th className="px-4 py-3 text-left">Loại</th><th className="px-4 py-3 text-right">Thực chi</th><th className="px-4 py-3 text-right">Thuế</th><th className="px-4 py-3 text-left">Chứng từ</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {topExpenses.map((e) => {
                  const tax = (e as ExpenseTax).taxAmount || 0;
                  return <tr key={e.id} className="odd:bg-white even:bg-slate-50/60"><td className="px-4 py-3 whitespace-nowrap">{dateVN(e.actualDate)}</td><td className="px-4 py-3 font-bold text-slate-900 max-w-md">{e.content}</td><td className="px-4 py-3 text-slate-600">{e.expenseType}</td><td className="px-4 py-3 money-cell font-black text-slate-900">{money(e.actualAmount)}</td><td className="px-4 py-3 money-cell text-amber-700">{tax ? money(tax) : '-'}</td><td className="px-4 py-3"><span className={`badge-pro ${e.documentStatus === 'Thiếu chứng từ' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{e.documentStatus}</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, isCount }: { icon: any; label: string; value: number; sub: string; tone: string; isCount?: boolean }) {
  const toneMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return <div className="card-pro p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-slate-900 font-mono">{isCount ? value : money(value)}</p><p className="text-[11px] text-slate-500 mt-1">{sub}</p></div><div className={`h-11 w-11 rounded-2xl border flex items-center justify-center ${toneMap[tone] || toneMap.slate}`}><Icon className="h-5 w-5" /></div></div></div>;
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return <div className="card-pro p-5"><div className="flex items-center gap-2 mb-4"><div className="h-9 w-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center"><Icon className="h-4.5 w-4.5" /></div><h3 className="font-black text-slate-900">{title}</h3></div>{children}</div>;
}
