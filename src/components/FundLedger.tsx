/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FundReceipt, UserRole, ExpenseType } from '../types';
import { Plus, Trash2, ShieldCheck, DollarSign, Fuel, Users, Landmark, Wallet, AlertCircle } from 'lucide-react';

interface FundLedgerProps {
  funds: FundReceipt[];
  expenses: any[];
  onAddFund: (fund: FundReceipt) => Promise<void>;
  onDeleteFund: (id: string) => Promise<void>;
  currentRole: UserRole;
  baselineDate: string;
}

export default function FundLedger({
  funds,
  expenses,
  onAddFund,
  onDeleteFund,
  currentRole,
  baselineDate,
}: FundLedgerProps) {
  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [roleModeOnly, setRoleModeOnly] = useState<boolean>(true);
  
  // Advanced Filter & Sort States
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchContent, setSearchContent] = useState<string>('');
  const [filterFundType, setFilterFundType] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // 'desc' is newest first, 'asc' lets user see "những chi phí nhập đã lâu" (oldest first)
  
  // Form Fields
  const [date, setDate] = useState(baselineDate);
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [source, setSource] = useState<'Ngân sách' | 'Mượn sếp' | 'Khác'>('Ngân sách');
  const [fundType, setFundType] = useState<'HCNS' | 'Dầu'>(currentRole === UserRole.STOREKEEPER ? 'Dầu' : 'HCNS');
  const [notes, setNotes] = useState('');

  // Filter funds list depending on department role & custom filters
  const filteredFunds = funds
    .filter(fund => {
      // 1. Department isolation
      if (roleModeOnly) {
        if (currentRole === UserRole.STOREKEEPER) {
          if (fund.fundType !== 'Dầu') return false;
        } else if (currentRole === UserRole.HCNS) {
          if (fund.fundType !== 'HCNS') return false;
        }
      }

      // 2. Date Range Filter
      if (fromDate && fund.date < fromDate) return false;
      if (toDate && fund.date > toDate) return false;

      // 3. Search Keyword Filter
      if (searchContent && !fund.content.toLowerCase().includes(searchContent.toLowerCase())) return false;

      // 4. Fund Type Filter
      if (filterFundType !== 'ALL' && fund.fundType !== filterFundType) return false;

      // 5. Source Filter
      if (filterSource !== 'ALL' && fund.source !== filterSource) return false;

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

  // Dynamically compute fund balance
  // 1. Dầu Fund
  const totalAllocatedDau = funds
    .filter(f => f.fundType === 'Dầu')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalSpentDau = expenses
    .filter(e => e.expenseType === ExpenseType.FUEL)
    .reduce((sum, e) => sum + e.actualAmount, 0);

  const balanceDau = totalAllocatedDau - totalSpentDau;

  // 2. HCNS Fund
  const totalAllocatedHCNS = funds
    .filter(f => f.fundType === 'HCNS')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalSpentHCNS = expenses
    .filter(e => e.expenseType !== ExpenseType.FUEL)
    .reduce((sum, e) => sum + e.actualAmount, 0);

  const balanceHCNS = totalAllocatedHCNS - totalSpentHCNS;

  // Combined totals
  const totalReceivedBudget = totalAllocatedDau + totalAllocatedHCNS;
  const totalSpentAll = totalSpentDau + totalSpentHCNS;
  const totalRemainingBudget = totalReceivedBudget - totalSpentAll;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || amount <= 0) {
      alert('Vui lòng nhập đầy đủ nội dung và số tiền đợt cấp!');
      return;
    }

    const payload: FundReceipt = {
      id: '',
      date,
      content,
      amount: Number(amount),
      source,
      fundType,
      notes,
      createdAt: new Date().toISOString()
    };

    await onAddFund(payload);
    setIsOpen(false);
    setContent('');
    setAmount(0);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Combined */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-mono text-slate-300">Tổng Ngân Sách Dự Án</span>
            <Landmark className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold mt-2 font-mono tracking-tight text-white">
            {totalRemainingBudget.toLocaleString()} VNĐ
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Tổng cấp: {totalReceivedBudget.toLocaleString()} đ</span>
            <span>Tổng thực chi: {totalSpentAll.toLocaleString()} đ</span>
          </div>
        </div>

        {/* Card 2: Quỹ Dầu */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-mono text-amber-100">Quỹ Dầu Tồn Kho (621)</span>
            <Fuel className="h-5 w-5 text-amber-200" />
          </div>
          <p className="text-2xl font-bold mt-2 font-mono tracking-tight text-white">
            {balanceDau.toLocaleString()} VNĐ
          </p>
          <div className="mt-4 pt-4 border-t border-amber-400/50 flex justify-between text-[11px] text-amber-100 font-mono">
            <span>Đã cấp: {totalAllocatedDau.toLocaleString()} đ</span>
            <span>Đã chi: {totalSpentDau.toLocaleString()} đ</span>
          </div>
        </div>

        {/* Card 3: Quỹ HCNS */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-mono text-blue-100">Quỹ Hành Chính Nhân Sự (HCNS)</span>
            <Users className="h-5 w-5 text-blue-200" />
          </div>
          <p className="text-2xl font-bold mt-2 font-mono tracking-tight text-white">
            {balanceHCNS.toLocaleString()} VNĐ
          </p>
          <div className="mt-4 pt-4 border-t border-blue-500/50 flex justify-between text-[11px] text-blue-100 font-mono">
            <span>Đã cấp: {totalAllocatedHCNS.toLocaleString()} đ</span>
            <span>Đã chi: {totalSpentHCNS.toLocaleString()} đ</span>
          </div>
        </div>

      </div>

      {/* Funds Table Info & Forms */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Danh Sách Đợt Cấp/Nhập Quỹ & Phân Phối</h3>
            <p className="text-xs text-gray-500">Mọi đợt tạm ứng nguồn ngân sách từ Tổng công ty hoặc mượn sếp đều được ghi nhận tại đây</p>
          </div>

          {currentRole !== UserRole.BOSS && (
            <button
              id="add-fund-btn"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Ghi Nhận Nhập Quỹ</span>
            </button>
          )}
        </div>

        {/* Datagrid Ledger */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left text-[11px] leading-normal" id="fund-table">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-150">
                <th className="py-2.5 px-3 font-bold text-center w-11">STT</th>
                <th 
                  className="py-2.5 px-3 font-bold cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày nhận tiền</span>
                    <span className="text-blue-600 font-bold text-xs">{sortOrder === 'desc' ? '▼ (Mới)' : '▲ (Cũ)'}</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold">Nội dung đợt cấp</th>
                <th className="py-2.5 px-3 font-bold text-center">Phân loại Quỹ</th>
                <th className="py-2.5 px-3 font-bold text-right">Số tiền cấp</th>
                <th className="py-2.5 px-3 font-bold">Nguồn tiền</th>
                <th className="py-2.5 px-3 font-bold">Ghi chú</th>
                {currentRole !== UserRole.BOSS && <th className="py-2.5 px-3 font-bold text-center w-14">Xóa</th>}
              </tr>
              {/* Filter inputs row */}
              <tr className="bg-slate-50 border-b border-gray-200 text-[10px] print:hidden">
                <td className="p-1.5 text-center">
                  <button 
                    type="button"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setSearchContent('');
                      setFilterFundType('ALL');
                      setFilterSource('ALL');
                      setSortOrder('desc');
                    }}
                    className="text-rose-600 hover:text-rose-800 font-black text-[9px] hover:underline"
                    title="Xóa bộ lọc"
                  >
                    Reset
                  </button>
                </td>
                <td className="p-1 px-1.5 min-w-[125px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[8px] font-semibold w-7">Từ:</span>
                      <input 
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="p-1 py-0.5 w-full border border-gray-250 bg-white rounded font-mono text-[9px] focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[8px] font-semibold w-7">Đến:</span>
                      <input 
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="p-1 py-0.5 w-full border border-gray-250 bg-white rounded font-mono text-[9px] focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </td>
                <td className="p-1 px-1.5">
                  <input 
                    type="text"
                    placeholder="Tìm theo nội dung nhập quỹ..."
                    value={searchContent}
                    onChange={(e) => setSearchContent(e.target.value)}
                    className="p-1 w-full border border-gray-250 bg-white rounded text-[10px] focus:border-blue-500 focus:outline-none font-medium"
                  />
                </td>
                <td className="p-1 px-1.5 text-center">
                  <select
                    value={filterFundType}
                    onChange={(e) => setFilterFundType(e.target.value)}
                    className="p-1 w-full border border-gray-250 bg-white rounded text-[10px] cursor-pointer focus:border-blue-500 focus:outline-none font-medium"
                    disabled={roleModeOnly && currentRole !== UserRole.ACCOUNTANT && currentRole !== UserRole.BOSS}
                  >
                    <option value="ALL">Tất cả Quỹ</option>
                    <option value="Dầu">Quỹ Dầu</option>
                    <option value="HCNS">Quỹ HCNS</option>
                  </select>
                </td>
                <td className="p-1 px-1.5 text-right font-mono text-gray-400 text-[9px] italic">
                  Tổng lọc: {filteredFunds.reduce((sum, f) => sum + f.amount, 0).toLocaleString()}đ
                </td>
                <td className="p-1 px-1.5">
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="p-1 w-full border border-gray-250 bg-white rounded text-[10px] cursor-pointer focus:border-blue-500 focus:outline-none font-medium"
                  >
                    <option value="ALL">Mọi nguồn tiền</option>
                    <option value="Ngân sách">Ngân sách</option>
                    <option value="Mượn sếp">Mượn sếp</option>
                    <option value="Khác">Khác</option>
                  </select>
                </td>
                <td className="p-1 px-1.5 font-mono text-gray-400 text-[9px] italic" colSpan={currentRole !== UserRole.BOSS ? 2 : 1}>
                  {filteredFunds.length} dòng
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFunds.length === 0 ? (
                <tr>
                  <td colSpan={currentRole !== UserRole.BOSS ? 8 : 7} className="py-12 text-center text-gray-400 font-medium">
                    Không tìm thấy đợt cấp/nhập quỹ nào khớp bộ lọc hạch toán.
                  </td>
                </tr>
              ) : (
                filteredFunds.map((fund, index) => (
                  <tr key={fund.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-2 text-center text-gray-400 font-mono">{index + 1}</td>
                    
                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap">
                      {fund.date ? fund.date.split('-').reverse().join('/') : '-'}
                    </td>

                    {/* Content */}
                    <td className="py-2.5 px-3 font-medium text-gray-900">{fund.content}</td>

                    {/* Fund Type badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        fund.fundType === 'Dầu'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${fund.fundType === 'Dầu' ? 'bg-amber-600' : 'bg-blue-600'}`}></span>
                        Quỹ {fund.fundType}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3 text-right font-mono text-gray-900 font-bold whitespace-nowrap">
                      {fund.amount.toLocaleString()} đ
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-3 font-medium">
                      <span className={`px-1.5 py-0.5 rounded ${
                        fund.source === 'Ngân sách'
                          ? 'bg-indigo-50 text-indigo-700'
                          : fund.source === 'Mượn sếp'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100 font-semibold'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {fund.source}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{fund.notes || '-'}</td>

                    {/* Actions */}
                    {currentRole !== UserRole.BOSS && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={async () => {
                            if (confirm(`Bạn chắc chắn muốn xóa đợt cáp quỹ: "${fund.content}" không?`)) {
                              await onDeleteFund(fund.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PopUp Input Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
            
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs tracking-wide">Phê Duyệt Đợt Nhập Quỹ Bản Sắp Tới</h3>
                <p className="text-[10px] text-indigo-100">Ghi nhận ngân sách mới bổ sung</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white leading-none text-xl p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Date */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Ngày nhận tiền thực tế:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Fund Type Picker */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Nhập vào phân hệ Quỹ:</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold transition-all ${
                    fundType === 'HCNS' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                    <input
                      type="radio"
                      checked={fundType === 'HCNS'}
                      onChange={() => setFundType('HCNS')}
                      className="sr-only"
                    />
                    <Users className="h-4 w-4" />
                    <span>Quỹ HCNS (Hành chính)</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold transition-all ${
                    fundType === 'Dầu' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                    <input
                      type="radio"
                      checked={fundType === 'Dầu'}
                      onChange={() => setFundType('Dầu')}
                      className="sr-only"
                    />
                    <Fuel className="h-4 w-4" />
                    <span>Quỹ Dầu (Nhiên liệu)</span>
                  </label>
                </div>
              </div>

              {/* Source of Fund */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Nguồn vốn cấp:</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Ngân sách">Ngân sách Tổng công ty cấp</option>
                  <option value="Mượn sếp">Sếp hỗ trợ / Tạm ứng mượn sếp</option>
                  <option value="Khác">Phát sinh khác</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Số tiền cấp quỹ (VNĐ):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono font-bold text-gray-800"
                    placeholder="0"
                    required
                    min={1}
                  />
                  <span className="absolute right-3 top-2 font-semibold text-gray-400">đ</span>
                </div>
              </div>

              {/* Description Content */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Nội dung đợt cấp (Mục đích dán nhãn):</label>
                <input
                  type="text"
                  placeholder="e.g. Nhập quỹ mua dầu cấp bãi đúc dầm đợt 5..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Extra Notes */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Ghi chú thêm:</label>
                <input
                  type="text"
                  placeholder="e.g. Chuyển khoản qua BIDV..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Duyệt Nhập Quỹ
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
