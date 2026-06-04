/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DocumentProgress, UserRole, Expense } from '../types';
import { Plus, Trash2, Edit2, CheckCircle2, Circle, Clock, Archive, FileText, ChevronRight } from 'lucide-react';

interface DocumentManagerProps {
  documents: DocumentProgress[];
  expenses: Expense[];
  onAddOrUpdateDoc: (doc: DocumentProgress) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  currentRole: UserRole;
  baselineDate: string;
}

export default function DocumentManager({
  documents,
  expenses,
  onAddOrUpdateDoc,
  onDeleteDoc,
  currentRole,
  baselineDate,
}: DocumentManagerProps) {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Hợp đồng' | 'Hóa đơn' | 'Biên bản nghiệm thu' | 'Biên bản giao nhận' | 'Khác'>('Hợp đồng');
  const [status, setStatus] = useState<any>('Soạn thảo');
  const [assignedTo, setAssignedTo] = useState<string>(UserRole.ACCOUNTANT);
  const [expenseId, setExpenseId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const steps: ('Soạn thảo' | 'Trình ký' | 'Đã ký duyệt' | 'Hoàn tất' | 'Lưu trữ')[] = [
    'Soạn thảo', 'Trình ký', 'Đã ký duyệt', 'Hoàn tất', 'Lưu trữ'
  ];

  const handleOpenNew = () => {
    setEditingId(null);
    setCode('HS-' + Math.floor(Math.random() * 900 + 100));
    setName('');
    setCategory('Hợp đồng');
    setStatus('Soạn thảo');
    setAssignedTo(currentRole);
    setExpenseId('');
    setNotes('');
    setIsOpen(true);
  };

  const handleEdit = (doc: DocumentProgress) => {
    setEditingId(doc.id);
    setCode(doc.code);
    setName(doc.name);
    setCategory(doc.category);
    setStatus(doc.status);
    setAssignedTo(doc.assignedTo);
    setExpenseId(doc.expenseId || '');
    setNotes(doc.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng điền tên loại hồ sơ!');
      return;
    }

    const payload: DocumentProgress = {
      id: editingId || '',
      code,
      name,
      category,
      status,
      assignedTo,
      expenseId: expenseId || undefined,
      notes,
      updatedAt: baselineDate
    };

    await onAddOrUpdateDoc(payload);
    setIsOpen(false);
  };

  // Stepping progressive advance helper
  const handleAdvanceStep = async (doc: DocumentProgress) => {
    const currentIdx = steps.indexOf(doc.status as any);
    if (currentIdx !== -1 && currentIdx < steps.length - 1) {
      const nextStep = steps[currentIdx + 1];
      const updated: DocumentProgress = {
        ...doc,
        status: nextStep,
        updatedAt: baselineDate
      };
      await onAddOrUpdateDoc(updated);
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'Soạn thảo': return 'bg-gray-100 text-gray-700';
      case 'Trình ký': return 'bg-blue-100 text-blue-700 font-medium';
      case 'Đã ký duyệt': return 'bg-amber-100 text-amber-800 font-semibold';
      case 'Hoàn tất': return 'bg-emerald-100 text-emerald-800 font-bold';
      case 'Lưu trữ': return 'bg-teal-50 text-teal-700 border border-teal-100';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Quản Lý & Theo Dõi Tiến Trình Hồ Sơ Pháp Lý</h2>
          <p className="text-xs text-gray-500">Giúp đồng bộ việc nộp hóa đơn đỏ, biên bản nghiệm thu hiện trường giữa Kế toán, Thủ kho & Hành chính</p>
        </div>
        {currentRole !== UserRole.BOSS && (
          <button
            id="add-doc-btn"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Khai Báo Bộ Hồ Sơ Mới</span>
          </button>
        )}
      </div>

      {/* Docs List Matrix */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs p-5 space-y-4">
        
        <div className="grid grid-cols-1 gap-4">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có hồ sơ pháp lý nào được khai báo.</div>
          ) : (
            documents.map((doc) => {
              const matchedExpense = expenses.find(e => e.id === doc.expenseId);
              const currentStepIdx = steps.indexOf(doc.status as any);
              
              return (
                <div key={doc.id} className="border border-gray-150 rounded-xl p-4 hover:border-blue-200 hover:shadow-xs transition-all space-y-3 bg-slate-50/20">
                  
                  {/* Row 1: Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{doc.code}</span>
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wide text-gray-400">({doc.category})</span>
                      <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{doc.name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">Cập nhật: {doc.updatedAt.split('-').reverse().join('/')}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Status Pipeline Progress Visual Bar */}
                  <div className="hidden sm:flex items-center justify-between gap-1 py-1.5 px-3 bg-gray-50 rounded-lg">
                    {steps.map((st, sIdx) => {
                      const isPast = sIdx < currentStepIdx;
                      const isCurrent = sIdx === currentStepIdx;
                      return (
                        <React.Fragment key={st}>
                          <div className="flex items-center gap-1">
                            {isPast ? (
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                            ) : isCurrent ? (
                              <Clock className="h-4.5 w-4.5 text-blue-600 animate-spin-slow" />
                            ) : (
                              <Circle className="h-4.5 w-4.5 text-gray-300" />
                            )}
                            <span className={`text-[10px] font-semibold ${
                              isCurrent ? 'text-blue-700 font-extrabold' : isPast ? 'text-gray-500' : 'text-gray-400'
                            }`}>{st}</span>
                          </div>
                          {sIdx < steps.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Row 3: Meta metadata & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] gap-2 pt-1 font-medium">
                    <div className="space-y-1 text-gray-500">
                      <div>
                        🎯 <span className="font-semibold text-gray-700">Bộ phận chịu trách nhiệm:</span> {doc.assignedTo}
                      </div>
                      {matchedExpense && (
                        <div className="text-blue-700 font-medium bg-blue-50/50 p-1 rounded inline-block">
                          📎 <span className="font-semibold">Chi phí đi kèm:</span> {matchedExpense.content} (Thực chi: {matchedExpense.actualAmount.toLocaleString()} VNĐ)
                        </div>
                      )}
                      {doc.notes && (
                        <div className="italic text-gray-400">📝 Ghi chú: {doc.notes}</div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2自self-end sm:self-auto">
                      
                      {/* Advance Step trigger */}
                      {currentRole !== UserRole.BOSS && currentStepIdx < steps.length - 1 && (
                        <button
                          onClick={() => handleAdvanceStep(doc)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] py-1 px-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          title="Chuyển bước tiếp"
                        >
                          <span>Duyệt Tiến Trình</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}

                      {/* Editing */}
                      {currentRole !== UserRole.BOSS && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(doc)}
                            className="p-1 px-2.5 text-blue-600 hover:bg-blue-50 border border-blue-200 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Bạn chắc chắn muốn xóa hồ sơ ${doc.code} này?`)) {
                                await onDeleteDoc(doc.id);
                              }
                            }}
                            className="p-1 px-2 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Pop up form */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs tracking-wide">
                  {editingId ? 'Chỉnh Sửa Bộ Sơ' : 'Khai Báo Bộ Hồ Sơ Mới'}
                </h3>
                <p className="text-[10px] text-blue-100">Đồng bộ chứng từ thi công</p>
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
              
              <div className="grid grid-cols-2 gap-3">
                {/* Code */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Mã hồ sơ pháp lý:</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                    placeholder="HS-101"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Loại tài liệu:</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Hợp đồng">Hợp đồng pháp nhân</option>
                    <option value="Hóa đơn">Hóa đơn giá trị gia tăng (VAT)</option>
                    <option value="Biên bản nghiệm thu">Biên bản nghiệm thu khối lượng</option>
                    <option value="Biên bản giao nhận">Biên bản giao nhận vật tư</option>
                    <option value="Khác">Pháp lý / Chứng từ khác</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Tên bộ hồ sơ / Biên bản:</label>
                <input
                  type="text"
                  placeholder="e.g. Chứng từ mua bán 500 lít dầu Trạm đúc dầm..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Khởi điểm Tiến trình:</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {steps.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Bộ phận theo dõi chính:</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none"
                  >
                    <option value={UserRole.ACCOUNTANT}>Bộ phận Kế Toán Dự Án</option>
                    <option value={UserRole.HCNS}>Bộ phận Hành Chính Nhân Sự</option>
                    <option value={UserRole.STOREKEEPER}>Bộ phận Thủ Kho hiện trường</option>
                  </select>
                </div>
              </div>

              {/* Linked Expense Item */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Liên kết với dòng Thực chi / Tạm ứng (nếu có):</label>
                <select
                  value={expenseId}
                  onChange={(e) => setExpenseId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Không liên kết --</option>
                  {expenses.map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {exp.actualDate.split('-').reverse().join('/')} - {exp.content} ({exp.actualAmount.toLocaleString()}đ)
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Ghi chú tiến độ hoặc vị trí lưu trữ hồ sơ giấy:</label>
                <input
                  type="text"
                  placeholder="e.g. Sếp đã phê duyệt bản scan, chờ nộp bản gốc..."
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
                  Lưu Tiến Trình Hồ Sơ
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
