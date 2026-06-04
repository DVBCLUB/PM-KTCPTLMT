/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialItem, MaterialTransaction, UserRole } from '../types';
import { Plus, Trash2, Calendar, FileText, User, ShoppingCart, Send, AlertTriangle, Layers, TrendingDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface InventoryManagerProps {
  materials: MaterialItem[];
  transactions: MaterialTransaction[];
  onAddTransaction: (tx: MaterialTransaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  currentRole: UserRole;
  baselineDate: string;
}

export default function InventoryManager({
  materials,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  currentRole,
  baselineDate,
}: InventoryManagerProps) {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Form Fields
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [type, setType] = useState<'NHẬP' | 'XUẤT'>('NHẬP');
  const [date, setDate] = useState(baselineDate);
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [person, setPerson] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-fill person based on role
  const handleOpenNew = () => {
    setQuantity(0);
    setUnitPrice(0);
    setReference(type === 'NHẬP' ? 'PN-' + Math.floor(Math.random() * 900 + 100) : 'PX-' + Math.floor(Math.random() * 900 + 100));
    setNotes('');
    
    if (currentRole === UserRole.STOREKEEPER) {
      setPerson('Đào Văn Phú (Thủ kho hiện trường)');
    } else if (currentRole === UserRole.HCNS) {
      setPerson('Cô Lan (Phụ trách HCNS)');
    } else if (currentRole === UserRole.ACCOUNTANT) {
      setPerson('Kế toán kiểm kho');
    } else {
      setPerson('Cán bộ phụ trách');
    }
    
    setIsOpen(true);
  };

  // Helper: compute stock ledger for each material
  const getStockLedger = (mat: MaterialItem) => {
    const matTxs = transactions.filter(t => t.materialId === mat.id);
    const totalNhap = matTxs
      .filter(t => t.type === 'NHẬP')
      .reduce((sum, t) => sum + t.quantity, 0);
    const totalXuat = matTxs
      .filter(t => t.type === 'XUẤT')
      .reduce((sum, t) => sum + t.quantity, 0);
    const currentStock = totalNhap - totalXuat;
    const isBelowMin = currentStock < mat.minStock;

    return { totalNhap, totalXuat, currentStock, isBelowMin };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || quantity <= 0) {
      alert('Vui lòng chọn vật tư và nhập số lượng lớn hơn 0!');
      return;
    }

    const payload: MaterialTransaction = {
      id: '',
      materialId,
      type,
      date,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice) || 0,
      totalPrice: (Number(quantity) * (Number(unitPrice) || 0)),
      reference,
      person: person || 'Người quản lý',
      notes,
      createdAt: new Date().toISOString()
    };

    await onAddTransaction(payload);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Sổ Đăng Ký & Quản Lý Vật Tư Tồn Kho Hiện Trường</h2>
          <p className="text-xs text-gray-500">Cho phép thủ kho và kế toán đồng bộ lượng dầu DO, nón bảo hộ, thép xi măng tại bãi thi công bồn dầm</p>
        </div>
        {currentRole !== UserRole.BOSS && (
          <button
            id="log-inventory-btn"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Khai Phiếu Xuất / Nhập Kho</span>
          </button>
        )}
      </div>

      {/* Grid: Stock overview cards & low stock warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Ledger grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-3xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-blue-650" />
              <span>Bảng Tổng Hợp Nhập - Xuất - Tồn Kho Vật Tư</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Bảng dữ liệu trích xuất tự động</span>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-[11px] leading-normal" id="inventory-card-table">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-150">
                  <th className="py-2.5 px-3 font-semibold">Mã Vật Tư</th>
                  <th className="py-2.5 px-3 font-semibold">Tên Vật Tư / Quy cách</th>
                  <th className="py-2.5 px-3 font-semibold text-center">ĐVT</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tổng Nhập</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tổng Xuất</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tồn Hiện Tại</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Định mức tối thiểu</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tình Trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materials.map((mat) => {
                  const ledger = getStockLedger(mat);
                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-gray-700 font-bold">{mat.code}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-gray-900 block">{mat.name}</span>
                        <span className="text-[10px] text-gray-400 block line-clamp-1">{mat.description || '-'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-gray-600">{mat.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-medium">{ledger.totalNhap.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-medium">{ledger.totalXuat.toLocaleString()}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${ledger.isBelowMin ? 'text-red-650' : 'text-gray-900'}`}>
                        {ledger.currentStock.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-400">{mat.minStock.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {ledger.isBelowMin ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            Dưới định mức
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            An Toàn
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts & Role Helper */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-3xs">
          <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            <span>Cảnh Báo Kho Hiện Trường</span>
          </h3>

          <div className="space-y-3">
            {materials.map(mat => {
              const ledger = getStockLedger(mat);
              if (ledger.isBelowMin) {
                return (
                  <div key={mat.id} className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-bold text-red-800">
                      <span>⚠️ Hết định mức an toàn!</span>
                      <span className="font-mono">{mat.code}</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-snug">
                      Vật tư <strong>{mat.name}</strong> hiện chỉ còn <strong>{ledger.currentStock} {mat.unit}</strong> trong kho dầm. Thấp hơn nhiều so với quy định {mat.minStock} {mat.unit} để dự phòng rủi ro.
                    </p>
                    <div className="text-[10px] text-red-500 italic">Thủ kho hoặc Kế toán cần đề xuất mua sắm bổ sung ngay.</div>
                  </div>
                );
              }
              return null;
            })}
            
            {/* If no alerts */}
            {materials.every(m => !getStockLedger(m).isBelowMin) && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs text-emerald-800 space-y-1">
                <p className="font-bold">✨ Tất cả vật tư đều An Toàn!</p>
                <p className="text-[10px] text-emerald-600">Lượng dự trữ tại trạm cao tốc đều lớn hơn mức tối thiểu.</p>
              </div>
            )}
          </div>

          {/* Quick instructions panel */}
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-gray-500 space-y-1 leading-relaxed">
            <p className="font-bold text-slate-700">💡 Hướng dẫn vận hành:</p>
            <p>1. Khi kế toán hạch toán mua dầu tại thẻ <strong>"Chi Phí & Tạm Ứng"</strong>, Thủ kho cần khai thêm phiếu <strong>"Nhập Kho"</strong> tương ứng tại đây.</p>
            <p>2. Khi có yêu cầu cấp nhiên liệu máy gạt/lu, Thủ kho làm phiếu <strong>"Xuất Kho"</strong> thực ghi để tự động trừ vào số tồn nhằm đảm bảo dòng dầu DO chính xác.</p>
          </div>

        </div>

      </div>

      {/* Material Transactions Ledger */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-3xs">
        <div>
          <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Nhật Ký Giao Dịch Kho (Thẻ Kho Điện Tử)</h3>
          <p className="text-xs text-gray-500 font-medium">Lưu trữ thời gian thực mọi lần xuất nhập vật tư chi tiết phục vụ máy thi công đào gầm</p>
        </div>

        {/* Transaction History Log Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left text-[11px] leading-normal" id="inventory-tx-history-table">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-150">
                <th className="py-2.5 px-3 font-semibold text-center w-11">STT</th>
                <th className="py-2.5 px-3 font-semibold">Ngày giao dịch</th>
                <th className="py-2.5 px-3 font-semibold">Tên Vật Tư</th>
                <th className="py-2.5 px-3 font-semibold text-center">Phân loại</th>
                <th className="py-2.5 px-3 font-semibold text-right">Số lượng</th>
                <th className="py-2.5 px-3 font-semibold text-right">Đơn giá mua</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thành tiền</th>
                <th className="py-2.5 px-3 font-semibold">Số chứng từ / Phiếu</th>
                <th className="py-2.5 px-3 font-semibold">Người giao/nhận</th>
                <th className="py-2.5 px-3 font-semibold">Ghi chú</th>
                {currentRole !== UserRole.BOSS && <th className="py-2.5 px-3 font-semibold text-center w-14">Xóa</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-gray-400">Chưa có giao dịch kho nào được lưu vết.</td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const mat = materials.find(m => m.id === tx.materialId);
                  const isNhap = tx.type === 'NHẬP';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap">
                        {tx.date ? tx.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{mat ? mat.name : 'Vật tư lạ'}</td>
                      
                      {/* Badge class */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm text-[9px] font-bold border ${
                          isNhap
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {isNhap ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {tx.type}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {tx.quantity.toLocaleString()} {mat ? mat.unit : ''}
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right font-mono text-gray-500">
                        {tx.unitPrice ? tx.unitPrice.toLocaleString() + ' đ' : '-'}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {tx.totalPrice ? tx.totalPrice.toLocaleString() + ' đ' : '-'}
                      </td>

                      {/* Reference */}
                      <td className="py-2.5 px-3 font-mono text-gray-600 font-medium whitespace-nowrap">{tx.reference || '-'}</td>
                      <td className="py-2.5 px-3 text-gray-700 font-medium">{tx.person}</td>
                      <td className="py-2.5 px-3 text-gray-400 italic max-w-xs truncate" title={tx.notes}>{tx.notes || '-'}</td>

                      {/* Delete */}
                      {currentRole !== UserRole.BOSS && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={async () => {
                              if (confirm(`Bạn chắc chắn muốn xóa giao dịch phiếu "${tx.reference}" này?`)) {
                                await onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popup input form for Transaction */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs tracking-wide">Xuất / Nhập Kho Vật Tư</h3>
                <p className="text-[10px] text-blue-100">Lập phiếu kho phục vụ bãi dầm dầm cao tốc</p>
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
              
              {/* Type: NHÂP / XUẤT Picker */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Chiều chuyển kho:</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border cursor-pointer font-bold transition-all ${
                    type === 'NHẬP' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                    <input
                      type="radio"
                      checked={type === 'NHẬP'}
                      onChange={() => setType('NHẬP')}
                      className="sr-only"
                    />
                    <ArrowDownLeft className="h-4.5 w-4.5" />
                    <span>NHẬP KHO</span>
                  </label>
                  
                  <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border cursor-pointer font-bold transition-all ${
                    type === 'XUẤT' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                    <input
                      type="radio"
                      checked={type === 'XUẤT'}
                      onChange={() => setType('XUẤT')}
                      className="sr-only"
                    />
                    <ArrowUpRight className="h-4.5 w-4.5" />
                    <span>XUẤT KHO</span>
                  </label>
                </div>
              </div>

              {/* Material Item Selector */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Chọn loại vật tư đối ứng:</label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Ngày thực hiện giao dịch:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Voucher code / Reference */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Số phiếu chứng từ:</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="PN-101..."
                    className="w-full p-2 border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Lượng xuất / nhập:</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg font-mono font-bold"
                    placeholder="0"
                    required
                    min={0.01}
                  />
                </div>

                {/* Unit price */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Đơn giá hạch toán mua (nếu có):</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Executor Name */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Người giao hàng / nhận hàng thực tế:</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tên kỹ sư nhận dầu, tên tài xế,..."
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Extra Notes */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Ghi chú hoặc lý do:</label>
                <input
                  type="text"
                  placeholder="e.g. Đổ nhiên liệu máy đào 09 gạt mặt bằng..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Ký & Lưu Phiếu Kho
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
