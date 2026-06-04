/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';
import { Shield, Truck, ClipboardList, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

interface RoleHeaderProps {
  currentRole: string;
  onChangeRole: (role: UserRole) => void;
  baselineDate: string;
  onChangeBaselineDate: (date: string) => void;
  overdueCount: number;
  activeUsers?: string[];
  syncStatus?: 'connected' | 'connecting' | 'disconnected';
}

export default function RoleHeader({
  currentRole,
  onChangeRole,
  baselineDate,
  onChangeBaselineDate,
  overdueCount,
  activeUsers = [],
  syncStatus = 'connected',
}: RoleHeaderProps) {
  const roles = [
    {
      id: UserRole.ACCOUNTANT,
      title: 'Kế Toán Dự Án',
      icon: Shield,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-500',
      activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100',
      badge: 'Chính',
      desc: 'Theo dõi chi phí, tạm ứng, hoàn ứng, chứng từ hóa đơn',
    },
    {
      id: UserRole.STOREKEEPER,
      title: 'Thủ Kho',
      icon: Truck,
      color: 'bg-amber-50 border-amber-200 text-amber-800 focus:ring-amber-500',
      activeColor: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-100',
      badge: 'Kho',
      desc: 'Quản lý danh mục vật tư, xuất/nhập tồn kho hiện trường',
    },
    {
      id: UserRole.HCNS,
      title: 'Hành Chính (HCNS)',
      icon: ClipboardList,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800 focus:ring-indigo-500',
      activeColor: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100',
      badge: 'Quỹ',
      desc: 'Chi phí bếp ăn, đi lại, văn phòng phẩm, nón bảo hộ',
    },
    {
      id: UserRole.BOSS,
      title: 'Giám Đốc (Sếp)',
      icon: TrendingUp,
      color: 'bg-rose-50 border-rose-200 text-rose-800 focus:ring-rose-500',
      activeColor: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-100',
      badge: 'Xem',
      desc: 'Xem báo cáo dòng tiền, quản lý tiến độ, phê duyệt',
    }
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* App title */}
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <p className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-bold">DỰ ÁN TRUNG LƯƠNG – MỸ THUẬN</p>
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight sm:text-xl mt-1">
              Hệ Thống Đồng Bộ Chi Phí & Doanh Nghiệp Căn Bản
            </h1>
          </div>
 
          {/* Simulations Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sync status beacon */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
              ${syncStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                syncStatus === 'connecting' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                'bg-rose-50 text-rose-700 border-rose-200'}`}
            >
              <span className={`h-2 w-2 rounded-full ${
                syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                syncStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'}`}
              />
              {syncStatus === 'connected' ? 'Đồng bộ trực tiếp' :
               syncStatus === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối'}
            </span>

            {/* Render online avatars */}
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50/50 border border-blue-100 rounded-xl px-2.5 py-1 h-[34px]">
                <span className="text-[9px] text-blue-700 font-extrabold uppercase mr-0.5">Online:</span>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {activeUsers.map((user, idx) => {
                    let initials = 'U';
                    let bg = 'bg-slate-700';
                    let title = user;
                    if (user.includes('Kế toán')) { initials = 'KT'; bg = 'bg-emerald-600'; }
                    else if (user.includes('Thủ khoa')) { initials = 'TK'; bg = 'bg-amber-600'; }
                    else if (user.includes('HCNS')) { initials = 'HC'; bg = 'bg-indigo-600'; }
                    else if (user.includes('Sếp')) { initials = 'SĐ'; bg = 'bg-rose-600'; }
                    return (
                      <div
                        key={idx}
                        title={title}
                        className={`inline-flex items-center justify-center h-5 w-7 text-[8px] font-extrabold text-white rounded-md ring-2 ring-white shrink-0 ${bg}`}
                      >
                        {initials}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-500" />
              <label htmlFor="baseline-date-picker" className="text-xs text-slate-600 font-semibold">Giả lập ngày:</label>
              <input
                id="baseline-date-picker"
                type="date"
                value={baselineDate}
                onChange={(e) => onChangeBaselineDate(e.target.value)}
                className="text-xs bg-transparent border-none text-slate-800 font-bold focus:outline-none focus:ring-0 p-0 cursor-pointer"
              />
            </div>
 
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold animate-pulse">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Có {overdueCount} trễ hạn hoàn ứng (15 ngày)!</span>
              </div>
            )}
          </div>
 
        </div>
 
        {/* Role Selector Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Đang tác nghiệp với vai trò (Dùng chung cho cả 3 bộ phận):</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {roles.map((role) => {
              const Icon = role.icon;
              const isActive = currentRole === role.id;
              return (
                <button
                  key={role.id}
                  id={`role-btn-${role.id.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => onChangeRole(role.id as UserRole)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? role.activeColor + " shadow-xs"
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs leading-none">{role.title}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {role.badge}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-1.5 line-clamp-1 leading-snug ${
                    isActive ? 'text-white/90' : 'text-slate-400'
                  }`}>
                    {role.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
 
      </div>
    </div>
  );
}
